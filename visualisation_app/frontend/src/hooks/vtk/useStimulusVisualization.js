import { useMemo } from 'react';

const findClosestTimestepIndex = (timesteps, targetTime) => {
  if (!timesteps?.length) return -1;
  
  return timesteps.reduce((closest, current, index) => {
    const currentDiff = Math.abs(current - targetTime);
    const closestDiff = Math.abs(timesteps[closest] - targetTime);
    return currentDiff < closestDiff ? index : closest;
  }, 0);
};

export const useStimulusVisualization = (stimulusData, currentTimestep) => {
  return useMemo(() => {
    if (!stimulusData?.timesteps?.length || !stimulusData?.areas) {
      return null;
    }

    const timeIndex = findClosestTimestepIndex(stimulusData.timesteps, currentTimestep);
    if (timeIndex === -1) {
      console.warn('No valid timestep found for stimulus visualization');
      return null;
    }

    const areaData = new Map();
    Object.entries(stimulusData.areas).forEach(([areaId, data]) => {
      const activityLevel = data.activity_levels[timeIndex];
      const isStimulated = stimulusData.stimulation_periods[areaId]?.periods?.some(
        period => currentTimestep >= period.start && currentTimestep <= period.end
      );
      
      areaData.set(areaId, {
        activityLevel,
        isStimulated,
        neuronCount: data.neuron_count
      });
    });

    return {
      timeIndex,
      timestamp: stimulusData.timesteps[timeIndex],
      areaData
    };
  }, [stimulusData, currentTimestep]);
}; 