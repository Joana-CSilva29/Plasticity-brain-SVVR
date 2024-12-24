# Brain Visualization VTP Viewer

by [Joana Costa e Silva](joana.raposo.costa.e.silva@student.uva.nl)() and [Sándor Battaglini-Fischer](sandor.battaglini-fischer@student.uva.nl)(15020118)

A web-based visualization tool for viewing and analyzing brain connectivity data using VTP (VTK Polygon) files. The application provides an interactive 3D viewer with simulation controls and neuron analytics capabilities.

A demo video can be found in this repo.

## Features

- 3D visualization of brain structures using VTK.js
- Interactive controls for visualization manipulation
- Simulation controls for temporal data analysis
- Neuron analytics dashboard
- Support for VTP file format
- Modern glass-morphic UI design

## Tech Stack

### Frontend

- React.js
- Material-UI (MUI)
- VTK.js for 3D visualization
- Plotly.js for analytics

### Backend

- Node.js (install from website)
- Python scripts for data processing

## Prerequisites

- Node.js (v14 or higher)
- npm or yarn package manager
- Python 3.x
- Modern web browser with WebGL support

## Installation

1. Install backend dependencies:
   ```bash
   cd backend
   npm install
   ```

2. Install frontend dependencies:
   ```bash
   cd frontend
   npm install
   ```

3. Install Python dependencies:
   ```bash
   cd backend/scripts
   pip install -r requirements.txt
   ```

## Running the Application

1. Start the backend server (default port: 5000):
   ```bash
   cd backend
   npm run dev
   ```

2. Start the frontend development server (default port: 3001):
   ```bash
   cd frontend
   npm start
   ```

3. Access the application at `http://localhost:3001`

## Usage

1. Launch the application in your web browser
2. Navigate around the application:
   - The generated plots are below the 3D viewer (some are not generated yet so use the python scripts to generate them, see below)
   - The disabling for the disable simulation is at timestep 100.000
   - The stimumation happens at timestep 150.000 for example

## Backend Python Scripts

The backend includes several Python scripts for data processing and visualization. Here's a detailed breakdown of each script:

### Data Processing Scripts

**Adjust the file paths in the scripts to match your data directory structure. These should only be run to generate additional data, as a demo we have already included some plots. A good example for a timestep to view is DISABLE at timestep 40.000.**

#### export_vtk_all.py
Converts neuron position and network connection data into VTP format for visualization.
- **Input**: Raw position data (`positions/rank_0_positions.txt`) and network files (`network/rank_0_step_*.txt`)
- **Output**: 
  - `neurons.vtp`: Static neuron positions with area-based coloring
  - `connections_*.vtp`: Network connections for each timestep
- **Features**:
  - Processes multiple simulation types (no-network, disable, calcium, stimulus)
  - Creates color-coded visualization data for neurons and connections
  - Supports timestep-based connection visualization

#### disable_data.py
Processes activity data for the disable simulation, tracking neuron behavior when specific areas are disabled.
- **Input**: CSV files from `viz-disable/monitors/`
- **Output**: `backend/uploads/disable/disable_data.json`
- **Features**:
  - Tracks calcium and activity levels for each area
  - Records disabled areas (areas 5 and 8) and their disable times
  - Processes data in 10,000-step increments

#### calcium_levels.py
Analyzes calcium level changes across different brain areas over time.
- **Input**: CSV files from `viz-calcium/monitors/`
- **Output**: `backend/uploads/calcium/calcium_data.json`
- **Features**:
  - Calculates average calcium levels per area
  - Tracks target calcium levels
  - Records neuron counts per area

#### stimulus_color.py
Processes stimulus response data, tracking how areas react to external stimulation.
- **Input**: CSV files from `viz-stimulus/monitors/`
- **Output**: `backend/uploads/stimulus/stimulus_data.json`
- **Features**:
  - Records stimulation periods for areas 8, 30, and 34
  - Tracks calcium and activity levels
  - Includes stimulation intensity data

### Visualization Scripts

#### plot1_script.py
Generates interactive parallel coordinates and box plots for neuron properties.
- **Output**: HTML files in `backend/uploads/[simulation]/plots/plot1_*.html`
- **Features**:
  - Visualizes neuron properties (calcium, firing rate, growth)
  - Creates interactive parallel coordinates plot
  - Includes area-based filtering options

#### plot2_script.py
Creates interactive heatmaps showing connection matrices between brain areas.
- **Output**: HTML files in `backend/uploads/[simulation]/plots/plot2_*.html`
- **Features**:
  - Visualizes synaptic connections between areas
  - Uses color intensity to show connection strength
  - Provides interactive tooltips with connection counts

#### plot3_script.py
Analyzes and visualizes connectivity changes between specific areas of interest.
- **Output**: HTML files in `backend/uploads/[simulation]/plots/plot3_*.html`
- **Features**:
  - Tracks cumulative connections between key areas
  - Shows connectivity evolution over time
  - Focuses on areas 8, 30, and 34

#### box_plot_calcium.py
Creates combined visualizations of calcium levels and neuron properties.
- **Output**: HTML files in `backend/uploads/[simulation]/plots/Box_plot_*.html`
- **Features**:
  - Combines box plots and parallel coordinates
  - Shows calcium level distributions by area
  - Provides interactive area filtering

### Running the Scripts

1. Ensure all required Python packages are installed:

```bash
pip install -r backend/scripts/requirements.txt
```

2. Run scripts in the following order:
```bash
cd backend/scripts
python export_vtk_all.py --sim no-network # Generate VTP files first, exchange with other simulation names
python disable_data.py    # Process disable simulation data
python calcium_levels.py  # Process calcium simulation data
python stimulus_color.py  # Process stimulus simulation data
python plot1_script.py    # Generate property plots
python plot2_script.py    # Generate connection matrices
python plot3_script.py    # Generate connectivity analysis
python box_plot_calcium.py # Generate calcium visualizations
```
