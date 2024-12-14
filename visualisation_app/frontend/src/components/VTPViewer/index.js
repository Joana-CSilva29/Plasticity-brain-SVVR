import React, { useRef } from 'react';
import { useVTKState } from '../../context/VTKContext';
import { useVTKInitialization } from '../../hooks/vtk/useVTKInitialization';
import { useVTKDataLoader } from '../../hooks/vtk/useVTKDataLoader';
import { useVTKCamera } from '../../hooks/vtk/useVTKCamera';
import { useLabels } from '../../hooks/vtk/useLabels';
import { useNeurons } from '../../hooks/vtk/useNeurons';
import { useConnections } from '../../hooks/vtk/useConnections';
import { useCalciumVisualization } from '../../hooks/vtk/useCalciumVisualization';
import { ViewerContainer, VTKContainer } from './styles';
import LoadingOverlay from './LoadingOverlay';
import CameraControls from './CameraControls';
import InfoOverlay from './InfoOverlay';
import Tooltip from './Tooltip';

const VTPViewer = () => {
  const state = useVTKState();
  const vtkContainerRef = useRef(null);
  
  // Core VTK setup
  const { isInitialized, context } = useVTKInitialization(vtkContainerRef);
  const { isLoading, loadingProgress, loadingStates } = useVTKDataLoader(context, isInitialized);
  const { setCameraPosition } = useVTKCamera(context);

  // Feature-specific hooks
  const {
    showLabels,
    setShowLabels,
    labelCanvas,
    tooltipInfo,
    handleMouseMove
  } = useLabels(context, isInitialized);

  useNeurons(context, state, isInitialized);
  useConnections(context, state, isInitialized);
  const calciumViz = useCalciumVisualization(context, state, calciumData);

  return (
    <ViewerContainer>
      <VTKContainer 
        ref={vtkContainerRef} 
        sx={{ visibility: isInitialized ? 'visible' : 'hidden' }}
        onMouseMove={handleMouseMove}
      />
      <CameraControls onViewChange={setCameraPosition} />
      <InfoOverlay />
      <LoadingOverlay 
        show={isLoading || loadingStates.neurons || loadingStates.connections}
        progress={loadingProgress}
      />
      {showLabels && <Tooltip info={tooltipInfo} />}
    </ViewerContainer>
  );
};

export default React.memo(VTPViewer); 