import React from 'react';
import { Box, Select, MenuItem, Slider, FormControl, InputLabel, Typography, Tabs, Tab } from '@mui/material';
import { styled } from '@mui/material/styles';
import { useVTKState } from '../context/VTKContext';
import { useVTKActions } from '../hooks/useVTKActions';

const StyledFormControl = styled(FormControl)(({ theme }) => ({
  '& .MuiInputLabel-root': {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  '& .MuiOutlinedInput-root': {
    color: 'white',
    '& fieldset': {
      borderColor: 'rgba(255, 255, 255, 0.2)',
    },
    '&:hover fieldset': {
      borderColor: 'rgba(255, 255, 255, 0.3)',
    },
    '&.Mui-focused fieldset': {
      borderColor: theme.palette.primary.main,
    },
  },
  '& .MuiSelect-icon': {
    color: 'rgba(255, 255, 255, 0.7)',
  },
}));

const SliderContainer = styled(Box)(({ theme }) => ({
  '& .MuiSlider-root': {
    color: theme.palette.primary.main,
  },
  '& .MuiTypography-root': {
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: theme.spacing(1),
  },
}));

const VTKControls = ({ colorMaps }) => {
  const state = useVTKState();
  const { updateNeuronOptions, updateConnectionOptions, setSelectedObject } = useVTKActions();

  const handleChange = (event, newValue) => {
    setSelectedObject(newValue);
  };

  const currentSource = state[state.selectedObject];
  const isConnections = state.selectedObject === 'connections';

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
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
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

      {!isConnections && (
        <StyledFormControl fullWidth>
          <InputLabel>Representation</InputLabel>
          <Select
            value={currentSource.options.representation}
            onChange={(e) => handleUpdate('representation', e.target.value)}
            label="Representation"
          >
            <MenuItem value="1:0:0">Points</MenuItem>
            <MenuItem value="1:1:0">Wireframe</MenuItem>
            <MenuItem value="1:2:0">Surface</MenuItem>
          </Select>
        </StyledFormControl>
      )}

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

      <SliderContainer>
        <Typography>{isConnections ? 'Line Width' : 'Point Size'}</Typography>
        <Slider
          value={isConnections ? currentSource.options.lineWidth : currentSource.options.pointSize}
          onChange={(_, value) => handleUpdate(isConnections ? 'lineWidth' : 'pointSize', value)}
          min={1}
          max={isConnections ? 10 : 20}
          step={1}
          valueLabelDisplay="auto"
        />
      </SliderContainer>

      {isConnections && (
        <>
          <Box>
            <Typography>In-Connection Color</Typography>
            <input
              type="color"
              value={rgbToHex(currentSource.options.inColor)}
              onChange={(e) => {
                const rgb = hexToRgb(e.target.value);
                handleUpdate('inColor', rgb);
              }}
              style={{ width: '100%', height: '40px' }}
            />
          </Box>
          <Box>
            <Typography>Out-Connection Color</Typography>
            <input
              type="color"
              value={rgbToHex(currentSource.options.outColor)}
              onChange={(e) => {
                const rgb = hexToRgb(e.target.value);
                handleUpdate('outColor', rgb);
              }}
              style={{ width: '100%', height: '40px' }}
            />
          </Box>
        </>
      )}
    </Box>
  );
};

export default VTKControls; 