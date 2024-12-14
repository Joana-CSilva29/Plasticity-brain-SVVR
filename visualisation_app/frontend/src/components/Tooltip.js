import React from 'react';
import { Box, Paper, Typography } from '@mui/material';
import { styled } from '@mui/material/styles';

const TooltipContainer = styled(Paper)(({ theme }) => ({
  position: 'absolute',
  bottom: theme.spacing(2),
  left: theme.spacing(2),
  padding: theme.spacing(2),
  backgroundColor: 'rgba(0, 0, 0, 0.85)',
  color: 'white',
  borderRadius: theme.shape.borderRadius,
  maxWidth: 400,
  minWidth: 300,
  zIndex: 1500,
  pointerEvents: 'none',
  transition: 'all 0.3s ease-in-out',
  opacity: props => props.show ? 1 : 0,
  transform: props => props.show ? 'translateY(0)' : 'translateY(10px)',
  backdropFilter: 'blur(8px)',
  border: '1px solid rgba(255, 255, 255, 0.1)',
}));

const Tooltip = ({ info }) => {
  if (!info) return null;

  return (
    <TooltipContainer>
      <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
        {info.brodmannArea}
      </Typography>
      {info.name && (
        <Typography variant="body2">
          {info.name}
        </Typography>
      )}
      {info.calciumDiff && (
        <Typography variant="body2" sx={{ color: 'lightgreen' }}>
          {info.calciumDiff}
        </Typography>
      )}
      {info.description && (
        <Typography variant="body2" sx={{ mt: 1, fontSize: '0.8rem' }}>
          {info.description}
        </Typography>
      )}
    </TooltipContainer>
  );
};

export default Tooltip; 