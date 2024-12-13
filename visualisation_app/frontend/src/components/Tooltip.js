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
  transition: 'opacity 0.2s ease-in-out',
  opacity: props => props.show ? 1 : 0,
}));

const Tooltip = ({ info }) => {
  return (
    <TooltipContainer show={!!info} elevation={3}>
      {info ? (
        <>
          <Typography variant="h6" sx={{ 
            fontWeight: 'bold', 
            mb: 1,
            color: 'primary.main',
            fontSize: '1.1rem'
          }}>
            {info.brodmannArea.replace('BA', 'Brodmann Area')}
          </Typography>
          <Typography variant="subtitle1" sx={{ 
            color: 'primary.light',
            mb: 1,
            fontWeight: 500,
            fontSize: '1rem'
          }}>
            {info.name}
          </Typography>
          <Typography variant="body2" sx={{ 
            lineHeight: 1.6,
            maxWidth: '100%',
            wordWrap: 'break-word',
            color: 'rgba(255, 255, 255, 0.9)',
            fontSize: '0.9rem'
          }}>
            {info.description}
          </Typography>
        </>
      ) : (
        <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
          Hover over a label to see information
        </Typography>
      )}
    </TooltipContainer>
  );
};

export default Tooltip; 