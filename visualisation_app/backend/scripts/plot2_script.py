# plot2_script.py

import os
from tqdm import tqdm
import pandas as pd
import numpy as np
import matplotlib.colors as mcolors
import plotly.graph_objects as go
from tqdm import tqdm

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
            area = parts[4]       # Area name
            neuron_area_map[neuron_id] = area
    return neuron_area_map

def parse_network_file(network_file, neuron_area_map):
    """
    Parses the network_out file to count the number of connections between areas.
    This version makes the connection matrix symmetrical.
    """
    from collections import defaultdict
    area_connections = defaultdict(int)

    with open(network_file, "r") as f:
        for line in tqdm(f, desc="Parsing network file", unit="line"):
            if line.startswith("#") or not line.strip():
                continue
            parts = line.split()
            target_id = parts[1]  # Extract target neuron ID directly
            source_id = parts[3]  # Extract source neuron ID directly

            if target_id not in neuron_area_map:
                print(f"Warning: Target neuron ID {target_id} is not in the area map.")
            if source_id not in neuron_area_map:
                print(f"Warning: Source neuron ID {source_id} is not in the area map.")

            target_area = neuron_area_map.get(target_id)
            source_area = neuron_area_map.get(source_id)

            if target_area and source_area:
                # Create a key that doesn't depend on direction
                def area_key(a):
                    return int(a.split('_')[1]) if '_' in a and a.split('_')[1].isdigit() else a

                if area_key(source_area) < area_key(target_area):
                    key = (source_area, target_area)
                else:
                    key = (target_area, source_area)
                area_connections[key] += 1

    # Sort the areas
    areas = sorted(
        set(neuron_area_map.values()),
        key=lambda x: int(x.split('_')[1]) if '_' in x and x.split('_')[1].isdigit() else x
    )

    connection_matrix = pd.DataFrame(0, index=areas, columns=areas, dtype=int)

    # Fill the matrix symmetrically
    for (a1, a2), count in area_connections.items():
        connection_matrix.loc[a1, a2] = count
        connection_matrix.loc[a2, a1] = count

    return connection_matrix


def plot_correlation_matrix_ordered(connection_matrix, time_step, simulation, output_file=None):
    """
    Plots the correlation matrix as an interactive heatmap with Plotly.
    Only displays the lower triangular part (excluding diagonal).
    """
    # Ensure correct ordering of areas
    ordered_areas = sorted(
        connection_matrix.index,
        key=lambda x: int(x.split('_')[1]) if '_' in x and x.split('_')[1].isdigit() else x
    )
    connection_matrix = connection_matrix.reindex(index=ordered_areas, columns=ordered_areas, fill_value=0)

    # Format area labels
    formatted_labels = [f"Area {int(area.split('_')[1])}" if '_' in area else area for area in ordered_areas]

    # Create a mask for upper triangle including diagonal
    mask = np.triu(np.ones_like(connection_matrix, dtype=bool))
    # Replace upper triangle (and diagonal) with NaN to hide them
    masked_values = connection_matrix.where(~mask, np.nan)

    # Define a color scale suitable for a dark theme (avoid white)
    # For example: start near black and move to a brighter blue
    colors = ["#000000", "#003f5c", "#2c7fb8", "#7fcdbb"]  # dark to lighter tealish-blue
    colorscale = [[i/(len(colors)-1), c] for i, c in enumerate(colors)]

    # Determine vmin, vmax excluding NaNs
    valid_values = masked_values.stack()
    vmin = 0
    vmax = valid_values.max() if not valid_values.empty else 0

    fig = go.Figure(data=go.Heatmap(
        z=masked_values.values,
        x=formatted_labels,
        y=formatted_labels,
        colorscale=colorscale,
        zmin=vmin,
        zmax=vmax,
        hoverongaps=False,
        colorbar=dict(title="Number of Synapses", tickcolor='white', titlefont_color='white'),
        xgap=0,
        ygap=0
    ))

    fig.update_layout(
        title=dict(
            text=f'Stimulus Simulation @ Time Step {time_step}',
            font=dict(color='white')
        ),
        xaxis=dict(
            title="Area", 
            tickangle=45, 
            showgrid=False, 
            zeroline=False, 
            showline=False,
            tickfont=dict(color='white'), 
            titlefont=dict(color='white')
        ),
        yaxis=dict(
            title="Area", 
            autorange='reversed', 
            showgrid=False, 
            zeroline=False, 
            showline=False,
            tickfont=dict(color='white'), 
            titlefont=dict(color='white')
        ),
        template='plotly_dark',
        paper_bgcolor='black',
        plot_bgcolor='black'
    )

    if output_file:
        fig.write_html(output_file)
        print(f"Interactive correlation plot saved to {output_file}")





simType = 'stimulus'  # Change to your simulation type
positions_file = f'/Users/joanacostaesilva/Desktop/Scientific Visualization and Virtual Reality /Project SVVR/viz-{simType}/positions/rank_0_positions.txt'
network_dir = f'/Users/joanacostaesilva/Desktop/Scientific Visualization and Virtual Reality /Project SVVR/viz-{simType}/network'


base_dir = f"/Users/joanacostaesilva/Desktop/Scientific Visualization and Virtual Reality /Plasticity-brain-SVVR/visualisation_app/backend/uploads/{simType}"
plots_dir = os.path.join(base_dir, "plots")

# Create the directories if they don't exist
os.makedirs(plots_dir, exist_ok=True)

# Parse positions file
neuron_area_map = parse_positions_file(positions_file)

# Generate plots from 0 to 1,000,000 in steps of 10,000
for time_step in range(0, 1000001, 10000):
    network_file = os.path.join(network_dir, f"rank_0_step_{time_step}_out_network.txt")
    if not os.path.exists(network_file):
        print(f"No network file for step {time_step}. Skipping.")
        continue

    connection_matrix = parse_network_file(network_file, neuron_area_map)

    # Output filename in the 'plots' directory
    output_file = os.path.join(plots_dir, f"plot2_{time_step}.html")

    plot_correlation_matrix_ordered(connection_matrix, time_step, simType, output_file=output_file)

    print(f"Plot 2 generated for step {time_step}: {output_file}")
