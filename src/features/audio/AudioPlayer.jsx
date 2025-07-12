import React, { useEffect, useRef, useState, useCallback } from 'react';
import { audioSources, setAudioSource } from './audios';
import { getVaultAudioSrc } from '../../shared/utils/testUtils';
import WavesurferComponent from './WavesurferComponent';
import '../../assets/styles/audio-contrast.css';

export default function AudioPlayer({ group }) {
  const [src, setSrc] = useState('');
  const [playbackRate, setPlaybackRate] = useState(1);
  const [showTranscript, setShowTranscript] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const wavesurferRef = useRef(null);

  // Consolidated audio loading logic
  useEffect(() => {
    let canceled = false;
    
    async function loadAudio() {
      setIsReady(false);
      const { audioFile, title, questions } = group;
      
      const tryLoad = async (file) => {
        try {
          const url = await getVaultAudioSrc(file);
          if (url && !canceled) return url;
        } catch (error) {
          console.error('Error loading audio:', error);
        }
        return '';
      };

      // Priority 1: Group-level audioFile
      let url = audioFile ? await tryLoad(audioFile) : '';
      
      // Priority 2: AUDIO question audioFile
      if (!url) {
        const audioQuestion = questions?.find(q => q.type === 'AUDIO' && q.audioFile);
        url = audioQuestion ? await tryLoad(audioQuestion.audioFile) : '';
      }
      
      // Priority 3: Existing audio sources fallback
      if (!url) {
        url = audioSources[title] || '';
      }

      if (!canceled) setSrc(url);
    }

    loadAudio();
    return () => { canceled = true; };
  }, [group]);

  // Streamlined external updates
  useEffect(() => {
    const onUpdate = (e) => {
      if (e.detail.key === group.title) setSrc(e.detail.fileUrl);
    };
    window.addEventListener('audioSourceUpdated', onUpdate);
    return () => window.removeEventListener('audioSourceUpdated', onUpdate);
  }, [group.title]);

  // Sync playback rate when ready
  useEffect(() => {
    if (isReady && wavesurferRef.current) {
      console.log('🎵 Setting playback rate to:', playbackRate);
      wavesurferRef.current.setPlaybackRate(playbackRate);
    }
  }, [playbackRate, isReady]);

  // Optimized keyboard shortcut handler
  useEffect(() => {
    const handler = (event) => {
      const ws = wavesurferRef.current;
      if (!ws || !isReady) return;
      
      const active = document.activeElement;
      if (['INPUT', 'TEXTAREA'].includes(active.tagName) || active.isContentEditable) return;
      
      const keyActions = {
        ArrowLeft: () => ws.skipBackward(1.5),
        ArrowRight: () => ws.skipForward(1.5),
        j: () => ws.playPause(),
        J: () => ws.playPause(),
        h: () => ws.skipBackward(1.5),
        H: () => ws.skipBackward(1.5),
        k: () => ws.skipForward(1.5),
        K: () => ws.skipForward(1.5)
      };
      
      if (keyActions[event.key]) {
        keyActions[event.key]();
        event.preventDefault();
      }
    };
    
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isReady]);

  // Memoized WaveSurfer callbacks
  const onReady = useCallback(() => {
    console.log('🎵 AudioPlayer - WaveSurfer ready');
    setIsReady(true);
  }, []);

  const onPlay = useCallback(() => {
    console.log('🎵 AudioPlayer - Play event received');
    setIsPlaying(true);
  }, []);

  const onPause = useCallback(() => {
    console.log('🎵 AudioPlayer - Pause event received');
    setIsPlaying(false);
  }, []);

  const onFinish = useCallback(() => {
    console.log('🎵 AudioPlayer - Finish event received');
    setIsPlaying(false);
  }, []);

  const onSeek = useCallback(() => {
    // Seek event handled by WaveSurfer internally
  }, []);

  // Simplified playback controls
  const handlePlayPause = () => {
    const ws = wavesurferRef.current;
    if (ws && isReady) {
      console.log('🎵 Play/Pause button clicked');
      ws.playPause();
    } else {
      console.log('❌ WaveSurfer instance not ready yet');
    }
  };

  const changeRate = (rate) => {
    const ws = wavesurferRef.current;
    if (!ws || !isReady) {
      console.log('❌ WaveSurfer not ready, cannot change speed');
      return;
    }
    
    console.log('🎵 Speed button clicked:', rate);
    const wasPlaying = ws.isPlaying();
    ws.setPlaybackRate(rate);
    setPlaybackRate(rate);
    
    // Resume playback if it was playing before rate change
    if (wasPlaying) {
      setTimeout(() => ws.play(), 10); // Small delay to ensure rate change is applied
    }
  };

  const handleUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setAudioSource(group.title, file);
      e.target.value = '';
    }
  };

  const speedOptions = [1, 0.8, 0.6, 0.4, 0.3];

  // Early return for "No Source" UI
  if (!src) {
    return (
      <div className="audio-contrast p-3 border rounded sticky top-0 z-50">
        <div className="mb-3 text-center text-gray-600 dark:text-gray-400">
          📷 No audio available for this task
        </div>
        
        {/* Upload Audio Button */}
        <div className="flex justify-center mb-3">
          <div className="upload-wrapper">
            <label htmlFor={`upload-${group.title}`} className="audio-btn-upload">
              📁 Upload Audio
            </label>
            <input
              id={`upload-${group.title}`}
              type="file"
              accept="audio/*"
              onChange={handleUpload}
            />
          </div>
        </div>
        
        {/* Transcript Section */}
        {group.transcript && (
          <div>
            <button
              className="audio-btn-transcript w-full mb-2"
              onClick={() => setShowTranscript(v => !v)}
            >
              {showTranscript ? '📄 Hide Transcript' : '📄 Show Transcript'}
            </button>
            {showTranscript && (
              <div className="p-3 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg border border-gray-200 dark:border-gray-600 text-sm whitespace-pre-line shadow-sm">
                <strong className="text-gray-900 dark:text-gray-100">Transcript:</strong>
                <div className="mt-2">{group.transcript}</div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // Main player UI with optimized layout
  return (
    <div className="audio-contrast p-3 border rounded sticky top-0 z-50">
      {/* WaveSurfer Player */}
      <div className="mb-3">
        <WavesurferComponent
          ref={wavesurferRef}
          audioUrl={src}
          onReady={onReady}
          onPlay={onPlay}
          onPause={onPause}
          onFinish={onFinish}
          onSeek={onSeek}
          waveColor="#60A5FA"
          progressColor="#2563EB"
          cursorColor="#DC2626"
          height={100}
        />
      </div>

      {/* Play/Pause Button */}
      <div className="flex justify-center mb-3">
        <button
          type="button"
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={handlePlayPause}
          disabled={!isReady}
        >
          {isPlaying ? '⏸️ Pause' : '▶️ Play'}
        </button>
      </div>
      
      {/* Compact Control Layout */}
      <div className="flex flex-wrap gap-2 items-center justify-between mb-2">
        {/* Navigation Controls */}
        <div className="flex gap-1 items-center">
          <button
            type="button"
            className="audio-btn-control"
            onClick={() => {
              const ws = wavesurferRef.current;
              if (ws && isReady) {
                console.log('⏪ Skip backward button clicked');
                ws.skipBackward(1.5);
              }
            }}
            disabled={!isReady}
            title="Go back 1.5 seconds"
          >
            ⏪ 1.5s
          </button>
          <button
            type="button"
            className="audio-btn-control"
            onClick={() => {
              const ws = wavesurferRef.current;
              if (ws && isReady) {
                console.log('⏩ Skip forward button clicked');
                ws.skipForward(1.5);
              }
            }}
            disabled={!isReady}
            title="Go forward 1.5 seconds"
          >
            1.5s ⏩
          </button>
        </div>

        {/* Speed Controls */}
        <div className="flex gap-1 items-center">
          {speedOptions.map((rate) => (
            <button
              key={rate}
              onClick={() => changeRate(rate)}
              disabled={!isReady}
              className={`audio-btn-speed ${
                playbackRate === rate
                  ? 'audio-btn-speed-active'
                  : 'audio-btn-speed-inactive'
              } ${!isReady ? 'opacity-50 cursor-not-allowed' : ''}`}
              title={`Set playback speed to ${rate}x`}
            >
              {rate}x
            </button>
          ))}
        </div>

        {/* Change Audio Button */}
        <div className="upload-wrapper">
          <label htmlFor={`upload-change-${group.title}`} className="audio-btn-upload">
            📁 Change Audio
          </label>
          <input
            id={`upload-change-${group.title}`}
            type="file"
            accept="audio/*"
            onChange={handleUpload}
          />
        </div>
      </div>
      
      {/* Keyboard Shortcuts - Compact Display */}
      <div className="text-xs text-gray-600 dark:text-gray-400 mb-2 flex flex-wrap gap-1 items-center">
        <span>Shortcuts:</span>
        <kbd className="kbd">J</kbd><span className="text-gray-500">play/pause</span>
        <kbd className="kbd">H</kbd><span className="text-gray-500">back</span>
        <kbd className="kbd">K</kbd><span className="text-gray-500">forward</span>
      </div>
      
      {/* Transcript Section */}
      {group.transcript && (
        <div>
          <button
            className="audio-btn-transcript w-full"
            onClick={() => setShowTranscript(v => !v)}
          >
            {showTranscript ? '📄 Hide Transcript' : '📄 Show Transcript'}
          </button>
          {showTranscript && (
            <div className="mt-2 p-3 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg border border-gray-200 dark:border-gray-600 text-sm whitespace-pre-line shadow-sm">
              <div>{group.transcript}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
