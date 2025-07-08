import React, { useEffect, useRef, useState } from 'react';
import { audioSources, setAudioSource } from './audios';
import { getVaultAudioSrc } from '../../shared/utils/testUtils';
import '../../assets/styles/audio-contrast.css';

export default function AudioPlayer({ group }) {
  const [src, setSrc] = useState('');
  const [playbackRate, setPlaybackRate] = useState(1);
  const [showTranscript, setShowTranscript] = useState(false);
  const audioRef = useRef();

  // Initialize audio source
  useEffect(() => {
    const initializeAudio = async () => {
      // First priority: Check if group has an audioFile from vault
      if (group.audioFile) {
        console.log('Loading audio from vault (group level):', group.audioFile);
        try {
          const vaultAudioSrc = await getVaultAudioSrc(group.audioFile);
          if (vaultAudioSrc) {
            setSrc(vaultAudioSrc);
            console.log('Successfully loaded vault audio');
            return;
          }
        } catch (error) {
          console.error('Error loading vault audio:', error);
        }
      }
      
      // Second priority: Check if any AUDIO question has an audioFile
      const audioQuestion = group.questions?.find(q => q.type === 'AUDIO' && q.audioFile);
      if (audioQuestion?.audioFile) {
        console.log('Loading audio from vault (question level):', audioQuestion.audioFile);
        try {
          const vaultAudioSrc = await getVaultAudioSrc(audioQuestion.audioFile);
          if (vaultAudioSrc) {
            setSrc(vaultAudioSrc);
            console.log('Successfully loaded vault audio from question');
            return;
          }
        } catch (error) {
          console.error('Error loading vault audio from question:', error);
        }
      }
      
      // Fallback: Use existing audio sources
      const existingSource = audioSources[group.title] || '';
      setSrc(existingSource);
    };

    initializeAudio();
  }, [group.title, group.audioFile, group.questions]);

  // Listen for audio source updates
  useEffect(() => {
    const handler = (e) => {
      if (e.detail.key === group.title) setSrc(e.detail.fileUrl);
    };
    window.addEventListener('audioSourceUpdated', handler);
    return () => window.removeEventListener('audioSourceUpdated', handler);
  }, [group.title]);

  // Cleanup object URL when component unmounts
  useEffect(() => {
    return () => {
      // Cleanup any object URLs when component unmounts
    };
  }, []);

  // Update playback rate on audio element
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackRate;
    }
  }, [playbackRate]);

  // Keyboard controls for audio playback
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!audioRef.current) return;
      // Only handle if not typing in an input/textarea
      const tag = document.activeElement.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || document.activeElement.isContentEditable) return;
      
      if (e.key === 'ArrowLeft') {
        audioRef.current.currentTime = Math.max(0, audioRef.current.currentTime - 1.5);
        e.preventDefault();
      } else if (e.key === 'ArrowRight') {
        audioRef.current.currentTime = Math.min(audioRef.current.duration || Infinity, audioRef.current.currentTime + 1.5);
        e.preventDefault();
      } else if (e.key === 'j' || e.key === 'J') {
        // J key: pause/play toggle
        if (audioRef.current.paused) {
          audioRef.current.play();
        } else {
          audioRef.current.pause();
        }
        e.preventDefault();
      } else if (e.key === 'h' || e.key === 'H') {
        // H key: backward 1.5s
        audioRef.current.currentTime = Math.max(0, audioRef.current.currentTime - 1.5);
        e.preventDefault();
      } else if (e.key === 'k' || e.key === 'K') {
        // K key: forward 1.5s
        audioRef.current.currentTime = Math.min(audioRef.current.duration || Infinity, audioRef.current.currentTime + 1.5);
        e.preventDefault();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Add error handling for audio loading
  const handleAudioError = () => {
    alert('Audio failed to load: ' + src);
    setSrc('');
  };

  // Handle file upload
  const handleUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setAudioSource(group.title, file); // Pass the File object, not a blob URL
      // clear *this* input immediately so no filename lingers
      e.target.value = '';
    }
  };

  const speedOptions = [1, 0.8, 0.6, 0.4, 0.3];

  if (!src) {
    return (
      <div>
        <p>No audio found for this task.</p>
        <div className="upload-wrapper">
          <label htmlFor={`upload-${group.title}`} className="btn">
            Upload Audio
          </label>
          <input
            id={`upload-${group.title}`}
            type="file"
            accept="audio/*"
            onChange={handleUpload}
          />
        </div>
        {group.transcript && (
          <div className="mt-4">
            <button
              className="mb-3 px-4 py-2 rounded-lg border bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-100 border-gray-300 dark:border-gray-600 hover:bg-gray-300 dark:hover:bg-gray-600 transition-all duration-200"
              onClick={() => setShowTranscript((v) => !v)}
            >
              {showTranscript ? '📄 Hide Transcript' : '📄 Show Transcript'}
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
    <div className="audio-contrast p-3 border rounded space-y-2 sticky top-0 z-50">
      <audio
        ref={audioRef}
        controls
        src={src}
        style={{ width: '100%' }}
        onError={handleAudioError}
      />
      <div className="my-2 flex gap-2 items-center">
        <button
          type="button"
          className="px-3 py-1.5 rounded-lg border bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-100 border-gray-300 dark:border-gray-600 hover:bg-gray-300 dark:hover:bg-gray-600 transition-all duration-200"
          onClick={() => {
            if (audioRef.current) {
              audioRef.current.currentTime = Math.max(0, audioRef.current.currentTime - 1.5);
            }
          }}
        >
          ⏪ 1.5s
        </button>
        {speedOptions.map((rate) => (
          <button
            key={rate}
            onClick={() => setPlaybackRate(rate)}
            className={`px-3 py-1.5 rounded-lg border transition-all duration-200 ${
              playbackRate === rate
                ? 'bg-blue-500 dark:bg-blue-600 text-white border-blue-500 dark:border-blue-600'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-100 border-gray-300 dark:border-gray-600 hover:bg-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            {rate}x
          </button>
        ))}
        <button
          type="button"
          className="px-3 py-1.5 rounded-lg border bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-100 border-gray-300 dark:border-gray-600 hover:bg-gray-300 dark:hover:bg-gray-600 transition-all duration-200"
          onClick={() => {
            if (audioRef.current) {
              audioRef.current.currentTime = Math.min(audioRef.current.duration || Infinity, audioRef.current.currentTime + 1.5);
            }
          }}
        >
          1.5s ⏩
        </button>
      </div>
      <div className="text-xs text-gray-600 dark:text-gray-400 mb-2">
        Keyboard shortcuts: <kbd className="px-1 py-0.5 bg-gray-100 dark:bg-gray-800 rounded">J</kbd> pause/play, 
        <kbd className="px-1 py-0.5 bg-gray-100 dark:bg-gray-800 rounded ml-1">H</kbd> back 1.5s, 
        <kbd className="px-1 py-0.5 bg-gray-100 dark:bg-gray-800 rounded ml-1">K</kbd> forward 1.5s
      </div>
      <div className="upload-wrapper">
        <label htmlFor={`upload-${group.title}`} className="btn">
          Change Audio
        </label>
        <input
          id={`upload-${group.title}`}
          type="file"
          accept="audio/*"
          onChange={handleUpload}
        />
      </div>
      {group.transcript && (
        <div className="mt-4">
          <button
            className="mb-3 px-4 py-2 rounded-lg border bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-100 border-gray-300 dark:border-gray-600 hover:bg-gray-300 dark:hover:bg-gray-600 transition-all duration-200"
            onClick={() => setShowTranscript((v) => !v)}
          >
            {showTranscript ? '📄 Hide Transcript' : '📄 Show Transcript'}
          </button>
          {showTranscript && (
            <div className="p-4 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg border border-gray-200 dark:border-gray-600 text-sm whitespace-pre-line shadow-sm">
              <div className="mt-2">{group.transcript}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
