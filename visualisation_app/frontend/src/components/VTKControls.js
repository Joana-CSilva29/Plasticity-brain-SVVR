import React from 'react';
import { Box, Slider, Typography, Tabs, Tab } from '@mui/material';
import { styled } from '@mui/material/styles';
import { useVTKState } from '../context/VTKContext';
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

const ColorControl = styled(Box)(({ theme }) => ({
  '& .MuiTypography-root': {
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: theme.spacing(1),
  },
  '& input[type="color"]': {
    width: '100%',
    height: '40px',
    borderRadius: theme.shape.borderRadius,
    border: '1px solid rgba(255, 255, 255, 0.2)',
    backgroundColor: 'transparent',
    cursor: 'pointer',
  },
}));

const VTKControls = ({ isLoading }) => {
  const state = useVTKState();
  const { updateNeuronOptions, updateConnectionOptions, setSelectedObject } = useVTKActions();

  const handleChange = (event, newValue) => {
    setSelectedObject(newValue);
  };

  const currentSource = state[state.selectedObject];

  const handleUpdate = (property, value) => {
    if (state.selectedObject === 'neurons') {
      updateNeuronOptions({ [property]: value });
    } else {
      updateConnectionOptions({ [property]: value });
    }
  };

  const rgbToHex = (rgb) => {
    return '#' + rgb.map(x => Math.round(x * 255).toString(16).padStart(2, '0')).join('');
  };

  const hexToRgb = (hex) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? [
      parseInt(result[1], 16) / 255,
      parseInt(result[2], 16) / 255,
      parseInt(result[3], 16) / 255
    ] : null;
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

      {state.selectedObject === 'neurons' ? (
        <>
          <SliderContainer>
            <Typography>Point Size</Typography>
            <Slider
              value={currentSource.options.pointSize}
              onChange={(_, value) => handleUpdate('pointSize', value)}
              min={1}
              max={10}
              valueLabelDisplay="auto"
            />
          </SliderContainer>
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
        </>
      ) : (
        <>
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
          <ColorControl>
            <Typography>Input Connections Color</Typography>
            <input
              type="color"
              value={rgbToHex(currentSource.options.inColor)}
              onChange={(e) => handleUpdate('inColor', hexToRgb(e.target.value))}
            />
          </ColorControl>
          <ColorControl>
            <Typography>Output Connections Color</Typography>
            <input
              type="color"
              value={rgbToHex(currentSource.options.outColor)}
              onChange={(e) => handleUpdate('outColor', hexToRgb(e.target.value))}
            />
          </ColorControl>
        </>
      )}
    </Box>
  );
};

export default VTKControls; 