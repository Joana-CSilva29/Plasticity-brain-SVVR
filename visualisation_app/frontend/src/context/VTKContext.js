import React, { createContext, useContext, useReducer } from 'react';

const VTKStateContext = createContext();
const VTKDispatchContext = createContext();

const initialState = {
  neurons: {
    type: 'Neurons',
    fileUrl: 'http://localhost:5000/files/neurons.vtp',
    options: {
      representation: '1:0:0',
      opacity: 1.0,
      pointSize: 3,
      lineWidth: 1
    }
  },
  connections: {
    type: 'Connections',
    fileUrl: 'http://localhost:5000/files/connections.vtp',
    options: {
      representation: '1:2:0',
      opacity: 0.7,
      lineWidth: 1,
      inColor: [46/255, 204/255, 113/255],  // Green
      outColor: [230/255, 126/255, 34/255]   // Orange
    }
  },
  selectedObject: 'neurons'
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
    default:
      throw new Error(`Unknown action: ${action.type}`);
  }
}

export function VTKProvider({ children }) {
  const [state, dispatch] = useReducer(vtkReducer, initialState);

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