import React, { useRef } from 'react';
import { useAudioVisualization, VISUALIZATION_TYPES } from '../contexts/AudioVisualizationContext';
import StandardAudioBars from './StandardAudioBars';
import WavesurferComponent from './WavesurferComponent';

export default function AudioVisualizationSelector({ audioRef, src, onLoadError, isPlaying }) {
  const { visualizationType } = useAudioVisualization();
  const wavesurferRef = useRef();

  // Expose the wavesurfer ref to parent component for control coordination
  React.useEffect(() => {
    if (audioRef && audioRef.wavesurferRef) {
      audioRef.wavesurferRef.current = wavesurferRef.current;
    }
  }, [audioRef, visualizationType]);

  if (visualizationType === VISUALIZATION_TYPES.WAVEFORM) {
    return (
      <WavesurferComponent 
        ref={wavesurferRef}
        audioElement={audioRef?.current} 
        audioSrc={src} 
        isPlaying={isPlaying}
      />
    );
  }

  // For standard bars, show the native HTML5 audio controls
  // We need to assign this audio element to the ref so other controls can work with it
  const standardAudioRef = (element) => {
    if (audioRef && element) {
      audioRef.current = element;
    }
  };

  return (
    <audio
      ref={standardAudioRef}
      controls
      src={src}
      style={{ 
        width: '100%',
        height: '40px'
      }}
      onError={onLoadError}
    />
  );
}
