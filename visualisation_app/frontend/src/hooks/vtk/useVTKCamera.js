import { useCallback } from 'react';

export function useVTKCamera(context) {
  const cameraPresets = {
    front: { position: [100, 0, 0], up: [0, 0, 1] },
    top: { position: [0, 0, 100], up: [0, 1, 0] },
    right: { position: [0, -100, 0], up: [0, 0, 1] }
  };

  const setCameraPosition = useCallback((preset) => {
    if (!context.current.renderer) return;
    
    const camera = context.current.renderer.getActiveCamera();
    const pos = cameraPresets[preset].position;
    const up = cameraPresets[preset].up;
    
    camera.setPosition(...pos);
    camera.setFocalPoint(0, 0, 0);
    camera.setViewUp(...up);
    context.current.renderer.resetCamera();
    context.current.renderWindow.render();
  }, [context]);

  return { setCameraPosition };
} 