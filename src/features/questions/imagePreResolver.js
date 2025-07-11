// imagePreResolver.js
// Pre-resolve images during question parsing (similar to audio processing)
// This enables proper image loading from subfolders by resolving paths early

import { getVaultImageSrc } from '../../shared/utils/testUtils.js';

/**
 * Pre-resolve images in orderedElements array
 * Similar to how audio files are pre-resolved during parsing
 */
export async function preResolveImagesInElements(elements) {
  if (!Array.isArray(elements)) {
    return elements;
  }

  const resolvedElements = [];
  
  for (const element of elements) {
    if (element.type === 'image' && element.content) {
      console.log('🔍 IMAGE PRE-RESOLUTION: Pre-resolving image:', element.content);
      try {
        const resolvedSrc = await getVaultImageSrc(element.content);
        if (resolvedSrc) {
          console.log('🔍 IMAGE PRE-RESOLUTION: Successfully resolved image:', element.content);
          resolvedElements.push({
            ...element,
            resolvedSrc: resolvedSrc
          });
        } else {
          console.warn('🔍 IMAGE PRE-RESOLUTION: Failed to resolve image:', element.content);
          resolvedElements.push(element);
        }
      } catch (error) {
        console.error('🔍 IMAGE PRE-RESOLUTION: Error resolving image:', element.content, error);
        resolvedElements.push(element);
      }
    } else {
      resolvedElements.push(element);
    }
  }
  
  return resolvedElements;
}

/**
 * Pre-resolve images in a single question object
 */
export async function preResolveQuestionImages(question) {
  if (!question) {
    return question;
  }

  const resolvedQuestion = { ...question };

  // Pre-resolve images in orderedElements (main content)
  if (question.orderedElements) {
    resolvedQuestion.orderedElements = await preResolveImagesInElements(question.orderedElements);
  }

  // Pre-resolve images in explanation orderedElements
  if (question.explanationOrderedElements) {
    resolvedQuestion.explanationOrderedElements = await preResolveImagesInElements(question.explanationOrderedElements);
  }

  return resolvedQuestion;
}

/**
 * Pre-resolve images in all questions within a group
 */
export async function preResolveGroupImages(groups) {
  if (!Array.isArray(groups)) {
    return groups;
  }

  console.log('🔍 IMAGE PRE-RESOLUTION: Starting pre-resolution for', groups.length, 'groups');
  
  const resolvedGroups = [];
  
  for (const group of groups) {
    if (group && Array.isArray(group.questions)) {
      console.log('🔍 IMAGE PRE-RESOLUTION: Processing group with', group.questions.length, 'questions');
      
      const resolvedQuestions = [];
      for (const question of group.questions) {
        const resolvedQuestion = await preResolveQuestionImages(question);
        resolvedQuestions.push(resolvedQuestion);
      }
      
      resolvedGroups.push({
        ...group,
        questions: resolvedQuestions
      });
    } else {
      resolvedGroups.push(group);
    }
  }
  
  console.log('🔍 IMAGE PRE-RESOLUTION: Completed pre-resolution for all groups');
  return resolvedGroups;
}
