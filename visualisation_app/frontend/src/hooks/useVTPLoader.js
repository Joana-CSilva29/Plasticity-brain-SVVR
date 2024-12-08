import { useCallback, useRef, useEffect } from 'react';
import { useVTKState } from '../context/VTKContext';

const CACHE_SIZE = 20; // Number of timesteps to keep in cache
const PRELOAD_AHEAD = 3; // Number of timesteps to preload

export function useVTPLoader() {
  const state = useVTKState();
  const loadingRef = useRef(false);
  const abortControllerRef = useRef(null);
  const cacheRef = useRef(new Map()); // Cache for loaded VTP data
  const preloadQueueRef = useRef([]); // Queue for preloading

  // Clean up old cache entries
  const cleanCache = useCallback(() => {
    if (cacheRef.current.size > CACHE_SIZE) {
      const sortedEntries = [...cacheRef.current.entries()]
        .sort(([timestep1], [timestep2]) => 
          Math.abs(timestep1 - state.currentTimestep) - 
          Math.abs(timestep2 - state.currentTimestep)
        );
      
      while (cacheRef.current.size > CACHE_SIZE) {
        const [oldestTimestep] = sortedEntries.pop();
        cacheRef.current.delete(oldestTimestep);
      }
    }
  }, [state.currentTimestep]);

  const loadVTPData = useCallback(async (url, timestep) => {
    // Check cache first
    if (cacheRef.current.has(timestep)) {
      return cacheRef.current.get(timestep);
    }

    try {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();

      const response = await fetch(url, {
        signal: abortControllerRef.current.signal
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const buffer = await response.arrayBuffer();
      
      // Cache the result
      cacheRef.current.set(timestep, buffer);
      cleanCache();
      
      return buffer;
    } catch (error) {
      if (error.name === 'AbortError') {
        console.log('Loading aborted');
        return null;
      }
      console.error('Error loading VTP data:', error);
      throw error;
    }
  }, [cleanCache]);

  const preloadNextTimesteps = useCallback(async () => {
    if (loadingRef.current) return;

    loadingRef.current = true;
    try {
      // Clear existing preload queue
      preloadQueueRef.current = [];
      
      // Add next few timesteps to preload queue
      for (let i = 1; i <= PRELOAD_AHEAD; i++) {
        const nextTimestep = (state.currentTimestep + (i * state.stepSize)) % 
          (state.maxTimestep + state.stepSize);
        
        if (!cacheRef.current.has(nextTimestep)) {
          preloadQueueRef.current.push(nextTimestep);
        }
      }

      // Load each timestep in the queue
      for (const timestep of preloadQueueRef.current) {
        const url = `http://localhost:5000/files/${state.currentSimulation}/connections_${String(timestep).padStart(7, '0')}.vtp`;
        await loadVTPData(url, timestep).catch(() => {
          // Silently fail for preloading errors
          console.warn(`Failed to preload timestep ${timestep}`);
        });
      }
    } finally {
      loadingRef.current = false;
    }
  }, [state.currentTimestep, state.stepSize, state.maxTimestep, state.currentSimulation, loadVTPData]);

  // Start preloading when currentTimestep changes
  useEffect(() => {
    preloadNextTimesteps();
  }, [state.currentTimestep, preloadNextTimesteps]);

  return {
    loadVTPData,
    preloadNextTimesteps,
    getFromCache: (timestep) => cacheRef.current.get(timestep)
  };
} 