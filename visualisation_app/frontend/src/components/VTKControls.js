import React from 'react';
import { Box, Slider, Typography, Tabs, Tab } from '@mui/material';
import { styled } from '@mui/material/styles';
import { useVTKState, useVTKDispatch } from '../context/VTKContext';
import { useVTKActions } from '../hooks/useVTKActions';

const SliderContainer = styled(Box)(({ theme }) => ({
  '& .MuiSlider-root': {
    color: theme.palette.primary.main,
  },
  '& .MuiTypography-root': {
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: theme.spacing(1),
  },
}));

const VTKControls = ({ isLoading }) => {
  const state = useVTKState();
  const dispatch = useVTKDispatch();
  const { updateNeuronOptions, updateConnectionOptions, setSelectedObject } = useVTKActions();

  const handleChange = (event, newValue) => {
    setSelectedObject(newValue);
    if (newValue === 'connections') {
      dispatch({ type: 'SET_LOAD_CONNECTIONS', payload: true });
    }
  };

  const currentSource = state[state.selectedObject];

  const handleUpdate = (property, value) => {
    if (state.selectedObject === 'neurons') {
      updateNeuronOptions({ [property]: value });
    } else {
      updateConnectionOptions({ [property]: value });
    }
  };

  return (
    <Box sx={{ 
      display: 'flex', 
      flexDirection: 'column', 
      gap: 3,
      opacity: isLoading ? 0.5 : 1,
      pointerEvents: isLoading ? 'none' : 'auto'
    }}>
      <Tabs
        value={state.selectedObject}
        onChange={handleChange}
        sx={{
          '& .MuiTab-root': { color: 'rgba(255, 255, 255, 0.7)' },
          '& .Mui-selected': { color: 'white' }
        }}
      >
        <Tab label="Neurons" value="neurons" />
        <Tab label="Connections" value="connections" />
      </Tabs>

      <SliderContainer>
        <Typography>Opacity</Typography>
        <Slider
          value={currentSource.options.opacity}
          onChange={(_, value) => handleUpdate('opacity', value)}
          min={0}
          max={1}
          step={0.1}
          valueLabelDisplay="auto"
        />
      </SliderContainer>
    </Box>
  );
};

export default VTKControls; 