import vtk
from collections import defaultdict
import random


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
        return None, None, None

    # Sort the areas by their numeric part, then assign the IDs
    sorted_areas = sorted(areas, key=lambda x: int(x.split('_')[1]))  # Sorting by the numeric part of 'area_X'
    area_to_id = {area: idx for idx, area in enumerate(sorted_areas)}  # Reassign area ids based on sorted order

    return points, areas, point_areas, area_to_id  # Return area_to_id


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


def create_colored_glyphs(points, point_areas, area_to_id, num_areas):
    """Create vtkPolyData for neuron glyphs with area-based colors."""
    polydata = vtk.vtkPolyData()
    polydata.SetPoints(points)

    # Add area-based colors
    colors = vtk.vtkUnsignedCharArray()
    colors.SetName("Colors")
    colors.SetNumberOfComponents(3)

    # Assign unique colors to each area using a lookup table
    lut = vtk.vtkLookupTable()
    lut.SetNumberOfTableValues(num_areas)  # Ensure the number of colors matches the number of areas
    lut.Build()

    # Assign random colors to each area
    for i in range(num_areas):
        lut.SetTableValue(i, random.random(), random.random(), random.random(), 1.0)

    # Set colors for each point based on the area it belongs to
    for area_id in point_areas:
        # Get the integer index for the area (from the sorted area_to_id mapping)
        index = area_to_id[area_id]  # area_id is now a string, area_to_id maps it to a unique integer
        rgb = lut.GetTableValue(index)  # Get color from lookup table based on the index
        colors.InsertNextTuple3(int(255 * rgb[0]), int(255 * rgb[1]), int(255 * rgb[2]))

    polydata.GetPointData().SetScalars(colors)

    # Create glyphs (spheres) for neuron points
    glyph_source = vtk.vtkSphereSource()
    glyph_source.SetRadius(0.005)  # Fixed small size for nodes

    glyph_filter = vtk.vtkGlyph3D()
    glyph_filter.SetSourceConnection(glyph_source.GetOutputPort())
    glyph_filter.SetInputData(polydata)
    glyph_filter.Update()

    mapper = vtk.vtkPolyDataMapper()
    mapper.SetInputConnection(glyph_filter.GetOutputPort())
    mapper.SetScalarModeToUsePointData()  # Use point data for coloring

    actor = vtk.vtkActor()
    actor.SetMapper(mapper)
    return actor


def create_area_connections(area_centroids, in_connections, out_connections, point_areas):
    """Create vtkPolyData for area-level connections."""
    points = vtk.vtkPoints()
    lines = vtk.vtkCellArray()
    radii = vtk.vtkDoubleArray()
    radii.SetName("TubeRadius")

    # Map area IDs to point indices in vtkPoints
    area_id_to_point_id = {}
    for area_id, centroid in area_centroids.items():
        area_id_to_point_id[area_id] = points.InsertNextPoint(centroid)

    # Count connections for in and out separately
    connection_counts = defaultdict(lambda: [0, 0])  # [in_count, out_count]

    for source_id, target_id in in_connections:
        if source_id < len(point_areas) and target_id < len(point_areas):
            area1 = point_areas[source_id]
            area2 = point_areas[target_id]
            connection_counts[(area1, area2)][0] += 1  # Increment in-count

    for source_id, target_id in out_connections:
        if source_id < len(point_areas) and target_id < len(point_areas):
            area1 = point_areas[source_id]
            area2 = point_areas[target_id]
            connection_counts[(area1, area2)][1] += 1  # Increment out-count

    # Create tubes for connections
    for (area1, area2), (in_count, out_count) in connection_counts.items():
        if area1 in area_id_to_point_id and area2 in area_id_to_point_id:
            # Create tube for in-connections
            line = vtk.vtkLine()
            line.GetPointIds().SetId(0, area_id_to_point_id[area1])
            line.GetPointIds().SetId(1, area_id_to_point_id[area2])
            lines.InsertNextCell(line)
            radii.InsertNextValue(0.1 * in_count)  # Scale by in-count

            # Create tube for out-connections
            line = vtk.vtkLine()
            line.GetPointIds().SetId(0, area_id_to_point_id[area2])
            line.GetPointIds().SetId(1, area_id_to_point_id[area1])
            lines.InsertNextCell(line)
            radii.InsertNextValue(0.1 * out_count)  # Scale by out-count

    polydata = vtk.vtkPolyData()
    polydata.SetPoints(points)
    polydata.SetLines(lines)
    polydata.GetCellData().AddArray(radii)
    polydata.GetCellData().SetActiveScalars("TubeRadius")

    return polydata


def create_tube_actor(polydata):
    """Create a VTK actor for the tubes."""
    tube_filter = vtk.vtkTubeFilter()
    tube_filter.SetInputData(polydata)
    tube_filter.SetVaryRadiusToVaryRadiusByScalar()
    tube_filter.SetNumberOfSides(50)
    tube_filter.CappingOn()
    tube_filter.Update()

    mapper = vtk.vtkPolyDataMapper()
    mapper.SetInputConnection(tube_filter.GetOutputPort())

    actor = vtk.vtkActor()
    actor.SetMapper(mapper)
    actor.GetProperty().SetColor(0.5, 0.5, 0.5)  # Fixed grey color for tubes
    return actor


def main():
    global base_path, renderer, render_window, area_to_id

    # File paths and timestep configuration
    base_path_joana = '/Users/joanacostaesilva/Desktop/Scientific Visualization and Virtual Reality /Project SVVR/viz-no-network'
    base_path_sandor = '/Volumes/Extreme SSD/SciVis Project 2023/SciVisContest23/viz-no-network'
    initial_timestep = 600000
    positions_file = f'{base_path_sandor}/positions/rank_0_positions.txt'
    in_network_file = f'{base_path_sandor}/network/rank_0_step_{initial_timestep}_in_network.txt'
    out_network_file = f'{base_path_sandor}/network/rank_0_step_{initial_timestep}_out_network.txt'

    points, areas, point_areas, area_to_id = read_positions(positions_file)
    if points is None:
        print("Unable to load positions data. Exiting.")
        return

    # Read in and out network connections
    in_connections = read_network_connections(in_network_file)
    out_connections = read_network_connections(out_network_file)

    # Calculate centroids for areas
    area_centroids = calculate_area_centroids(points, point_areas)

    # Create area connections
    area_connections_polydata = create_area_connections(area_centroids, in_connections, out_connections, point_areas)
    connection_actor = create_tube_actor(area_connections_polydata)

    # Create neuron glyphs with area-based colors
    neuron_actor = create_colored_glyphs(points, point_areas, area_to_id, len(areas))

    # VTK rendering setup
    renderer = vtk.vtkRenderer()
    render_window = vtk.vtkRenderWindow()
    render_window.AddRenderer(renderer)
    render_window.SetSize(1000, 800)
    renderer.SetBackground(1, 1, 1)  # Set background to white

    # Add actors to renderer
    renderer.AddActor(connection_actor)
    renderer.AddActor(neuron_actor)

    # Start the interaction
    iren = vtk.vtkRenderWindowInteractor()
    iren.SetRenderWindow(render_window)
    iren.Initialize()
    render_window.Render()
    iren.Start()


if __name__ == "__main__":
    main()
