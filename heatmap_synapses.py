import pandas as pd
import seaborn as sns
import matplotlib.pyplot as plt
from tqdm import tqdm
import numpy as np
import seaborn as sns
import matplotlib.pyplot as plt
import matplotlib.colors as mcolors

def parse_network_file(network_file, neuron_area_map):
    """
    Parses the network_out file to count the number of connections between areas.
    """
    from collections import defaultdict

    # Use defaultdict for dynamic counting of area connections
    area_connections = defaultdict(int)

    with open(network_file, "r") as f:
        for line in tqdm(f, desc="Parsing network file", unit="line"):
            if line.startswith("#") or not line.strip():
                continue
            parts = line.split()
            target_id = parts[1]  # Extract target neuron ID directly
            source_id = parts[3]  # Extract source neuron ID directly

            # Debugging: Check if neurons are in the map
            if target_id not in neuron_area_map:
                print(f"Warning: Target neuron ID {target_id} is not in the area map.")
            if source_id not in neuron_area_map:
                print(f"Warning: Source neuron ID {source_id} is not in the area map.")

            # Map neuron IDs to their respective areas
            target_area = neuron_area_map.get(target_id)
            source_area = neuron_area_map.get(source_id)

            if target_area and source_area:
                area_connections[(source_area, target_area)] += 1

    # Convert the area_connections to a DataFrame for visualization
    areas = sorted(set(neuron_area_map.values()))
    connection_matrix = pd.DataFrame(
        0, index=areas, columns=areas, dtype=int
    )
    for (source_area, target_area), count in area_connections.items():
        connection_matrix.loc[source_area, target_area] = count

    return connection_matrix

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


time_step = 1000000
simulation = 'disable'
positions_file = f'/Users/joanacostaesilva/Desktop/Scientific Visualization and Virtual Reality /Project SVVR/viz-{simulation}/positions/rank_0_positions.txt' # Update to your positions file path
network_file = f'/Users/joanacostaesilva/Desktop/Scientific Visualization and Virtual Reality /Project SVVR/viz-{simulation}/network/rank_0_step_{time_step}_out_network.txt' # Update to your network file path


neuron_area_map = parse_positions_file(positions_file)
connection_matrix = parse_network_file(network_file, neuron_area_map)
output_file = f"correlation_matrix_{simulation}_timestep_{time_step}.png"




def plot_correlation_matrix_ordered(connection_matrix, time_step, simulation, output_file=None):
    """
    Plots the correlation matrix as a heatmap with areas ordered numerically or alphabetically.
    Only displays the lower triangular part (excluding diagonal) and saves the figure.
    """
    # Sort areas numerically if they contain numbers, otherwise alphabetically
    ordered_areas = sorted(
        connection_matrix.index,
        key=lambda x: int(x.split('_')[1]) if '_' in x and x.split('_')[1].isdigit() else x
    )

    # Reindex the matrix with the ordered areas
    connection_matrix = connection_matrix.reindex(index=ordered_areas, columns=ordered_areas, fill_value=0)

    # Format area labels to make them nicer (e.g., "Area ID 1")
    formatted_labels = [f"Area {int(area.split('_')[1])}" if '_' in area else area for area in ordered_areas]

    # Create a mask for the upper triangular part, including the diagonal
    mask = np.triu(np.ones_like(connection_matrix, dtype=bool))  # Mask for upper triangle and diagonal

    # Extract values excluding the upper triangular part for gradient adjustment
    values_without_upper_triangle = connection_matrix.values[~mask]

    # Get the minimum and maximum values, excluding the upper triangular part
    vmin = 0  # Ensure zero is included in the gradient
    vmax = values_without_upper_triangle.max()  # Largest value in the lower triangular part

    # Define a smooth colormap from white to blue
    cmap = mcolors.LinearSegmentedColormap.from_list(
        "white_to_blue", 
        ["white", "#c7e9b4", "#41b6c4", "#2c7fb8", "#253494"]  # White to Blue gradient
    )
    
    plt.figure(figsize=(12, 10))
    sns.heatmap(
        connection_matrix,
        mask=mask,  # Mask for upper triangular part and diagonal
        annot=False,  # Do not annotate cells with values
        cmap=cmap,  # Custom colormap
        linewidths=0.5,  # Add grid lines
        cbar_kws={"label": "Number of Connections"},  # Label for colorbar
        vmin=vmin,  # Minimum value for the gradient
        vmax=vmax,  # Maximum value for the gradient
        xticklabels=formatted_labels,  # Use formatted labels for x-axis
        yticklabels=formatted_labels,  # Use formatted labels for y-axis
    )
    plt.title(f'Disabled Simulation @ Time Step {time_step}', fontsize=16, pad=20)
    plt.xlabel("Target Area ", fontsize=12)
    plt.ylabel("Source Area ", fontsize=12)
    plt.xticks(rotation=45, ha="right", fontsize=10)
    plt.yticks(fontsize=10)
    plt.tight_layout()

    if output_file:
        plt.savefig(output_file, dpi=300)  # Save with high quality
        print(f"Ordered correlation plot saved to {output_file}")

    plt.show()


plot_correlation_matrix_ordered(connection_matrix, time_step, simulation, output_file)
