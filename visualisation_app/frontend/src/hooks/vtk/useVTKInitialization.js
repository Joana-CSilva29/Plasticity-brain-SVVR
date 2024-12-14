import { useEffect, useState, useRef } from 'react';
import vtkFullScreenRenderWindow from '@kitware/vtk.js/Rendering/Misc/FullScreenRenderWindow';
import vtkOrientationMarkerWidget from '@kitware/vtk.js/Interaction/Widgets/OrientationMarkerWidget';
import vtkAxesActor from '@kitware/vtk.js/Rendering/Core/AxesActor';

export function useVTKInitialization(containerRef) {
  const [isInitialized, setIsInitialized] = useState(false);
  const [containerReady, setContainerReady] = useState(false);
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

  // Initialize container
  useEffect(() => {
    if (containerRef.current) {
      setContainerReady(true);
    }
  }, []);

  // Initialize VTK viewer
  useEffect(() => {
    if (!containerReady || !containerRef.current) return;

    const fullScreenRenderer = vtkFullScreenRenderWindow.newInstance({
      rootContainer: containerRef.current,
      background: [0.1, 0.1, 0.1],
    });

    // Add orientation widget
    const axesActor = vtkAxesActor.newInstance();
    const orientationWidget = vtkOrientationMarkerWidget.newInstance({
      actor: axesActor,
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

    return () => {
      if (context.current.orientationWidget) {
        context.current.orientationWidget.setEnabled(false);
        context.current.orientationWidget.delete();
      }
      if (context.current.fullScreenRenderWindow) {
        context.current.fullScreenRenderWindow.delete();
      }
    };
  }, [containerReady]);

  return { isInitialized, context };
} 