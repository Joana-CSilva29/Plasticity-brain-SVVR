import React from 'react';
import { CircularProgress, Typography } from '@mui/material';
import { styled } from '@mui/material/styles';

const StyledOverlay = styled(Box)(/* ... existing styles ... */);

const LoadingOverlay = ({ show, progress }) => {
  if (!show) return null;
  
  return (
    <StyledOverlay>
      <CircularProgress 
        variant="determinate" 
        value={progress} 
        size={60}
        sx={{ color: 'white' }}
      />
      <Typography sx={{ color: 'white' }}>
        Loading... {progress}%
      </Typography>
    </StyledOverlay>
  );
};

export default LoadingOverlay; 