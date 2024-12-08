import React, { useEffect, useRef, useState } from 'react';
import '@kitware/vtk.js/Rendering/Profiles/Geometry';
import vtkFullScreenRenderWindow from '@kitware/vtk.js/Rendering/Misc/FullScreenRenderWindow';
import vtkActor from '@kitware/vtk.js/Rendering/Core/Actor';
import vtkMapper from '@kitware/vtk.js/Rendering/Core/Mapper';
import vtkXMLPolyDataReader from '@kitware/vtk.js/IO/XML/XMLPolyDataReader';
import vtkColorTransferFunction from '@kitware/vtk.js/Rendering/Core/ColorTransferFunction';
import vtkColorMaps from '@kitware/vtk.js/Rendering/Core/ColorTransferFunction/ColorMaps';
import { ColorMode, ScalarMode } from '@kitware/vtk.js/Rendering/Core/Mapper/Constants';
import { styled } from '@mui/material/styles';
import { Box } from '@mui/material';
import { useVTKState, useVTKDispatch } from '../context/VTKContext';
import vtkTubeFilter from '@kitware/vtk.js/Filters/General/TubeFilter';
import { useVTPLoader } from '../hooks/useVTPLoader';
import { useVTKAnimation } from '../hooks/useVTKAnimation';

const ViewerContainer = styled(Box)({
  width: '100%',
  height: '100%',
  position: 'relative',
  backgroundColor: 'transparent',
  minHeight: '400px',
  display: 'block',
});

const VTPViewer = () => {
  const state = useVTKState();
  const dispatch = useVTKDispatch();
  const vtkContainerRef = useRef(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const animationRef = useRef(null);
  const context = useRef({
    fullScreenRenderWindow: null,
    actors: new Map(),
    renderer: null,
    renderWindow: null,
    originalData: {
      colors: null,
      radii: null
    }
  });
  const { loadVTPData, preloadNextTimesteps } = useVTPLoader();
  useVTKAnimation();

  // Initialize VTK viewer
  useEffect(() => {
    if (!vtkContainerRef.current) return;

    context.current.fullScreenRenderWindow = vtkFullScreenRenderWindow.newInstance({
      rootContainer: vtkContainerRef.current,
      background: [0.1, 0.1, 0.1],
    });

    context.current.renderer = context.current.fullScreenRenderWindow.getRenderer();
    context.current.renderWindow = context.current.fullScreenRenderWindow.getRenderWindow();
    
    setIsInitialized(true);

    return () => {
      if (context.current.fullScreenRenderWindow) {
        context.current.fullScreenRenderWindow.delete();
      }
    };
  }, []);

  // Load and update data
  useEffect(() => {
    if (!isInitialized) return;

    const loadData = async () => {
      try {
        // Clean up existing actors
        for (const actor of context.current.actors.values()) {
          context.current.renderer.removeActor(actor);
          actor.delete();
        }
        context.current.actors.clear();

        // Load neurons
        const neuronsResponse = await fetch(state.neurons.fileUrl);
        const neuronsBuffer = await neuronsResponse.arrayBuffer();
        const neuronsReader = vtkXMLPolyDataReader.newInstance();
        neuronsReader.parseAsArrayBuffer(neuronsBuffer);

        const neuronsMapper = vtkMapper.newInstance();
        const neuronsActor = vtkActor.newInstance();
        neuronsActor.setMapper(neuronsMapper);
        neuronsMapper.setInputData(neuronsReader.getOutputData(0));

        // Load connections
        const connectionsResponse = await fetch(state.connections.fileUrl);
        const connectionsBuffer = await connectionsResponse.arrayBuffer();
        const connectionsReader = vtkXMLPolyDataReader.newInstance();
        connectionsReader.parseAsArrayBuffer(connectionsBuffer);
        const connectionsData = connectionsReader.getOutputData(0);

        // Set up the connections visualization
        const connectionsMapper = vtkMapper.newInstance();
        const connectionsActor = vtkActor.newInstance();
        connectionsActor.setMapper(connectionsMapper);
        connectionsMapper.setInputData(connectionsData);

        // Verify the connection types are present
        const connectionTypes = connectionsData.getCellData().getArrayByName('ConnectionType');
        if (!connectionTypes) {
          console.error('ConnectionType array not found in VTP file');
        } else {
          console.log('ConnectionType array found:', connectionTypes.getData());
        }

        // Store actors
        context.current.actors.set('neurons', neuronsActor);
        context.current.actors.set('connections', connectionsActor);

        // Add actors to renderer
        context.current.renderer.addActor(neuronsActor);
        context.current.renderer.addActor(connectionsActor);

        // Update properties
        updateActorProperties(neuronsActor, state.neurons);
        updateActorProperties(connectionsActor, state.connections);

        // Reset camera and render
        context.current.renderer.resetCamera();
        context.current.renderWindow.render();
      } catch (error) {
        console.error('Error loading VTP files:', error);
      }
    };

    loadData();
  }, [isInitialized, state.neurons.fileUrl, state.connections.fileUrl]);

  // Update properties when state changes
  useEffect(() => {
    if (!isInitialized) return;

    const neuronsActor = context.current.actors.get('neurons');
    const connectionsActor = context.current.actors.get('connections');

    if (neuronsActor) {
      updateActorProperties(neuronsActor, state.neurons);
    }
    if (connectionsActor) {
      updateActorProperties(connectionsActor, state.connections);
    }

    context.current.renderWindow?.render();
  }, [state, isInitialized]);

  // Add effect for preloading
  useEffect(() => {
    if (isInitialized && state.isPlaying) {
      preloadNextTimesteps();
    }
  }, [isInitialized, state.isPlaying, preloadNextTimesteps]);

  const updateActorProperties = (actor, source) => {
    if (!actor) return;

    const property = actor.getProperty();
    const mapper = actor.getMapper();

    if (source.type === 'Neurons') {
      // For neurons
      mapper.setScalarVisibility(true);
      mapper.setScalarModeToUsePointData();
      property.setPointSize(source.options.pointSize);
      property.setOpacity(source.options.opacity);
      property.setRepresentation(0); // Points
      
      // Force opacity update
      property.modified();
      
    } else if (source.type === 'Connections') {
      // For connections
      const polydata = mapper.getInputData();
      
      // Create color lookup based on connection type
      const lut = vtkColorTransferFunction.newInstance();
      lut.addRGBPoint(0, ...source.options.inColor);   // In connections
      lut.addRGBPoint(1, ...source.options.outColor);  // Out connections
      
      // Clean up old lookup table
      if (mapper.getLookupTable()) {
        mapper.getLookupTable().delete();
      }
      
      // Set up the mapper
      mapper.setLookupTable(lut);
      mapper.setScalarRange(0, 1);
      mapper.setColorModeToMapScalars();
      mapper.setScalarModeToUseCellData();
      mapper.setScalarVisibility(true);
      
      // Set opacity
      property.setOpacity(source.options.opacity);
      property.modified();
    }

    // Make sure everything is updated
    mapper.modified();
    actor.modified();
    
    if (context.current.renderWindow) {
      context.current.renderWindow.render();
    }
  };

  return <ViewerContainer ref={vtkContainerRef} />;
};

export default VTPViewer; 