import React, { createContext, useContext, useReducer, useMemo } from 'react';

const VTKStateContext = createContext();
const VTKDispatchContext = createContext();

export const SIMULATION_TYPES = {
  NO_NETWORK: 'no-network',
  DISABLE: 'disable',
  CALCIUM: 'calcium',
  STIMULUS: 'stimulus'
};

export const VISUALIZATION_MODES = {
  NEURONS_ONLY: 'neurons-only',
  CONNECTIONS_ONLY: 'connections-only',
  BOTH: 'both'
};

const initialState = {
  neurons: {
    type: 'Neurons',
    fileUrl: `http://localhost:5000/files/${SIMULATION_TYPES.NO_NETWORK}/neurons.vtp`,
    options: {
      opacity: 1.0,
      pointSize: 3
    }
  },
  connections: {
    type: 'Connections',
    fileUrl: `http://localhost:5000/files/no-network/connections_0000000.vtp`,
    options: {
      opacity: 0.7,
      inColor: [46/255, 204/255, 113/255],
      outColor: [230/255, 126/255, 34/255],
      tubeRadius: 0.05
    }
  },
  selectedObject: 'neurons',
  currentTimestep: 0,
  maxTimestep: 1000000,
  stepSize: 10000,
  simulationType: SIMULATION_TYPES.NO_NETWORK,
  lastUpdate: Date.now(),
  loadConnections: true,
  visualizationMode: VISUALIZATION_MODES.BOTH,
  isAnimating: false,
  animationSpeed: 100,
};

const THROTTLE_TIME = 16;

function vtkReducer(state, action) {
  const currentTime = Date.now();
  
  if (currentTime - state.lastUpdate < THROTTLE_TIME) {
    return state;
  }

  switch (action.type) {
    case 'UPDATE_NEURON_OPTIONS': {
      const newOptions = {
        ...state.neurons.options,
        ...action.payload
      };
      
      if (JSON.stringify(newOptions) === JSON.stringify(state.neurons.options)) {
        return state;
      }

      return {
        ...state,
        neurons: {
          ...state.neurons,
          options: newOptions
        },
        lastUpdate: currentTime
      };
    }

    case 'UPDATE_CONNECTION_OPTIONS': {
      const newOptions = {
        ...state.connections.options,
        ...action.payload
      };
      
      if (JSON.stringify(newOptions) === JSON.stringify(state.connections.options)) {
        return state;
      }

      return {
        ...state,
        connections: {
          ...state.connections,
          options: newOptions
        },
        lastUpdate: currentTime
      };
    }

    case 'SET_SELECTED_OBJECT':
      if (state.selectedObject === action.payload) {
        return state;
      }
      return {
        ...state,
        selectedObject: action.payload,
        lastUpdate: currentTime
      };

    case 'SET_TIMESTEP': {
      const timestep = Math.min(Math.max(0, action.payload), state.maxTimestep);
      if (timestep === state.currentTimestep) {
        return state;
      }
      return {
        ...state,
        currentTimestep: timestep,
        connections: {
          ...state.connections,
          fileUrl: `http://localhost:5000/files/${state.simulationType}/connections_${String(timestep).padStart(7, '0')}.vtp`
        },
        lastUpdate: currentTime
      };
    }

    case 'SET_SIMULATION_TYPE':
      if (state.simulationType === action.payload) {
        return state;
      }
      return {
        ...state,
        simulationType: action.payload,
        currentTimestep: 0,
        neurons: {
          ...state.neurons,
          fileUrl: `http://localhost:5000/files/${action.payload}/neurons.vtp`
        },
        connections: {
          ...state.connections,
          fileUrl: `http://localhost:5000/files/${action.payload}/connections_0000000.vtp`
        },
        lastUpdate: currentTime
      };

    case 'SET_LOAD_CONNECTIONS':
      return {
        ...state,
        loadConnections: action.payload,
      };

    case 'SET_VISUALIZATION_MODE':
      if (state.visualizationMode === action.payload) {
        return state;
      }
      return {
        ...state,
        visualizationMode: action.payload,
        loadConnections: action.payload !== VISUALIZATION_MODES.NEURONS_ONLY,
        lastUpdate: currentTime
      };

    case 'TOGGLE_ANIMATION':
      return {
        ...state,
        isAnimating: !state.isAnimating,
        ...(state.isAnimating ? { 
          currentTimestep: Math.round(state.currentTimestep / state.stepSize) * state.stepSize 
        } : {}),
        lastUpdate: currentTime
      };

    case 'SET_ANIMATION_SPEED':
      return {
        ...state,
        animationSpeed: action.payload,
        lastUpdate: currentTime
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