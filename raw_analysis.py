import plotly.graph_objects as go
import plotly.subplots as sp
import numpy as np

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

def plot_neuron_properties(neurons_data, output_file):
    # Vibrant colors contrasting with dark background
    colors = {
        'no-network': 'rgba(0, 255, 255, 1)',  # Cyan
        'disabled': 'rgba(255, 0, 0, 1)',      # Red
        'calcium': 'rgba(0, 255, 0, 1)',       # Lime
        'stimulus': 'rgba(255, 255, 0, 1)',    # Yellow
    }

    # Layout:
    # Row 1: Calcium (col=1) & Axons (col=2)
    # Row 2: Connected Axons (col=1) & Dendrites (col=2)

    fig = sp.make_subplots(
        rows=2, cols=2,
        specs=[
            [{}, {}],  # Row 1: Calcium & Axons
            [{}, {}],  # Row 2: Connected Axons & Dendrites
        ],
        vertical_spacing=0.08,
        horizontal_spacing=0.1
    )

    neuron_metrics = ["Calcium", "Axons", "Connected Axons", "Dendrites"]
    metric_positions = {
        "Calcium": (1, 1),
        "Axons": (1, 2),
        "Connected Axons": (2, 1),
        "Dendrites": (2, 2)
    }

    simulations = list(neurons_data.keys())

    for metric in neuron_metrics:
        row, col = metric_positions[metric]

        for i, sim in enumerate(simulations):
            data = neurons_data[sim]
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
                line=dict(color=colors[sim], width=3),
                legendgroup=sim,
                name=sim if metric == "Calcium" else None,
                showlegend=(metric == "Calcium")  
            ), row=row, col=col)

            upper = (np.array(avg) + np.array(std)).tolist()
            lower = (np.array(avg) - np.array(std)).tolist()
            fig.add_trace(go.Scatter(
                x=steps + steps[::-1],
                y=upper + lower[::-1],
                fill='toself',
                fillcolor=colors[sim].replace("1)", "0.2)"),
                line=dict(width=0),
                legendgroup=sim,
                showlegend=False
            ), row=row, col=col)

        fig.update_yaxes(title_text=metric, row=row, col=col)
        fig.update_xaxes(
            tickvals=[0, 0.2e6, 0.4e6, 0.6e6, 0.8e6, 1.0e6],
            ticktext=["0", "0.2M", "0.4M", "0.6M", "0.8M", "1M"],
            title_text="Time Step" if metric in ["Connected Axons", "Dendrites"] else "",
            row=row, col=col
        )

    fig.update_layout(
        title_text="<b>Neuron Properties Overview</b>",
        title_x=0.5,  # center the title
        height=800,
        width=1400,
        template="plotly_dark",
        margin=dict(l=50, r=50, t=180, b=50),
        font=dict(size=18),
        showlegend=True,
        legend=dict(
            orientation='h',
            x=0.5,
            y=1.05,
            xanchor='center',
            yanchor='bottom',
            font=dict(size=16)
        )
    )

    fig.write_html(output_file)
    print(f"Neuron properties overview plot saved to {output_file}")


# Example usage:
# Paths for the simulations
simulations = {
    'no-network': '/Users/joanacostaesilva/Desktop/Scientific Visualization and Virtual Reality /Project SVVR/viz-no-network/',
    'disabled': '/Users/joanacostaesilva/Desktop/Scientific Visualization and Virtual Reality /Project SVVR/viz-disable/',
    'calcium': '/Users/joanacostaesilva/Desktop/Scientific Visualization and Virtual Reality /Project SVVR/viz-calcium/',
    'stimulus': '/Users/joanacostaesilva/Desktop/Scientific Visualization and Virtual Reality /Project SVVR/viz-stimulus/',
}
neurons_data = {}
for label, path in simulations.items():
    neurons_file = f"{path}rank_0_neurons_overview.txt"
    neurons_data[label] = read_neurons_with_std(neurons_file)

plot_neuron_properties(neurons_data, "neuron_properties_overview.html")
