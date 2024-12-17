import pandas as pd
import os
from tqdm import tqdm  
import plotly.graph_objects as go
import numpy as np

def read_csv_safely(file_path):
    """
    Reads a CSV file with predefined column names and adds a global step column.
    """
    column_names = [
        "step", "fired", "fired_fraction", "activity", "dampening", 
        "current_calcium", "target_calcium", "synaptic_input", 
        "background_input", "grown_axons", "connected_axons", 
        "grown_dendrites", "connected_dendrites"
    ]

    try:
        df = pd.read_csv(file_path, delimiter=';', header=None, names=column_names, engine='python')
        df['step'] = df['step'].astype(int)
        df['global_step'] = df.index * 100
        return df
    except Exception as e:
        print(f"Error reading file {file_path}: {e}")
        return None

def parse_positions_file(positions_file):
    """
    Parses the positions file to map neuron IDs to their corresponding areas.
    """
    neuron_area_map = {}
    with open(positions_file, "r") as file:
        for line in file:
            if line.startswith("#") or not line.strip():
                continue
            parts = line.split()
            neuron_id = parts[0]  # Local ID
            area = parts[4]       # Area (e.g., "area_8")
            neuron_area_map[neuron_id] = area
    return neuron_area_map

def extract_neuron_properties(data_dir, target_step, neuron_area_map):
    """
    Extracts firing rate and activity properties for each neuron at the given global step.
    """
    records = []
    for neuron_id, area in neuron_area_map.items():
        file_path = os.path.join(data_dir, f"0_{neuron_id}.csv")
        if not os.path.exists(file_path):
            continue

        df = read_csv_safely(file_path)
        if df is None or df.empty:
            continue

        step_data = df[df['global_step'] == target_step]
        if step_data.empty:
            continue

        row = step_data.iloc[0]
        records.append({
            'Area': int(area.split('_')[1]),
            'Neuron_ID': neuron_id,
            'Global Step': target_step,
            'Activity': row['activity'],
            'Firing Rate': row['fired_fraction']
        })

    return pd.DataFrame(records)

def plot_firing_rate_activity_over_time(results, simulation, output_dir="plots"):
    """
    Plots the firing rate and activity over time for areas 8, 30, and 34.
    results: dictionary of form:
        {
            'Firing Rate': {area: [values over time], ...},
            'Activity': {area: [values over time], ...},
            'Time Steps': [list of timesteps]
        }
    """

    if not os.path.exists(output_dir):
        os.makedirs(output_dir)

    time_steps = results['Time Steps']
    areas = [8, 30, 34]

    fig = go.Figure()

    # Add firing rate lines
    for area in areas:
        fig.add_trace(go.Scatter(
            x=time_steps,
            y=results['Firing Rate'][area],
            mode='lines',
            name=f"Firing Rate Area {area}",
            line=dict(dash='solid')
        ))

    # Add activity lines
    for area in areas:
        fig.add_trace(go.Scatter(
            x=time_steps,
            y=results['Activity'][area],
            mode='lines',
            name=f"Activity Area {area}",
            line=dict(dash='dot')
        ))

    fig.update_layout(
        title="Firing Rate and Activity for Areas 8, 30, and 34 Over Time",
        xaxis_title="Time Step",
        yaxis_title="Value",
        template='plotly_white',
        legend_title="Metric & Area"
    )

    output_file = os.path.join(output_dir, f"firing_activity_{simulation}_over_time.html")
    fig.write_html(output_file)
    print(f"Plot saved to {output_file}")
    fig.show()

# Main execution
simulation = 'stimulus'
data_dir = f'/Users/joanacostaesilva/Desktop/Scientific Visualization and Virtual Reality /Project SVVR/viz-{simulation}/monitors_test'
positions_file = f'/Users/joanacostaesilva/Desktop/Scientific Visualization and Virtual Reality /Project SVVR/viz-{simulation}/positions/rank_0_positions.txt'
neuron_area_map = parse_positions_file(positions_file)

# Define the time steps you want to iterate over (adjust as needed)
time_steps = range(0, 1000001, 100000)  # e.g., from 0 to 1,000,000 in steps of 10,000

# Areas of interest
target_areas = [8, 30, 34]

# Initialize structures to store results
firing_rate_results = {area: [] for area in target_areas}
activity_results = {area: [] for area in target_areas}
valid_time_steps = []

for t in tqdm(time_steps, desc="Processing Time Steps"):
    neuron_df = extract_neuron_properties(data_dir, t, neuron_area_map)
    if neuron_df.empty:
        # No data at this time step, append NaNs or skip
        # For clarity, let's append NaN to keep array lengths consistent
        for area in target_areas:
            firing_rate_results[area].append(np.nan)
            activity_results[area].append(np.nan)
        continue

    # Aggregate by area
    agg_df = neuron_df.groupby('Area', as_index=False).agg({
        'Firing Rate': 'mean',
        'Activity': 'mean'
    })

    # For each target area, extract the value or NaN if not present
    current_areas = agg_df['Area'].unique()
    for area in target_areas:
        if area in current_areas:
            val = agg_df.loc[agg_df['Area'] == area]
            firing_rate_results[area].append(float(val['Firing Rate']))
            activity_results[area].append(float(val['Activity']))
        else:
            firing_rate_results[area].append(np.nan)
            activity_results[area].append(np.nan)

    valid_time_steps.append(t)

# Prepare the results dictionary
results = {
    'Time Steps': valid_time_steps,
    'Firing Rate': firing_rate_results,
    'Activity': activity_results
}

# Plot the results
plot_firing_rate_activity_over_time(results, simulation)
