import os
import pandas as pd
import numpy as np
from tqdm import tqdm
import plotly.graph_objects as go
from collections import defaultdict

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
            neuron_id = parts[0]  # Local neuron ID
            area = parts[4]       # e.g., "area_8"
            neuron_area_map[neuron_id] = area
    return neuron_area_map

def parse_network_file(network_file, neuron_area_map):
    """
    Parses the network_out file and returns a dictionary mapping each area (int)
    to its total number of connections at this time step.

    For each connection:
    - Extract the two areas involved.
    - Increment the connection count for both areas by 1.

    Returns:
       area_connection_counts: dict {area_int: connection_count}
    """
    if not os.path.exists(network_file):
        return None

    def area_key(a):
        # Convert 'area_x' to an integer x
        return int(a.split('_')[1]) if '_' in a and a.split('_')[1].isdigit() else a

    area_connection_counts = defaultdict(int)

    with open(network_file, "r") as f:
        for line in f:
            if line.startswith("#") or not line.strip():
                continue
            parts = line.split()
            target_id = parts[1]  # Target neuron ID
            source_id = parts[3]  # Source neuron ID

            target_area = neuron_area_map.get(target_id)
            source_area = neuron_area_map.get(source_id)

            if target_area and source_area:
                a1 = area_key(source_area)
                a2 = area_key(target_area)
                # Each connection increments both involved areas
                area_connection_counts[a1] += 1
                area_connection_counts[a2] += 1

    return area_connection_counts

# ----------------------------------------------------
# Main execution
# ----------------------------------------------------
simulation = 'disable'  # Adjust if needed
positions_file = f'/Users/joanacostaesilva/Desktop/Scientific Visualization and Virtual Reality /Project SVVR/viz-{simulation}/positions/rank_0_positions.txt'
neuron_area_map = parse_positions_file(positions_file)

# Determine the time steps to process
time_steps = range(0, 1000001, 10000)  # Adjust as needed

# We'll track all areas as we discover them at time steps
all_areas = set()

# First pass: identify all areas
for area_name in neuron_area_map.values():
    # Convert area_x to int
    area_id = int(area_name.split('_')[1])
    all_areas.add(area_id)

# Initialize a dictionary to store time-series data for all areas
results_all_areas = {area: [] for area in all_areas}
timesteps_used = []

for t in tqdm(time_steps, desc="Processing Time Steps"):
    network_file = f'/Users/joanacostaesilva/Desktop/Scientific Visualization and Virtual Reality /Project SVVR/viz-{simulation}/network/rank_0_step_{t}_out_network.txt'
    area_connection_counts = parse_network_file(network_file, neuron_area_map)

    if area_connection_counts is None:
        # If the file doesn't exist or can't be parsed, skip this timestep
        continue

    # Record results for all areas. If an area isn't present in area_connection_counts,
    # it means no connections were found for that area this step, so we record 0.
    for area in all_areas:
        results_all_areas[area].append(area_connection_counts.get(area, 0))

    timesteps_used.append(t)

# ----------------------------------------------------
# Plotting
# ----------------------------------------------------
fig = go.Figure()

for area in sorted(results_all_areas.keys()):
    fig.add_trace(go.Scatter(
        x=timesteps_used,
        y=results_all_areas[area],
        mode='lines',
        name=f"Area {area}"
    ))

fig.update_layout(
    title="Total Connections per area @ Disable Simulation",
    xaxis_title="Time Step",
    yaxis_title="Number of Synapses",
    template="plotly_dark",
    legend_title_text="Areas",
    hovermode="x"
)
fig.update_layout(
    title=dict(
        text="Total Connections per area @ Disable Simulation",
        font=dict(size=24)  # Increase the title font size
    ),
    xaxis=dict(
        title=dict(text="Time Step", font=dict(size=18)),  # Increase x-axis title font size
        tickfont=dict(size=14)  # Increase x-axis tick font size
    ),
    yaxis=dict(
        title=dict(text="Number of Synapses", font=dict(size=18)),  # Increase y-axis title font size
        tickfont=dict(size=14)  # Increase y-axis tick font size
    ),
    legend=dict(
        title=dict(text="Areas", font=dict(size=16)),  # Increase legend title font size
        font=dict(size=14)  # Increase legend entry font size
    ),
    template="plotly_dark",
    hovermode="x"
)

output_file = f"disabled_analysis.html"

fig.write_html(output_file)

fig.show()
