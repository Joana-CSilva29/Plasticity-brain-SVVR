import os
import pandas as pd
import numpy as np
from tqdm import tqdm
import plotly.graph_objects as go

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
            area = parts[4]       # Area name (e.g., "area_8")
            neuron_area_map[neuron_id] = area
    return neuron_area_map

def parse_network_file(network_file, neuron_area_map):
    """
    Parses the network_out file to count the number of connections between areas (undirected).
    Returns a DataFrame with connection counts.
    """
    from collections import defaultdict
    area_connections = defaultdict(int)

    if not os.path.exists(network_file):
        print(f"Network file not found: {network_file}")
        return None

    with open(network_file, "r") as f:
        for line in f:
            if line.startswith("#") or not line.strip():
                continue
            parts = line.split()
            target_id = parts[1]  # Extract target neuron ID directly
            source_id = parts[3]  # Extract source neuron ID directly

            target_area = neuron_area_map.get(target_id)
            source_area = neuron_area_map.get(source_id)

            if target_area and source_area:
                # Convert area names (e.g., 'area_8') to ints
                def area_key(a):
                    return int(a.split('_')[1]) if '_' in a and a.split('_')[1].isdigit() else a

                a1 = area_key(source_area)
                a2 = area_key(target_area)

                # Create a sorted tuple for the area pair to ensure undirected consistency
                pair = tuple(sorted((a1, a2)))
                area_connections[pair] += 1

    return area_connections

# Main execution
simulation = 'stimulus'
positions_file = f'/Users/joanacostaesilva/Desktop/Scientific Visualization and Virtual Reality /Project SVVR/viz-{simulation}/positions/rank_0_positions.txt'
neuron_area_map = parse_positions_file(positions_file)

# Define areas of interest
areas_of_interest = [(8,30), (8,34), (30,34)]

# Define the time steps you want to iterate through
# Adjust this range as needed; here we do e.g. from 0 to 300000 in steps of 10000
time_steps = range(0, 1000001, 10000)

# Initialize a dictionary to store results for each pair
results = {pair: [] for pair in areas_of_interest}

# Also store the actual timesteps
timesteps_list = []

for t in tqdm(time_steps, desc="Processing Time Steps"):
    network_file = f'/Users/joanacostaesilva/Desktop/Scientific Visualization and Virtual Reality /Project SVVR/viz-{simulation}/network/rank_0_step_{t}_out_network.txt'
    area_connections = parse_network_file(network_file, neuron_area_map)

    if area_connections is None:
        # If the file doesn't exist or can't be parsed, skip this timestep
        continue

    # Extract the number of connections for each pair of interest
    for pair in areas_of_interest:
        # pair is already sorted, just check if it exists in the dict
        count = area_connections.get(pair, 0)
        results[pair].append(count)

    timesteps_list.append(t)

# Now we have results for each pair at each time step
# Create a line plot using Plotly
fig = go.Figure()

# Add a trace for each pair
for pair in areas_of_interest:
    fig.add_trace(go.Scatter(
        x=timesteps_list,
        y=results[pair],
        mode='lines+markers',
        name=f"{pair[0]}-{pair[1]}"
    ))

fig.update_layout(
    title="Connectivity Analysis @ Stimulus Simulation",
    xaxis_title="Time Step",
    yaxis_title="Number of Synapses",
    template="plotly_dark",
    legend_title_text="Area Pairs"
)
fig.update_layout(
    title=dict(
        text="Connectivity Analysis @ Stimulus Simulation",
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

output_file = f"simulus_analysis.html"

fig.write_html(output_file)

fig.show()
