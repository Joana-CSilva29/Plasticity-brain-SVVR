import { useCallback, useRef } from 'react';
import { useVTKState } from '../context/VTKContext';

export function useVTPLoader() {
  const state = useVTKState();
  const loadingRef = useRef(false);
  const abortControllerRef = useRef(null);

  const loadVTPData = useCallback(async (url) => {
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
      return buffer;
    } catch (error) {
      if (error.name === 'AbortError') {
        console.log('Loading aborted');
        return null;
      }
      console.error('Error loading VTP data:', error);
      throw error;
    }
  }, []);

  const preloadNextTimestep = useCallback(async () => {
    if (loadingRef.current) return;

    const nextTimestep = (state.currentTimestep + state.stepSize) % (state.maxTimestep + state.stepSize);
    const nextUrl = `http://localhost:5000/files/sim1/connections_${String(nextTimestep).padStart(7, '0')}.vtp`;
    
    loadingRef.current = true;
    try {
      await loadVTPData(nextUrl);
    } finally {
      loadingRef.current = false;
    }
  }, [state.currentTimestep, state.stepSize, state.maxTimestep, loadVTPData]);

  return {
    loadVTPData,
    preloadNextTimestep
  };
} 