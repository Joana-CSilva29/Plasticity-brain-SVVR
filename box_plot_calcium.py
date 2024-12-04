import pandas as pd
import os
import matplotlib.pyplot as plt
from collections import defaultdict

def read_csv_safely(file_path):
    """
    Safely reads a CSV file and skips problematic lines.
    """
    try:
        column_names = [
            "step", "fired", "fired_fraction", "activity", "dampening",
            "current_calcium", "target_calcium", "synaptic_input", 
            "background_input", "grown_axons", "connected_axons", 
            "grown_dendrites", "connected_dendrites"
        ]
        df = pd.read_csv(file_path, sep=';', header=None, names=column_names, usecols=range(13), on_bad_lines='skip')
        return df
    except pd.errors.ParserError as e:
        print(f"Error reading {file_path}: {e}")
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
            area = parts[4]       # Area
            neuron_area_map[neuron_id] = area
    return neuron_area_map

def extract_calcium_per_area(data_dir, target_step, neuron_area_map):
    """
    Extracts calcium values for each neuron and maps them to their areas.
    """
    calcium_data = defaultdict(list)
    area_data = defaultdict(list)

    for neuron_id, area in neuron_area_map.items():
        file_path = os.path.join(data_dir, f"0_{neuron_id}.csv")
        
        if not os.path.exists(file_path):
            print(f"File not found: {file_path}")
            continue

        df = read_csv_safely(file_path)
        if df is None:
            print(f"Skipping file: {file_path}")
            continue

        # Filter data for the chosen time step
        step_data = df[df['step'] == target_step]
        if not step_data.empty:
            calcium_value = step_data.iloc[0]['current_calcium']
            calcium_data[area].append(calcium_value)
            area_data[area].append(neuron_id)

    return area_data, calcium_data

def plot_boxplot(area_data, calcium_data, target_step, output_dir="plots"):
    """
    Plots a boxplot for calcium values by area and saves it with the target step in the filename.
    """
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)

    areas = sorted(calcium_data.keys())
    data = [calcium_data[area] for area in areas]

    plt.figure(figsize=(15, 6))
    plt.boxplot(data, 
            positions=range(len(areas)), 
            patch_artist=True, 
            showmeans=True,  # Show mean line
            flierprops=dict(marker='^', color='green', markersize=10),  # Customize outliers
            meanprops=dict(color='black', linewidth=2)) 
    area_numbers = [int(area.split('_')[1]) for area in areas]
    plt.xticks(range(len(areas)), area_numbers, rotation=0)
    plt.xlabel("Area ID")
    plt.ylabel("Calcium")
    plt.title(f"Calcium per Area (Step {target_step})")

    # Save the plot
    output_file = os.path.join(output_dir, f"calcium_boxplot_step_{target_step}.png")
    plt.savefig(output_file, dpi=300)
    print(f"Plot saved to {output_file}")
    plt.show()

# Main execution
data_dir = "/Users/joanacostaesilva/Desktop/Scientific Visualization and Virtual Reality /Project SVVR/viz-no-network/monitors"
positions_file = "/Users/joanacostaesilva/Desktop/Scientific Visualization and Virtual Reality /Project SVVR/viz-no-network/positions/rank_0_positions.txt"
target_step = 100  # Change to your desired time step

# Parse positions file to create neuron-to-area mapping
neuron_area_map = parse_positions_file(positions_file)

# Extract calcium data
area_data, calcium_data = extract_calcium_per_area(data_dir, target_step, neuron_area_map)

# Plot and save boxplot
plot_boxplot(area_data, calcium_data, target_step)
