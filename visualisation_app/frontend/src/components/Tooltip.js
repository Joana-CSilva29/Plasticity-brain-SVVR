import React from 'react';
import { Box, Paper, Typography } from '@mui/material';
import { styled } from '@mui/material/styles';
import { useTheme } from '@mui/material/styles';

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
  const theme = useTheme();
  
  if (!info) return null;

  return (
    <TooltipContainer>
      <Typography 
        variant="h6" 
        sx={{ 
          mb: 1,
          color: 'white',
          fontSize: '0.9rem',
          fontWeight: 600
        }}
      >
        {info.name || info.label}
      </Typography>
      {info.description && (
        <Typography 
          variant="body2" 
          sx={{ 
            mb: 1,
            color: 'rgba(255, 255, 255, 0.9)',
            fontSize: '0.75rem'
          }}
        >
          {info.description}
        </Typography>
      )}
      {info.calciumDiff && (
        <Typography 
          variant="body2" 
          sx={{ 
            fontWeight: 'bold',
            color: theme.palette.primary.light,
            fontSize: '0.75rem'
          }}
        >
          {info.calciumDiff}
        </Typography>
      )}
      {info.details && (
        <Typography 
          variant="body2" 
          sx={{ 
            color: 'rgba(255, 255, 255, 0.7)',
            fontSize: '0.75rem'
          }}
        >
          {info.details}
        </Typography>
      )}
      {info.activityInfo && (
        <Typography 
          variant="body2" 
          sx={{ 
            fontWeight: 'bold',
            color: '#FF6B6B',
            fontSize: '0.75rem'
          }}
        >
          {info.activityInfo}
        </Typography>
      )}
      {info.stimulationStatus && (
        <Typography 
          variant="body2" 
          sx={{ 
            color: '#FF5500', 
            fontWeight: 'bold',
            mt: 0.5,
            fontSize: '0.75rem'
          }}
        >
          {info.stimulationStatus}
        </Typography>
      )}
    </TooltipContainer>
  );
};

export default Tooltip; 