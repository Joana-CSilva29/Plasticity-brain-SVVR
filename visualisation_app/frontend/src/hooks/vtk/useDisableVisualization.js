import { useMemo } from 'react';

const findClosestTimestepIndex = (timesteps, targetTime) => {
  if (!timesteps?.length) return -1;
  
  return timesteps.reduce((closest, current, index) => {
    const currentDiff = Math.abs(current - targetTime);
    const closestDiff = Math.abs(timesteps[closest] - targetTime);
    return currentDiff < closestDiff ? index : closest;
  }, 0);
};

export const useDisableVisualization = (disableData, currentTimestep) => {
  return useMemo(() => {
    if (!disableData?.timesteps?.length || !disableData?.areas) {
      return null;
    }

    const timeIndex = findClosestTimestepIndex(disableData.timesteps, currentTimestep);
    if (timeIndex === -1) {
      console.warn('No valid timestep found for disable visualization');
      return null;
    }

    const areaData = new Map();
    Object.entries(disableData.areas).forEach(([areaId, data]) => {
      const activityLevel = data.activity_levels[timeIndex];
      const isDisabled = data.is_disabled && currentTimestep >= disableData.disabled_areas[areaId]?.disable_time;
      
      areaData.set(areaId, {
        activityLevel,
        isDisabled,
        neuronCount: data.neuron_count
      });
    });

    return {
      timeIndex,
      timestamp: disableData.timesteps[timeIndex],
      areaData
    };
  }, [disableData, currentTimestep]);
}; 