#!/usr/bin/env python3

import os
import pandas as pd
import numpy as np
from tqdm import tqdm
import plotly.graph_objects as go
from collections import defaultdict

def parse_positions_file(positions_file):
    """
    Parses the positions file to map neuron IDs to their corresponding areas.
    
    Parameters:
        positions_file (str): Path to the positions file.
        
    Returns:
        dict: A dictionary mapping neuron IDs to area names.
    """
    neuron_area_map = {}
    with open(positions_file, "r") as file:
        for line in file:
            if line.startswith("#") or not line.strip():
                continue
            parts = line.split()
            if len(parts) < 5:
                continue  # Skip malformed lines
            neuron_id = parts[0]  # Local neuron ID
            area = parts[4]       # Area name (e.g., "area_8")
            neuron_area_map[neuron_id] = area
    return neuron_area_map

def parse_network_file(network_file, neuron_area_map):
    """
    Parses the network_out file to count the number of connections between areas (undirected).
    
    Parameters:
        network_file (str): Path to the network file.
        neuron_area_map (dict): Mapping of neuron IDs to area names.
        
    Returns:
        defaultdict: A dictionary with area pair tuples as keys and connection counts as values.
    """
    area_connections = defaultdict(int)

    if not os.path.exists(network_file):
        print(f"Network file not found: {network_file}")
        return None

    with open(network_file, "r") as f:
        for line in f:
            if line.startswith("#") or not line.strip():
                continue
            parts = line.split()
            if len(parts) < 4:
                continue  # Skip malformed lines
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

def create_output_directory(simType):
    """
    Creates the output directory for plots based on the simulation type.
    
    Parameters:
        simType (str): The type of simulation.
        
    Returns:
        str: Path to the created output directory.
    """
    output_dir = f"/Users/joanacostaesilva/Desktop/Scientific Visualization and Virtual Reality/Plasticity-brain-SVVR/visualisation_app/backend/uploads/{simType}/plots"
    os.makedirs(output_dir, exist_ok=True)
    return output_dir

def get_simulation_paths():
    """
    Defines the paths for different simulation types.
    
    Returns:
        dict: A dictionary mapping simulation types to their respective directories.
    """
    simulations = {
        'no-network': '/Users/joanacostaesilva/Desktop/Scientific Visualization and Virtual Reality/Project SVVR/viz-no-network/',
        'disabled': '/Users/joanacostaesilva/Desktop/Scientific Visualization and Virtual Reality/Project SVVR/viz-disable/',
        'calcium': '/Users/joanacostaesilva/Desktop/Scientific Visualization and Virtual Reality/Project SVVR/viz-calcium/',
        'stimulus': '/Users/joanacostaesilva/Desktop/Scientific Visualization and Virtual Reality /Project SVVR/viz-stimulus/',
    }
    return simulations

def generate_connectivity_plot_per_timestep(simType, simulation_path, neuron_area_map, areas_of_interest, time_steps, output_dir):
    """
    Generates and saves a connectivity plot for each timestep in the given simulation.
    
    Parameters:
        simType (str): The type of simulation.
        simulation_path (str): Path to the simulation directory.
        neuron_area_map (dict): Mapping of neuron IDs to area names.
        areas_of_interest (list): List of area pairs to analyze.
        time_steps (range): Range of time steps to process.
        output_dir (str): Directory to save the output plots.
    """
    # Initialize a dictionary to store cumulative results for each pair
    cumulative_results = {pair: 0 for pair in areas_of_interest}
    
    for t in tqdm(time_steps, desc=f"Processing Time Steps for {simType}"):
        network_file = os.path.join(simulation_path, f"network/rank_0_step_{t}_out_network.txt")
        area_connections = parse_network_file(network_file, neuron_area_map)

        if area_connections is None:
            # If the file doesn't exist or can't be parsed, skip this timestep
            continue

        # Update cumulative connections for each pair of interest
        for pair in areas_of_interest:
            count = area_connections.get(pair, 0)
            cumulative_results[pair] += count

        # Generate plot for the current timestep
        fig = go.Figure()

        # Add a trace for each pair
        for pair in areas_of_interest:
            fig.add_trace(go.Bar(
                x=[f"{pair[0]}-{pair[1]}"],
                y=[cumulative_results[pair]],
                name=f"{pair[0]}-{pair[1]}"
            ))

        # Update layout
        fig.update_layout(
            title={
                "text": f"Connectivity Analysis @ Timestep {t} ({simType.capitalize()} Simulation)",
                "font": {"size": 24}
            },
            xaxis={
                "title": {"text": "Area Pairs", "font": {"size": 18}},
                "tickfont": {"size": 14}
            },
            yaxis={
                "title": {"text": "Cumulative Number of Synapses", "font": {"size": 18}},
                "tickfont": {"size": 14}
            },
            legend={
                "title": {"text": "Area Pairs", "font": {"size": 16}},
                "font": {"size": 14}
            },
            template="plotly_dark",
            hovermode="x"
        )

        # Define the output file with the current timestep
        output_file = os.path.join(output_dir, f"plot3_{t}.html")

        fig.write_html(output_file)
        print(f"Plot saved to {output_file} in the directory {output_dir}")



def main():
    """
    Main function to execute the connectivity analysis and plotting for specified simulations.
    """
    # Define the simulation type you want to process
    simType = 'stimulus'  # Change this to process a different simulation
    
    # Get all simulation paths
    simulations = get_simulation_paths()
    
    # Check if simType is valid
    if simType not in simulations:
        print(f"Simulation type '{simType}' is not recognized. Available types: {list(simulations.keys())}")
        return
    
    simulation_path = simulations[simType]
    
    # Define the positions file path
    positions_file = os.path.join(simulation_path, 'positions/rank_0_positions.txt')
    
    if not os.path.exists(positions_file):
        print(f"Positions file not found: {positions_file}")
        return
    
    # Parse the positions file to get neuron to area mapping
    neuron_area_map = parse_positions_file(positions_file)
    
    # Define areas of interest as list of tuples (sorted)
    areas_of_interest = [(8,30), (8,34), (30,34)]
    
    # Define the time steps you want to iterate through
    # Adjust this range as needed; here we do from 0 to 1,000,000 in steps of 10,000
    time_steps = range(0, 1000001, 10000)
    
    # Create the output directory for plots
    output_dir = create_output_directory(simType)
    
    # Generate connectivity plots for each timestep
    generate_connectivity_plot_per_timestep(
        simType=simType,
        simulation_path=simulation_path,
        neuron_area_map=neuron_area_map,
        areas_of_interest=areas_of_interest,
        time_steps=time_steps,
        output_dir=output_dir
    )

if __name__ == "__main__":
    main()
