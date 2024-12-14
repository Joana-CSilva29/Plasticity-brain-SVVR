import vtk
from collections import defaultdict
import random
import os
import math


def read_positions(file_path):
    """Read neuron positions from the given file."""
    points = vtk.vtkPoints()
    areas = set()
    area_to_id = {}
    point_areas = []
    try:
        with open(file_path, 'r') as file:
            for line in file:
                if line.startswith('#') or not line.strip():
                    continue
                data = line.strip().split()
                local_id = int(data[0])
                x, y, z = float(data[1]), float(data[2]), float(data[3])
                area = data[4]  # Assuming the area is in the 5th column
                if not area.startswith('area_'):
                    continue
                points.InsertNextPoint(x, y, z)
                areas.add(area)
                point_areas.append(area)  # Store the original area name
    except FileNotFoundError:
        print(f"File {file_path} not found.")
        return None, None, None, None

    # Sort the areas by their numeric part, then assign the IDs
    sorted_areas = sorted(areas, key=lambda x: int(x.split('_')[1]))
    area_to_id = {area: idx for idx, area in enumerate(sorted_areas)}

    return points, areas, point_areas, area_to_id


def read_network_connections(file_path):
    """Read network connections (either in or out) from the given file."""
    connections = []
    try:
        with open(file_path, 'r') as file:
            for line in file:
                if line.startswith('#') or not line.strip():
                    continue
                data = line.strip().split()
                source_id = int(data[1])
                target_id = int(data[3])
                connections.append((source_id, target_id))
    except FileNotFoundError:
        print(f"File {file_path} not found.")
        return None
    return connections


def calculate_area_centroids(points, point_areas):
    """Calculate centroids for each area."""
    area_points = defaultdict(list)
    for i in range(points.GetNumberOfPoints()):
        x, y, z = points.GetPoint(i)
        area_id = point_areas[i]
        area_points[area_id].append((x, y, z))

    centroids = {}
    for area_id, area_points_list in area_points.items():
        xs, ys, zs = zip(*area_points_list)
        centroids[area_id] = (sum(xs) / len(xs), sum(ys) / len(ys), sum(zs) / len(zs))
    return centroids


def create_neurons_polydata(points, point_areas, area_to_id, num_areas):
    """Create vtkPolyData for neurons with area-based colors and labels."""
    polydata = vtk.vtkPolyData()
    polydata.SetPoints(points)

    # Create vertices (points)
    vertices = vtk.vtkCellArray()
    for i in range(points.GetNumberOfPoints()):
        vertices.InsertNextCell(1)
        vertices.InsertCellPoint(i)
    
    polydata.SetVerts(vertices)

    # Add area-based colors
    colors = vtk.vtkUnsignedCharArray()
    colors.SetName("Colors")
    colors.SetNumberOfComponents(3)

    # Define a color mapping for each area
    unique_areas = sorted(set(point_areas))
    area_color_map = {}
    
    # Generate distinct colors for each area
    for i, area in enumerate(unique_areas):
        # Create a rainbow color scheme
        hue = i / len(unique_areas)
        # Convert HSV to RGB (assuming S=1, V=1)
        if hue < 1/6:
            rgb = (255, int(255 * 6 * hue), 0)
        elif hue < 2/6:
            rgb = (int(255 * (2 - 6 * hue)), 255, 0)
        elif hue < 3/6:
            rgb = (0, 255, int(255 * (6 * hue - 2)))
        elif hue < 4/6:
            rgb = (0, int(255 * (4 - 6 * hue)), 255)
        elif hue < 5/6:
            rgb = (int(255 * (6 * hue - 4)), 0, 255)
        else:
            rgb = (255, 0, int(255 * (6 - 6 * hue)))
        area_color_map[area] = rgb

    # Add area labels as a string array
    areaLabels = vtk.vtkStringArray()
    areaLabels.SetName("AreaLabels")
    areaLabels.SetNumberOfComponents(1)

    # Set colors and labels for each point based on its area
    for area_id in point_areas:
        rgb = area_color_map[area_id]
        colors.InsertNextTuple3(rgb[0], rgb[1], rgb[2])
        areaLabels.InsertNextValue(area_id)  # Store the original area name

    polydata.GetPointData().SetScalars(colors)
    polydata.GetPointData().AddArray(areaLabels)
    
    return polydata


def create_connections_polydata(area_centroids, in_connections, out_connections, point_areas):
    """Create basic vtkPolyData for area-level connections with weights."""
    points = vtk.vtkPoints()
    lines = vtk.vtkCellArray()
    
    # Create array for connection weights
    connectionWeights = vtk.vtkFloatArray()
    connectionWeights.SetName("ConnectionWeight")
    connectionWeights.SetNumberOfComponents(1)
    
    # Map area IDs to point indices
    area_id_to_point_id = {}
    for area_id, centroid in area_centroids.items():
        area_id_to_point_id[area_id] = points.InsertNextPoint(centroid)

    # Count connections between areas
    connection_counts = defaultdict(int)
    
    # Process connections as undirected (combine in and out)
    all_connections = in_connections + out_connections
    for source_id, target_id in all_connections:
        if source_id >= len(point_areas) or target_id >= len(point_areas):
            continue
            
        area1 = point_areas[source_id]
        area2 = point_areas[target_id]
        
        # Create a sorted tuple to treat connections as undirected
        area_pair = tuple(sorted([area1, area2]))
        connection_counts[area_pair] += 1

    # Find max connection count for normalization
    max_count = max(connection_counts.values()) if connection_counts else 1

    print("\nConnection counts between areas:")
    for (area1, area2), count in connection_counts.items():
        normalized = count / max_count
        print(f"Areas {area1} <-> {area2}: {count} connections (normalized: {normalized:.3f})")
    print(f"Maximum connections between any two areas: {max_count}")

    # Create lines with explicit normalization
    for (area1, area2), count in connection_counts.items():
        if area1 == area2:
            continue  # Skip self-connections
            
        line = vtk.vtkLine()
        line.GetPointIds().SetId(0, area_id_to_point_id[area1])
        line.GetPointIds().SetId(1, area_id_to_point_id[area2])
        lines.InsertNextCell(line)
        
        # Ensure normalization is exactly between 0 and 1
        normalized_weight = count / max_count
        connectionWeights.InsertNextValue(normalized_weight)

    # Create the polydata
    polydata = vtk.vtkPolyData()
    polydata.SetPoints(points)
    polydata.SetLines(lines)
    
    # Add weights to cell data
    polydata.GetCellData().AddArray(connectionWeights)
    polydata.GetCellData().SetActiveScalars("ConnectionWeight")
    
    return polydata


def export_to_vtp(polydata, filename):
    """Export polydata to VTP file with proper formatting."""
    # Create the writer
    writer = vtk.vtkXMLPolyDataWriter()
    writer.SetFileName(filename)
    writer.SetInputData(polydata)
    
    # Set data mode to ASCII for human-readable output
    writer.SetDataModeToAscii()
    
    # Ensure all arrays are written
    writer.SetEncodeAppendedData(0)
    writer.SetCompressorTypeToNone()
    
    # Write the file
    writer.Write()


def process_simulation(sim_name, base_path):
    """Process a single simulation and export VTP files."""
    print(f"Processing simulation: {sim_name}")
    
    # Create output directory
    base_output_dir = 'backend/uploads'
    sim_dir = os.path.join(base_output_dir, sim_name)
    os.makedirs(sim_dir, exist_ok=True)

    # Read positions data
    positions_file = f'{base_path}/positions/rank_0_positions.txt'
    print(f"Reading positions from: {positions_file}")  # Debug log
    
    points, areas, point_areas, area_to_id = read_positions(positions_file)
    if points is None:
        print(f"Unable to load positions data for {sim_name}. Skipping.")
        return

    # Create neurons VTP
    neurons_polydata = create_neurons_polydata(points, point_areas, area_to_id, len(areas))
    neurons_file = os.path.join(sim_dir, 'neurons.vtp')
    print(f"Exporting neurons to: {neurons_file}")  # Debug log
    export_to_vtp(neurons_polydata, neurons_file)

    # Process each timestep
    for timestep in range(0, 1000001, 10000):
        print(f"Processing timestep {timestep}...")
        
        # Read network connections
        in_network_file = f'{base_path}/network/rank_0_step_{timestep}_in_network.txt'
        out_network_file = f'{base_path}/network/rank_0_step_{timestep}_out_network.txt'
        
        in_connections = read_network_connections(in_network_file)
        out_connections = read_network_connections(out_network_file)
        
        if in_connections is None or out_connections is None:
            print(f"Skipping timestep {timestep} due to missing network data.")
            continue

        area_centroids = calculate_area_centroids(points, point_areas)
        connections_polydata = create_connections_polydata(
            area_centroids, in_connections, out_connections, point_areas
        )

        connections_filename = os.path.join(sim_dir, f'connections_{timestep:07d}.vtp')
        export_to_vtp(connections_polydata, connections_filename)


def create_empty_connections_polydata():
    """Create an empty polydata for the no-network case."""
    polydata = vtk.vtkPolyData()
    points = vtk.vtkPoints()
    polydata.SetPoints(points)
    
    # Add empty cell array
    lines = vtk.vtkCellArray()
    polydata.SetLines(lines)
    
    # Add empty connection type array
    connectionTypes = vtk.vtkUnsignedCharArray()
    connectionTypes.SetName("ConnectionType")
    connectionTypes.SetNumberOfComponents(1)
    polydata.GetCellData().AddArray(connectionTypes)
    
    return polydata


def main():
    base_ssd_path = '/Volumes/Extreme SSD/SciVis Project 2023/SciVisContest23'
    
    # Define simulation configurations
    simulations = {
        'no-network': f'{base_ssd_path}/viz-no-network',
        'disable': f'{base_ssd_path}/viz-disable',
        'calcium': f'{base_ssd_path}/viz-calcium',
        'stimulus': f'{base_ssd_path}/viz-stimulus'
    }

    # Get command line arguments
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument('--sim', choices=list(simulations.keys()), 
                       help='Specific simulation to process')
    args = parser.parse_args()

    if args.sim:
        # Process single simulation
        if args.sim in simulations:
            process_simulation(args.sim, simulations[args.sim])
        else:
            print(f"Unknown simulation: {args.sim}")
    else:
        # Process all simulations
        for sim_name, sim_path in simulations.items():
            process_simulation(sim_name, sim_path)


if __name__ == "__main__":
    main()