import React from 'react';
import { ToggleButton } from '@mui/material';
import { styled } from '@mui/material/styles';
import { useVTKState } from '../context/VTKContext';
import { useVTKActions } from '../hooks/useVTKActions';
import { Box } from '@mui/material';

const StyledToggleButton = styled(ToggleButton)(({ theme }) => ({
  flex: 1,
  minWidth: 0,
  padding: theme.spacing(0.75, 1),
  color: 'rgba(255, 255, 255, 0.7)',
  borderColor: 'rgba(255, 255, 255, 0.1)',
  textTransform: 'none',
  fontSize: '0.875rem',
  whiteSpace: 'nowrap',
  marginRight: theme.spacing(1),
  '&:last-child': {
    marginRight: 0,
  },
  '&.Mui-selected': {
    backgroundColor: theme.palette.primary.main,
    color: 'white',
    '&:hover': {
      backgroundColor: theme.palette.primary.dark,
    },
  },
  '&:hover': {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
}));

const VisualizationModeToggle = () => {
  const state = useVTKState();
  const { setVisualizationMode } = useVTKActions();
  
  // Derive individual toggles from visualization mode
  const showNeurons = state.visualizationMode !== 'connections-only';
  const showConnections = state.visualizationMode !== 'neurons-only';

  const handleNeuronsToggle = () => {
    if (showNeurons && showConnections) {
      setVisualizationMode('connections-only');
    } else if (showNeurons) {
      setVisualizationMode('connections-only');
    } else if (showConnections) {
      setVisualizationMode('both');
    } else {
      setVisualizationMode('neurons-only');
    }
  };

  const handleConnectionsToggle = () => {
    if (showNeurons && showConnections) {
      setVisualizationMode('neurons-only');
    } else if (showConnections) {
      setVisualizationMode('neurons-only');
    } else if (showNeurons) {
      setVisualizationMode('both');
    } else {
      setVisualizationMode('connections-only');
    }
  };

  return (
    <Box sx={{ 
      width: '100%', 
      display: 'flex', 
      gap: 1 ,
    }}>
      <StyledToggleButton
        value="neurons"
        selected={showNeurons}
        onChange={handleNeuronsToggle}
      >
        Neurons
      </StyledToggleButton>
      <StyledToggleButton
        value="connections"
        selected={showConnections}
        onChange={handleConnectionsToggle}
      >
        Connections
      </StyledToggleButton>
    </Box>
  );
};

export default VisualizationModeToggle; 