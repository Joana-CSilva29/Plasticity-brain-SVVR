import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import '@kitware/vtk.js/Rendering/Profiles/Geometry';
import vtkFullScreenRenderWindow from '@kitware/vtk.js/Rendering/Misc/FullScreenRenderWindow';
import vtkActor from '@kitware/vtk.js/Rendering/Core/Actor';
import vtkMapper from '@kitware/vtk.js/Rendering/Core/Mapper';
import vtkXMLPolyDataReader from '@kitware/vtk.js/IO/XML/XMLPolyDataReader';
import vtkColorTransferFunction from '@kitware/vtk.js/Rendering/Core/ColorTransferFunction';
import vtkPixelSpaceCallbackMapper from '@kitware/vtk.js/Rendering/Core/PixelSpaceCallbackMapper';
import vtk from '@kitware/vtk.js/vtk';
import { styled } from '@mui/material/styles';
import { Box, Typography, CircularProgress, Button } from '@mui/material';
import { useVTKState } from '../context/VTKContext';
import Tooltip from './Tooltip';

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

const VTPViewer = () => {
  const state = useVTKState();
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
  });
  const labelPositions = useRef(new Map());
  const [tooltipInfo, setTooltipInfo] = useState(null);
  const [tooltipPosition, setTooltipPosition] = useState(null);
  const [brodmannInfo, setBrodmannInfo] = useState(new Map());

  const cleanupVTKObjects = useCallback(() => {
    // Clean up readers
    context.current.readers.forEach(reader => reader.delete());
    context.current.readers.clear();

    // Clean up mappers
    context.current.mappers.forEach(mapper => mapper.delete());
    context.current.mappers.clear();

    // Clean up lookup tables
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
    if (!containerReady || isInitialized) return;

    const container = vtkContainerRef.current;
    if (!container) return;

    try {
      // Make sure container has dimensions
      if (container.getBoundingClientRect().width === 0) return;

      context.current.fullScreenRenderWindow = vtkFullScreenRenderWindow.newInstance({
        rootContainer: container,
        background: [0.1, 0.1, 0.1],
      });

      context.current.renderer = context.current.fullScreenRenderWindow.getRenderer();
      context.current.renderWindow = context.current.fullScreenRenderWindow.getRenderWindow();
      
      // Set initial camera position to view from front-right-top
      const camera = context.current.renderer.getActiveCamera();
      camera.setPosition(100, 100, 100);  // Position camera at front-right-top
      camera.setFocalPoint(0, 0, 0);      // Look at center
      camera.setViewUp(0, 0, 1);          // Keep "up" direction
      context.current.renderer.resetCamera();

      setIsInitialized(true);
    } catch (error) {
      console.error('Error initializing VTK viewer:', error);
    }

    return () => {
      if (context.current.fullScreenRenderWindow) {
        try {
          cleanupVTKObjects();
          context.current.fullScreenRenderWindow.delete();
          context.current.fullScreenRenderWindow = null;
          context.current.renderer = null;
          context.current.renderWindow = null;
          setIsInitialized(false);
        } catch (error) {
          console.error('Error cleaning up VTK viewer:', error);
        }
      }
    };
  }, [containerReady, cleanupVTKObjects]);

  // Load data with debouncing
  useEffect(() => {
    if (!isInitialized) return;

    let isCancelled = false;

    const loadData = async () => {
      try {
        setIsLoading(true);
        setLoadingProgress(0);
        saveCameraState();
        cleanupVTKObjects();

        // Load neurons first
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
        neuronsMapper.setScalarVisibility(true);
        neuronsMapper.setScalarModeToUsePointData();

        // Store and add neurons actor
        context.current.actors.set('neurons', neuronsActor);
        context.current.renderer.addActor(neuronsActor);

        // Try to load connections
        try {
          setLoadingProgress(70);
          const connectionsResponse = await fetch(state.connections.fileUrl);
          if (!connectionsResponse.ok) {
            throw new Error('Connections not available');
          }
          if (isCancelled) return;
          const connectionsBuffer = await connectionsResponse.arrayBuffer();
          if (isCancelled) return;

          setLoadingProgress(80);
          const connectionsReader = vtkXMLPolyDataReader.newInstance();
          context.current.readers.set('connections', connectionsReader);
          connectionsReader.parseAsArrayBuffer(connectionsBuffer);

          const output = connectionsReader.getOutputData(0);
          console.log('Connections data:', {
            numberOfPoints: output.getNumberOfPoints(),
            numberOfCells: output.getNumberOfCells(),
            arrays: output.getCellData().getArrays().map(arr => ({
              name: arr.getName(),
              numberOfComponents: arr.getNumberOfComponents(),
              dataRange: arr.getRange()
            }))
          });

          setLoadingProgress(90);
          const connectionsMapper = vtkMapper.newInstance();
          context.current.mappers.set('connections', connectionsMapper);
          const connectionsActor = vtkActor.newInstance();
          connectionsActor.setMapper(connectionsMapper);
          connectionsMapper.setInputData(connectionsReader.getOutputData(0));

          // Add back the LUT creation
          const lut = vtkColorTransferFunction.newInstance();
          context.current.lookupTables.set('connections', lut);
          lut.addRGBPoint(0, ...state.connections.options.inColor);
          lut.addRGBPoint(1, ...state.connections.options.outColor);

          // Simple mapper configuration
          connectionsMapper.setScalarVisibility(true);
          connectionsMapper.setScalarModeToUseCellData();
          connectionsMapper.setColorModeToMapScalars();
          connectionsMapper.setLookupTable(lut);
          connectionsMapper.setScalarRange(0, 1);

          // Make sure the actor is visible
          connectionsActor.getProperty().setOpacity(1.0);
          connectionsActor.setVisibility(true);

          // Store and add connections actor
          context.current.actors.set('connections', connectionsActor);
          context.current.renderer.addActor(connectionsActor);

          if (connectionsActor) {
            // Set the representation to Surface to properly display tubes
            connectionsActor.getProperty().setRepresentationToSurface();
            
            // Optional: Add some lighting effects for better tube visualization
            connectionsActor.getProperty().setLighting(true);
            connectionsActor.getProperty().setInterpolationToPhong();
            connectionsActor.getProperty().setAmbient(0.1);
            connectionsActor.getProperty().setDiffuse(0.7);
            connectionsActor.getProperty().setSpecular(0.3);
            connectionsActor.getProperty().setSpecularPower(20);
          }
        } catch (error) {
          console.log('No connections data available for this timestep');
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
      } catch (error) {
        console.error('Error loading VTP files:', error);
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
          setLoadingProgress(0);
        }
      }
    };

    const timeoutId = setTimeout(loadData, 100); // Add small delay to debounce rapid changes

    return () => {
      isCancelled = true;
      clearTimeout(timeoutId);
    };
  }, [isInitialized, state.neurons.fileUrl, state.connections.fileUrl, cleanupVTKObjects, saveCameraState, restoreCameraState]);

  // Update properties with debouncing
  useEffect(() => {
    if (!isInitialized) return;

    const timeoutId = setTimeout(() => {
      const neuronsActor = context.current.actors.get('neurons');
      const connectionsActor = context.current.actors.get('connections');

      if (neuronsActor) {
        const property = neuronsActor.getProperty();
        property.setPointSize(state.neurons.options.pointSize);
        property.setOpacity(state.neurons.options.opacity);
      }

      if (connectionsActor) {
        const property = connectionsActor.getProperty();
        property.setOpacity(state.connections.options.opacity);
      }

      context.current.renderWindow?.render();
    }, 100);

    return () => clearTimeout(timeoutId);
  }, [isInitialized, state.neurons.options, state.connections.options]);

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

        const numPoints = points.getNumberOfPoints();
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
        for (let i = 0; i < numPoints; i++) {
            const point = points.getPoint(i);
            const areaId = areaMap.get(i + 1); // Add 1 because IDs start at 1 in the text file
            
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
                color: areaColorMap.get(areaId),
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
          if (!labelContext.current || !labelCanvas.current) return;

          const ctx = labelContext.current;
          const canvas = labelCanvas.current;
          ctx.clearRect(0, 0, canvas.width, canvas.height);

          // Get current canvas dimensions
          const canvasWidth = canvas.width;
          const canvasHeight = canvas.height;

          coordsList.forEach((xy, idx) => {
            const { label, color, centroid } = labelPoints[idx];

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

            // Draw text
            ctx.fillStyle = `rgb(${Math.round(color[0])}, ${Math.round(color[1])}, ${Math.round(color[2])})`;
            ctx.fillText(brodmannLabel, x, y);

            // Store label position with the full label ID
            labelPositions.current.set(`${x},${y}`, {
              label: label,  // Make sure this is the full BA_XX format
              brodmannArea: brodmannLabel,
              color,
              bounds: centroid
            });
            
            console.log('Stored label position for:', label); // Add this log
          });
        });

        // Add actor to renderer
        context.current.renderer.addActor(actor);
        setLabelActor(actor);
        context.current.renderWindow.render();
    } catch (error) {
        console.error('Error creating labels:', error);
    }
  }, [labelActor]);

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

  // Add a function to change camera position
  const setCameraPosition = (preset) => {
    if (!context.current.renderer) return;
    
    const camera = context.current.renderer.getActiveCamera();
    const pos = cameraPresets[preset].position;
    const up = cameraPresets[preset].up;
    
    camera.setPosition(...pos);
    camera.setFocalPoint(0, 0, 0);
    camera.setViewUp(...up);
    context.current.renderer.resetCamera();
    context.current.renderWindow.render();
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
        const areaId = labelInfo.label.replace('area_', 'BA_');
        const areaInfo = brodmannInfo.get(areaId);
        
        if (areaInfo) {
          setTooltipInfo({
            ...labelInfo,
            name: areaInfo.name,
            description: areaInfo.description
          });
        }
      }
    });

    if (!foundLabel) {
      setTooltipInfo(null);
    }
  }, [showLabels, brodmannInfo]);

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

  return (
    <ViewerContainer>
      <VTKContainer ref={vtkContainerRef} sx={{ visibility: isInitialized ? 'visible' : 'hidden' }} />
      <Button
        variant="contained"
        onClick={() => setShowLabels(!showLabels)}
        sx={{
          position: 'absolute',
          top: '10px',
          left: '10px',
          zIndex: 1,
        }}
      >
        {showLabels ? 'Hide Labels' : 'Show Labels'}
      </Button>
      <Box sx={{ position: 'absolute', top: '10px', right: '10px', zIndex: 1 }}>
        <Button variant="contained" onClick={() => setCameraPosition('front')} sx={{ m: 1 }}>
          Front View
        </Button>
        <Button variant="contained" onClick={() => setCameraPosition('top')} sx={{ m: 1 }}>
          Top View
        </Button>
        <Button variant="contained" onClick={() => setCameraPosition('right')} sx={{ m: 1 }}>
          Right View
        </Button>
      </Box>
      <InfoOverlay>
        <StyledTypography>
          Simulation: {state.simulationType}
        </StyledTypography>
        <StyledTypography>
          Timestep: {state.currentTimestep.toLocaleString()}
        </StyledTypography>
      </InfoOverlay>
      {isLoading && (
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
      <Tooltip info={tooltipInfo} />
    </ViewerContainer>
  );
};

export default React.memo(VTPViewer); 