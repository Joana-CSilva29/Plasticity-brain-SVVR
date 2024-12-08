import React, { createContext, useContext, useReducer, useMemo } from 'react';

const VTKStateContext = createContext();
const VTKDispatchContext = createContext();

const initialState = {
  neurons: {
    type: 'Neurons',
    fileUrl: 'http://localhost:5000/files/sim1/neurons.vtp',
    options: {
      opacity: 1.0,
      pointSize: 3
    }
  },
  connections: {
    type: 'Connections',
    fileUrl: 'http://localhost:5000/files/sim1/connections_0000000.vtp',
    options: {
      opacity: 0.7,
      inColor: [46/255, 204/255, 113/255],  // Green
      outColor: [230/255, 126/255, 34/255]  // Orange
    }
  },
  selectedObject: 'neurons',
  currentTimestep: 0,
  maxTimestep: 1000000,
  stepSize: 10000,
  isPlaying: false
};

function vtkReducer(state, action) {
  switch (action.type) {
    case 'UPDATE_NEURON_OPTIONS':
      return {
        ...state,
        neurons: {
          ...state.neurons,
          options: {
            ...state.neurons.options,
            ...action.payload
          }
        }
      };
    case 'UPDATE_CONNECTION_OPTIONS':
      return {
        ...state,
        connections: {
          ...state.connections,
          options: {
            ...state.connections.options,
            ...action.payload
          }
        }
      };
    case 'SET_SELECTED_OBJECT':
      return {
        ...state,
        selectedObject: action.payload
      };
    case 'SET_TIMESTEP':
      return {
        ...state,
        currentTimestep: action.payload,
        connections: {
          ...state.connections,
          fileUrl: `http://localhost:5000/files/sim1/connections_${String(action.payload).padStart(7, '0')}.vtp`
        }
      };
    case 'SET_PLAYING':
      return {
        ...state,
        isPlaying: action.payload
      };
    case 'SET_SIMULATION':
      return {
        ...state,
        currentSimulation: action.payload,
        currentTimestep: 0,
        isPlaying: false,
        neurons: {
          ...state.neurons,
          fileUrl: `http://localhost:5000/files/${action.payload}/neurons.vtp`
        },
        connections: {
          ...state.connections,
          fileUrl: `http://localhost:5000/files/${action.payload}/connections_0000000.vtp`
        }
      };
    default:
      throw new Error(`Unknown action: ${action.type}`);
  }
}

export function VTKProvider({ children }) {
  const [state, dispatch] = useReducer(vtkReducer, initialState);
  
  const value = useMemo(() => ({ state, dispatch }), [state]);

  return (
    <VTKStateContext.Provider value={state}>
      <VTKDispatchContext.Provider value={dispatch}>
        {children}
      </VTKDispatchContext.Provider>
    </VTKStateContext.Provider>
  );
}

export function useVTKState() {
  const context = useContext(VTKStateContext);
  if (context === undefined) {
    throw new Error('useVTKState must be used within a VTKProvider');
  }
  return context;
}

export function useVTKDispatch() {
  const context = useContext(VTKDispatchContext);
  if (context === undefined) {
    throw new Error('useVTKDispatch must be used within a VTKProvider');
  }
  return context;
} 