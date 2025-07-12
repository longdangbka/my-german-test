import React, { useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import WaveSurfer from 'wavesurfer.js';

const WavesurferComponent = forwardRef(function WavesurferComponent({ 
  audioUrl, 
  onReady, 
  onPlay, 
  onPause, 
  onSeek, 
  onFinish,
  onError,
  waveColor = '#FF6B35',
  progressColor = '#FF6B35', 
  cursorColor = '#FF6B35',
  height = 80,
  responsive = true,
  normalize = true
}, ref) {
  const containerRef = useRef();
  const wavesurferRef = useRef();

  useImperativeHandle(ref, () => ({
    // Core playback methods
    play: () => wavesurferRef.current?.play(),
    pause: () => wavesurferRef.current?.pause(),
    playPause: () => wavesurferRef.current?.playPause(),
    stop: () => wavesurferRef.current?.stop(),
    
    // Seeking methods - Fixed to use correct WaveSurfer v7 API
    seekTo: (progress) => wavesurferRef.current?.seekTo(progress),
    skipBackward: (seconds) => {
      const ws = wavesurferRef.current;
      if (ws) {
        const currentTime = ws.getCurrentTime();
        const duration = ws.getDuration();
        const newTime = Math.max(0, currentTime - seconds);
        ws.seekTo(newTime / duration);
      }
    },
    skipForward: (seconds) => {
      const ws = wavesurferRef.current;
      if (ws) {
        const currentTime = ws.getCurrentTime();
        const duration = ws.getDuration();
        const newTime = Math.min(duration, currentTime + seconds);
        ws.seekTo(newTime / duration);
      }
    },
    
    // State getters
    isPlaying: () => wavesurferRef.current?.isPlaying() || false,
    getCurrentTime: () => wavesurferRef.current?.getCurrentTime() || 0,
    getDuration: () => wavesurferRef.current?.getDuration() || 0,
    
    // Playback rate
    setPlaybackRate: (rate) => wavesurferRef.current?.setPlaybackRate(rate),
    getPlaybackRate: () => wavesurferRef.current?.getPlaybackRate() || 1,
    
    // Volume
    setVolume: (volume) => wavesurferRef.current?.setVolume(volume),
    getVolume: () => wavesurferRef.current?.getVolume() || 1,
    
    // Raw wavesurfer instance for advanced usage
    getWaveSurfer: () => wavesurferRef.current,
    
    // Load new audio
    load: (url) => wavesurferRef.current?.load(url)
  }), []);

  useEffect(() => {
    if (!containerRef.current) return;

    // Create WaveSurfer instance
    const wavesurfer = WaveSurfer.create({
      container: containerRef.current,
      waveColor,
      progressColor,
      cursorColor,
      height,
      responsive,
      normalize,
      interact: true,
      cursorWidth: 2,
      barWidth: 3,
      barGap: 1,
      barRadius: 3,
      fillParent: true,
      hideScrollbar: true,
      mediaControls: false
    });

    wavesurferRef.current = wavesurfer;

    // Event listeners
    if (onReady) wavesurfer.on('ready', onReady);
    if (onPlay) wavesurfer.on('play', onPlay);
    if (onPause) wavesurfer.on('pause', onPause);
    if (onSeek) wavesurfer.on('seek', onSeek);
    if (onFinish) wavesurfer.on('finish', onFinish);
    if (onError) wavesurfer.on('error', onError);

    // Handle finish event to reset UI state
    wavesurfer.on('finish', () => {
      console.log('🎵 WaveSurfer finished playing');
      if (onPause) onPause(); // Reset the playing state in parent
    });

    // Debug logging
    wavesurfer.on('ready', () => {
      console.log('🎵 WaveSurfer ready, duration:', wavesurfer.getDuration());
    });
    
    wavesurfer.on('play', () => {
      console.log('🎵 WaveSurfer play event');
    });
    
    wavesurfer.on('pause', () => {
      console.log('🎵 WaveSurfer pause event');
    });

    // Click to seek and play
    wavesurfer.on('click', (progress) => {
      console.log('🎵 WaveSurfer click, seeking to:', progress);
      wavesurfer.seekTo(progress);
      // Always start playback after seeking, regardless of previous state
      setTimeout(() => {
        wavesurfer.play();
      }, 10); // Small delay to ensure seek completes
      if (onSeek) onSeek(progress);
    });

    // Load audio
    if (audioUrl) {
      console.log('🎵 Loading audio URL:', audioUrl);
      wavesurfer.load(audioUrl);
    }

    // Cleanup function
    return () => {
      if (wavesurfer) {
        wavesurfer.destroy();
      }
    };
  }, [audioUrl, waveColor, progressColor, cursorColor, height, responsive, normalize]);
  
  // Separate effect for event handlers to avoid recreating WaveSurfer instance
  useEffect(() => {
    const wavesurfer = wavesurferRef.current;
    if (!wavesurfer) return;

    // Remove all existing listeners first
    wavesurfer.un('ready');
    wavesurfer.un('play');
    wavesurfer.un('pause');
    wavesurfer.un('seek');
    wavesurfer.un('finish');
    wavesurfer.un('error');

    // Add new listeners
    if (onReady) wavesurfer.on('ready', onReady);
    if (onPlay) wavesurfer.on('play', onPlay);
    if (onPause) wavesurfer.on('pause', onPause);
    if (onSeek) wavesurfer.on('seek', onSeek);
    if (onFinish) wavesurfer.on('finish', onFinish);
    if (onError) wavesurfer.on('error', onError);
  }, [onReady, onPlay, onPause, onSeek, onFinish, onError]);

  return (
    <div 
      ref={containerRef} 
      className="w-full bg-gradient-to-r from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 rounded-lg overflow-hidden border border-gray-300 dark:border-gray-600 shadow-sm"
      style={{ minHeight: height + 'px' }}
    />
  );
});

export default WavesurferComponent;
