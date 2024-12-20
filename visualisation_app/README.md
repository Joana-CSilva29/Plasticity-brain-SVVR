# Brain Visualization VTP Viewer

A web-based visualization tool for viewing and analyzing brain connectivity data using VTP (VTK Polygon) files. The application provides an interactive 3D viewer with simulation controls and neuron analytics capabilities.

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
- Framer Motion for animations
- Axios for API communication

### Backend

- Node.js
- Express.js
- Multer for file handling
- CORS for cross-origin resource sharing
- Python scripts for data processing

## Prerequisites

- Node.js (v14 or higher)
- npm or yarn package manager
- Python 3.x
- Modern web browser with WebGL support

## Installation

1. Clone the repository:
   ```bash
   git clone [repository-url]
   cd [repository-name]
   ```

2. Install backend dependencies:
   ```bash
   cd backend
   npm install
   ```

3. Install frontend dependencies:
   ```bash
   cd frontend
   npm install
   ```

4. Install Python dependencies:
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
2. Use the visualization controls panel to:
   - Upload VTP files
   - Adjust visualization parameters
   - Control simulation playback
   - View neuron analytics

## Backend Scripts

The backend includes several Python scripts located in the `backend/scripts` directory. These scripts are used for data processing and populating necessary folders:

- **1stattempt.py**: Entry point for initializing data processing. Sets up the environment and calls other scripts as needed.

- **disable_data.py**: Processes activity data from CSV files for the disable simulation. Outputs JSON data to `backend/uploads/disable/disable_data.json`.

- **calcium_levels.py**: Processes calcium level data from CSV files. Outputs JSON data to `backend/uploads/calcium/calcium_data.json`.

- **export_vtk_all.py**: Reads neuron positions and network connections, then exports VTP files for visualization. Outputs to `backend/uploads/[simulation_name]`.

- **stimulus_color.py**: Processes stimulus and activity data from CSV files. Outputs JSON data to `backend/uploads/stimulus/stimulus_data.json`.

- **plot1_script.py**: Generates interactive plots for neuron properties and calcium levels. Outputs HTML files to `backend/uploads/[simulation_name]/plots`.

- **plot2_script.py**: Creates interactive heatmaps of connection matrices. Outputs HTML files to `backend/uploads/[simulation_name]/plots`.

- **plot3_script.py**: Combines multiple plots for plasticity changes and neuron properties. Outputs a single HTML file to `backend/uploads/[simulation_name]/plots`.

- **box_plot_calcium.py**: Combines box plots and parallel coordinates plots for calcium levels. Outputs HTML files to `backend/uploads/[simulation_name]/plots`.

### Running Scripts

To run a specific script, navigate to the `backend/scripts` directory and execute the script using Python:

```bash
python script_name.py
```

Ensure that the input directories specified in each script exist and contain the necessary data files.



