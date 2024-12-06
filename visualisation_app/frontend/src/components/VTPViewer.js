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
  const { loadVTPData, preloadNextTimestep } = useVTPLoader();
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

        // Store original colors and radii
        const colors = connectionsData.getCellData().getArrayByName('Colors');
        const radii = connectionsData.getCellData().getArrayByName('TubeRadius');
        if (colors && radii) {
          context.current.originalData = {
            colors: new Uint8Array(colors.getData()),
            radii: new Float32Array(radii.getData())
          };
        }

        const connectionsMapper = vtkMapper.newInstance();
        const connectionsActor = vtkActor.newInstance();
        connectionsActor.setMapper(connectionsMapper);
        connectionsMapper.setInputData(connectionsData);

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
    if (state.isPlaying) {
      preloadNextTimestep();
    }
  }, [state.currentTimestep, state.isPlaying, preloadNextTimestep]);

  const updateActorProperties = (actor, source) => {
    if (!actor) return;

    const property = actor.getProperty();
    const mapper = actor.getMapper();

    if (source.type === 'Neurons') {
      // Handle neuron properties
      mapper.setScalarVisibility(true);
      mapper.setScalarModeToUsePointData();
      property.setPointSize(source.options.pointSize);
      property.setOpacity(source.options.opacity);

      const [mode, rep] = source.options.representation.split(':').map(Number);
      property.setRepresentation(rep);
    } else if (source.type === 'Connections') {
      // Handle connection properties
      mapper.setScalarVisibility(true);
      mapper.setScalarModeToUseCellData();
      property.setOpacity(source.options.opacity);

      const polydata = actor.getMapper().getInputData();
      
      // Update colors using original data
      const colors = polydata.getCellData().getArrayByName('Colors');
      if (colors && context.current.originalData.colors) {
        const numCells = polydata.getNumberOfCells();
        const newColors = new Uint8Array(numCells * 3);
        
        for (let i = 0; i < numCells; i++) {
          const isInConnection = context.current.originalData.colors[i * 3] === 46;
          const color = isInConnection ? source.options.inColor : source.options.outColor;
          
          newColors[i * 3] = Math.round(color[0] * 255);
          newColors[i * 3 + 1] = Math.round(color[1] * 255);
          newColors[i * 3 + 2] = Math.round(color[2] * 255);
        }
        
        colors.setData(newColors);
        colors.modified();
      }

      // Update line width using original radii
      const radii = polydata.getCellData().getArrayByName('TubeRadius');
      if (radii && context.current.originalData.radii) {
        const scaledRadii = new Float32Array(context.current.originalData.radii.length);
        for (let i = 0; i < context.current.originalData.radii.length; i++) {
          scaledRadii[i] = context.current.originalData.radii[i] * source.options.lineWidth;
        }
        radii.setData(scaledRadii);
        radii.modified();
      }

      polydata.modified();
      mapper.modified();
    }

    // Force a render
    if (context.current.renderWindow) {
      context.current.renderWindow.render();
    }
  };

  return <ViewerContainer ref={vtkContainerRef} />;
};

export default VTPViewer; 