import { useEffect, useRef, useCallback } from 'react';
import { useVTKState, useVTKDispatch } from '../context/VTKContext';

export function useVTKAnimation() {
  const { isPlaying, currentTimestep, maxTimestep, stepSize } = useVTKState();
  const dispatch = useVTKDispatch();
  const animationFrameRef = useRef(null);
  const lastUpdateTimeRef = useRef(0);
  const FPS = 30; // Limit FPS for smoother animation
  const frameInterval = 1000 / FPS;

  const updateTimestep = useCallback(() => {
    const currentTime = performance.now();
    const deltaTime = currentTime - lastUpdateTimeRef.current;

    if (deltaTime >= frameInterval) {
      dispatch({
        type: 'SET_TIMESTEP',
        payload: (currentTimestep + stepSize) % (maxTimestep + stepSize)
      });
      lastUpdateTimeRef.current = currentTime;
    }

    if (isPlaying) {
      animationFrameRef.current = requestAnimationFrame(updateTimestep);
    }
  }, [currentTimestep, maxTimestep, stepSize, isPlaying, dispatch]);

  useEffect(() => {
    if (isPlaying) {
      lastUpdateTimeRef.current = performance.now();
      animationFrameRef.current = requestAnimationFrame(updateTimestep);
    } else if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isPlaying, updateTimestep]);
} 