import csv
import json
import glob
import os
from pathlib import Path

def process_calcium_data(input_dir, output_file):
    """
    Process calcium level data from CSV files.
    Each row represents a 100-step increment, regardless of the timestep column.
    Export timesteps 0, 10000, 20000, etc.
    All values are rounded to 4 decimal places.
    """
    if not os.path.exists(input_dir):
        print(f"Input directory does not exist: {input_dir}")
        return
        
    print(f"Scanning directory: {input_dir}")
    
    # Dictionary to store calcium data
    calcium_data = {
        "timesteps": [],
        "areas": {}
    }
    
    # Pre-define the timesteps we want (every 10000th step)
    step_size = 10000
    row_step = 100  # Each row represents 100 timesteps
    
    csv_files = sorted(glob.glob(os.path.join(input_dir, "*.csv")))
    if not csv_files:
        print("No CSV files found in the input directory!")
        return
        
    print(f"Found {len(csv_files)} CSV files")
    
    # First, determine the number of rows from a sample file
    with open(csv_files[0], 'r') as f:
        total_rows = sum(1 for _ in f)
    
    max_timestep = (total_rows - 1) * row_step  # -1 because we start at 0
    calcium_data["timesteps"] = list(range(0, max_timestep + 1, step_size))
    num_timesteps = len(calcium_data["timesteps"])
    
    print(f"Each file has {total_rows} rows (representing timesteps 0 to {max_timestep})")
    print(f"Will process {num_timesteps} timesteps (every {step_size} steps)")
    
    # Load area mapping
    area_mapping = {}
    try:
        with open("backend/uploads/info/area-info.txt", 'r') as f:
            for line in f:
                if line.startswith('#') or not line.strip():
                    continue
                parts = line.strip().split()
                if len(parts) >= 5 and parts[4].startswith('area_'):
                    neuron_id = int(parts[0])
                    area_id = parts[4]
                    area_mapping[neuron_id] = area_id
    except Exception as e:
        print(f"Error loading area mapping: {e}")
        return

    # Initialize area data structures
    area_neurons = {}
    for csv_file in csv_files:
        try:
            neuron_id = int(Path(csv_file).stem.split('_')[1]) + 1
            area_id = area_mapping.get(neuron_id)
            if area_id:
                if area_id not in area_neurons:
                    area_neurons[area_id] = []
                area_neurons[area_id].append(csv_file)
        except Exception as e:
            print(f"Error processing file {csv_file}: {e}")
            continue
    
    # Process each area
    for area_id, neuron_files in area_neurons.items():
        print(f"Processing area {area_id} ({len(neuron_files)} neurons)")
        
        calcium_sums = [0.0] * num_timesteps
        target_sum = 0.0
        valid_neurons = 0
        
        for csv_file in neuron_files:
            try:
                with open(csv_file, 'r') as f:
                    reader = csv.reader(f, delimiter=';')
                    rows = list(reader)
                    
                    if len(rows) != total_rows:
                        print(f"Warning: {csv_file} has {len(rows)} rows instead of {total_rows}")
                        continue
                        
                    valid_neurons += 1
                    target_sum += float(rows[0][6])
                    
                    # Process each timestep we want (every 10000th)
                    for i, target_timestep in enumerate(range(0, max_timestep + 1, step_size)):
                        row_index = target_timestep // row_step  # Convert timestep to row index
                        try:
                            calcium_sums[i] += float(rows[row_index][5])
                        except Exception as e:
                            print(f"Error processing timestep {target_timestep} (row {row_index}) in {csv_file}: {e}")
                            continue
                        
            except Exception as e:
                print(f"Error reading file {csv_file}: {e}")
                continue
        
        if valid_neurons == 0:
            print(f"Warning: No valid neurons processed for area {area_id}")
            continue
            
        # Calculate averages
        calcium_data["areas"][area_id] = {
            "calcium_levels": [round(sum_val / valid_neurons, 4) for sum_val in calcium_sums],
            "target_calcium": round(target_sum / valid_neurons, 4),
            "neuron_count": valid_neurons
        }
    
    # Round timesteps to 4 decimal places
    calcium_data["timesteps"] = [round(float(t), 4) for t in calcium_data["timesteps"]]
    
    # Save to JSON file
    print("\nSaving data to JSON file...")
    os.makedirs(os.path.dirname(output_file), exist_ok=True)
    with open(output_file, 'w') as f:
        json.dump(calcium_data, f)
    
    # Print statistics
    print(f"\nProcessing complete!")
    print(f"Processed {len(area_neurons)} areas")
    print(f"Number of timesteps in output: {len(calcium_data['timesteps'])}")
    print(f"First timestep: {calcium_data['timesteps'][0]}")
    print(f"Last timestep: {calcium_data['timesteps'][-1]}")
    print(f"Step size: {calcium_data['timesteps'][1] - calcium_data['timesteps'][0]}")
    print(f"Output saved to: {output_file}")

if __name__ == "__main__":
    input_directory = "/Volumes/Extreme SSD/SciVis Project 2023/SciVisContest23/viz-calcium/monitors"
    output_file = "backend/uploads/calcium/calcium_data.json"
    
    process_calcium_data(input_directory, output_file)
