import React from 'react';
import { 
  Box, 
  MenuItem,
  Button,
  Typography,
  Stack,
  Paper,
  TextField
} from '@mui/material';
import { styled } from '@mui/material/styles';
import { useVTKState, useVTKDispatch, SIMULATION_TYPES } from '../context/VTKContext';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';

const StyledSelect = styled(TextField)(({ theme }) => ({
  '& .MuiInputBase-input': {
    color: 'white',
  },
  '& .MuiOutlinedInput-root': {
    '& fieldset': {
      borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    '&:hover fieldset': {
      borderColor: 'rgba(255, 255, 255, 0.2)',
    },
    '&.Mui-focused fieldset': {
      borderColor: theme.palette.primary.main,
    },
  },
  '& .MuiSelect-icon': {
    color: 'rgba(255, 255, 255, 0.7)',
  },
}));

const StyledTextField = styled(TextField)(({ theme }) => ({
  width: '120px',
  '& .MuiInputBase-input': {
    color: 'white',
    textAlign: 'center',
    fontSize: '1.1rem',
    '&::-webkit-inner-spin-button, &::-webkit-outer-spin-button': {
      '-webkit-appearance': 'none',
      margin: 0,
    },
  },
  '& .MuiOutlinedInput-root': {
    '& fieldset': {
      borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    '&:hover fieldset': {
      borderColor: 'rgba(255, 255, 255, 0.2)',
    },
    '&.Mui-focused fieldset': {
      borderColor: theme.palette.primary.main,
    },
  },
}));

const StyledTypography = styled(Typography)(({ theme }) => ({
  color: 'rgba(255, 255, 255, 0.7)',
  fontFamily: 'monospace',
  fontWeight: 500,
}));

const TimestepControl = styled(Paper)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: theme.spacing(1),
  padding: theme.spacing(2),
  background: 'rgba(255, 255, 255, 0.03)',
  borderRadius: theme.shape.borderRadius,
  border: '1px solid rgba(255, 255, 255, 0.1)',
}));

const StyledButton = styled(Button)(({ theme }) => ({
  minWidth: 40,
  height: 40,
  padding: 0,
  color: 'white',
  background: 'rgba(255, 255, 255, 0.05)',
  borderColor: 'rgba(255, 255, 255, 0.1)',
  '&:hover:not(:disabled)': {
    background: 'rgba(255, 255, 255, 0.1)',
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  '&:disabled': {
    color: 'rgba(255, 255, 255, 0.3)',
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
}));

const SimulationControls = () => {
  const state = useVTKState();
  const dispatch = useVTKDispatch();

  const handleSimulationChange = (event) => {
    dispatch({ type: 'SET_SIMULATION_TYPE', payload: event.target.value });
  };

  const handleTimestepChange = (change) => {
    const newValue = state.currentTimestep + change;
    if (newValue >= 0 && newValue <= state.maxTimestep) {
      dispatch({ type: 'SET_TIMESTEP', payload: newValue });
    }
  };

  const handleTimestepInputChange = (event) => {
    let value = parseInt(event.target.value, 10);
    if (!isNaN(value)) {
      value = Math.min(Math.max(0, value), state.maxTimestep);
      value = Math.round(value / state.stepSize) * state.stepSize;
      dispatch({ type: 'SET_TIMESTEP', payload: value });
    }
  };

  return (
    <Stack spacing={3}>
      <StyledSelect
        select
        label="Simulation Type"
        value={state.simulationType}
        onChange={handleSimulationChange}
        variant="outlined"
      >
        <MenuItem value={SIMULATION_TYPES.NO_NETWORK}>No Network</MenuItem>
        <MenuItem value={SIMULATION_TYPES.DISABLE}>Disable</MenuItem>
        <MenuItem value={SIMULATION_TYPES.CALCIUM}>Calcium</MenuItem>
        <MenuItem value={SIMULATION_TYPES.STIMULUS}>Stimulus</MenuItem>
      </StyledSelect>

      <TimestepControl elevation={0}>
        <StyledTypography variant="subtitle2">
          Timestep
        </StyledTypography>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <StyledButton
            variant="outlined"
            onClick={() => handleTimestepChange(-state.stepSize)}
            disabled={state.currentTimestep === 0}
          >
            <RemoveIcon />
          </StyledButton>
          <StyledTextField
            variant="outlined"
            value={state.currentTimestep}
            onChange={handleTimestepInputChange}
            type="number"
            inputProps={{
              min: 0,
              max: state.maxTimestep,
              step: state.stepSize,
            }}
          />
          <StyledButton
            variant="outlined"
            onClick={() => handleTimestepChange(state.stepSize)}
            disabled={state.currentTimestep === state.maxTimestep}
          >
            <AddIcon />
          </StyledButton>
        </Box>
      </TimestepControl>
    </Stack>
  );
};

export default SimulationControls; 