// useAutoIdAssignment.js
// React hook for managing automatic ID assignment

import { useState, useCallback } from 'react';
import { autoIdAssigner } from '../services/autoIdAssigner.js';

/**
 * Hook for managing automatic ID assignment to questions
 * @returns {Object} Hook state and functions
 */
export function useAutoIdAssignment() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingResults, setProcessingResults] = useState(null);
  const [error, setError] = useState(null);

  /**
   * Process all markdown files to assign missing IDs
   * @returns {Promise<Object>} Processing results
   */
  const processAllFiles = useCallback(async () => {
    setIsProcessing(true);
    setError(null);
    setProcessingResults(null);

    try {
      console.log('🆔 HOOK - Starting batch ID assignment process');
      const results = await autoIdAssigner.processAllMarkdownFiles();
      
      setProcessingResults(results);
      console.log('🆔 HOOK - Batch processing completed:', results);
      
      return results;
    } catch (err) {
      console.error('🆔 HOOK - Error during batch processing:', err);
      setError(err.message || 'Failed to process files');
      throw err;
    } finally {
      setIsProcessing(false);
    }
  }, []);

  /**
   * Process a single file to assign missing IDs
   * @param {string} fileName - Name of the file to process
   * @returns {Promise<Object>} Processing results
   */
  const processSingleFile = useCallback(async (fileName) => {
    setIsProcessing(true);
    setError(null);

    try {
      console.log(`🆔 HOOK - Processing single file: ${fileName}`);
      const result = await autoIdAssigner.processSingleFile(fileName);
      
      console.log(`🆔 HOOK - Single file processing completed:`, result);
      return result;
    } catch (err) {
      console.error(`🆔 HOOK - Error processing ${fileName}:`, err);
      setError(err.message || `Failed to process ${fileName}`);
      throw err;
    } finally {
      setIsProcessing(false);
    }
  }, []);

  /**
   * Clear processing results and errors
   */
  const clearResults = useCallback(() => {
    setProcessingResults(null);
    setError(null);
  }, []);

  return {
    isProcessing,
    processingResults,
    error,
    processAllFiles,
    processSingleFile,
    clearResults
  };
}

export default useAutoIdAssignment;
