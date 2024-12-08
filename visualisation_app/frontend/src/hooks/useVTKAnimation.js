import { useEffect, useRef, useCallback, useState } from 'react';
import { useVTKState, useVTKDispatch } from '../context/VTKContext';

export function useVTKAnimation() {
  const { isPlaying, currentTimestep, maxTimestep, stepSize } = useVTKState();
  const dispatch = useVTKDispatch();
  const animationFrameRef = useRef(null);
  const lastUpdateTimeRef = useRef(0);
  const errorCountRef = useRef(0);
  const [isLoading, setIsLoading] = useState(false);
  
  // Target 60 FPS but allow dynamic adjustment based on performance
  const targetFPS = 60;
  const minFPS = 24;
  const frameIntervalRef = useRef(1000 / targetFPS);

  const updateTimestep = useCallback(async () => {
    const currentTime = performance.now();
    const deltaTime = currentTime - lastUpdateTimeRef.current;

    if (deltaTime >= frameIntervalRef.current) {
      const nextTimestep = (currentTimestep + stepSize) % (maxTimestep + stepSize);
      
      try {
        // Only update if we're not already loading
        if (!isLoading) {
          setIsLoading(true);
          dispatch({ type: 'SET_TIMESTEP', payload: nextTimestep });
          
          // Reset error count on successful update
          errorCountRef.current = 0;
          
          // Dynamically adjust frame interval based on performance
          const updateDuration = performance.now() - currentTime;
          if (updateDuration > frameIntervalRef.current) {
            // Slow down if updates are taking too long
            frameIntervalRef.current = Math.min(1000 / minFPS, updateDuration * 1.1);
          } else {
            // Speed up gradually if performance is good
            frameIntervalRef.current = Math.max(1000 / targetFPS, frameIntervalRef.current * 0.95);
          }
        }
      } catch (error) {
        console.warn('Error updating timestep:', error);
        errorCountRef.current++;
        
        // If we encounter too many errors, skip ahead
        if (errorCountRef.current > 5) {
          const skipAmount = stepSize * 2;
          dispatch({
            type: 'SET_TIMESTEP',
            payload: (currentTimestep + skipAmount) % (maxTimestep + skipAmount)
          });
          errorCountRef.current = 0;
        }
      } finally {
        setIsLoading(false);
      }
      
      lastUpdateTimeRef.current = currentTime;
    }

    if (isPlaying) {
      animationFrameRef.current = requestAnimationFrame(updateTimestep);
    }
  }, [currentTimestep, maxTimestep, stepSize, isPlaying, dispatch, isLoading]);

  useEffect(() => {
    if (isPlaying && !animationFrameRef.current) {
      lastUpdateTimeRef.current = performance.now();
      frameIntervalRef.current = 1000 / targetFPS; // Reset frame interval when starting
      animationFrameRef.current = requestAnimationFrame(updateTimestep);
    } else if (!isPlaying && animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [isPlaying, updateTimestep]);
} 