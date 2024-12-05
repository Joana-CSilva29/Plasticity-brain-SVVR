import React, { useState, useEffect } from 'react';
import { 
  AppBar, 
  Toolbar, 
  Typography, 
  Container,
  List,
  ListItem,
  ListItemText,
  Paper,
  Grid,
  Button,
  ThemeProvider,
  Box,
  Slider,
  IconButton,
  Stack,
  alpha,
  Select,
  MenuItem,
  FormControl,
  InputLabel
} from '@mui/material';
import { styled } from '@mui/material/styles';
import VTPViewer from './components/VTPViewer';
import { theme } from './theme';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import { motion } from 'framer-motion';
import vtkColorMaps from '@kitware/vtk.js/Rendering/Core/ColorTransferFunction/ColorMaps';
import VTKControls from './components/VTKControls';
import { VTKProvider } from './context/VTKContext';

const Input = styled('input')({
  display: 'none',
});

const StyledFileList = styled(Paper)(({ theme }) => ({
  height: '100%',
  overflowY: 'auto',
  padding: theme.spacing(2),
  backgroundColor: '#ffffff',
  borderRadius: theme.spacing(1),
  boxShadow: '0 2px 4px rgba(0,0,0,0.08)',
}));

const MainContainer = styled(Box)(({ theme }) => ({
  minHeight: '100vh',
  backgroundColor: theme.palette.background.default,
}));

const ContentContainer = styled(Box)(({ theme }) => ({
  padding: theme.spacing(4),
  paddingTop: theme.spacing(8),
}));

const MotionPaper = motion(Paper);
const MotionButton = motion(Button);

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

const FileButton = styled(MotionButton)(({ theme, isSelected }) => ({
  flex: '1 1 150px',
  minHeight: 60,
  background: isSelected 
    ? theme.palette.gradients.blue 
    : 'rgba(255, 255, 255, 0.05)',
  color: '#ffffff',
  fontSize: '1rem',
  fontWeight: 600,
  border: 'none',
  position: 'relative',
  overflow: 'hidden',
  transition: 'all 0.3s ease',
  '&:hover': {
    background: isSelected 
      ? theme.palette.gradients.blue 
      : 'rgba(255, 255, 255, 0.1)',
    transform: 'translateY(-2px)',
  },
}));

const PlayButton = styled(IconButton)(({ theme }) => ({
  width: 60,
  height: 60,
  background: theme.palette.gradients.purple,
  color: '#ffffff',
  '&:hover': {
    background: theme.palette.gradients.purple,
    transform: 'scale(1.1)',
  },
  transition: 'all 0.3s ease',
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

const COLORMAPS = vtkColorMaps.rgbPresetNames;
const REPRESENTATIONS = [
  { value: 0, label: 'Points' },
  { value: 1, label: 'Wireframe' },
  { value: 2, label: 'Surface' },
];

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

const TimelineContainer = styled(Box)(({ theme }) => ({
  background: 'rgba(255, 255, 255, 0.03)',
  borderRadius: theme.spacing(2),
  padding: theme.spacing(2),
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(2),
  marginTop: theme.spacing(2),
}));

function App() {
  const [selectedSimulation, setSelectedSimulation] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [timelineValue, setTimelineValue] = useState(0);
  
  const [dataSources, setDataSources] = useState([
    {
      type: 'Neurons',
      fileUrl: 'http://localhost:5000/files/neurons.vtp',
      options: {
        representation: '1:0:0',
        opacity: 1.0,
        pointSize: 3,
        lineWidth: 1
      }
    },
    {
      type: 'Connections',
      fileUrl: 'http://localhost:5000/files/connections.vtp',
      options: {
        representation: '1:2:0',
        opacity: 0.7,
        lineWidth: 2,
        inColor: [46/255, 204/255, 113/255],  // Green
        outColor: [230/255, 126/255, 34/255]   // Orange
      }
    }
  ]);

  const updateDataSource = (index, newSource) => {
    const newSources = [...dataSources];
    newSources[index] = newSource;
    setDataSources(newSources);
  };

  const handleSimulationSelect = (simulationId) => {
    setSelectedSimulation(simulationId);
    // Here you could load different VTP files based on the selected simulation
  };

  return (
    <ThemeProvider theme={theme}>
      <VTKProvider>
        <MainContainer>
          <StyledAppBar position="fixed">
            <StyledToolbar>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Typography 
                  variant="h5" 
                  sx={{ 
                    fontWeight: 600,
                    background: 'linear-gradient(90deg, #fff, #81ECEC)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                  }}
                >
                  VTP Viewer
                </Typography>
              </Box>
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

                    <VTKControls
                      dataSources={dataSources}
                      updateDataSource={updateDataSource}
                      colorMaps={COLORMAPS}
                    />
                  </ControlPanel>

                  <Box className="viewer-section">
                    <ViewerContainer>
                      <VTPViewer dataSources={dataSources} />
                    </ViewerContainer>

                    <TimelineContainer>
                      <PlayButton onClick={() => setIsPlaying(!isPlaying)}>
                        {isPlaying ? <PauseIcon /> : <PlayArrowIcon />}
                      </PlayButton>
                      <Slider
                        value={timelineValue}
                        onChange={(_, value) => setTimelineValue(value)}
                        sx={{
                          '& .MuiSlider-thumb': {
                            backgroundColor: '#fff',
                          },
                          '& .MuiSlider-track': {
                            background: theme.palette.gradients.blue,
                          },
                        }}
                      />
                    </TimelineContainer>

                    <Stack 
                      direction="row" 
                      spacing={2} 
                      sx={{ 
                        flexWrap: 'wrap', 
                        gap: 2,
                        mt: 2,
                      }}
                    >
                      <FileButton
                        component={motion.button}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        isSelected={selectedSimulation === 'sim1'}
                        onClick={() => handleSimulationSelect('sim1')}
                      >
                        Simulation 1
                      </FileButton>
                      <FileButton
                        component={motion.button}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        isSelected={selectedSimulation === 'sim2'}
                        onClick={() => handleSimulationSelect('sim2')}
                      >
                        Simulation 2
                      </FileButton>
                      <FileButton
                        component={motion.button}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        isSelected={selectedSimulation === 'sim3'}
                        onClick={() => handleSimulationSelect('sim3')}
                      >
                        Simulation 3
                      </FileButton>
                      <FileButton
                        component={motion.button}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        isSelected={selectedSimulation === 'sim4'}
                        onClick={() => handleSimulationSelect('sim4')}
                      >
                        Simulation 4
                      </FileButton>
                    </Stack>
                  </Box>
                </ViewerLayout>
              </Stack>
            </GlassContainer>
          </ContentContainer>
        </MainContainer>
      </VTKProvider>
    </ThemeProvider>
  );
}

export default App; 