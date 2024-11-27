import vtk

# Function to read neuron positions from the file
def read_positions(file_path):
    points = vtk.vtkPoints()
    try:
        with open(file_path, 'r') as file:
            for line in file:
                if line.startswith('#') or not line.strip():
                    continue
                data = line.strip().split()
                x, y, z = float(data[1]), float(data[2]), float(data[3])
                points.InsertNextPoint(x, y, z)
    except FileNotFoundError:
        print(f"File {file_path} not found.")
        return None
    return points

# Function to read network connections from the file
def read_connections(file_path):
    lines = vtk.vtkCellArray()
    try:
        with open(file_path, 'r') as file:
            for line in file:
                if line.startswith('#') or not line.strip():
                    continue
                data = line.strip().split()
                point1_id, point2_id = int(data[0]), int(data[1])
                line = vtk.vtkLine()
                line.GetPointIds().SetId(0, point1_id)
                line.GetPointIds().SetId(1, point2_id)
                lines.InsertNextCell(line)
    except FileNotFoundError:
        print(f"File {file_path} not found.")
        return None
    return lines

# Paths to the neuron positions and network connections files
positions_file = "/Users/joanacostaesilva/Desktop/Scientific Visualization and Virtual Reality /Project SVVR/viz-no-network/positions/rank_0_positions.txt"
in_network_file = "/Users/joanacostaesilva/Desktop/Scientific Visualization and Virtual Reality /Project SVVR/viz-no-network/network/rank_0_step_60000_in_network.txt"
out_network_file = "/Users/joanacostaesilva/Desktop/Scientific Visualization and Virtual Reality /Project SVVR/viz-no-network/network/rank_0_step_60000_out_network.txt"

# Read positions and check for validity
points = read_positions(positions_file)
if not points:
    exit("No points to visualize. Exiting.")

# Count the number of neurons
num_neurons = points.GetNumberOfPoints()
print(f"Number of neurons: {num_neurons}")

# Create a vtkPolyData object
polydata = vtk.vtkPolyData()
polydata.SetPoints(points)

# Read network connections
in_network_lines = read_connections(in_network_file)
out_network_lines = read_connections(out_network_file)

# Print the number of links
num_in_network_links = in_network_lines.GetNumberOfCells() if in_network_lines else 0
num_out_network_links = out_network_lines.GetNumberOfCells() if out_network_lines else 0
print(f"Number of in-network links: {num_in_network_links}")
print(f"Number of out-network links: {num_out_network_links}")

# Combine in-network and out-network lines
all_lines = vtk.vtkCellArray()
if in_network_lines:
    all_lines.DeepCopy(in_network_lines)
if out_network_lines:
    all_lines.Append(out_network_lines)

# Set lines to polydata
polydata.SetLines(all_lines)

# Glyph representation of neurons (using spheres)
sphere = vtk.vtkSphereSource()
sphere.SetRadius(0.5)  # Increase the radius to make the nodes bigger

glyph3D = vtk.vtkGlyph3D()
glyph3D.SetSourceConnection(sphere.GetOutputPort())
glyph3D.SetInputData(polydata)
glyph3D.SetScaleModeToDataScalingOff()

# Mapper for glyphs
glyph_mapper = vtk.vtkPolyDataMapper()
glyph_mapper.SetInputConnection(glyph3D.GetOutputPort())

# Actor for glyphs
glyph_actor = vtk.vtkActor()
glyph_actor.SetMapper(glyph_mapper)
glyph_actor.GetProperty().SetColor(0, 0, 1)  # Blue color for neurons

# Mapper for lines
line_mapper = vtk.vtkPolyDataMapper()
line_mapper.SetInputData(polydata)

# Actor for lines
line_actor = vtk.vtkActor()
line_actor.SetMapper(line_mapper)
line_actor.GetProperty().SetColor(0.5, 0.5, 0.5)  # Grey color for lines
line_actor.GetProperty().SetEdgeColor(0.5, 0.5, 0.5)  # Grey color for edges
line_actor.GetProperty().EdgeVisibilityOn()
line_actor.GetProperty().SetLineWidth(2)  # Increase the line width

# Renderer
renderer = vtk.vtkRenderer()
renderer.AddActor(glyph_actor)
renderer.AddActor(line_actor)
renderer.SetBackground(1, 1, 1)  # White background color

# Render window
render_window = vtk.vtkRenderWindow()
render_window.AddRenderer(renderer)
render_window.SetSize(1200, 800)  # Increase the size of the visualization window

# Interactor for rendering
interactor = vtk.vtkRenderWindowInteractor()
interactor.SetRenderWindow(render_window)

# Start visualization
render_window.Render()
interactor.Start()