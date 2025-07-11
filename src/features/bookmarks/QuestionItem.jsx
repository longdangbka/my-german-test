import React, { useState, useEffect, useRef, useMemo } from 'react';
import QuestionList from '../questions/components/QuestionList';
import { getVaultAudioSrc } from '../../shared/utils/testUtils';

// Enhanced audio player component for bookmarked questions with full controls
const BookmarkAudioPlayer = React.memo(function BookmarkAudioPlayer({ audioFile }) {
  const [audioSrc, setAudioSrc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [playbackRate, setPlaybackRate] = useState(1);
  const audioRef = useRef();

  useEffect(() => {
    const loadAudio = async () => {
      if (!audioFile) {
        setLoading(false);
        return;
      }
      
      try {
        console.log('🔊 BOOKMARK AUDIO - Loading audio:', audioFile);
        const src = await getVaultAudioSrc(audioFile);
        if (src) {
          setAudioSrc(src);
          console.log('🔊 BOOKMARK AUDIO - Successfully loaded audio');
        } else {
          console.warn('🔊 BOOKMARK AUDIO - Failed to load audio:', audioFile);
        }
      } catch (error) {
        console.error('🔊 BOOKMARK AUDIO - Error loading audio:', error);
      } finally {
        setLoading(false);
      }
    };

    loadAudio();
  }, [audioFile]);

  // Update playback rate on audio element
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackRate;
    }
  }, [playbackRate]);

  const speedOptions = [1, 0.8, 0.6, 0.4, 0.3];

  if (!audioFile || loading) {
    return null;
  }

  if (!audioSrc) {
    return (
      <div className="mb-3 p-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md">
        <span className="text-sm text-yellow-800 dark:text-yellow-200">
          🔊 Audio: {audioFile} (unavailable)
        </span>
      </div>
    );
  }

  // Handle audio loading errors
  const handleAudioError = () => {
    console.error('🔊 BOOKMARK AUDIO - Failed to load:', audioFile);
  };

  return (
    <div className="mb-3 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md">
      <div className="flex items-center space-x-2 mb-2">
        <span className="text-sm font-medium text-blue-800 dark:text-blue-200">
          🔊 Audio: {audioFile}
        </span>
      </div>
      
      {/* Audio element with full controls */}
      <audio 
        ref={audioRef}
        controls 
        className="w-full mb-2"
        onError={handleAudioError}
        preload="metadata"
      >
        <source src={audioSrc} type="audio/mpeg" />
        <source src={audioSrc} type="audio/wav" />
        <source src={audioSrc} type="audio/mp4" />
        <source src={audioSrc} type="audio/ogg" />
        Your browser does not support the audio element.
      </audio>
      
      {/* Control buttons for skip and speed - Updated to match main AudioPlayer */}
      <div className="flex flex-wrap gap-1 items-center justify-between">
        {/* Navigation Controls */}
        <div className="flex gap-1 items-center">
          <button
            type="button"
            className="audio-btn-control"
            onClick={() => {
              if (audioRef.current) {
                audioRef.current.currentTime = Math.max(0, audioRef.current.currentTime - 1.5);
              }
            }}
            title="Go back 1.5 seconds"
          >
            ⏪ 1.5s
          </button>
          <button
            type="button"
            className="audio-btn-control"
            onClick={() => {
              if (audioRef.current) {
                audioRef.current.currentTime = Math.min(audioRef.current.duration || Infinity, audioRef.current.currentTime + 1.5);
              }
            }}
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
              onClick={() => setPlaybackRate(rate)}
              className={`audio-btn-speed ${
                playbackRate === rate
                  ? 'audio-btn-speed-active'
                  : 'audio-btn-speed-inactive'
              }`}
              title={`Set playback speed to ${rate}x`}
            >
              {rate}x
            </button>
          ))}
        </div>
      </div>
    </div>
  );
});

const QuestionItem = React.memo(function QuestionItem({
  question,
  answers,
  feedback,
  onChange,
  showFeedback,
  individualFeedback,
  onShowIndividualAnswer,
  seqStart
}) {
  // Memoize the question-specific data to avoid re-parsing on every render
  const questionData = useMemo(() => {
    // Extract only the data relevant to this specific question
    const questionAnswers = {};
    const questionFeedback = {};
    
    if (question.type === 'CLOZE' && question.blanks) {
      question.blanks.forEach((_, bi) => {
        const key = `${question.id}_${bi+1}`;
        questionAnswers[key] = answers[key] || '';
        questionFeedback[key] = feedback[key] || '';
      });
    } else {
      questionAnswers[question.id] = answers[question.id] || '';
      questionFeedback[question.id] = feedback[question.id] || '';
    }
    
    return {
      answers: questionAnswers,
      feedback: questionFeedback,
      individualFeedback: individualFeedback[question.id] || false
    };
  }, [question, answers, feedback, individualFeedback]);

  return (
    <div>
      {/* Render audio player if question has audio */}
      {question.audioFile && (
        <BookmarkAudioPlayer audioFile={question.audioFile} />
      )}
      
      {/* Render individual question */}
      <QuestionList
        questions={[question]}
        answers={questionData.answers}
        feedback={questionData.feedback}
        onChange={onChange}
        showFeedback={showFeedback}
        quizName="bookmarks"
        showAnkiButton={true}
        individualFeedback={{ [question.id]: questionData.individualFeedback }}
        onShowIndividualAnswer={onShowIndividualAnswer}
        seqStart={seqStart}
      />
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison function - only re-render if this question's data changed
  const qid = prevProps.question.id;
  
  // Check if this question's answers changed
  let answerChanged = false;
  if (prevProps.question.type === 'CLOZE' && prevProps.question.blanks) {
    answerChanged = prevProps.question.blanks.some((_, bi) => {
      const key = `${qid}_${bi+1}`;
      return prevProps.answers[key] !== nextProps.answers[key];
    });
  } else {
    answerChanged = prevProps.answers[qid] !== nextProps.answers[qid];
  }
  
  // Check if this question's feedback changed
  let feedbackChanged = false;
  if (prevProps.question.type === 'CLOZE' && prevProps.question.blanks) {
    feedbackChanged = prevProps.question.blanks.some((_, bi) => {
      const key = `${qid}_${bi+1}`;
      return prevProps.feedback[key] !== nextProps.feedback[key];
    });
  } else {
    feedbackChanged = prevProps.feedback[qid] !== nextProps.feedback[qid];
  }
  
  // Check if other relevant props changed
  const otherPropsChanged = 
    prevProps.showFeedback !== nextProps.showFeedback ||
    prevProps.individualFeedback[qid] !== nextProps.individualFeedback[qid] ||
    prevProps.question !== nextProps.question ||
    prevProps.seqStart !== nextProps.seqStart;
  
  // Only re-render if something actually changed for this question
  const shouldRerender = answerChanged || feedbackChanged || otherPropsChanged;
  
  // Return true to skip re-render, false to re-render
  return !shouldRerender;
});

export default QuestionItem;
