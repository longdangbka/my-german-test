import React, { useEffect, useRef, useState } from 'react';
import { audioSources, setAudioSource } from '../../../audios.js';
import '../../../audio-contrast.css';

/**
 * AudioPlayer component for playing question group audio with playback controls
 * @param {Object} props - Component props
 * @param {Object} props.group - Question group object
 * @param {string} props.group.title - Group title used as audio key
 * @param {string} props.group.transcript - Audio transcript text
 * @param {boolean} props.disabled - Whether the player should be disabled
 */
export default function AudioPlayer({ group, disabled = false }) {
  const [src, setSrc] = useState(audioSources[group.title] || '');
  const [objectUrl, setObjectUrl] = useState(null);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [showTranscript, setShowTranscript] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const audioRef = useRef();
  const fileInputRef = useRef();

  // Listen for audio source updates
  useEffect(() => {
    const handler = (e) => {
      if (e.detail.key === group.title) {
        setSrc(e.detail.fileUrl);
        setError(null);
      }
    };
    window.addEventListener('audioSourceUpdated', handler);
    return () => window.removeEventListener('audioSourceUpdated', handler);
  }, [group.title]);

  // Cleanup object URL when src changes or unmounts
  useEffect(() => {
    return () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [objectUrl]);

  // Update playback rate on audio element
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackRate;
    }
  }, [playbackRate]);

  // Keyboard controls for forward/backward only (no spacebar to avoid conflicts)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!audioRef.current || disabled) return;
      
      // Only handle if not typing in an input/textarea
      const activeElement = document.activeElement;
      const tag = activeElement.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || activeElement.isContentEditable) {
        return;
      }

      if (e.key === 'ArrowLeft') {
        audioRef.current.currentTime = Math.max(0, audioRef.current.currentTime - 1.5);
        e.preventDefault();
      } else if (e.key === 'ArrowRight') {
        audioRef.current.currentTime = Math.min(
          audioRef.current.duration || Infinity, 
          audioRef.current.currentTime + 1.5
        );
        e.preventDefault();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [disabled]);

  /**
   * Handle audio loading errors
   */
  const handleAudioError = (e) => {
    const errorMessage = `Audio failed to load: ${src}`;
    console.error('Audio error:', e, errorMessage);
    setError(errorMessage);
  };

  /**
   * Handle audio loading start
   */
  const handleLoadStart = () => {
    setIsLoading(true);
    setError(null);
  };

  /**
   * Handle audio loading completion
   */
  const handleLoadedData = () => {
    setIsLoading(false);
  };

  /**
   * Handle file upload for changing audio
   */
  const handleUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setAudioSource(group.title, file); // Pass the File object
      // Clear input immediately so no filename lingers
      e.target.value = '';
    }
  };

  /**
   * Skip backwards by 1.5 seconds
   */
  const skipBackward = () => {
    if (audioRef.current && !disabled) {
      audioRef.current.currentTime = Math.max(0, audioRef.current.currentTime - 1.5);
    }
  };

  /**
   * Skip forward by 1.5 seconds
   */
  const skipForward = () => {
    if (audioRef.current && !disabled) {
      audioRef.current.currentTime = Math.min(
        audioRef.current.duration || Infinity, 
        audioRef.current.currentTime + 1.5
      );
    }
  };

  const speedOptions = [1, 0.8, 0.6, 0.4, 0.3];

  // Render upload interface if no audio source
  if (!src) {
    return (
      <div className="audio-player-no-source p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
        <p className="text-yellow-800 dark:text-yellow-200 mb-3">
          No audio found for this task.
        </p>
        
        <div className="upload-wrapper">
          <label 
            htmlFor={`upload-${group.title}`} 
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg cursor-pointer transition-all duration-200 shadow-sm focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            <span>📁</span>
            <span>Upload Audio</span>
          </label>
          <input
            id={`upload-${group.title}`}
            ref={fileInputRef}
            type="file"
            accept="audio/*"
            onChange={handleUpload}
            className="hidden"
          />
        </div>

        {group.transcript && (
          <div className="mt-4">
            <button
              className="flex items-center gap-2 mb-3 px-4 py-2 rounded-lg border bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-100 border-gray-300 dark:border-gray-600 hover:bg-gray-300 dark:hover:bg-gray-600 transition-all duration-200"
              onClick={() => setShowTranscript(v => !v)}
            >
              <span>📄</span>
              <span>{showTranscript ? 'Hide' : 'Show'} Transcript</span>
            </button>
            
            {showTranscript && (
              <div className="p-4 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg border border-gray-200 dark:border-gray-600 text-sm whitespace-pre-line shadow-sm">
                <strong className="text-gray-900 dark:text-gray-100">Transcript:</strong>
                <div className="mt-2">{group.transcript}</div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`audio-player audio-contrast p-4 border rounded-lg space-y-3 sticky top-0 z-50 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-sm ${disabled ? 'opacity-50' : ''}`}>
      {/* Error display */}
      {error && (
        <div className="error-message p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-red-700 dark:text-red-300 text-sm">
          {error}
        </div>
      )}

      {/* Loading indicator */}
      {isLoading && (
        <div className="loading-indicator text-sm text-gray-600 dark:text-gray-400">
          Loading audio...
        </div>
      )}

      {/* Audio element */}
      <audio
        ref={audioRef}
        controls={!disabled}
        src={src}
        style={{ width: '100%' }}
        onError={handleAudioError}
        onLoadStart={handleLoadStart}
        onLoadedData={handleLoadedData}
        className="rounded"
      />

      {/* Playback controls */}
      <div className="playback-controls flex flex-wrap gap-2 items-center">
        <button
          type="button"
          disabled={disabled}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg border bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-100 border-gray-300 dark:border-gray-600 hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
          onClick={skipBackward}
          title="Skip back 1.5 seconds (← key)"
        >
          <span>⏪</span>
          <span className="text-xs">1.5s</span>
        </button>

        {/* Speed controls */}
        <div className="speed-controls flex gap-1">
          {speedOptions.map((rate) => (
            <button
              key={rate}
              disabled={disabled}
              onClick={() => setPlaybackRate(rate)}
              className={`px-3 py-1.5 rounded-lg border transition-all duration-200 text-sm disabled:opacity-50 disabled:cursor-not-allowed ${
                playbackRate === rate
                  ? 'bg-blue-500 dark:bg-blue-600 text-white border-blue-500 dark:border-blue-600'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-100 border-gray-300 dark:border-gray-600 hover:bg-gray-300 dark:hover:bg-gray-600'
              }`}
              title={`Set playback speed to ${rate}x`}
            >
              {rate}x
            </button>
          ))}
        </div>

        <button
          type="button"
          disabled={disabled}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg border bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-100 border-gray-300 dark:border-gray-600 hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
          onClick={skipForward}
          title="Skip forward 1.5 seconds (→ key)"
        >
          <span className="text-xs">1.5s</span>
          <span>⏩</span>
        </button>
      </div>

      {/* Upload controls */}
      <div className="upload-wrapper">
        <label 
          htmlFor={`upload-${group.title}`} 
          className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg border bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-100 border-gray-300 dark:border-gray-600 hover:bg-gray-300 dark:hover:bg-gray-600 transition-all duration-200 text-sm ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        >
          <span>🔄</span>
          <span>Change Audio</span>
        </label>
        <input
          id={`upload-${group.title}`}
          ref={fileInputRef}
          type="file"
          accept="audio/*"
          onChange={handleUpload}
          disabled={disabled}
          className="hidden"
        />
      </div>

      {/* Transcript */}
      {group.transcript && (
        <div className="transcript-section">
          <button
            disabled={disabled}
            className="flex items-center gap-2 mb-3 px-4 py-2 rounded-lg border bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-100 border-gray-300 dark:border-gray-600 hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            onClick={() => setShowTranscript(v => !v)}
          >
            <span>📄</span>
            <span>{showTranscript ? 'Hide' : 'Show'} Transcript</span>
          </button>
          
          {showTranscript && (
            <div className="transcript-content p-4 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg border border-gray-200 dark:border-gray-600 text-sm whitespace-pre-line shadow-sm">
              <div className="transcript-text">{group.transcript}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
