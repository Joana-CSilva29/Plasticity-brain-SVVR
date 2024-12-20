import React from 'react';
import { Paper, Typography, Grid } from '@mui/material';
import { styled } from '@mui/material/styles';

const PropertiesContainer = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(2),
  background: 'rgba(255, 255, 255, 0.03)',
  borderRadius: theme.shape.borderRadius,
  border: '1px solid rgba(255, 255, 255, 0.1)',
  marginBottom: theme.spacing(3),
  overflow: 'hidden',
}));

const PlotBox = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(2),
  background: 'rgba(255, 255, 255, 0.02)',
  borderRadius: theme.shape.borderRadius,
  border: '1px solid rgba(255, 255, 255, 0.05)',
  marginBottom: theme.spacing(2),
}));

const PlotFrame = styled('iframe')({
  width: '100%',
  height: '800px',
  border: 'none',
  backgroundColor: 'transparent',
});

const NeuronProperties = () => {
  return (
    <PropertiesContainer>
      <Typography variant="h6" sx={{ mb: 3, color: 'rgba(255, 255, 255, 0.7)' }}>
        Neuron Properties Overview
      </Typography>
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <PlotBox>
            <PlotFrame
              src="http://localhost:5000/files/neuron_properties_overview.html"
              title="Neuron Properties Overview"
            />
          </PlotBox>
        </Grid>
      </Grid>
    </PropertiesContainer>
  );
};

export default NeuronProperties; 