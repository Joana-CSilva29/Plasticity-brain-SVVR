import matplotlib.pyplot as plt

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
                data = line.strip().split(':')
                step = int(data[0])
                # Parse creations, deletions, and net changes
                creation, deletion, total_change = map(int, data[1].split())
                steps.append(step)
                creations.append(creation)
                deletions.append(deletion)
                net_changes.append(total_change)
    except FileNotFoundError:
        print(f"File {file_path} not found.")
        return None, None, None, None
    return steps, creations, deletions, net_changes


def plot_plasticity_changes(steps, creations, deletions, net_changes, output_file):
    """
    Plots creations, deletions, and net changes in plasticity over time.
    """
    plt.figure(figsize=(14, 8))

    # Plot creations, deletions, and net changes
    plt.plot(steps, creations, linestyle='-', color='green', label='Creations')
    plt.plot(steps, deletions, linestyle='-', color='red', label='Deletions')
    plt.plot(steps, net_changes, linestyle='-', color='blue', label='Net Changes')

    # Improve plot aesthetics
    plt.title('Plasticity Changes Over Time', fontsize=16, fontweight='bold')
    plt.xlabel('Time Step', fontsize=14)
    plt.ylabel('Number of Changes', fontsize=14)
    plt.xticks(fontsize=12)
    plt.yticks(fontsize=12)
    plt.grid(True, linestyle='--', alpha=0.7)
    plt.legend(fontsize=12)
    plt.tight_layout()

    # Save and show the plot
    plt.savefig(output_file)
    plt.show()


def read_neurons_overview(file_path):
    """
    Reads neurons overview file and extracts key metrics.
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


def plot_neurons_overview(steps, calcium_avg, calcium_std, axons_avg, axons_std, axons_c_avg, axons_c_std, den_ex_avg, den_ex_std, output_file):
    """
    Plots an overview of neuron metrics.
    """
    plt.figure(figsize=(14, 10))

    # Plot Calcium
    plt.subplot(2, 2, 1)
    plt.errorbar(steps, calcium_avg, yerr=calcium_std, fmt='-', color='b', ecolor='lightgray', elinewidth=2, capsize=4)
    plt.title('Calcium Average with Std Dev', fontsize=14, fontweight='bold')
    plt.xlabel('Time Step', fontsize=12)
    plt.ylabel('Calcium (avg)', fontsize=12)
    plt.grid(True, linestyle='--', alpha=0.7)

    # Plot Axons
    plt.subplot(2, 2, 2)
    plt.errorbar(steps, axons_avg, yerr=axons_std, fmt='-', color='g', ecolor='lightgray', elinewidth=2, capsize=4)
    plt.title('Axons Average with Std Dev', fontsize=14, fontweight='bold')
    plt.xlabel('Time Step', fontsize=12)
    plt.ylabel('Axons (avg)', fontsize=12)
    plt.grid(True, linestyle='--', alpha=0.7)

    # Plot Connected Axons
    plt.subplot(2, 2, 3)
    plt.errorbar(steps, axons_c_avg, yerr=axons_c_std, fmt='-', color='r', ecolor='lightgray', elinewidth=2, capsize=4)
    plt.title('Connected Axons Average with Std Dev', fontsize=14, fontweight='bold')
    plt.xlabel('Time Step', fontsize=12)
    plt.ylabel('Connected Axons (avg)', fontsize=12)
    plt.grid(True, linestyle='--', alpha=0.7)

    # Plot Dendrites
    plt.subplot(2, 2, 4)
    plt.errorbar(steps, den_ex_avg, yerr=den_ex_std, fmt='-', color='m', ecolor='lightgray', elinewidth=2, capsize=4)
    plt.title('Dendrites Average with Std Dev', fontsize=14, fontweight='bold')
    plt.xlabel('Time Step', fontsize=12)
    plt.ylabel('Dendrites (avg)', fontsize=12)
    plt.grid(True, linestyle='--', alpha=0.7)

    plt.tight_layout()
    plt.savefig(output_file)
    plt.show()


# Paths to the data files
plasticity_changes_file = '/Users/joanacostaesilva/Desktop/Scientific Visualization and Virtual Reality /Project SVVR/viz-no-network/rank_0_plasticity_changes.txt'
neurons_overview_file = '/Users/joanacostaesilva/Desktop/Scientific Visualization and Virtual Reality /Project SVVR/viz-no-network/rank_0_neurons_overview.txt'

# Read and plot plasticity changes
steps, creations, deletions, net_changes = read_plasticity_changes(plasticity_changes_file)
if steps is not None:
    output_file = "plasticity_changes_plot.png"
    plot_plasticity_changes(steps, creations, deletions, net_changes, output_file)
    print(f"Plasticity changes plot saved as {output_file}")

# Read and plot neurons overview data
steps, calcium_avg, calcium_std, axons_avg, axons_std, axons_c_avg, axons_c_std, den_ex_avg, den_ex_std = read_neurons_overview(neurons_overview_file)
if steps is not None:
    output_file = "neurons_overview_plot.png"
    plot_neurons_overview(steps, calcium_avg, calcium_std, axons_avg, axons_std, axons_c_avg, axons_c_std, den_ex_avg, den_ex_std, output_file)
    print(f"Neurons overview plot saved as {output_file}")
