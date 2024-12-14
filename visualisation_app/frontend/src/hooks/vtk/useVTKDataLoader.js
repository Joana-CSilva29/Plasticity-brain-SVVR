import { useEffect, useState } from 'react';
import { useVTKState } from '../../context/VTKContext';
import VTPCache from '../../utils/VTPCache';
import { loadNeurons, loadConnections } from '../../utils/vtk/loaders';

export function useVTKDataLoader(context, isInitialized) {
  const state = useVTKState();
  const [loadingStates, setLoadingStates] = useState({
    neurons: false,
    connections: false
  });
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const cache = new VTPCache();

  // Main data loading effect
  useEffect(() => {
    if (!isInitialized) return;
    let isCancelled = false;

    const loadData = async () => {
      try {
        let isLoadingAnything = false;
        setLoadingProgress(0);

        // Load neurons if needed
        if (state.visualizationMode !== VISUALIZATION_MODES.CONNECTIONS_ONLY) {
          const result = await loadNeurons(context, state, setLoadingProgress, isCancelled);
          isLoadingAnything = isLoadingAnything || result.loaded;
          setLoadingStates(prev => ({ ...prev, neurons: result.loading }));
        }

        // Load connections if needed
        if (state.visualizationMode !== VISUALIZATION_MODES.NEURONS_ONLY) {
          const result = await loadConnections(context, state, cache, setLoadingProgress, isCancelled);
          isLoadingAnything = isLoadingAnything || result.loaded;
          setLoadingStates(prev => ({ ...prev, connections: result.loading }));
        }

        setIsLoading(isLoadingAnything);
        setLoadingProgress(100);

      } catch (error) {
        console.error('Error loading VTP files:', error);
        setLoadingStates({ neurons: false, connections: false });
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
          setLoadingProgress(0);
        }
      }
    };

    const timeoutId = setTimeout(loadData, 100);

    return () => {
      isCancelled = true;
      clearTimeout(timeoutId);
    };
  }, [isInitialized, state.neurons.fileUrl, state.connections.fileUrl,
      state.simulationType, state.visualizationMode, state.currentTimestep]);

  return { isLoading, loadingProgress, loadingStates };
} 