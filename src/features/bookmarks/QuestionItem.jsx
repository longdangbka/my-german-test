import React, { useState, useEffect, useRef, useCallback, memo } from 'react';
import QuestionList from '../questions/components/QuestionList';
import { getVaultAudioSrc } from '../../shared/utils/testUtils';
import WavesurferComponent from '../audio/WavesurferComponent';

// Optimized BookmarkAudioPlayer for bookmarked questions
const BookmarkAudioPlayer = memo(function BookmarkAudioPlayer({ audioFile }) {
  const [src, setSrc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [rate, setRate] = useState(1);
  const [playing, setPlaying] = useState(false);
  const [ready, setReady] = useState(false);
  const wsRef = useRef(null);

  // Lean audio loading with active flag
  useEffect(() => {
    let active = true;
    
    if (!audioFile) {
      setLoading(false);
      return;
    }

    (async () => {
      setReady(false);
      try {
        console.log('🔊 Loading audio:', audioFile);
        const url = await getVaultAudioSrc(audioFile);
        if (active) {
          setSrc(url || '');
          console.log('🔊 Audio loaded:', url ? 'success' : 'failed');
        }
      } catch (error) {
        console.error('🔊 Audio load error:', error);
        if (active) setSrc('');
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => { active = false; };
  }, [audioFile]);

  // Sync playback rate when ready
  useEffect(() => {
    if (ready && wsRef.current) {
      wsRef.current.setPlaybackRate(rate);
    }
  }, [rate, ready]);

  // Memoized WaveSurfer callbacks
  const onReady = useCallback(() => {
    console.log('🎵 BookmarkAudioPlayer ready');
    setReady(true);
  }, []);

  const onPlay = useCallback(() => setPlaying(true), []);
  const onPause = useCallback(() => setPlaying(false), []);
  const onFinish = useCallback(() => setPlaying(false), []);

  // Encapsulated control functions
  const togglePlay = () => {
    const ws = wsRef.current;
    if (ws && ready) {
      console.log('🎵 Toggle play/pause');
      ws.playPause();
    }
  };

  const changeRate = (newRate) => {
    const ws = wsRef.current;
    if (!ws || !ready) return;
    
    console.log('🎵 Changing rate to:', newRate);
    const wasPlaying = ws.isPlaying();
    ws.setPlaybackRate(newRate);
    setRate(newRate);
    
    // Resume playback if it was playing before rate change
    if (wasPlaying) {
      setTimeout(() => ws.play(), 10);
    }
  };

  const skipBackward = () => {
    const ws = wsRef.current;
    if (ws && ready) {
      console.log('⏪ Skip backward');
      ws.skipBackward(1.5);
    }
  };

  const skipForward = () => {
    const ws = wsRef.current;
    if (ws && ready) {
      console.log('⏩ Skip forward');
      ws.skipForward(1.5);
    }
  };

  // Early returns for loading and unavailable states
  if (loading || !audioFile) return null;
  
  if (!src) {
    return (
      <div className="mb-3 p-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md">
        <span className="text-sm text-yellow-800 dark:text-yellow-200">
          🔊 Audio: {audioFile} (unavailable)
        </span>
      </div>
    );
  }

  const speedOptions = [1, 0.8, 0.6, 0.4, 0.3];

  return (
    <div className="mb-3 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md">
      <div className="flex items-center space-x-2 mb-2">
        <span className="text-sm font-medium text-blue-800 dark:text-blue-200">
          🔊 Audio: {audioFile}
        </span>
      </div>
      
      {/* WaveSurfer Player */}
      <div className="mb-3">
        <WavesurferComponent
          ref={wsRef}
          audioUrl={src}
          onReady={onReady}
          onPlay={onPlay}
          onPause={onPause}
          onFinish={onFinish}
          waveColor="#60A5FA"
          progressColor="#2563EB"
          cursorColor="#DC2626"
          height={80}
        />
      </div>

      {/* Play/Pause Button */}
      <div className="flex justify-center mb-2">
        <button
          type="button"
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1 rounded-md text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={togglePlay}
          disabled={!ready}
        >
          {playing ? '⏸️ Pause' : '▶️ Play'}
        </button>
      </div>
      
      {/* Streamlined control layout */}
      <div className="flex flex-wrap gap-1 items-center justify-between">
        {/* Navigation Controls */}
        <div className="flex gap-1 items-center">
          <button
            type="button"
            className="audio-btn-control"
            onClick={skipBackward}
            disabled={!ready}
            title="Go back 1.5 seconds"
          >
            ⏪ 1.5s
          </button>
          <button
            type="button"
            className="audio-btn-control"
            onClick={skipForward}
            disabled={!ready}
            title="Go forward 1.5 seconds"
          >
            1.5s ⏩
          </button>
        </div>

        {/* Speed Controls */}
        <div className="flex gap-1 items-center">
          {speedOptions.map((speed) => (
            <button
              key={speed}
              onClick={() => changeRate(speed)}
              disabled={!ready}
              className={`audio-btn-speed ${
                rate === speed
                  ? 'audio-btn-speed-active'
                  : 'audio-btn-speed-inactive'
              } ${!ready ? 'opacity-50 cursor-not-allowed' : ''}`}
              title={`Set playback speed to ${speed}x`}
            >
              {speed}x
            </button>
          ))}
        </div>
      </div>
    </div>
  );
});

// Simplified QuestionItem with optimized rendering
const QuestionItem = memo(function QuestionItem({
  question,
  answers,
  feedback,
  onChange,
  showFeedback,
  individualFeedback,
  onShowIndividualAnswer,
  seqStart
}) {
  const hasAudio = question.audioFile;

  return (
    <div className="question-item">
      {/* Conditionally render audio player */}
      {hasAudio && <BookmarkAudioPlayer audioFile={question.audioFile} />}
      
      {/* Render the question */}
      <QuestionList
        questions={[question]}
        answers={answers}
        feedback={feedback}
        onChange={onChange}
        showFeedback={showFeedback}
        quizName="bookmarks"
        showAnkiButton={true}
        individualFeedback={individualFeedback}
        onShowIndividualAnswer={onShowIndividualAnswer}
        seqStart={seqStart}
      />
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom memo comparator - only re-render if relevant data changed
  const { question } = prevProps;
  const { id, type, blanks = [] } = question;
  
  // Helper to check if a property changed
  const propChanged = (prop) => prevProps[prop] !== nextProps[prop];
  
  // Check if question-specific data changed
  let dataChanged = false;
  
  if (type === 'CLOZE' && blanks.length > 0) {
    // For CLOZE questions, check each blank's answer and feedback
    dataChanged = blanks.some((_, index) => {
      const key = `${id}_${index + 1}`;
      return (
        prevProps.answers[key] !== nextProps.answers[key] ||
        prevProps.feedback[key] !== nextProps.feedback[key]
      );
    });
  } else {
    // For other question types, check the main answer and feedback
    dataChanged = (
      prevProps.answers[id] !== nextProps.answers[id] ||
      prevProps.feedback[id] !== nextProps.feedback[id]
    );
  }
  
  // Check if other relevant props changed
  const otherPropsChanged = 
    propChanged('showFeedback') ||
    propChanged('seqStart') ||
    propChanged('question') ||
    (prevProps.individualFeedback[id] !== nextProps.individualFeedback[id]);
  
  // Only re-render if something actually changed
  const shouldRerender = dataChanged || otherPropsChanged;
  
  // Return true to skip re-render, false to re-render
  return !shouldRerender;
});

export default QuestionItem;
