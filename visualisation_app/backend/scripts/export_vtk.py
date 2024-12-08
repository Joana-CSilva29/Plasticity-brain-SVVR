import vtk
from collections import defaultdict
import random
import os


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
    """Create vtkPolyData for neurons with area-based colors."""
    polydata = vtk.vtkPolyData()
    polydata.SetPoints(points)

    # Create vertices (points)
    vertices = vtk.vtkCellArray()
    for i in range(points.GetNumberOfPoints()):
        vertices.InsertNextCell(1)
        vertices.InsertCellPoint(i)
    
    # Add vertices to polydata
    polydata.SetVerts(vertices)

    # Add area-based colors
    colors = vtk.vtkUnsignedCharArray()
    colors.SetName("Colors")
    colors.SetNumberOfComponents(3)

    # Create lookup table for area colors
    lut = vtk.vtkLookupTable()
    lut.SetNumberOfTableValues(num_areas)
    lut.Build()

    # Assign random colors to each area
    for i in range(num_areas):
        lut.SetTableValue(i, random.random(), random.random(), random.random(), 1.0)

    # Set colors for each point based on its area
    for area_id in point_areas:
        index = area_to_id[area_id]
        rgb = lut.GetTableValue(index)
        colors.InsertNextTuple3(int(255 * rgb[0]), int(255 * rgb[1]), int(255 * rgb[2]))

    polydata.GetPointData().SetScalars(colors)
    return polydata


def create_connections_polydata(area_centroids, in_connections, out_connections, point_areas):
    """Create vtkPolyData for area-level connections with separate in/out colors."""
    points = vtk.vtkPoints()
    lines = vtk.vtkCellArray()
    
    # Create array for connection types (0 for in, 1 for out)
    connectionTypes = vtk.vtkUnsignedCharArray()
    connectionTypes.SetName("ConnectionType")
    connectionTypes.SetNumberOfComponents(1)
    
    # Map area IDs to point indices
    area_id_to_point_id = {}
    for area_id, centroid in area_centroids.items():
        area_id_to_point_id[area_id] = points.InsertNextPoint(centroid)

    # Process in connections
    for source_id, target_id in in_connections:
        if source_id < len(point_areas) and target_id < len(point_areas):
            area1 = point_areas[source_id]
            area2 = point_areas[target_id]
            
            # Create line
            line = vtk.vtkLine()
            line.GetPointIds().SetId(0, area_id_to_point_id[area1])
            line.GetPointIds().SetId(1, area_id_to_point_id[area2])
            lines.InsertNextCell(line)
            
            # Mark as in connection (0)
            connectionTypes.InsertNextValue(0)

    # Process out connections
    for source_id, target_id in out_connections:
        if source_id < len(point_areas) and target_id < len(point_areas):
            area1 = point_areas[source_id]
            area2 = point_areas[target_id]
            
            # Create line
            line = vtk.vtkLine()
            line.GetPointIds().SetId(0, area_id_to_point_id[area1])
            line.GetPointIds().SetId(1, area_id_to_point_id[area2])
            lines.InsertNextCell(line)
            
            # Mark as out connection (1)
            connectionTypes.InsertNextValue(1)

    # Create the polydata
    polydata = vtk.vtkPolyData()
    polydata.SetPoints(points)
    polydata.SetLines(lines)
    
    # Add the connection types to cell data
    polydata.GetCellData().AddArray(connectionTypes)
    polydata.GetCellData().SetActiveScalars('ConnectionType')

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


def main():
    # File paths
    base_path = '/Volumes/Extreme SSD/SciVis Project 2023/SciVisContest23/viz-no-network'
    
    # Create output directories if they don't exist
    base_output_dir = 'backend/uploads'
    sim1_dir = os.path.join(base_output_dir, 'sim1')
    os.makedirs(sim1_dir, exist_ok=True)

    # Read positions data (constant across timesteps)
    positions_file = f'{base_path}/positions/rank_0_positions.txt'
    points, areas, point_areas, area_to_id = read_positions(positions_file)
    if points is None:
        print("Unable to load positions data. Exiting.")
        return

    # Calculate area centroids (constant across timesteps)
    area_centroids = calculate_area_centroids(points, point_areas)

    # Create neurons VTP (constant across timesteps)
    neurons_polydata = create_neurons_polydata(points, point_areas, area_to_id, len(areas))
    export_to_vtp(neurons_polydata, os.path.join(sim1_dir, 'neurons.vtp'))

    # Process each timestep
    for timestep in range(0, 1000001, 10000):
        print(f"Processing timestep {timestep}...")
        
        # Read network connections for this timestep
        in_network_file = f'{base_path}/network/rank_0_step_{timestep}_in_network.txt'
        out_network_file = f'{base_path}/network/rank_0_step_{timestep}_out_network.txt'
        
        in_connections = read_network_connections(in_network_file)
        out_connections = read_network_connections(out_network_file)
        
        if in_connections is None or out_connections is None:
            print(f"Skipping timestep {timestep} due to missing network data.")
            continue

        # Create and export connections VTP for this timestep
        connections_polydata = create_connections_polydata(
            area_centroids, in_connections, out_connections, point_areas
        )
        connections_filename = os.path.join(sim1_dir, f'connections_{timestep:07d}.vtp')
        export_to_vtp(connections_polydata, connections_filename)

    print(f"VTP files exported successfully to: {sim1_dir}")


if __name__ == "__main__":
    main()