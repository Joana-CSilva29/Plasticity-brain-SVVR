import React, { useState, useEffect } from 'react';
import { Box, Paper, Typography, CircularProgress } from '@mui/material';
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

const PlotFrame = styled('iframe')({
  width: '100%',
  height: '1000px', // Match the height from your Python plot
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

const NeuronAnalytics = () => {
  const state = useVTKState();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Function to check if the plot exists
  const checkPlotExists = async (url) => {
    try {
      const response = await fetch(url, { method: 'HEAD' });
      return response.ok;
    } catch (err) {
      return false;
    }
  };

  useEffect(() => {
    const checkPlot = async () => {
      setLoading(true);
      const plotUrl = `http://localhost:5000/files/${state.simulationType}/plots/combined_box_and_parallel_step_${state.currentTimestep}.html`;
      const exists = await checkPlotExists(plotUrl);
      
      if (!exists) {
        setError('Plot not available for this timestep');
      } else {
        setError(null);
      }
      setLoading(false);
    };

    checkPlot();
  }, [state.simulationType, state.currentTimestep]);

  if (loading) {
    return (
      <AnalyticsContainer>
        <LoadingContainer>
          <CircularProgress />
        </LoadingContainer>
      </AnalyticsContainer>
    );
  }

  if (error) {
    return (
      <AnalyticsContainer>
        <Typography sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
          {error}
        </Typography>
      </AnalyticsContainer>
    );
  }

  return (
    <AnalyticsContainer>
      <Typography variant="h6" sx={{ mb: 2, color: 'rgba(255, 255, 255, 0.7)' }}>
        Neuron Analytics
      </Typography>
      <PlotFrame 
        src={`http://localhost:5000/files/${state.simulationType}/plots/combined_box_and_parallel_step_${state.currentTimestep}.html`}
        title="Neuron Analytics Plot"
      />
    </AnalyticsContainer>
  );
};

export default NeuronAnalytics; 