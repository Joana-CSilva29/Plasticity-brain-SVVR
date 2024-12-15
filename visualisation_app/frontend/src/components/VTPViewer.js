import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import '@kitware/vtk.js/Rendering/Profiles/Geometry';
import vtkFullScreenRenderWindow from '@kitware/vtk.js/Rendering/Misc/FullScreenRenderWindow';
import vtkActor from '@kitware/vtk.js/Rendering/Core/Actor';
import vtkMapper from '@kitware/vtk.js/Rendering/Core/Mapper';
import vtkXMLPolyDataReader from '@kitware/vtk.js/IO/XML/XMLPolyDataReader';
import vtkColorTransferFunction from '@kitware/vtk.js/Rendering/Core/ColorTransferFunction';
import vtkPixelSpaceCallbackMapper from '@kitware/vtk.js/Rendering/Core/PixelSpaceCallbackMapper';
import vtk from '@kitware/vtk.js/vtk';
import vtkOrientationMarkerWidget from '@kitware/vtk.js/Interaction/Widgets/OrientationMarkerWidget';
import vtkAnnotatedCubeActor from '@kitware/vtk.js/Rendering/Core/AnnotatedCubeActor';
import vtkTubeFilter from '@kitware/vtk.js/Filters/General/TubeFilter';
import { styled, useTheme } from '@mui/material/styles';
import { Box, Typography, CircularProgress, Button } from '@mui/material';
import { useVTKState, useVTKDispatch } from '../context/VTKContext';
import Tooltip from './Tooltip';
import { SIMULATION_TYPES, VISUALIZATION_MODES } from '../context/VTKContext';
import { useStimulusVisualization } from '../hooks/vtk/useStimulusVisualization';


const FIXED_MIN = -70;  // Fixed minimum membrane potential (mV)
const FIXED_MAX = -30;  // Fixed maximum membrane potential (mV)

const ViewerContainer = styled(Box)({
  width: '100%',
  height: '100%',
  position: 'relative',
  backgroundColor: 'transparent',
  minHeight: '400px',
  display: 'block',
});

const VTKContainer = styled(Box)({
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  '& > div': {
    width: '100%',
    height: '100%',
  },
  minHeight: '400px',
  minWidth: '300px',
});

const InfoOverlay = styled(Box)(({ theme }) => ({
  position: 'absolute',
  top: theme.spacing(1),
  left: '50%',
  transform: 'translateX(-50%)',
  color: 'white',
  padding: theme.spacing(1),
  fontSize: '0.8rem',
  zIndex: 1,
  pointerEvents: 'none',
  textAlign: 'center',
}));

const StyledTypography = styled(Typography)({
  fontSize: '0.9rem',
});

const LoadingOverlay = styled(Box)({
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: 'rgba(0, 0, 0, 0.7)',
  zIndex: 2,
  gap: '16px',
});

const ToggleButton = styled(Button)(({ theme, active }) => ({
  position: 'absolute',
  top: '10px',
  left: '10px',
  zIndex: 1,
  backgroundColor: active ? theme.palette.primary.main : 'rgba(255, 255, 255, 0.05)',
  borderColor: active ? theme.palette.primary.main : 'rgba(255, 255, 255, 0.1)',
  '&:hover': {
    backgroundColor: active ? theme.palette.primary.dark : 'rgba(255, 255, 255, 0.1)',
    borderColor: active ? theme.palette.primary.dark : 'rgba(255, 255, 255, 0.2)',
  }
}));

const ColorLegend = styled(Box)(({ theme }) => ({
  position: 'absolute',
  bottom: theme.spacing(2),
  left: '50%',
  transform: 'translateX(-50%)',
  background: 'rgba(0, 0, 0, 0.7)',
  padding: theme.spacing(1),
  borderRadius: theme.shape.borderRadius,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: theme.spacing(1),
  zIndex: 1,
  minWidth: '200px',
}));

const findClosestTimestepIndex = (timesteps, targetTime) => {
  if (!timesteps?.length) return -1;
  
  return timesteps.reduce((closest, current, index) => {
    const currentDiff = Math.abs(current - targetTime);
    const closestDiff = Math.abs(timesteps[closest] - targetTime);
    return currentDiff < closestDiff ? index : closest;
  }, 0);
};

const calculateCalciumDifference = (currentLevel, targetLevel) => {
  if (typeof currentLevel !== 'number' || typeof targetLevel !== 'number') {
    return 0;
  }
  // Calculate relative difference as a percentage (0-1 scale)
  return Math.abs(currentLevel - targetLevel) / targetLevel;
};

const useCalciumVisualization = (calciumData, currentTimestep) => {
  return useMemo(() => {
    if (!calciumData?.timesteps?.length || !calciumData?.areas) {
      return null;
    }

    const timeIndex = findClosestTimestepIndex(calciumData.timesteps, currentTimestep);
    if (timeIndex === -1) {
      console.warn('No valid timestep found for calcium visualization');
      return null;
    }

    const areaData = new Map();
    Object.entries(calciumData.areas).forEach(([areaId, data]) => {
      const currentLevel = data.calcium_levels[timeIndex];
      const targetLevel = data.target_calcium;
      
      if (typeof currentLevel === 'number' && typeof targetLevel === 'number') {
        const difference = calculateCalciumDifference(currentLevel, targetLevel);
        console.log(`Area ${areaId}:`, { currentLevel, targetLevel, difference });
        areaData.set(areaId, {
          difference,
          currentLevel,
          targetLevel,
          neuronCount: data.neuron_count
        });
      }
    });

    return {
      timeIndex,
      timestamp: calciumData.timesteps[timeIndex],
      areaData
    };
  }, [calciumData, currentTimestep]);
};

const hexToRgb = (hex) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
};

const formatSimulationType = (type) => {
  switch (type) {
    case SIMULATION_TYPES.NO_NETWORK:
      return "No Network";
    case SIMULATION_TYPES.CALCIUM:
      return "Calcium";
    case SIMULATION_TYPES.DISABLE:
      return "Disable";
    case SIMULATION_TYPES.STIMULUS:
      return "Stimulus";
    default:
      return type;
  }
};

const VTPViewer = () => {
  const state = useVTKState();
  const dispatch = useVTKDispatch();
  const vtkContainerRef = useRef(null);
  const [containerReady, setContainerReady] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [showLabels, setShowLabels] = useState(false);
  const [labelActor, setLabelActor] = useState(null);
  const labelCanvas = useRef(null);
  const labelContext = useRef(null);
  const context = useRef({
    fullScreenRenderWindow: null,
    actors: new Map(),
    renderer: null,
    renderWindow: null,
    cameraState: null,
    isFirstRender: true,
    readers: new Map(),
    mappers: new Map(),
    lookupTables: new Map(),
    lastSimulationType: null,
    lastTimestep: null,
  });
  const labelPositions = useRef(new Map());
  const [tooltipInfo, setTooltipInfo] = useState(null);
  const [tooltipPosition, setTooltipPosition] = useState(null);
  const [brodmannInfo, setBrodmannInfo] = useState(new Map());
  const [calciumData, setCalciumData] = useState(null);
  const [loadingStates, setLoadingStates] = useState({
    neurons: false,
    connections: false
  });
  const theme = useTheme();
  const [stimulusData, setStimulusData] = useState(null);
  // Add these state variables near your other useState declarations
  const [activityStats, setActivityStats] = useState({
    minActivity: -65,
    maxActivity: -54,
    meanActivity: -60
  });
  // Add this near your other state declarations
  const [flashPhase, setFlashPhase] = useState(0);
  // Add this state to track stimulated neurons
  const [stimulatedNeurons, setStimulatedNeurons] = useState(new Set());

  // Add the calcium visualization data at component level
  const calciumViz = useCalciumVisualization(calciumData, state.currentTimestep);
  const stimulusViz = useStimulusVisualization(stimulusData, state.currentTimestep);

  const cleanupVTKObjects = useCallback(() => {
    // Always clean up readers, mappers, and lookup tables
    context.current.readers.forEach(reader => reader.delete());
    context.current.readers.clear();

    context.current.mappers.forEach(mapper => mapper.delete());
    context.current.mappers.clear();

    context.current.lookupTables.forEach(lut => lut.delete());
    context.current.lookupTables.clear();

    // Clean up actors
    context.current.actors.forEach(actor => {
      if (context.current.renderer) {
        context.current.renderer.removeActor(actor);
      }
      actor.delete();
    });
    context.current.actors.clear();

    // Reset last simulation type
    context.current.lastSimulationType = null;
    context.current.lastTimestep = null;
    
    // Render the empty scene
    if (context.current.renderWindow) {
      context.current.renderWindow.render();
    }
  }, []);

  const saveCameraState = useCallback(() => {
    if (!context.current.renderer) return;
    
    const camera = context.current.renderer.getActiveCamera();
    context.current.cameraState = {
      position: camera.getPosition(),
      focalPoint: camera.getFocalPoint(),
      viewUp: camera.getViewUp(),
      viewAngle: camera.getViewAngle(),
    };
  }, []);

  const restoreCameraState = useCallback(() => {
    if (!context.current.renderer || !context.current.cameraState) return;
    
    const camera = context.current.renderer.getActiveCamera();
    const state = context.current.cameraState;
    
    camera.setPosition(...state.position);
    camera.setFocalPoint(...state.focalPoint);
    camera.setViewUp(...state.viewUp);
    camera.setViewAngle(state.viewAngle);
  }, []);

  // Wait for container to be ready
  useEffect(() => {
    if (vtkContainerRef.current) {
      setContainerReady(true);
    }
  }, []);

  // Initialize VTK viewer
  useEffect(() => {
    if (!containerReady || !vtkContainerRef.current) return;

    // Create the fullscreen window
    const fullScreenRenderer = vtkFullScreenRenderWindow.newInstance({
      rootContainer: vtkContainerRef.current,
      background: [0.1, 0.1, 0.1],
    });

    // Create annotated cube actor
    const axes = vtkAnnotatedCubeActor.newInstance();
    
    // Set the color of the axes using theme-based colors
    const themeColor = theme.palette.primary.main;
    const rgbColor = hexToRgb(themeColor);
    if (rgbColor) {
      const xColor = `rgb(${rgbColor.r}, ${rgbColor.g}, ${rgbColor.b})`;  // Original
      const yColor = `rgb(${Math.min(255, rgbColor.r + 40)}, ${Math.min(255, rgbColor.g + 40)}, ${Math.min(255, rgbColor.b + 40)})`; // Lighter
      const zColor = `rgb(${Math.max(0, rgbColor.r - 40)}, ${Math.max(0, rgbColor.g - 40)}, ${Math.max(0, rgbColor.b - 40)})`; // Darker

      // Configure the cube faces with theme colors and labels
      axes.setDefaultStyle({
        text: '',
        faceColor: xColor,
        edgeThickness: 0.1,
        edgeColor: 'rgb(255, 255, 255)',
        resolution: 400,
      });

      axes.setXPlusFaceProperty({ 
        text: 'A', 
        faceColor: xColor,
        faceRotation: 90 
      });
      axes.setXMinusFaceProperty({ 
        text: 'P', 
        faceColor: xColor,
        faceRotation: -90 
      });
      axes.setYPlusFaceProperty({ 
        text: 'L', 
        faceColor: yColor,
        faceRotation: 180 
      });
      axes.setYMinusFaceProperty({ 
        text: 'R', 
        faceColor: yColor,
        faceRotation: 0 
      });
      axes.setZPlusFaceProperty({ 
        text: 'S', 
        faceColor: zColor,
        faceRotation: 0 
      });
      axes.setZMinusFaceProperty({ 
        text: 'I', 
        faceColor: zColor,
        faceRotation: 0 
      });
    }

    const orientationWidget = vtkOrientationMarkerWidget.newInstance({
      actor: axes,
      interactor: fullScreenRenderer.getInteractor(),
    });

    orientationWidget.setEnabled(true);
    orientationWidget.setViewportCorner(
      vtkOrientationMarkerWidget.Corners.BOTTOM_RIGHT
    );
    orientationWidget.setViewportSize(0.15);
    orientationWidget.setMinPixelSize(100);
    orientationWidget.setMaxPixelSize(300);

    // Store references
    context.current.fullScreenRenderWindow = fullScreenRenderer;
    context.current.renderer = fullScreenRenderer.getRenderer();
    context.current.renderWindow = fullScreenRenderer.getRenderWindow();
    context.current.orientationWidget = orientationWidget;

    // Set initial camera position
    const camera = context.current.renderer.getActiveCamera();
    camera.setPosition(0, 0, 5);
    camera.setFocalPoint(0, 0, 0);
    camera.setViewUp(0, 1, 0);

    setIsInitialized(true);

    // Cleanup
    return () => {
      if (context.current.orientationWidget) {
        context.current.orientationWidget.setEnabled(false);
        context.current.orientationWidget.delete();
      }
      if (context.current.fullScreenRenderWindow) {
        context.current.fullScreenRenderWindow.delete();
      }
      cleanupVTKObjects();
    };
  }, [containerReady, cleanupVTKObjects, theme.palette.primary.main]);

  // Load data with debouncing
  useEffect(() => {
    if (!isInitialized) return;

    let isCancelled = false;

    const loadData = async () => {
      try {
        let isLoadingAnything = false;
        setLoadingProgress(0);
        saveCameraState();

        // Clean up existing objects when simulation type changes
        if (context.current.lastSimulationType !== state.simulationType) {
          cleanupVTKObjects();
        }

        // Load neurons if needed
        if (state.visualizationMode !== VISUALIZATION_MODES.CONNECTIONS_ONLY) {
          const needsNeuronLoad = !context.current.actors.get('neurons') || 
                                 context.current.lastSimulationType !== state.simulationType;
          
          if (needsNeuronLoad) {
            isLoadingAnything = true;
            setLoadingStates(prev => ({ ...prev, neurons: true }));
            
            setLoadingProgress(20);
            const neuronsResponse = await fetch(state.neurons.fileUrl);
            if (isCancelled) return;
            const neuronsBuffer = await neuronsResponse.arrayBuffer();
            if (isCancelled) return;

            setLoadingProgress(40);
            const neuronsReader = vtkXMLPolyDataReader.newInstance();
            context.current.readers.set('neurons', neuronsReader);
            neuronsReader.parseAsArrayBuffer(neuronsBuffer);

            setLoadingProgress(60);
            const neuronsMapper = vtkMapper.newInstance();
            context.current.mappers.set('neurons', neuronsMapper);
            const neuronsActor = vtkActor.newInstance();
            neuronsActor.setMapper(neuronsMapper);
            neuronsMapper.setInputData(neuronsReader.getOutputData(0));

            // Store and add neurons actor
            context.current.actors.set('neurons', neuronsActor);
            context.current.renderer.addActor(neuronsActor);
            
            // Store the current simulation type
            context.current.lastSimulationType = state.simulationType;

            setLoadingStates(prev => ({ ...prev, neurons: false }));
          }

          // Update visibility
          const neuronsActor = context.current.actors.get('neurons');
          if (neuronsActor) {
            neuronsActor.setVisibility(true);
            context.current.renderWindow.render();
          }
        } else {
          const neuronsActor = context.current.actors.get('neurons');
          if (neuronsActor) {
            neuronsActor.setVisibility(false);
            context.current.renderWindow.render();
          }
        }

        // Load connections if needed
        if (state.visualizationMode !== VISUALIZATION_MODES.NEURONS_ONLY) {
          const needsConnectionLoad = !context.current.actors.get('connections') || 
                                    state.currentTimestep !== context.current.lastTimestep;
          
          if (needsConnectionLoad) {
            try {
              isLoadingAnything = true;
              setLoadingStates(prev => ({ ...prev, connections: true }));
              setLoadingProgress(70);
              console.log('Loading connections from:', state.connections.fileUrl);
              
              const connectionsResponse = await fetch(state.connections.fileUrl);
              if (!connectionsResponse.ok) {
                console.log(`No connections available for timestep ${state.currentTimestep}`);
                // Clean up any existing connections
                const oldActor = context.current.actors.get('connections');
                if (oldActor) {
                  context.current.renderer.removeActor(oldActor);
                  oldActor.delete();
                  context.current.actors.delete('connections');
                }
                // Update loading state and continue
                setLoadingStates(prev => ({ ...prev, connections: false }));
                return;  // Exit early but don't throw error
              }
              if (isCancelled) return;
              
              const connectionsBuffer = await connectionsResponse.arrayBuffer();
              if (isCancelled) return;

              setLoadingProgress(80);
              
              // Clean up old connections
              const oldActor = context.current.actors.get('connections');
              if (oldActor) {
                context.current.renderer.removeActor(oldActor);
                oldActor.delete();
              }

              const oldMapper = context.current.mappers.get('connections');
              if (oldMapper) {
                oldMapper.delete();
              }

              const oldReader = context.current.readers.get('connections');
              if (oldReader) {
                oldReader.delete();
              }

              // Create new reader and parse data
              const connectionsReader = vtkXMLPolyDataReader.newInstance();
              context.current.readers.set('connections', connectionsReader);
              connectionsReader.parseAsArrayBuffer(connectionsBuffer);

              const output = connectionsReader.getOutputData(0);
              if (!output) {
                throw new Error('Failed to read connections data');
              }

              // Create tube filter directly on the polydata
              const tubeFilter = vtkTubeFilter.newInstance();
              tubeFilter.setInputData(output);
              tubeFilter.setRadius(0.05);
              tubeFilter.setNumberOfSides(20);
              tubeFilter.setCapping(true);

              // Set up radius variation based on connection weights
              tubeFilter.setInputArrayToProcess(0, 'ConnectionWeight', 'CellData', 'Scalars');
              tubeFilter.setVaryRadius(1);  // Use scalar values to vary radius
              tubeFilter.setRadiusFactor(50.0);  // Amplify the variation

              // Create mapper and actor
              const mapper = vtkMapper.newInstance();
              mapper.setInputConnection(tubeFilter.getOutputPort());
              mapper.setScalarVisibility(false);  // Turn off scalar coloring

              // Simple grey color
              const actor = vtkActor.newInstance();
              actor.setMapper(mapper);
              actor.getProperty().setColor(0.5, 0.5, 0.5); 
              actor.getProperty().setOpacity(0.8);

              // Add to renderer
              context.current.renderer.addActor(actor);
              context.current.actors.set('connections', actor);
              context.current.renderWindow.render();

              // Store references for cleanup
              context.current.mappers.set('connections', mapper);

              setLoadingStates(prev => ({ ...prev, connections: false }));
            } catch (error) {
              console.error('Error loading connections:', error);
              // Clean up any existing connections
              const oldActor = context.current.actors.get('connections');
              if (oldActor) {
                context.current.renderer.removeActor(oldActor);
                oldActor.delete();
                context.current.actors.delete('connections');
              }
              setLoadingStates(prev => ({ ...prev, connections: false }));
            }
          } else {
            // Just update visibility without reloading
            const actor = context.current.actors.get('connections');
            if (actor) {
              actor.setVisibility(true);
              context.current.renderWindow.render();
            }
          }
        } else {
          // Hide connections
          const actor = context.current.actors.get('connections');
          if (actor) {
            actor.setVisibility(false);
            context.current.renderWindow.render();
          }
        }

        // Handle camera
        if (context.current.isFirstRender) {
          context.current.renderer.resetCamera();
          context.current.isFirstRender = false;
        } else {
          restoreCameraState();
        }

        setLoadingProgress(100);
        context.current.renderWindow.render();

        // Only set loading state if we actually loaded something
        setIsLoading(isLoadingAnything);

        // Store the current timestep
        context.current.lastTimestep = state.currentTimestep;
      } catch (error) {
        console.error('Error loading VTP files:', error);
        setLoadingStates({ neurons: false, connections: false });
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
          setLoadingProgress(0);
        }
      }
    };

    const timeoutId = setTimeout(loadData, 100);

    return () => {
      isCancelled = true;
      clearTimeout(timeoutId);
    };
  }, [
    isInitialized, 
    state.neurons.fileUrl, 
    state.connections.fileUrl,
    state.simulationType,
    state.visualizationMode,
    state.currentTimestep,
    state.connections.options,
    cleanupVTKObjects, 
    saveCameraState, 
    restoreCameraState
  ]);

  // Update properties with debouncing
  useEffect(() => {
    if (!isInitialized) return;

    const timeoutId = setTimeout(() => {
      const neuronsActor = context.current.actors.get('neurons');
      const connectionsActor = context.current.actors.get('connections');

      if (neuronsActor) {
        const property = neuronsActor.getProperty();
        // Only update point size directly if not in calcium mode
        if (state.simulationType !== SIMULATION_TYPES.CALCIUM) {
          property.setPointSize(state.neurons.options.pointSize);
          // Ensure we maintain color visibility
          const neuronsMapper = context.current.mappers.get('neurons');
          if (neuronsMapper) {
            neuronsMapper.setScalarVisibility(true);
          }
        }
        property.setOpacity(state.neurons.options.opacity);
      }

      if (connectionsActor) {
        const property = connectionsActor.getProperty();
        property.setOpacity(state.connections.options.opacity);
      }

      context.current.renderWindow?.render();
    }, 100);

    return () => clearTimeout(timeoutId);
  }, [isInitialized, state.neurons.options, state.connections.options, state.simulationType]);

  const updateCanvasSize = useCallback(() => {
    if (!labelCanvas.current || !vtkContainerRef.current) return;
    
    const container = vtkContainerRef.current;
    const { width, height } = container.getBoundingClientRect();
    
    // Update canvas dimensions
    labelCanvas.current.width = width;
    labelCanvas.current.height = height;
    
    // Force label redraw by triggering a render
    if (context.current.renderWindow) {
      context.current.renderWindow.render();
    }
  }, []);

  // Replace the existing canvas setup effect with this updated version
  useEffect(() => {
    if (!vtkContainerRef.current || !isInitialized) return;

    if (!labelCanvas.current) {
      const canvas = document.createElement('canvas');
      canvas.style.position = 'absolute';
      canvas.style.top = '0';
      canvas.style.left = '0';
      canvas.style.pointerEvents = 'none';
      vtkContainerRef.current.appendChild(canvas);
      labelCanvas.current = canvas;
      labelContext.current = canvas.getContext('2d');
    }

    // Initial canvas size update
    updateCanvasSize();

    // Add resize observer
    const resizeObserver = new ResizeObserver(() => {
      updateCanvasSize();
    });

    resizeObserver.observe(vtkContainerRef.current);
    
    return () => {
      resizeObserver.disconnect();
      if (labelCanvas.current) {
        labelCanvas.current.remove();
        labelCanvas.current = null;
        labelContext.current = null;
      }
    };
  }, [isInitialized, updateCanvasSize]);

  // Add this function to create labels
  const createLabels = useCallback(async () => {
    if (!context.current.renderer || !labelContext.current) {
      console.log('Missing renderer or label context');
      return;
    }

    // Clean up existing label actor
    if (labelActor) {
      context.current.renderer.removeActor(labelActor);
      labelActor.delete();
    }

    // Fetch area labels
    const areaMap = await fetchAreaLabels();
    if (!areaMap) {
      console.log('Failed to load area labels');
      return;
    }

    const psMapper = vtkPixelSpaceCallbackMapper.newInstance();
    psMapper.setUseZValues(true);
    const actor = vtkActor.newInstance();
    actor.setMapper(psMapper);

    try {
      // Get centroids from the neurons data
      const neuronsReader = context.current.readers.get('neurons');
      if (!neuronsReader) {
        console.log('No neurons reader found');
        return;
      }

      const polyData = neuronsReader.getOutputData(0);
      if (!polyData) {
        console.log('No polyData found');
        return;
      }

      const points = polyData.getPoints();
      if (!points) {
        console.log('No points found');
        return;
      }

      const pointData = polyData.getPointData();
      if (!pointData) {
        console.log('No pointData found');
        return;
      }

      const colors = pointData.getScalars();
      if (!colors) {
        console.log('No colors found');
        return;
      }

      // Calculate centroids for each area
      const areaCentroids = new Map();
      const areaColorMap = new Map();

      // Group points by area
      for (let i = 0; i < points.getNumberOfPoints(); i++) {
        const point = points.getPoint(i);
        const areaId = areaMap.get(i + 1);
        
        if (!areaId) continue;

        if (!areaCentroids.has(areaId)) {
          areaCentroids.set(areaId, []);
          const color = colors.getTuple(i);
          areaColorMap.set(areaId, color);
        }
        areaCentroids.get(areaId).push(point);
      }

      // Calculate average position for each area
      const labelPoints = [];
      areaCentroids.forEach((points, areaId) => {
        // Calculate the bounding box for this area
        let minX = Infinity, minY = Infinity, minZ = Infinity;
        let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
        
        points.forEach(point => {
          minX = Math.min(minX, point[0]);
          minY = Math.min(minY, point[1]);
          minZ = Math.min(minZ, point[2]);
          maxX = Math.max(maxX, point[0]);
          maxY = Math.max(maxY, point[1]);
          maxZ = Math.max(maxZ, point[2]);
        });

        // Use the center of the bounding box as the label position
        const centroid = [
          (minX + maxX) / 2,
          (minY + maxY) / 2,
          (minZ + maxZ) / 2
        ];

        labelPoints.push({ 
          centroid, 
          label: areaId, 
          color: state.simulationType === SIMULATION_TYPES.NO_NETWORK ? areaColorMap.get(areaId) : [255, 255, 255],  // White for calcium and stimulus
          bounds: { minX, minY, minZ, maxX, maxY, maxZ }
        });
      });

      // Sort label points by depth (Z coordinate) to handle overlapping
      labelPoints.sort((a, b) => b.centroid[2] - a.centroid[2]);

      // Create polydata for the label positions
      const labelPolyData = vtk({
        vtkClass: 'vtkPolyData',
        points: {
          vtkClass: 'vtkPoints',
          dataType: 'Float32Array',
          numberOfComponents: 3,
          values: labelPoints.flatMap(lp => lp.centroid),
        },
        polys: {
          vtkClass: 'vtkCellArray',
          dataType: 'Uint16Array',
          values: labelPoints.map((_, i) => [1, i]).flat(),
        },
      });

      // Create the mapper and set its input directly
      psMapper.setInputData(labelPolyData);

      // Create the callback to render labels
      psMapper.setCallback((coordsList, camera, aspect, depthBuffer) => {
        if (!labelCanvas.current || !labelContext.current) return;

        const ctx = labelContext.current;
        const canvasWidth = labelCanvas.current.width;
        const canvasHeight = labelCanvas.current.height;

        // Clear previous labels
        ctx.clearRect(0, 0, canvasWidth, canvasHeight);

        // Reset label positions
        labelPositions.current.clear();

        coordsList.forEach((xy, idx) => {
          const { label, color } = labelPoints[idx];

          // Calculate relative positions (0 to 1) from the center
          const relX = (xy[0] / canvasWidth) - 0.5;
          const relY = (xy[1] / canvasHeight) - 0.5;

          // Apply scaling and offset to relative positions
          const scale = 0.6;
          const xOffset = -0.30;
          const yOffset = -0.32;

          // Convert back to pixel coordinates
          const x = (relX * scale + 0.5 + xOffset) * canvasWidth;
          const y = canvasHeight - ((relY * scale + 0.5 + yOffset) * canvasHeight);

          // Format label
          const areaNumber = label.split('_')[1];
          const brodmannLabel = `BA ${areaNumber}`;

          // Draw shadow/outline
          ctx.font = 'bold 14px Arial';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.strokeStyle = 'rgba(0, 0, 0, 0.8)';
          ctx.lineWidth = 3;
          ctx.strokeText(brodmannLabel, x, y);

          // Use white for calcium and stimulus modes, original colors for no-network mode
          ctx.fillStyle = state.simulationType === SIMULATION_TYPES.NO_NETWORK
            ? `rgb(${Math.round(color[0] * 255)}, ${Math.round(color[1] * 255)}, ${Math.round(color[2] * 255)})`
            : 'rgb(255, 255, 255)';
          ctx.fillText(brodmannLabel, x, y);

          // Store label position
          labelPositions.current.set(`${x},${y}`, {
            label: label,
            brodmannArea: brodmannLabel,
            color,
            bounds: labelPoints[idx].bounds
          });
        });
      });

      // Add actor to renderer
      context.current.renderer.addActor(actor);
      setLabelActor(actor);
      context.current.renderWindow.render();

    } catch (error) {
      console.error('Error creating labels:', error);
    }
  }, [labelActor, state.simulationType]);

  // Add this effect to handle label visibility
  useEffect(() => {
    if (!isInitialized || !context.current.readers.get('neurons')) return;

    if (showLabels && !labelActor) {
      console.log('Creating labels...');
      createLabels().catch(error => {
        console.error('Error in label creation:', error);
      });
    } else if (!showLabels && labelActor) {
      console.log('Removing labels...');
      context.current.renderer.removeActor(labelActor);
      labelActor.delete();
      setLabelActor(null);
      if (labelContext.current) {
        labelContext.current.clearRect(
          0, 
          0, 
          labelCanvas.current.width, 
          labelCanvas.current.height
        );
      }
      context.current.renderWindow.render();
    }
  }, [showLabels, isInitialized, createLabels, labelActor, state.neurons.fileUrl]);

  const fetchAreaLabels = async () => {
    try {
      const response = await fetch(`http://localhost:5000/files/info/area-info.txt`);
      const text = await response.text();
      
      // Parse the text file
      const areaMap = new Map();
      text.split('\n').forEach(line => {
        if (line.startsWith('#') || !line.trim()) return;
        
        const [id, x, y, z, area] = line.trim().split(/\s+/);
        if (area?.startsWith('area_')) {
          areaMap.set(parseInt(id), area);
        }
      });
      
      return areaMap;
    } catch (error) {
      console.error('Error loading area labels:', error);
      return null;
    }
  };

  // Add click handler function
  const handleCanvasClick = useCallback((event) => {
    if (!labelCanvas.current || !showLabels) return;

    const rect = labelCanvas.current.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    // Check if click is near any label (within 20 pixels)
    labelPositions.current.forEach((labelInfo, pos) => {
      const [labelX, labelY] = pos.split(',').map(Number);
      const distance = Math.sqrt(
        Math.pow(x - labelX, 2) + 
        Math.pow(y - labelY, 2)
      );

      if (distance < 20) {
        // Handle label click - you can show more information, highlight the area, etc.
        console.log('Clicked label:', labelInfo);
        // Optional: Highlight the corresponding area
        highlightArea(labelInfo.bounds);
      }
    });
  }, [showLabels]);

  // Add click listener setup
  useEffect(() => {
    if (!labelCanvas.current) return;
    
    labelCanvas.current.addEventListener('click', handleCanvasClick);
    return () => {
      if (labelCanvas.current) {
        labelCanvas.current.removeEventListener('click', handleCanvasClick);
      }
    };
  }, [handleCanvasClick]);

  // Optional: Add highlight function
  const highlightArea = (bounds) => {
    // You could create a temporary highlight actor or modify the existing visualization
    // This is just a placeholder for the highlighting logic
    console.log('Highlighting area with bounds:', bounds);
  };

  // Update the camera presets
  const cameraPresets = {
    front: { position: [100, 0, 0], up: [0, 0, 1] },    // Switched with right view
    top: { position: [0, 0, 100], up: [0, 1, 0] },
    right: { position: [0, -100, 0], up: [0, 0, 1] }    // Switched with front view
  };

  // Update the setCameraPosition function
  const setCameraPosition = (preset) => {
    if (!context.current.renderer) return;
    
    const camera = context.current.renderer.getActiveCamera();
    const initialPosition = camera.getPosition();
    const initialFocalPoint = camera.getFocalPoint();
    const initialViewUp = camera.getViewUp();
    const distance = camera.getDistance();

    // Get the center of the brain (center of all points)
    const neuronsReader = context.current.readers.get('neurons');
    const polyData = neuronsReader.getOutputData(0);
    const bounds = polyData.getBounds();
    const center = [
      (bounds[0] + bounds[1]) / 2,
      (bounds[2] + bounds[3]) / 2,
      (bounds[4] + bounds[5]) / 2
    ];

    // Calculate target position based on preset while maintaining distance
    const targetPosition = cameraPresets[preset].position.map(coord => coord * distance / 100);
    const targetViewUp = cameraPresets[preset].up;

    // Animate camera movement
    const animationDuration = 2000;
    const startTime = Date.now();

    const animate = () => {
      const now = Date.now();
      const elapsed = now - startTime;
      const t = Math.min(elapsed / animationDuration, 1);
      
      const easeT = t < 0.5 
        ? 4 * t * t * t 
        : 1 - Math.pow(-2 * t + 2, 3) / 2;

      // Interpolate position
      const newPosition = [
        initialPosition[0] + (targetPosition[0] - initialPosition[0]) * easeT,
        initialPosition[1] + (targetPosition[1] - initialPosition[1]) * easeT,
        initialPosition[2] + (targetPosition[2] - initialPosition[2]) * easeT
      ];

      // Interpolate view up vector
      const newViewUp = [
        initialViewUp[0] + (targetViewUp[0] - initialViewUp[0]) * easeT,
        initialViewUp[1] + (targetViewUp[1] - initialViewUp[1]) * easeT,
        initialViewUp[2] + (targetViewUp[2] - initialViewUp[2]) * easeT
      ];

      camera.setPosition(...newPosition);
      camera.setViewUp(...newViewUp);
      
      // Keep the focal point at the center of the brain
      camera.setFocalPoint(...center);
      
      // Reset clipping range to ensure all objects are visible
      context.current.renderer.resetCameraClippingRange();
      context.current.renderWindow.render();

      if (t < 1) {
        requestAnimationFrame(animate);
      }
    };

    animate();
  };

  // Add this function to handle mouse movement
  const handleMouseMove = useCallback((event) => {
    if (!labelCanvas.current || !showLabels) {
      setTooltipInfo(null);
      return;
    }

    const rect = labelCanvas.current.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    let foundLabel = false;
    labelPositions.current.forEach((labelInfo, pos) => {
      const [labelX, labelY] = pos.split(',').map(Number);
      const distance = Math.sqrt(
        Math.pow(x - labelX, 2) + 
        Math.pow(y - labelY, 2)
      );

      if (distance < 20) {
        foundLabel = true;
        const areaId = labelInfo.label;  // Use the original area_XX format
        const brodmannId = areaId.replace('area_', 'BA_');
        const areaInfo = brodmannInfo.get(brodmannId);
        
        if (areaInfo) {
          if (state.simulationType === SIMULATION_TYPES.CALCIUM) {
            const areaData = calciumViz?.areaData.get(areaId);
            setTooltipInfo({
              ...labelInfo,
              name: areaInfo.name,
              description: areaInfo.description,
              calciumDiff: areaData 
                ? `Calcium difference from target: ${(areaData.difference * 100).toFixed(4)}%`
                : 'No calcium data available',
              ...(areaData && {
                details: `Current: ${areaData.currentLevel.toFixed(4)}, Target: ${areaData.targetLevel.toFixed(4)}`
              })
            });
          } else if (state.simulationType === SIMULATION_TYPES.STIMULUS) {
            const areaData = stimulusViz?.areaData.get(areaId);
            setTooltipInfo({
              ...labelInfo,
              name: areaInfo.name,
              description: areaInfo.description,
              activityInfo: areaData 
                ? `Membrane potential: ${areaData.activityLevel.toFixed(2)} mV`
                : 'No activity data available',
              ...(areaData?.isStimulated && {
                stimulationStatus: 'Currently under stimulation'
              })
            });
          } else {
            setTooltipInfo({
              ...labelInfo,
              name: areaInfo.name,
              description: areaInfo.description
            });
          }
        }
      }
    });

    if (!foundLabel) {
      setTooltipInfo(null);
    }
  }, [showLabels, brodmannInfo, state.simulationType, calciumViz, stimulusViz]);

  // Add this effect to handle mouse movement
  useEffect(() => {
    if (!labelCanvas.current) return;
    
    const container = vtkContainerRef.current;
    container.addEventListener('mousemove', handleMouseMove);
    container.addEventListener('mouseleave', () => setTooltipInfo(null));
    
    return () => {
      container.removeEventListener('mousemove', handleMouseMove);
      container.removeEventListener('mouseleave', () => setTooltipInfo(null));
    };
  }, [handleMouseMove]);

  // Add this new effect to load the Brodmann info
  useEffect(() => {
    const loadBrodmannInfo = async () => {
      try {
        const response = await fetch('http://localhost:5000/files/info/brodmann-info.txt');
        const text = await response.text();
        const info = new Map();
        
        text.split('\n').forEach(line => {
          if (!line.trim()) return;
          const [id, name, description] = line.split('|');
          if (id && name) {
            const key = id.trim();
            info.set(key, { 
              name: name.trim(),
              description: description.trim()
            });
            console.log('Added Brodmann info:', key, info.get(key));
          }
        });
        
        console.log('Loaded Brodmann info size:', info.size);
        setBrodmannInfo(info);
      } catch (error) {
        console.error('Error loading Brodmann info:', error);
      }
    };

    loadBrodmannInfo();
  }, []);

  // 1. First define the calcium visualization function
  const updateCalciumVisualization = useCallback(async () => {
    if (!isInitialized || 
        !calciumData || 
        state.simulationType !== SIMULATION_TYPES.CALCIUM ||
        !calciumViz) {
      return;
    }

    const neuronsReader = context.current.readers.get('neurons');
    const neuronsMapper = context.current.mappers.get('neurons');
    if (!neuronsReader || !neuronsMapper) {
      console.warn('Required VTK objects not available');
      return;
    }

    try {
      // Load and process area mapping
      const areaMapping = new Map();
      const response = await fetch('http://localhost:5000/files/info/area-info.txt');
      const text = await response.text();
      
      text.split('\n').forEach(line => {
        if (!line.startsWith('#') && line.trim()) {
          const [id, , , , area] = line.trim().split(/\s+/);
          if (area?.startsWith('area_')) {
            areaMapping.set(parseInt(id), area);
          }
        }
      });

      // Set up VTK data structures
      const polyData = neuronsReader.getOutputData(0);
      const points = polyData.getPoints();
      const numPoints = points.getNumberOfPoints();

      // Create array for calcium differences
      const calciumDiffs = new Float32Array(numPoints);

      // Calculate differences for each neuron
      let maxDiff = 0;
      for (let i = 0; i < numPoints; i++) {
        const neuronId = i + 1;
        const areaId = areaMapping.get(neuronId);
        const areaInfo = calciumViz.areaData.get(areaId);
        
        const diff = areaInfo?.difference ?? 0;
        calciumDiffs[i] = diff;
        maxDiff = Math.max(maxDiff, diff);
      }

      // Create and configure VTK scalar array
      const calciumArray = vtk({
        vtkClass: 'vtkDataArray',
        name: 'calcium_differences',
        numberOfComponents: 1,
        values: calciumDiffs
      });

      // Update polydata with new scalars
      polyData.getPointData().setScalars(calciumArray);

      // Create and configure color mapping
      const lut = vtkColorTransferFunction.newInstance();
      context.current.lookupTables.set('calcium', lut);

      // Configure color transfer function to match the legend
      lut.addRGBPoint(0.0, 0.0, 1.0, 0.0);     // Green for no difference
      lut.addRGBPoint(0.005, 0.5, 1.0, 0.0);   // Light green for 0.5% difference
      lut.addRGBPoint(0.01, 1.0, 1.0, 0.0);    // Yellow for 1% difference
      lut.addRGBPoint(0.015, 1.0, 0.5, 0.0);   // Orange for 1.5% difference
      lut.addRGBPoint(0.02, 1.0, 0.0, 0.0);    // Red for 2% or greater difference

      // Configure mapper
      neuronsMapper.setInputData(polyData);
      neuronsMapper.setScalarVisibility(true);
      neuronsMapper.setLookupTable(lut);
      neuronsMapper.setScalarRange(0, Math.max(0.02, maxDiff)); // Adjusted range to make small differences more visible

      // Configure actor properties
      const actor = context.current.actors.get('neurons');
      if (actor) {
        const property = actor.getProperty();
        property.setAmbient(0.3);
        property.setDiffuse(0.7);
        
        // Map point size based on calcium difference
        const baseSize = state.neurons.options.pointSize;
        const maxSizeMultiplier = 3; // Maximum size will be 3x the base size
        const scaledSize = baseSize //* (1 + (maxSizeMultiplier - 1) * (maxDiff > 0.5 ? 1 : maxDiff / 0.5));
        property.setPointSize(scaledSize);
      }

      // Trigger updates
      polyData.modified();
      neuronsMapper.modified();
      context.current.renderWindow.render();

    } catch (error) {
      console.error('Error updating calcium visualization:', error);
    }
  }, [isInitialized, calciumData, state.simulationType, state.currentTimestep, calciumViz, state.neurons.options.pointSize]);

  // 2. Then use it in effects
  useEffect(() => {
    const loadCalciumData = async () => {
      if (state.simulationType !== SIMULATION_TYPES.CALCIUM) return;
      
      try {
        const response = await fetch('http://localhost:5000/files/calcium/calcium_data.json');
        const data = await response.json();
        setCalciumData(data);
        
        // After setting calcium data, trigger visualization update if neurons are loaded
        if (context.current.actors.get('neurons')) {
          setTimeout(() => updateCalciumVisualization(), 0);
        }
      } catch (error) {
        console.error('Error loading calcium data:', error);
      }
    };

    loadCalciumData();
  }, [state.simulationType, updateCalciumVisualization]);

  // 3. Add the timestep update effect
  useEffect(() => {
    updateCalciumVisualization();
  }, [updateCalciumVisualization, state.currentTimestep]);

  // Update the simulation type effect
  useEffect(() => {
    if (!isInitialized || !context.current.mappers) return;
    
    const neuronsMapper = context.current.mappers.get('neurons');
    if (!neuronsMapper) return;

    if (state.simulationType === SIMULATION_TYPES.CALCIUM) {
      console.log('Switching to calcium visualization mode');
      // Don't reset anything - let calcium visualization take over
    } else {
      console.log('Resetting to default visualization mode');
      const actor = context.current.actors.get('neurons');
      if (actor) {
        actor.getProperty().setColor(1, 1, 1);
        // Reset point size to base value from options
        actor.getProperty().setPointSize(state.neurons.options.pointSize);
      }
      
      // Clear any existing lookup tables
      context.current.lookupTables.forEach(lut => lut.delete());
      context.current.lookupTables.clear();
      
      neuronsMapper.setLookupTable(null);
      neuronsMapper.setScalarVisibility(false);
      neuronsMapper.modified();
      context.current.renderWindow.render();
    }
  }, [isInitialized, state.simulationType, state.neurons.options.pointSize]);

  // Add this new effect after your other useEffects
  useEffect(() => {
    if (!isInitialized || !context.current.actors) return;

    console.log('Visualization mode changed:', {
      mode: state.visualizationMode,
      loadConnections: state.loadConnections,
      hasNeurons: context.current.actors.has('neurons'),
      hasConnections: context.current.actors.has('connections')
    });

    const neuronsActor = context.current.actors.get('neurons');
    const connectionsActor = context.current.actors.get('connections');

    if (neuronsActor) {
      const shouldShowNeurons = state.visualizationMode !== VISUALIZATION_MODES.CONNECTIONS_ONLY;
      console.log('Setting neurons visibility:', shouldShowNeurons);
      neuronsActor.setVisibility(shouldShowNeurons);
    }

    if (connectionsActor) {
      const shouldShowConnections = state.visualizationMode !== VISUALIZATION_MODES.NEURONS_ONLY;
      console.log('Setting connections visibility:', shouldShowConnections);
      connectionsActor.setVisibility(shouldShowConnections);
    }

    if (context.current.renderWindow) {
      context.current.renderWindow.render();
    }
  }, [isInitialized, state.visualizationMode]);

  // Add this effect to handle simulation type changes
  useEffect(() => {
    if (!isInitialized) return;

    // Reset state when simulation type changes
    setLoadingProgress(0);
    setLoadingStates({
      neurons: false,
      connections: false
    });
    
    // Force cleanup of existing objects
    cleanupVTKObjects();
    
    // Reset camera on simulation change
    if (context.current.renderer) {
      context.current.renderer.resetCamera();
      context.current.renderWindow?.render();
    }
    
  }, [state.simulationType, isInitialized, cleanupVTKObjects]);

  // Add this function near your other camera-related functions
  const focusHighestDifference = useCallback(async () => {
    if (!isInitialized || !calciumViz || !context.current.renderer) return;

    try {
      // Pre-calculate all the data we need before starting animation
      const { maxDiffAreaId, targetPoint, center } = await (async () => {
        // Find area with highest difference
        let maxDiff = 0;
        let maxDiffAreaId = null;
        calciumViz.areaData.forEach((data, areaId) => {
          if (data.difference > maxDiff) {
            maxDiff = data.difference;
            maxDiffAreaId = areaId;
          }
        });

        if (!maxDiffAreaId) return null;

        // Get all the points data at once
        const neuronsReader = context.current.readers.get('neurons');
        const polyData = neuronsReader.getOutputData(0);
        const points = polyData.getPoints();
        const areaPoints = [];

        // Get the center of the brain
        const bounds = polyData.getBounds();
        const center = [
          (bounds[0] + bounds[1]) / 2,
          (bounds[2] + bounds[3]) / 2,
          (bounds[4] + bounds[5]) / 2
        ];

        // Load area mapping once
        const response = await fetch('http://localhost:5000/files/info/area-info.txt');
        const text = await response.text();
        const areaMapping = new Map();
        
        text.split('\n').forEach(line => {
          if (!line.startsWith('#') && line.trim()) {
            const [id, , , , area] = line.trim().split(/\s+/);
            if (area?.startsWith('area_')) {
              areaMapping.set(parseInt(id), area);
            }
          }
        });

        // Collect points for target area
        for (let i = 0; i < points.getNumberOfPoints(); i++) {
          const neuronId = i + 1;
          const areaId = areaMapping.get(neuronId);
          if (areaId === maxDiffAreaId) {
            areaPoints.push(points.getPoint(i));
          }
        }

        if (areaPoints.length === 0) return null;

        // Calculate target point (centroid of area)
        const targetPoint = areaPoints.reduce(
          (acc, point) => [
            acc[0] + point[0], 
            acc[1] + point[1], 
            acc[2] + point[2]
          ],
          [0, 0, 0]
        ).map(coord => coord / areaPoints.length);

        return { maxDiffAreaId, targetPoint, center };
      })();

      if (!targetPoint || !center) return;

      // Get camera initial state
      const camera = context.current.renderer.getActiveCamera();
      const initialPosition = camera.getPosition();
      const initialFocalPoint = camera.getFocalPoint();
      const distance = camera.getDistance();

      // Calculate direction from center to target point
      const direction = [
        targetPoint[0] - center[0],
        targetPoint[1] - center[1],
        targetPoint[2] - center[2]
      ];
      const length = Math.sqrt(direction[0]**2 + direction[1]**2 + direction[2]**2);

      // Calculate target camera position
      const targetPosition = [
        center[0] + (direction[0] / length) * distance,
        center[1] + (direction[1] / length) * distance,
        center[2] + (direction[2] / length) * distance
      ];

      // Animation setup
      const animationDuration = 2000;
      const startTime = Date.now();
      let animationFrameId;

      const animate = () => {
        const now = Date.now();
        const elapsed = now - startTime;
        const t = Math.min(elapsed / animationDuration, 1);

        const easeT = t < 0.5 
          ? 4 * t * t * t 
          : 1 - Math.pow(-2 * t + 2, 3) / 2;

        // Interpolate position
        const newPosition = [
          initialPosition[0] + (targetPosition[0] - initialPosition[0]) * easeT,
          initialPosition[1] + (targetPosition[1] - initialPosition[1]) * easeT,
          initialPosition[2] + (targetPosition[2] - initialPosition[2]) * easeT
        ];

        camera.setPosition(...newPosition);
        camera.setFocalPoint(...center);
        context.current.renderer.resetCameraClippingRange();
        context.current.renderWindow.render();

        if (t < 1) {
          animationFrameId = requestAnimationFrame(animate);
        }
      };

      animate();

    } catch (error) {
      console.error('Error focusing on highest difference:', error);
    }
  }, [isInitialized, calciumViz]);

  // Add animation effect
  useEffect(() => {
    if (!state.isAnimating) {
      // Make sure we clean up any pending loads when animation stops
      context.current.renderWindow?.render();
      return;
    }

    let animationFrame;
    let isCancelled = false;

    const animate = async () => {
      if (isCancelled) return;

      const nextTimestep = state.currentTimestep + state.stepSize;
      
      if (nextTimestep > state.maxTimestep) {
        dispatch({ type: 'TOGGLE_ANIMATION' }); // Stop animation
        return;
      }

      try {
        // Preload next connection data
        const nextUrl = `http://localhost:5000/files/${state.simulationType}/connections_${String(nextTimestep).padStart(7, '0')}.vtp`;
        const response = await fetch(nextUrl);
        
        if (response.ok && !isCancelled) {
          const buffer = await response.arrayBuffer();
          if (!isCancelled) {
            loadConnectionData(buffer);
            dispatch({ type: 'SET_TIMESTEP', payload: nextTimestep });
            animationFrame = setTimeout(animate, state.animationSpeed);
          }
        }
      } catch (error) {
        console.log('No connections for next timestep');
        if (!isCancelled) {
          dispatch({ type: 'SET_TIMESTEP', payload: nextTimestep });
          animationFrame = setTimeout(animate, state.animationSpeed);
        }
      }
    };

    animate();

    return () => {
      isCancelled = true;
      if (animationFrame) {
        clearTimeout(animationFrame);
      }
    };
  }, [state.isAnimating, state.currentTimestep, state.stepSize, state.maxTimestep, state.animationSpeed, dispatch, state.simulationType]);

  // Add optimized connection loading function
  const loadConnectionData = (buffer) => {
    try {
      const connectionsReader = vtkXMLPolyDataReader.newInstance();
      connectionsReader.parseAsArrayBuffer(buffer);
      const output = connectionsReader.getOutputData(0);

      const tubeFilter = vtkTubeFilter.newInstance();
      tubeFilter.setInputData(output);
      tubeFilter.setRadius(0.05);
      tubeFilter.setNumberOfSides(20);
      tubeFilter.setCapping(true);
      tubeFilter.setInputArrayToProcess(0, 'ConnectionWeight', 'CellData', 'Scalars');
      tubeFilter.setVaryRadius(1);
      tubeFilter.setRadiusFactor(50.0);

      const mapper = vtkMapper.newInstance();
      mapper.setInputConnection(tubeFilter.getOutputPort());
      mapper.setScalarVisibility(false);

      const actor = vtkActor.newInstance();
      actor.setMapper(mapper);
      actor.getProperty().setColor(0.5, 0.5, 0.5);
      actor.getProperty().setOpacity(0.8);

      // Clean up old actor
      const oldActor = context.current.actors.get('connections');
      if (oldActor) {
        context.current.renderer.removeActor(oldActor);
        oldActor.delete();
      }

      // Add new actor
      context.current.renderer.addActor(actor);
      context.current.actors.set('connections', actor);
      context.current.renderWindow.render();
    } catch (error) {
      console.error('Error loading connection data:', error);
    }
  };

  // Add this effect to load stimulus data
  useEffect(() => {
    const loadStimulusData = async () => {
      if (state.simulationType !== SIMULATION_TYPES.STIMULUS) return;
      
      try {
        const response = await fetch('http://localhost:5000/files/stimulus/stimulus_data.json');
        const data = await response.json();
        setStimulusData(data);
        
        if (context.current.actors.get('neurons')) {
          setTimeout(() => updateStimulusVisualization(), 0);
        }
      } catch (error) {
        console.error('Error loading stimulus data:', error);
      }
    };

    loadStimulusData();
  }, [state.simulationType]);

  // Add this effect to handle the flashing animation
  useEffect(() => {
    if (state.simulationType !== SIMULATION_TYPES.STIMULUS) return;
    
    const flashInterval = setInterval(() => {
      setFlashPhase(prev => (prev + 1) % 100);  // 0-99 for smooth animation
    }, 16); // ~60fps
    
    return () => clearInterval(flashInterval);
  }, [state.simulationType]);

  // Add this function to update stimulated neurons (put it before updateStimulusVisualization)
  const updateStimulatedNeurons = useCallback((areaMapping, stimulusViz) => {
    const newStimulatedNeurons = new Set();
    
    // Get currently stimulated areas
    const stimulatedAreas = new Set();
    stimulusViz?.areaData?.forEach((data, areaId) => {
      if (data.isStimulated) {
        stimulatedAreas.add(areaId);
      }
    });

    // Map neurons to their areas and check if they're in stimulated areas
    areaMapping.forEach((areaId, neuronId) => {
      if (stimulatedAreas.has(areaId)) {
        newStimulatedNeurons.add(neuronId);
      }
    });

    setStimulatedNeurons(newStimulatedNeurons);
    return newStimulatedNeurons;
  }, []);

  // Modify the updateStimulusVisualization function
  const updateStimulusVisualization = useCallback(async () => {
    if (!isInitialized || !stimulusData || !stimulusViz) return;

    const neuronsReader = context.current.readers.get('neurons');
    const neuronsMapper = context.current.mappers.get('neurons');
    if (!neuronsReader || !neuronsMapper) {
      console.warn('Required VTK objects not available');
      return;
    }

    try {
      // Load and process area mapping
      const areaMapping = new Map();
      const response = await fetch('http://localhost:5000/files/info/area-info.txt');
      const text = await response.text();
      
      text.split('\n').forEach(line => {
        if (!line.startsWith('#') && line.trim()) {
          const [id, , , , area] = line.trim().split(/\s+/);
          if (area?.startsWith('area_')) {
            areaMapping.set(parseInt(id), area);
          }
        }
      });

      const polyData = neuronsReader.getOutputData(0);
      const points = polyData.getPoints();
      const numPoints = points.getNumberOfPoints();

      // Create array for activity levels
      const activityLevels = new Float32Array(numPoints);
      
      // Process all points
      for (let i = 0; i < numPoints; i++) {
        const neuronId = i + 1;
        const areaId = areaMapping.get(neuronId);
        const areaInfo = stimulusViz.areaData.get(areaId);
        
        const activity = areaInfo?.activityLevel ?? -65;
        const normalized = (activity - FIXED_MIN) / (FIXED_MAX - FIXED_MIN);
        activityLevels[i] = Math.max(0, Math.min(1, normalized));
      }

      // Create and configure VTK scalar array
      const activityArray = vtk({
        vtkClass: 'vtkDataArray',
        name: 'activity_levels',
        numberOfComponents: 1,
        values: activityLevels
      });

      // Update polydata with scalar array
      polyData.getPointData().setScalars(activityArray);

      // Configure color mapping
      const lut = vtkColorTransferFunction.newInstance();
      context.current.lookupTables.set('stimulus', lut);

      // Cool to warm colormap
      lut.addRGBPoint(0.0, 0.0, 0.0, 0.4);        // Dark blue
      lut.addRGBPoint(0.2, 0.0, 0.3, 0.8);        // Blue
      lut.addRGBPoint(0.4, 0.2, 0.6, 0.9);        // Light blue
      lut.addRGBPoint(0.6, 0.9, 0.6, 0.2);        // Light orange
      lut.addRGBPoint(0.8, 0.9, 0.3, 0.0);        // Orange
      lut.addRGBPoint(1.0, 0.8, 0.0, 0.0);        // Red

      // Configure mapper
      neuronsMapper.setInputData(polyData);
      neuronsMapper.setScalarVisibility(true);
      neuronsMapper.setLookupTable(lut);
      neuronsMapper.setScalarRange(0, 1);

      // Configure actor properties with flashing for stimulated areas
      const actor = context.current.actors.get('neurons');
      if (actor) {
        const property = actor.getProperty();
        property.setAmbient(0.3);
        property.setDiffuse(0.7);

        // Calculate flash intensity
        const flashIntensity = Math.abs(Math.sin(flashPhase * Math.PI / 50));
        const basePointSize = state.neurons.options.pointSize;

        // Check if any area is currently stimulated
        const stimulatedAreas = new Set();
        stimulusViz.areaData.forEach((data, areaId) => {
          if (data.isStimulated) {
            stimulatedAreas.add(areaId);
          }
        });

        // Only flash if we have stimulated areas
        if (stimulatedAreas.size > 0) {
          // Get the area ID for the current point
          const currentAreaId = areaMapping.get(1); // Use first point to check area
          if (stimulatedAreas.has(currentAreaId)) {
            // Increase point size for stimulated areas
            const flashSize = basePointSize * (1 + flashIntensity * 0.5);
            property.setPointSize(flashSize);
            
            // Add white highlight
            property.setAmbientColor(
              1.0 - flashIntensity * 0.5,  // R
              1.0 - flashIntensity * 0.5,  // G
              1.0 - flashIntensity * 0.5   // B
            );
          } else {
            // Reset to normal size and color for non-stimulated areas
            property.setPointSize(basePointSize);
            property.setAmbientColor(1.0, 1.0, 1.0);
          }
        } else {
          // No stimulated areas, use normal size
          property.setPointSize(basePointSize);
          property.setAmbientColor(1.0, 1.0, 1.0);
        }
      }

      // Trigger updates
      polyData.modified();
      neuronsMapper.modified();
      context.current.renderWindow.render();

    } catch (error) {
      console.error('Error updating stimulus visualization:', error);
    }
  }, [isInitialized, stimulusData, state.simulationType, state.currentTimestep, stimulusViz, state.neurons.options.pointSize, flashPhase]);

  // Helper function to check if any area is currently being stimulated
  const getCurrentStimulatedArea = (stimulusViz) => {
    if (!stimulusViz?.areaData) return null;
    
    for (const [areaId, data] of stimulusViz.areaData.entries()) {
      if (data.isStimulated) {
        return areaId;
      }
    }
    return null;
  };

  // Add this effect to update visualization when timestep changes
  useEffect(() => {
    if (state.simulationType === SIMULATION_TYPES.STIMULUS) {
      updateStimulusVisualization();
    }
  }, [updateStimulusVisualization, state.currentTimestep]);

  // Update the focusHighestActivity function to match focusHighestDifference's implementation
  const focusHighestActivity = useCallback(async () => {
    if (!isInitialized || !stimulusViz || !context.current.renderer) return;

    try {
      // Find area with highest activity
      let maxActivity = -Infinity;  // Changed from 0 since we're dealing with negative values
      let maxActivityAreaId = null;
      stimulusViz.areaData.forEach((data, areaId) => {
        if (data.activityLevel > maxActivity) {  // Higher (less negative) values mean more activity
          maxActivity = data.activityLevel;
          maxActivityAreaId = areaId;
        }
      });

      if (!maxActivityAreaId) {
        console.warn('No area with activity found');
        return;
      }

      // Get all the points data
      const neuronsReader = context.current.readers.get('neurons');
      const polyData = neuronsReader.getOutputData(0);
      const points = polyData.getPoints();
      const areaPoints = [];

      // Get the center of the brain
      const bounds = polyData.getBounds();
      const center = [
        (bounds[0] + bounds[1]) / 2,
        (bounds[2] + bounds[3]) / 2,
        (bounds[4] + bounds[5]) / 2
      ];

      // Load area mapping
      const response = await fetch('http://localhost:5000/files/info/area-info.txt');
      const text = await response.text();
      const areaMapping = new Map();
      
      text.split('\n').forEach(line => {
        if (!line.startsWith('#') && line.trim()) {
          const [id, , , , area] = line.trim().split(/\s+/);
          if (area?.startsWith('area_')) {
            areaMapping.set(parseInt(id), area);
          }
        }
      });

      // Collect points for target area
      for (let i = 0; i < points.getNumberOfPoints(); i++) {
        const neuronId = i + 1;
        const areaId = areaMapping.get(neuronId);
        if (areaId === maxActivityAreaId) {
          areaPoints.push(points.getPoint(i));
        }
      }

      if (areaPoints.length === 0) {
        console.warn('No points found for target area');
        return;
      }

      // Calculate target point (centroid of area)
      const targetPoint = areaPoints.reduce(
        (acc, point) => [
          acc[0] + point[0], 
          acc[1] + point[1], 
          acc[2] + point[2]
        ],
        [0, 0, 0]
      ).map(coord => coord / areaPoints.length);

      // Get camera initial state
      const camera = context.current.renderer.getActiveCamera();
      const initialPosition = camera.getPosition();
      const distance = camera.getDistance();

      // Calculate direction from center to target point
      const direction = [
        targetPoint[0] - center[0],
        targetPoint[1] - center[1],
        targetPoint[2] - center[2]
      ];
      const length = Math.sqrt(direction[0]**2 + direction[1]**2 + direction[2]**2);

      // Calculate target camera position
      const targetPosition = [
        center[0] + (direction[0] / length) * distance,
        center[1] + (direction[1] / length) * distance,
        center[2] + (direction[2] / length) * distance
      ];

      // Animation setup
      const animationDuration = 2000;
      const startTime = Date.now();

      const animate = () => {
        const now = Date.now();
        const elapsed = now - startTime;
        const t = Math.min(elapsed / animationDuration, 1);
        
        const easeT = t < 0.5 
          ? 4 * t * t * t 
          : 1 - Math.pow(-2 * t + 2, 3) / 2;

        // Interpolate position
        const newPosition = [
          initialPosition[0] + (targetPosition[0] - initialPosition[0]) * easeT,
          initialPosition[1] + (targetPosition[1] - initialPosition[1]) * easeT,
          initialPosition[2] + (targetPosition[2] - initialPosition[2]) * easeT
        ];

        camera.setPosition(...newPosition);
        camera.setFocalPoint(...center);
        context.current.renderer.resetCameraClippingRange();
        context.current.renderWindow.render();

        if (t < 1) {
          requestAnimationFrame(animate);
        }
      };

      animate();

    } catch (error) {
      console.error('Error focusing on highest activity:', error);
    }
  }, [isInitialized, stimulusViz]);

  return (
    <ViewerContainer>
      <VTKContainer ref={vtkContainerRef} sx={{ visibility: isInitialized ? 'visible' : 'hidden' }} />
      <ToggleButton
        variant="contained"
        onClick={() => setShowLabels(!showLabels)}
        active={showLabels ? 1 : 0}
      >
        {showLabels ? 'Hide Labels' : 'Show Labels'}
      </ToggleButton>
      <Box sx={{ 
        position: 'absolute', 
        top: '10px', 
        right: '10px', 
        zIndex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end'
      }}>
        <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
          <Button variant="contained" onClick={() => setCameraPosition('front')} sx={{ m: 1 }}>
            Anterior View
          </Button>
          <Button variant="contained" onClick={() => setCameraPosition('top')} sx={{ m: 1 }}>
            Superior View
          </Button>
          <Button variant="contained" onClick={() => setCameraPosition('right')} sx={{ m: 1 }}>
            Right View
          </Button>
        </Box>
        {state.simulationType === SIMULATION_TYPES.CALCIUM && (
          <Button 
            variant="contained" 
            onClick={() => focusHighestDifference().catch(console.error)} 
            sx={{ 
              width: '100%',
              background: theme.palette.gradients.blue,
              '&:hover': {
                background: theme.palette.gradients.blue,
                filter: 'brightness(0.9)'
              }
            }}
          >
            Turn to Area of Maximum Calcium Gradient
          </Button>
        )}
        {state.simulationType === SIMULATION_TYPES.STIMULUS && (
          <Button 
            variant="contained" 
            onClick={() => focusHighestActivity().catch(console.error)} 
            sx={{ 
              width: '100%',
              background: theme.palette.gradients.red,
              '&:hover': {
                background: theme.palette.gradients.red,
                filter: 'brightness(0.9)'
              }
            }}
          >
            Turn to Area of Maximum Activity
          </Button>
        )}
      </Box>
      <InfoOverlay>
        <StyledTypography>
          Simulation: {formatSimulationType(state.simulationType)}
        </StyledTypography>
        <StyledTypography>
          Timestep: {state.currentTimestep.toLocaleString()}
        </StyledTypography>
      </InfoOverlay>
      {(isLoading || loadingStates.neurons || loadingStates.connections) && (
        <LoadingOverlay>
          <CircularProgress 
            variant="determinate" 
            value={loadingProgress} 
            size={60}
            sx={{ color: 'white' }}
          />
          <Typography sx={{ color: 'white' }}>
            Loading... {loadingProgress}%
          </Typography>
        </LoadingOverlay>
      )}
      {showLabels && <Tooltip info={tooltipInfo} />}
      {state.simulationType === SIMULATION_TYPES.CALCIUM && calciumData && (
        <ColorLegend sx={{ backgroundColor: 'transparent' }}>
          <Typography variant="subtitle2" sx={{ color: 'white', mb: 1 }}>
            Calcium Level Difference
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
            <Box sx={{ 
              width: '180px',
              height: '20px',
              background: 'linear-gradient(90deg, #00FF00, #80FF00, #FFFF00, #FF8000, #FF0000)',
              borderRadius: '2px',
              mb: 0.5
            }} />
            <Box sx={{ 
              display: 'flex', 
              justifyContent: 'space-between',
              width: '180px',
              color: 'white',
              fontSize: '0.75rem'
            }}>
              <span>0%</span>
              <span>0.5%</span>
              <span>1%</span>
              <span>1.5%</span>
              <span>2%+</span>
            </Box>
            <Typography variant="caption" sx={{ color: 'white', mt: 1, textAlign: 'center' }}>
              Difference from target calcium level
            </Typography>
          </Box>
        </ColorLegend>
      )}
      {state.simulationType === SIMULATION_TYPES.NO_NETWORK && (
        <ColorLegend sx={{ backgroundColor: 'transparent' }}>
          <Typography variant="subtitle2" sx={{ color: 'white', mb: 1 }}>
            Area Visualization
          </Typography>
          <Typography variant="caption" sx={{ color: 'white', textAlign: 'center' }}>
            Each color represents a different Brodmann area
          </Typography>
        </ColorLegend>
      )}
      {state.simulationType === SIMULATION_TYPES.STIMULUS && stimulusData && (
        <ColorLegend sx={{ backgroundColor: 'transparent' }}>
          <Typography variant="subtitle2" sx={{ color: 'white', mb: 1 }}>
            Neural Activity Level
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
            <Box sx={{ 
              width: '180px',
              height: '20px',
              background: 'linear-gradient(90deg, #000066, #0044CC, #3399FF, #FFAA44, #FF5500, #CC0000)',
              borderRadius: '2px',
              mb: 0.5
            }} />
            <Box sx={{ 
              display: 'flex', 
              justifyContent: 'space-between',
              width: '180px',
              color: 'white',
              fontSize: '0.75rem'
            }}>
              <span>-70</span>
              <span>-60</span>
              <span>-50</span>
              <span>-40</span>
              <span>-30</span>
            </Box>
            <Typography variant="caption" sx={{ color: 'white', mt: 1, textAlign: 'center' }}>
              Membrane potential (mV)
            </Typography>
            {stimulusViz?.areaData?.get('area_8')?.isStimulated && (
              <Typography variant="caption" sx={{ color: '#FF5500', mt: 0.5, fontWeight: 'bold' }}>
                Area 8 under stimulation
              </Typography>
            )}
            {stimulusViz?.areaData?.get('area_30')?.isStimulated && (
              <Typography variant="caption" sx={{ color: '#FF5500', mt: 0.5, fontWeight: 'bold' }}>
                Area 30 under stimulation
              </Typography>
            )}
            {stimulusViz?.areaData?.get('area_34')?.isStimulated && (
              <Typography variant="caption" sx={{ color: '#FF5500', mt: 0.5, fontWeight: 'bold' }}>
                Area 34 under stimulation
              </Typography>
            )}
          </Box>
        </ColorLegend>
      )}
    </ViewerContainer>
  );
};

export default React.memo(VTPViewer); 