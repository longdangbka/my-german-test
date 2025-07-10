import React, { useState } from 'react';
import { addNoteToAnki, testAnkiConnection, mapQuestionTypeToNoteType } from './ankiConnect';

const AnkiButton = ({ question, deckName = 'Default' }) => {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('idle'); // idle, success, error

  const handleSendToAnki = async () => {
    setLoading(true);
    setStatus('idle');
    
    try {
      // First test the connection
      const isConnected = await testAnkiConnection();
      if (!isConnected) {
        throw new Error('Cannot connect to Anki. Make sure Anki is running and AnkiConnect is installed.');
      }

      // Add the note
      const noteId = await addNoteToAnki(question, deckName);
      
      if (noteId) {
        setStatus('success');
        // Reset status after 3 seconds
        setTimeout(() => setStatus('idle'), 3000);
      } else {
        throw new Error('Failed to add note to Anki');
      }
    } catch (error) {
      console.error('Error sending to Anki:', error);
      setStatus('error');
      // Reset status after 5 seconds
      setTimeout(() => setStatus('idle'), 5000);
    } finally {
      setLoading(false);
    }
  };

  const getNoteTypeDisplay = () => {
    return mapQuestionTypeToNoteType(question.type, question);
  };

  const getButtonColor = () => {
    if (status === 'success') return 'text-green-600 hover:text-green-700';
    if (status === 'error') return 'text-red-600 hover:text-red-700';
    return 'text-blue-600 hover:text-blue-700';
  };

  const getButtonIcon = () => {
    if (loading) {
      return (
        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      );
    }

    if (status === 'success') {
      return (
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
        </svg>
      );
    }

    if (status === 'error') {
      return (
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z"/>
        </svg>
      );
    }

    return (
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
        <path d="M12 6v6l4 2"/>
      </svg>
    );
  };

  const getStatusMessage = () => {
    if (status === 'success') return 'Added to Anki!';
    if (status === 'error') return 'Failed to add';
    return `Send to Anki (${getNoteTypeDisplay()})`;
  };

  return (
    <button
      onClick={handleSendToAnki}
      disabled={loading}
      className={`inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200 ${getButtonColor()} bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 border border-gray-200 dark:border-gray-600`}
      title={`Send question to Anki as ${getNoteTypeDisplay()} note type`}
    >
      {getButtonIcon()}
      <span className="ml-2">{getStatusMessage()}</span>
    </button>
  );
};

export default AnkiButton;
