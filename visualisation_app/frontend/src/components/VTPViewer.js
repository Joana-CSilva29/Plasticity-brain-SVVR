import React, { useEffect, useRef, useState, useCallback } from 'react';
import '@kitware/vtk.js/Rendering/Profiles/Geometry';
import vtkFullScreenRenderWindow from '@kitware/vtk.js/Rendering/Misc/FullScreenRenderWindow';
import vtkActor from '@kitware/vtk.js/Rendering/Core/Actor';
import vtkMapper from '@kitware/vtk.js/Rendering/Core/Mapper';
import vtkXMLPolyDataReader from '@kitware/vtk.js/IO/XML/XMLPolyDataReader';
import vtkColorTransferFunction from '@kitware/vtk.js/Rendering/Core/ColorTransferFunction';
import { styled } from '@mui/material/styles';
import { Box, Typography, CircularProgress } from '@mui/material';
import { useVTKState } from '../context/VTKContext';

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
  right: theme.spacing(1),
  color: 'white',
  padding: theme.spacing(1),
  fontSize: '0.8rem',
  zIndex: 1,
  pointerEvents: 'none',
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

        // Load neurons
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

        // Load connections
        setLoadingProgress(70);
        const connectionsResponse = await fetch(state.connections.fileUrl);
        if (isCancelled) return;
        const connectionsBuffer = await connectionsResponse.arrayBuffer();
        if (isCancelled) return;

        setLoadingProgress(80);
        const connectionsReader = vtkXMLPolyDataReader.newInstance();
        context.current.readers.set('connections', connectionsReader);
        connectionsReader.parseAsArrayBuffer(connectionsBuffer);

        setLoadingProgress(90);
        const connectionsMapper = vtkMapper.newInstance();
        context.current.mappers.set('connections', connectionsMapper);
        const connectionsActor = vtkActor.newInstance();
        connectionsActor.setMapper(connectionsMapper);
        connectionsMapper.setInputData(connectionsReader.getOutputData(0));

        const lut = vtkColorTransferFunction.newInstance();
        context.current.lookupTables.set('connections', lut);
        lut.addRGBPoint(0, ...state.connections.options.inColor);
        lut.addRGBPoint(1, ...state.connections.options.outColor);
        connectionsMapper.setLookupTable(lut);
        connectionsMapper.setScalarRange(0, 1);
        connectionsMapper.setColorModeToMapScalars();
        connectionsMapper.setScalarModeToUseCellData();
        connectionsMapper.setScalarVisibility(true);

        if (isCancelled) return;

        // Store and add actors
        context.current.actors.set('neurons', neuronsActor);
        context.current.actors.set('connections', connectionsActor);
        context.current.renderer.addActor(neuronsActor);
        context.current.renderer.addActor(connectionsActor);

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

  return (
    <ViewerContainer>
      <VTKContainer 
        ref={vtkContainerRef}
        sx={{ visibility: isInitialized ? 'visible' : 'hidden' }}
      />
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
    </ViewerContainer>
  );
};

export default React.memo(VTPViewer); 