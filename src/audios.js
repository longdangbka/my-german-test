// audios.js
// Export audio sources for each audio group

// Helper to load audio sources from sessionStorage
function loadAudioSourcesFromSession() {
  if (typeof window === 'undefined') return {};
  try {
    const stored = sessionStorage.getItem('uploadedAudioSources');
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

// Merge persisted audio sources with defaults
const persisted = loadAudioSourcesFromSession();
export let audioSources = {
  'Audio 1.1': process.env.PUBLIC_URL + '/audios/audio1_1.mp3',
  'Audio 1.2': process.env.PUBLIC_URL + '/audios/audio1_2.mp3',
  'Audio 1.3': process.env.PUBLIC_URL + '/audios/audio1_3.mp3',
  ...persisted,
};

// Helper to update audioSources with uploaded files and persist to sessionStorage as data URL
export function setAudioSource(key, fileOrUrl) {
  // If fileOrUrl is a File, read as data URL and store; otherwise, store as is
  if (fileOrUrl instanceof File) {
    const reader = new FileReader();
    reader.onload = function (e) {
      const dataUrl = e.target.result;
      audioSources = { ...audioSources, [key]: dataUrl };
      // Persist to sessionStorage
      if (typeof window !== 'undefined') {
        try {
          const stored = sessionStorage.getItem('uploadedAudioSources');
          const obj = stored ? JSON.parse(stored) : {};
          obj[key] = dataUrl;
          sessionStorage.setItem('uploadedAudioSources', JSON.stringify(obj));
        } catch {}
      }
      // Notify listeners (e.g., React components) to reload the audio
      if (typeof window !== 'undefined' && window.dispatchEvent) {
        window.dispatchEvent(new CustomEvent('audioSourceUpdated', { detail: { key, fileUrl: dataUrl } }));
      }
    };
    reader.readAsDataURL(fileOrUrl);
  } else {
    audioSources = { ...audioSources, [key]: fileOrUrl };
    // Persist to sessionStorage
    if (typeof window !== 'undefined') {
      try {
        const stored = sessionStorage.getItem('uploadedAudioSources');
        const obj = stored ? JSON.parse(stored) : {};
        obj[key] = fileOrUrl;
        sessionStorage.setItem('uploadedAudioSources', JSON.stringify(obj));
      } catch {}
    }
    // Notify listeners (e.g., React components) to reload the audio
    if (typeof window !== 'undefined' && window.dispatchEvent) {
      window.dispatchEvent(new CustomEvent('audioSourceUpdated', { detail: { key, fileUrl: fileOrUrl } }));
    }
  }
}

// IMPORTANT: Place your audio files in a folder named 'audios' inside the 'public' directory (not src/).
// If a file is not found, the app should prompt the user to upload the missing audio file.
// Use setAudioSource('Audio 1.1', fileUrl) to update the source after upload.
