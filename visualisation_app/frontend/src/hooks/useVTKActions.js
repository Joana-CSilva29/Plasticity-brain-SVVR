import { useVTKDispatch } from '../context/VTKContext';

export function useVTKActions() {
  const dispatch = useVTKDispatch();

  const updateNeuronOptions = (options) => {
    dispatch({ type: 'UPDATE_NEURON_OPTIONS', payload: options });
  };

  const updateConnectionOptions = (options) => {
    dispatch({ type: 'UPDATE_CONNECTION_OPTIONS', payload: options });
  };

  const setSelectedObject = (objectType) => {
    dispatch({ type: 'SET_SELECTED_OBJECT', payload: objectType });
  };

  return {
    updateNeuronOptions,
    updateConnectionOptions,
    setSelectedObject
  };
} 