import os
import numpy as np
import plotly.graph_objects as go
import plotly.subplots as sp

def read_plasticity_changes(file_path):
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
    colors = {
        'no-network': 'rgba(0, 0, 255, 1)',   # Blue
        'disabled': 'rgba(255, 165, 0, 1)',  # Orange
        'calcium': 'rgba(0, 128, 0, 1)',     # Green
        'stimulus': 'rgba(128, 0, 128, 1)',  # Purple
    }

    # Define figure layout with multiple subplots
    fig = sp.make_subplots(
        rows=6, cols=2,
        specs=[
            [{"colspan": 2}, None],  # Row 1: Plasticity Creations
            [{"colspan": 2}, None],  # Row 2: Plasticity Deletions
            [{"colspan": 2}, None],  # Row 3: Plasticity Net Changes
            [{"colspan": 2}, None],  # Row 4: Neuron overview title
            [{}, {}],                # Row 5: Neuron Calcium & Axons
            [{}, {}],                # Row 6: Neuron Connected Axons & Dendrites
        ],
        vertical_spacing=0.02,
        horizontal_spacing=0.1
    )

    simulations = list(plasticity_data.keys())

    # Add dummy traces for legend
    for sim in simulations:
        fig.add_trace(go.Scatter(
            x=[np.nan], y=[np.nan],
            mode='lines',
            line=dict(color=colors[sim], width=2),
            name=sim,
            legendgroup=sim,
            showlegend=True
        ), row=1, col=1)

    # Plasticity title
    fig.add_annotation(
        text="<b>Plasticity Changes Overview Across Simulations</b>",
        x=0.5, y=1.03, xref="paper", yref="paper",
        showarrow=False, font=dict(size=18), align="center"
    )

    # Plasticity metrics
    metrics = ["Creations", "Deletions", "Net Changes"]
    y_labels = ["Created synapses", "Deleted synapses", "Net Changes"]

    for idx, (metric, y_label) in enumerate(zip(metrics, y_labels), start=1):
        current_row = idx
        for label, data in plasticity_data.items():
            if data[0] is None:
                continue
            steps, creations, deletions, net_changes = data
            values = creations if metric == "Creations" else (deletions if metric == "Deletions" else net_changes)
            fig.add_trace(go.Scatter(
                x=steps, y=values, mode='lines',
                line=dict(color=colors[label], width=2),
                legendgroup=label,
                showlegend=False
            ), row=current_row, col=1)

        fig.update_yaxes(title_text=y_label, row=current_row, col=1)
        fig.update_xaxes(
            tickvals=[0, 0.2e6, 0.4e6, 0.6e6, 0.8e6, 1.0e6],
            ticktext=["0", "0.2M", "0.4M", "0.6M", "0.8M", "1M"],
            title_text="Time Step" if metric == "Net Changes" else "",
            row=current_row, col=1
        )

    # Neuron overview title
    fig.add_annotation(
        text="<b>Neuron Properties Overview Across Simulations</b>",
        x=0.5, y=0.37, xref="paper", yref="paper",
        showarrow=False, font=dict(size=18), align="center"
    )

    neuron_metrics = ["Calcium", "Axons", "Connected Axons", "Dendrites"]
    for idx, metric in enumerate(neuron_metrics, start=1):
        row_offset, col_offset = divmod(idx - 1, 2)
        row = 5 + row_offset
        col = 1 + col_offset

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
                line=dict(color=colors[label], width=2),
                legendgroup=label,
                showlegend=False
            ), row=row, col=col)

            fig.add_trace(go.Scatter(
                x=steps + steps[::-1],
                y=(np.array(avg) + np.array(std)).tolist() + (np.array(avg) - np.array(std)).tolist()[::-1],
                fill='toself',
                fillcolor=colors[label].replace("1)", "0.2)"),
                line=dict(width=0),
                legendgroup=label,
                showlegend=False
            ), row=row, col=col)

        fig.update_yaxes(title_text=metric, row=row, col=col)
        fig.update_xaxes(
            tickvals=[0, 0.2e6, 0.4e6, 0.6e6, 0.8e6, 1.0e6],
            ticktext=["0", "0.2M", "0.4M", "0.6M", "0.8M", "1M"],
            title_text="Time Step" if row == 6 else "",
            row=row, col=col
        )

    fig.update_layout(
        height=1900,
        width=1400,
        template="plotly_dark",
        margin=dict(l=50, r=50, t=50, b=50),
        showlegend=True,
        legend=dict(
            orientation='h',
            x=0.5,
            y=1.05,
            xanchor='center',
            yanchor='bottom'
        )
    )

    fig.write_html(output_file)
    print(f"Combined interactive plot saved to {output_file}")

# Main code:
simType = 'stimulus'
output_dir = f"/Users/joanacostaesilva/Desktop/Scientific Visualization and Virtual Reality /Plasticity-brain-SVVR/visualisation_app/backend/uploads/{simType}/plots"
os.makedirs(output_dir, exist_ok=True)

simulations = {
    'no-network': '/Users/joanacostaesilva/Desktop/Scientific Visualization and Virtual Reality /Project SVVR/viz-no-network/',
    'disabled': '/Users/joanacostaesilva/Desktop/Scientific Visualization and Virtual Reality /Project SVVR/viz-disable/',
    'calcium': '/Users/joanacostaesilva/Desktop/Scientific Visualization and Virtual Reality /Project SVVR/viz-calcium/',
    'stimulus': '/Users/joanacostaesilva/Desktop/Scientific Visualization and Virtual Reality /Project SVVR/viz-stimulus/',
}

# Load all plasticity and neuron data once
plasticity_data = {}
for label, path in simulations.items():
    plasticity_file = f"{path}rank_0_plasticity_changes.txt"
    plasticity_data[label] = read_plasticity_changes(plasticity_file)

neurons_data = {}
for label, path in simulations.items():
    neurons_file = f"{path}rank_0_neurons_overview.txt"
    neurons_data[label] = read_neurons_with_std(neurons_file)

# This plot is a single overview, not dependent on timestep
output_file = os.path.join(output_dir, "plot3_0.html")
plot_combined_plots_refined(plasticity_data, neurons_data, output_file)
