import pandas as pd
import os
from tqdm import tqdm  
import plotly.express as px
import plotly.graph_objects as go
from plotly.subplots import make_subplots



def read_csv_safely(file_path):
    """
    Reads a CSV file with predefined column names and adds a global step column.
    Attempts to convert certain columns to numeric, coercing errors.
    """
    column_names = [
        "step", "fired", "fired_fraction", "activity", "dampening", 
        "current_calcium", "target_calcium", "synaptic_input", 
        "background_input", "grown_axons", "connected_axons", 
        "grown_dendrites", "connected_dendrites"
    ]

    try:
        df = pd.read_csv(file_path, delimiter=';', header=None, names=column_names, engine='python')
        df['step'] = pd.to_numeric(df['step'], errors='coerce')
        # Convert the growth and connection columns to numeric
        numeric_cols = ["fired_fraction", "current_calcium", "target_calcium", "synaptic_input",
                        "background_input", "grown_axons", "connected_axons", "grown_dendrites", "connected_dendrites"]
        for col in numeric_cols:
            df[col] = pd.to_numeric(df[col], errors='coerce')

        # Drop rows that have NaN in critical columns if needed
        # (e.g. grown_axons and grown_dendrites must be numeric)
        df = df.dropna(subset=["grown_axons", "grown_dendrites"])

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
            area = parts[4]       # Area
            neuron_area_map[neuron_id] = area
    return neuron_area_map




def extract_neuron_properties(data_dir, target_step, neuron_area_map):
    """
    Extracts calcium, growth, and connectivity properties for each neuron, with a progress bar.
    Handles non-numeric values by skipping those neurons.
    """
    records = []

    for neuron_id, area in tqdm(neuron_area_map.items(), desc="Processing Neurons", unit="neuron"):
        file_path = os.path.join(data_dir, f"0_{neuron_id}.csv")
        if not os.path.exists(file_path):
            print(f"File not found: {file_path}")
            continue

        df = read_csv_safely(file_path)
        if df is None or df.empty:
            print(f"No data found in file for Neuron {neuron_id}")
            continue

        # Filter for the target global step
        step_data = df[df['global_step'] == target_step]

        if step_data.empty:
            print(f"No data for Neuron {neuron_id} at global_step {target_step}")
            continue

        # Extract the row for the target step
        row = step_data.iloc[0]

        # Check if the columns needed are numeric
        if pd.isna(row['grown_axons']) or pd.isna(row['grown_dendrites']):
            print(f"Invalid numeric data for Neuron {neuron_id} at global_step {target_step}, skipping.")
            continue

        records.append({
            'Area': int(area.split('_')[1]),
            'Neuron_ID': neuron_id,
            'Global Step': target_step,
            'Calcium': row['current_calcium'],
            'Firing Rate': row['fired_fraction'],
            'Grown Axons': row['grown_axons'],
            'Connected Axons': row['connected_axons'],
            'Grown Dendrites': row['grown_dendrites'],
            'Connected Dendrites': row['connected_dendrites'],
            'Total Growth': float(row['grown_axons']) + float(row['grown_dendrites']),
            'Total Connections': float(row['connected_axons']) + float(row['connected_dendrites'])
        })

    if not records:
        print("No data found for the specified global step.")
    return pd.DataFrame(records)




def plot_combined_parallel_and_box(neuron_df, target_step, simulation, output_dir="plots"):
    """
    Combines a box plot for Calcium levels by Area and a parallel coordinates plot for averages per Area
    with normalized column scales (min to max of each column) and interactive filtering using buttons.
    """
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)

    # Ensure 'Area' is treated as a string for consistent grouping
    neuron_df['Area'] = neuron_df['Area'].apply(str)

    # Sort neuron_df by Area
    neuron_df = neuron_df.sort_values(by='Area', key=lambda col: col.astype(int))

    # Select only numeric columns for averaging
    numeric_columns = ['Calcium', 'Firing Rate', 'Grown Axons', 'Grown Dendrites']
    avg_df = neuron_df.groupby('Area', as_index=False)[numeric_columns].mean()

    # Create the box plot
    box_trace = go.Box(
        x=neuron_df['Area'],
        y=neuron_df['Calcium'],
        name="Calcium Levels",
        boxmean=True,
        marker=dict(color="lightblue")
    )

    # Prepare parallel coordinates dimensions with min-max scaling for each column
    dimensions = [
        dict(
            label="Area ID",
            values=avg_df['Area'].astype(int),
            range=[avg_df['Area'].astype(int).min(), avg_df['Area'].astype(int).max()]
        )
    ]

    for col in numeric_columns:
        col_min = avg_df[col].min()
        col_max = avg_df[col].max()
        dimensions.append(
            dict(
                label=col,
                values=avg_df[col],
                range=[col_min, col_max]  # Scale each column from its min to max value
            )
        )

    # Create the parallel coordinates plot
    parcoords_trace = go.Parcoords(
        line=dict(color=avg_df['Calcium'], colorscale='Viridis'),
        dimensions=dimensions
    )

    # Combine the two plots
    combined_fig = make_subplots(
        rows=2, cols=1,
        subplot_titles=[
            f"Neuron Properties (Time step: {target_step})",
            f"Calcium Levels by Area (Time step: {target_step})"
        ],
        vertical_spacing=0.25,  # Add more space between plots
        specs=[[{"type": "domain"}], [{"type": "xy"}]]
    )

    # Add parallel coordinates plot to the first row
    combined_fig.add_trace(parcoords_trace, row=1, col=1)

    # Add box plot to the second row
    combined_fig.add_trace(box_trace, row=2, col=1)

    # Add x-axis and y-axis labels for the box plot
    combined_fig.update_xaxes(
        title_text="Area ID",
        row=2,
        col=1,
        title_font=dict(size=14),
        tickfont=dict(size=12)
    )
    combined_fig.update_yaxes(
        title_text="Calcium",
        row=2,
        col=1,
        title_font=dict(size=14),
        tickfont=dict(size=12)
    )

    # Add interactive buttons for filtering
    area_options = avg_df['Area'].astype(int).tolist()
    buttons = []

    for area in area_options:
        buttons.append(
            dict(
                label=f"Area {area}",
                method="restyle",
                args=[
                    {
                        "dimensions[0].constraintrange": [[area - 0.5, area + 0.5]],  # Filter for this area
                        "line.color": avg_df.loc[avg_df['Area'] == str(area), 'Calcium']
                    }
                ]
            )
        )

    # Add reset button
    buttons.append(
        dict(
            label="All Areas",
            method="restyle",
            args=[
                {
                    "dimensions[0].constraintrange": None  # Reset to show all areas
                }
            ]
        )
    )

    # Update layout with dark theme and styling
    combined_fig.update_layout(
        template='plotly_dark',
        updatemenus=[
            dict(
                buttons=buttons,
                direction="down",
                showactive=True,
                x=0.85,
                xanchor="center",
                y=1.2,
                yanchor="top",
                bordercolor="white",
                borderwidth=1
            )
        ],
        annotations=[
            dict(
                text=f"<b>Neuron Properties @Time step {target_step}</b>",
                x=0.5,
                y=1.15,
                xref="paper",
                yref="paper",
                showarrow=False,
                font=dict(size=18, family="Arial")
            ),
            dict(
                text=f"<b>Calcium Levels by Area @Time step {target_step}</b>",
                x=0.5,
                y=0.45,
                xref="paper",
                yref="paper",
                showarrow=False,
                font=dict(size=18, family="Arial")
            )
        ],
        font=dict(size=14),
        height=1000,
        margin=dict(t=200, b=50, l=50, r=50),
        showlegend=False
    )

    # Save the plot as an HTML file
    output_file = os.path.join(output_dir, f"Box_plot_{simulation}_step_{target_step}.html")
    combined_fig.write_html(output_file)
    print(f"Interactive Combined Plot saved to {output_file}")

    # Show the plot
    combined_fig.show()



# Main execution
target_step = 0
simulation = 'stimulus'
data_dir = f'/Volumes/Extreme SSD/SciVis Project 2023/SciVisContest23/viz-{simulation}/monitors'
positions_file = f'/Volumes/Extreme SSD/SciVis Project 2023/SciVisContest23/viz-{simulation}/positions/rank_0_positions.txt'

# Change to your desired global step

# Parse positions file to create neuron-to-area mapping
neuron_area_map = parse_positions_file(positions_file)

# Extract neuron properties as a DataFrame
neuron_df = extract_neuron_properties(data_dir, target_step, neuron_area_map)
print(neuron_df.head(), neuron_df.tail())
plot_combined_parallel_and_box(neuron_df, target_step,simulation)

