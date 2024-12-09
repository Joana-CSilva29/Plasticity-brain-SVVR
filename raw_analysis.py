import plotly.graph_objects as go
import pandas as pd
import plotly.subplots as sp
import plotly.graph_objects as go
import numpy as np


def read_plasticity_changes(file_path):
    """
    Reads plasticity changes file and extracts steps, creations, deletions, and net changes.
    """
    steps, creations, deletions, net_changes = [], [], [], []
    try:
        with open(file_path, 'r') as file:
            for line in file:
                if line.startswith('#') or not line.strip():
                    continue
                data = line.strip().replace(':', '').split()
                steps.append(int(data[0]))
                creations.append(int(data[1]))
                deletions.append(int(data[2]))
                net_changes.append(int(data[3]))
    except FileNotFoundError:
        print(f"File {file_path} not found.")
        return None, None, None, None
    return steps, creations, deletions, net_changes


def read_neurons_with_std(file_path):
    """
    Reads neurons overview file and extracts key metrics including standard deviation.
    """
    steps = []
    calcium_avg, calcium_std = [], []
    axons_avg, axons_std = [], []
    axons_c_avg, axons_c_std = [], []
    den_ex_avg, den_ex_std = [], []

    try:
        with open(file_path, 'r') as file:
            for line in file:
                if line.startswith('#') or not line.strip():
                    continue
                data = line.strip().split()
                steps.append(int(data[0]))
                calcium_avg.append(float(data[1]))
                calcium_std.append(float(data[5]))
                axons_avg.append(float(data[6]))
                axons_std.append(float(data[10]))
                axons_c_avg.append(float(data[11]))
                axons_c_std.append(float(data[15]))
                den_ex_avg.append(float(data[16]))
                den_ex_std.append(float(data[20]))
    except FileNotFoundError:
        print(f"File {file_path} not found.")
        return None, None, None, None, None, None, None, None, None
    return steps, calcium_avg, calcium_std, axons_avg, axons_std, axons_c_avg, axons_c_std, den_ex_avg, den_ex_std

def plot_combined_plots_refined(plasticity_data, neurons_data, output_file):
    """
    Combines the plasticity changes subplots and neuron properties grid into a single HTML file.
    Includes optimized layout with minimized gaps and no individual neuron subplot titles.
    """
    colors = {
        'no-network': 'rgba(0, 0, 255, 1)',  # Blue
        'disabled': 'rgba(255, 165, 0, 1)',  # Orange
        'calcium': 'rgba(0, 128, 0, 1)',  # Green
        'stimulus': 'rgba(128, 0, 128, 1)',  # Purple
    }

    # Create a combined subplot layout
    fig = sp.make_subplots(
        rows=7, cols=2,  # Adjust total rows and columns
        specs=[
            [{"colspan": 2}, None],  # Plasticity title row
            [{"colspan": 2}, None],  # Plasticity row 1
            [{"colspan": 2}, None],  # Plasticity row 2
            [{"colspan": 2}, None],  # Plasticity row 3
            [{"colspan": 2}, None],  # Neuron overview title
            [{}, {}],  # Neuron row 1 (2 columns)
            [{}, {}],  # Neuron row 2 (2 columns)
        ],
        vertical_spacing=0.02,
        horizontal_spacing=0.1
    )

    # Plasticity generic title
    fig.add_annotation(
        dict(
            text="<b>Plasticity Changes Overview Across Simulations</b>",
            x=0.5, y=0.99, xref="paper", yref="paper",  # Adjusted `y` for higher placement
            showarrow=False, font=dict(size=18), align="center"
        )
    )

    # Add plasticity subplots
    metrics = ["Creations", "Deletions", "Net Changes"]
    y_labels = ["Number of Creations", "Number of Deletions", "Number of Net Changes"]
    for idx, (metric, y_label) in enumerate(zip(metrics, y_labels), start=1):
        for label, data in plasticity_data.items():
            if data[0] is None:
                continue
            steps, creations, deletions, net_changes = data
            values = creations if metric == "Creations" else deletions if metric == "Deletions" else net_changes

            fig.add_trace(go.Scatter(
                x=steps, y=values, mode='lines',
                name=label if idx == 1 else None,  # Show legend only once
                line=dict(color=colors[label], width=2),
                showlegend=(idx == 1)
            ), row=idx + 1, col=1)

        fig.update_yaxes(title_text=y_label, row=idx + 1, col=1)
        fig.update_xaxes(
            tickvals=[0, 0.2e6, 0.4e6, 0.6e6, 0.8e6, 1.0e6],
            ticktext=["0", "0.2M", "0.4M", "0.6M", "0.8M", "1M"],
            title_text="Time Step" if idx == 3 else "",
            row=idx + 1, col=1
        )

    # Neuron overview generic title
    fig.add_annotation(
        dict(
            text="<b>Neuron Properties Overview Across Simulations</b>",
            x=0.5, y=0.32, xref="paper", yref="paper",  # Adjusted `y` to center neurons section
            showarrow=False, font=dict(size=18), align="center"
        )
    )

    # Add neuron grid subplots (correctly configured)
    neuron_metrics = ["Calcium", "Axons", "Connected Axons", "Dendrites"]
    for idx, metric in enumerate(neuron_metrics, start=1):
        row, col = divmod(idx - 1, 2)
        row += 6  # Neuron grid starts from row 6
        col += 1

        for label, data in neurons_data.items():
            if data[0] is None:
                continue

            steps, calcium_avg, calcium_std, axons_avg, axons_std, axons_c_avg, axons_c_std, den_ex_avg, den_ex_std = data
            avg, std = (
                (calcium_avg, calcium_std) if metric == "Calcium" else
                (axons_avg, axons_std) if metric == "Axons" else
                (axons_c_avg, axons_c_std) if metric == "Connected Axons" else
                (den_ex_avg, den_ex_std)
            )

            fig.add_trace(go.Scatter(
                x=steps, y=avg, mode='lines',
                name=label if idx == 1 else None,  # Show legend only in the first neuron plot
                line=dict(color=colors[label], width=2),
                showlegend=(idx == 1)
            ), row=row, col=col)

            fig.add_trace(go.Scatter(
                x=steps + steps[::-1],
                y=(np.array(avg) + np.array(std)).tolist() + (np.array(avg) - np.array(std)).tolist()[::-1],
                fill='toself',
                fillcolor=colors[label].replace("1)", "0.2)"),
                line=dict(width=0),
                showlegend=False
            ), row=row, col=col)

        fig.update_yaxes(title_text=metric, row=row, col=col)
        fig.update_xaxes(
            tickvals=[0, 0.2e6, 0.4e6, 0.6e6, 0.8e6, 1.0e6],
            ticktext=["0", "0.2M", "0.4M", "0.6M", "0.8M", "1M"],
            title_text="Time Step" if row == 7 else "",
            row=row, col=col
        )

    # Update layout
    fig.update_layout(
        height=2000,  # Combined height for both plots
        width=1400,  # Full-page width
        template="plotly_dark",  # Dark theme
        showlegend=False,
        margin=dict(l=10, r=0, t=0, b=10)  # Reduce top margin
    )

    # Save combined HTML
    fig.write_html(output_file)
    print(f"Combined interactive plot saved to {output_file}")

    
# Paths for the simulations
simulations = {
    'no-network': '/Users/joanacostaesilva/Desktop/Scientific Visualization and Virtual Reality /Project SVVR/viz-no-network/',
    'disabled': '/Users/joanacostaesilva/Desktop/Scientific Visualization and Virtual Reality /Project SVVR/viz-disable/',
    'calcium': '/Users/joanacostaesilva/Desktop/Scientific Visualization and Virtual Reality /Project SVVR/viz-calcium/',
    'stimulus': '/Users/joanacostaesilva/Desktop/Scientific Visualization and Virtual Reality /Project SVVR/viz-stimulus/',
}

# Process plasticity changes data
plasticity_data = {}
for label, path in simulations.items():
    plasticity_file = f"{path}rank_0_plasticity_changes.txt"
    plasticity_data[label] = read_plasticity_changes(plasticity_file)

# Process neurons overview data
neurons_data = {}
for label, path in simulations.items():
    neurons_file = f"{path}rank_0_neurons_overview.txt"
    neurons_data[label] = read_neurons_with_std(neurons_file)

# Generate the combined plot
plot_combined_plots_refined(plasticity_data, neurons_data, "combined_plots_refined.html")
