import vtk
from collections import defaultdict


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
                if area not in area_to_id:
                    area_to_id[area] = len(area_to_id)
                point_areas.append(area_to_id[area])
    except FileNotFoundError:
        print(f"File {file_path} not found.")
        return None, None, None
    return points, areas, point_areas


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


def create_area_polydata(area_centroids, connection_counts):
    """Create vtkPolyData for area-level connections."""
    points = vtk.vtkPoints()
    lines = vtk.vtkCellArray()

    # Map area IDs to point indices in vtkPoints
    area_id_to_point_id = {}
    for area_id, centroid in area_centroids.items():
        area_id_to_point_id[area_id] = points.InsertNextPoint(centroid)

    # Create connections between area centroids
    for (area1, area2), count in connection_counts.items():
        if area1 in area_id_to_point_id and area2 in area_id_to_point_id:
            lines.InsertNextCell(2)
            lines.InsertCellPoint(area_id_to_point_id[area1])
            lines.InsertCellPoint(area_id_to_point_id[area2])

    polydata = vtk.vtkPolyData()
    polydata.SetPoints(points)
    polydata.SetLines(lines)

    return polydata


def create_actor_from_polydata(polydata, is_glyph=False, radius=0.5, color=(1, 0, 0)):
    """Create an actor for either glyphs or lines."""
    if is_glyph:
        # Glyph for neuron points
        glyph_source = vtk.vtkSphereSource()
        glyph_source.SetRadius(radius)

        glyph_filter = vtk.vtkGlyph3D()
        glyph_filter.SetSourceConnection(glyph_source.GetOutputPort())
        glyph_filter.SetInputData(polydata)
        glyph_filter.Update()

        mapper = vtk.vtkPolyDataMapper()
        mapper.SetInputConnection(glyph_filter.GetOutputPort())
    else:
        # Tube for connections
        tube_filter = vtk.vtkTubeFilter()
        tube_filter.SetInputData(polydata)
        tube_filter.SetRadius(radius)
        tube_filter.SetNumberOfSides(50)
        tube_filter.CappingOn()
        tube_filter.Update()

        mapper = vtk.vtkPolyDataMapper()
        mapper.SetInputConnection(tube_filter.GetOutputPort())

    actor = vtk.vtkActor()
    actor.SetMapper(mapper)
    actor.GetProperty().SetColor(*color)
    return actor


def main():
    global base_path, renderer, render_window

    # File paths and timestep configuration
    base_path = '/Users/joanacostaesilva/Desktop/Scientific Visualization and Virtual Reality /Project SVVR/viz-no-network'
    initial_timestep = 600000
    positions_file = f'{base_path}/positions/rank_0_positions.txt'
    in_network_file = f'{base_path}/network/rank_0_step_{initial_timestep}_in_network.txt'
    out_network_file = f'{base_path}/network/rank_0_step_{initial_timestep}_out_network.txt'

    points, areas, point_areas = read_positions(positions_file)
    if points is None:
        print("Unable to load positions data. Exiting.")
        return

    # Read in and out network connections
    in_connections = read_network_connections(in_network_file)
    out_connections = read_network_connections(out_network_file)

    # Count connections between areas
    connection_counts = defaultdict(int)
    if in_connections is not None:
        for source_id, target_id in in_connections:
            if source_id < len(point_areas) and target_id < len(point_areas):
                area1 = point_areas[source_id]
                area2 = point_areas[target_id]
                connection_counts[(area1, area2)] += 1

    if out_connections is not None:
        for source_id, target_id in out_connections:
            if source_id < len(point_areas) and target_id < len(point_areas):
                area1 = point_areas[source_id]
                area2 = point_areas[target_id]
                connection_counts[(area1, area2)] += 1

    # Calculate centroids for areas
    area_centroids = calculate_area_centroids(points, point_areas)

    # Create area-level polydata and actor
    area_polydata = create_area_polydata(area_centroids, connection_counts)
    area_connection_actor = create_actor_from_polydata(area_polydata, is_glyph=False, radius=1.0, color=(0.2, 0.2, 0.2))

    # Create neuron glyphs
    neuron_polydata = vtk.vtkPolyData()
    neuron_polydata.SetPoints(points)
    neuron_actor = create_actor_from_polydata(neuron_polydata, is_glyph=True, radius=0.5, color=(1, 0, 0))

    # VTK rendering setup
    renderer = vtk.vtkRenderer()
    render_window = vtk.vtkRenderWindow()
    render_window.AddRenderer(renderer)
    render_window.SetSize(800, 600)
    renderer.SetBackground(1, 1, 1)  # Set background to white

    # Add actors to renderer
    renderer.AddActor(area_connection_actor)
    renderer.AddActor(neuron_actor)

    # Start the interaction
    iren = vtk.vtkRenderWindowInteractor()
    iren.SetRenderWindow(render_window)
    iren.Initialize()
    render_window.Render()
    iren.Start()


if __name__ == "__main__":
    main()
