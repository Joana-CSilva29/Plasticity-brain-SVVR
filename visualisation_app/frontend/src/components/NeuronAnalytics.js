import React, { useState, useEffect } from 'react';
import { Box, Paper, Typography, CircularProgress, Grid } from '@mui/material';
import { styled } from '@mui/material/styles';
import { useVTKState } from '../context/VTKContext';

const AnalyticsContainer = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(2),
  background: 'rgba(255, 255, 255, 0.03)',
  borderRadius: theme.shape.borderRadius,
  border: '1px solid rgba(255, 255, 255, 0.1)',
  marginTop: theme.spacing(3),
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
  height: '600px',
  border: 'none',
  backgroundColor: 'transparent',
});

const LoadingContainer = styled(Box)({
  width: '100%',
  height: '200px',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
});

const PLOT_TYPES = [
  {
    id: 'plot1',
    title: 'Neuron Activity Distribution',
    height: '600px',
  },
  {
    id: 'plot2',
    title: 'Network Connectivity Analysis',
    height: '500px',
  },
  {
    id: 'plot3',
    title: 'Temporal Evolution',
    height: '400px',
  },
  // Add more plot types as needed
];

const Plot = ({ plotType, simType, timestep }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [exists, setExists] = useState(false);

  useEffect(() => {
    const checkPlot = async () => {
      setLoading(true);
      const plotUrl = `http://localhost:5000/files/${simType}/plots/${plotType.id}_${timestep}.html`;
      
      try {
        const response = await fetch(plotUrl, { method: 'HEAD' });
        setExists(response.ok);
        setError(null);
      } catch (err) {
        setExists(false);
        setError(`Failed to load ${plotType.title}`);
      } finally {
        setLoading(false);
      }
    };

    checkPlot();
  }, [plotType, simType, timestep]);

  if (loading) {
    return (
      <LoadingContainer>
        <CircularProgress />
      </LoadingContainer>
    );
  }

  if (!exists || error) {
    return (
      <Box sx={{ p: 2, textAlign: 'center' }}>
        <Typography sx={{ color: 'rgba(255, 255, 255, 0.5)' }}>
          {error || `No ${plotType.title.toLowerCase()} available for this timestep`}
        </Typography>
      </Box>
    );
  }

  return (
    <PlotFrame
      src={`http://localhost:5000/files/${simType}/plots/${plotType.id}_${timestep}.html`}
      title={plotType.title}
      style={{ height: plotType.height }}
    />
  );
};

const NeuronAnalytics = () => {
  const state = useVTKState();

  return (
    <AnalyticsContainer>
      <Typography variant="h6" sx={{ mb: 3, color: 'rgba(255, 255, 255, 0.7)' }}>
        Neuron Analytics
      </Typography>
      
      <Grid container spacing={3}>
        {PLOT_TYPES.map((plotType) => (
          <Grid item xs={12} key={plotType.id}>
            <PlotBox>
              <Typography variant="h6" sx={{ mb: 2, color: 'rgba(255, 255, 255, 0.6)' }}>
                {plotType.title}
              </Typography>
              <Plot
                plotType={plotType}
                simType={state.simulationType}
                timestep={state.currentTimestep}
              />
            </PlotBox>
          </Grid>
        ))}
      </Grid>
    </AnalyticsContainer>
  );
};

export default NeuronAnalytics; 