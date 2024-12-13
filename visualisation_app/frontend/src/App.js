import React from 'react';
import { 
  AppBar, 
  Toolbar, 
  Typography, 
  ThemeProvider,
  Box,
  Stack,
  Paper
} from '@mui/material';
import { styled } from '@mui/material/styles';
import { motion } from 'framer-motion';
import VTPViewer from './components/VTPViewer';
import VTKControls from './components/VTKControls';
import SimulationControls from './components/SimulationControls';
import { useVTKState } from './context/VTKContext';
import { theme } from './theme';
import NeuronAnalytics from './components/NeuronAnalytics';

const MainContainer = styled(Box)(({ theme }) => ({
  minHeight: '100vh',
  backgroundColor: theme.palette.background.default,
}));

const ContentContainer = styled(Box)(({ theme }) => ({
  padding: theme.spacing(4),
  paddingTop: theme.spacing(8),
}));

const MotionPaper = motion(Paper);

const ViewerLayout = styled(Box)(({ theme }) => ({
  display: 'grid',
  gridTemplateColumns: '300px 1fr',
  gap: theme.spacing(3),
  width: '100%',
  maxWidth: '100%',
  margin: '0 auto',
  '& .viewer-section': {
    display: 'flex',
    flexDirection: 'column',
  },
}));

const ControlPanel = styled(MotionPaper)(({ theme }) => ({
  padding: theme.spacing(3),
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(3),
  background: 'rgba(255, 255, 255, 0.03)',
  height: 'fit-content',
}));

const GlassContainer = styled(MotionPaper)(({ theme }) => ({
  padding: theme.spacing(3),
  width: '100%',
  maxWidth: '100%',
  margin: '0 auto',
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(3),
}));

const ViewerContainer = styled(Box)(({ theme }) => ({
  aspectRatio: '16/10',
  width: '100%',
  borderRadius: theme.spacing(3),
  overflow: 'hidden',
  marginBottom: theme.spacing(4),
  backgroundColor: 'transparent',
}));

const StyledAppBar = styled(AppBar)(({ theme }) => ({
  background: 'transparent',
  backdropFilter: 'blur(10px)',
  boxShadow: 'none',
  borderBottom: 'none',
  '& .MuiToolbar-root': {
    borderBottom: 'none',
  },
}));

const StyledToolbar = styled(Toolbar)(({ theme }) => ({
  justifyContent: 'space-between',
  padding: theme.spacing(2, 4),
  background: 'transparent',
  border: 'none',
}));

function App() {
  return (
    <ThemeProvider theme={theme}>
      <MainContainer>
        <StyledAppBar position="fixed">
          <StyledToolbar>
            <Typography variant="h5" sx={{ 
              fontWeight: 600,
              background: 'linear-gradient(90deg, #fff, #81ECEC)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>
              Brain Visualisation
            </Typography>
          </StyledToolbar>
        </StyledAppBar>

        <ContentContainer>
          <GlassContainer
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Stack spacing={3}>
              <ViewerLayout>
                <ControlPanel
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                >
                  <Typography variant="h6" sx={{ color: 'white', mb: 2 }}>
                    Visualization Controls
                  </Typography>

                  <SimulationControls />
                  <VTKControls />
                </ControlPanel>

                <Box className="viewer-section">
                  <ViewerContainer>
                    <VTPViewer />
                  </ViewerContainer>
                  <NeuronAnalytics />
                </Box>
              </ViewerLayout>
            </Stack>
          </GlassContainer>
        </ContentContainer>
      </MainContainer>
    </ThemeProvider>
  );
}

export default App; 