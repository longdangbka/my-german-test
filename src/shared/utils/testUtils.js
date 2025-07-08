// testUtils.js
// Utility functions for managing quiz files

// Utility function to get the correct vault path for the current environment
export function getVaultPath() {
  if (window.electron) {
    return 'vault://';
  }
  return '/vault/';
}

// Utility function to get image source URL for the current environment
export async function getVaultImageSrc(imageName) {
  if (!imageName) return null;
  
  console.log('getVaultImageSrc: Loading image:', imageName);
  console.log('getVaultImageSrc: Electron environment:', !!window.electron);
  
  if (window.electron && window.electron.readVaultImage) {
    // In Electron, use IPC to get base64 data URL
    try {
      console.log('getVaultImageSrc: Using IPC to load image');
      const dataUrl = await window.electron.readVaultImage(imageName);
      console.log('getVaultImageSrc: IPC result:', dataUrl ? 'SUCCESS' : 'FAILED');
      return dataUrl;
    } catch (error) {
      console.error('getVaultImageSrc: Error loading image via IPC:', error);
      return null;
    }
  } else {
    console.log('getVaultImageSrc: Using HTTP fallback');
    // In browser, use regular HTTP path
    return `/vault/${imageName}`;
  }
}

// Utility function to get audio source URL for the current environment
export async function getVaultAudioSrc(audioName) {
  if (!audioName) return null;
  
  console.log('getVaultAudioSrc: Loading audio:', audioName);
  console.log('getVaultAudioSrc: Electron environment:', !!window.electron);
  
  if (window.electron && window.electron.readVaultImage) {
    // In Electron, use IPC to get base64 data URL (reuse readVaultImage for any file)
    try {
      console.log('getVaultAudioSrc: Using IPC to load audio');
      const dataUrl = await window.electron.readVaultImage(audioName);
      console.log('getVaultAudioSrc: IPC result:', dataUrl ? 'SUCCESS' : 'FAILED');
      return dataUrl;
    } catch (error) {
      console.error('getVaultAudioSrc: Error loading audio via IPC:', error);
      return null;
    }
  } else {
    console.log('getVaultAudioSrc: Using HTTP fallback');
    // In browser, use regular HTTP path
    return `/vault/${audioName}`;
  }
}

export async function getAvailableTests(forceRefresh = false) {
  try {
    let availableTests = [];
    
    // Check if we're in an Electron environment
    if (window.electron && window.electron.listVaultFiles) {
      // In Electron, use IPC to get files with metadata
      console.log('Getting vault files via Electron IPC...');
      try {
        const files = await window.electron.listVaultFiles();
        console.log('Vault files from IPC:', files);
        
        if (files && files.length > 0) {
          // Files now come with metadata from Electron
          availableTests = files.map(file => ({
            filename: file.filename,
            displayName: file.displayName || file.filename.replace('.md', '').replace(/-/g, ' '),
            createdTime: new Date(file.createdTime),
            modifiedTime: new Date(file.modifiedTime),
            size: file.size
          }));
          console.log('Successfully loaded', availableTests.length, 'quiz files from Electron with metadata');
          return availableTests;
        } else {
          console.warn('No vault files found via IPC');
          return [];
        }
      } catch (error) {
        console.error('Error getting files via IPC:', error);
        return [];
      }
    }
    
    // Fallback to HTTP fetch for web/development
    let vaultPath = getVaultPath();
    
    // Always try to use manifest.json first (most reliable)
    try {
      const manifestRes = await fetch(vaultPath + 'manifest.json');
      if (manifestRes.ok) {
        const manifest = await manifestRes.json();
        // Filter for .md files and verify they actually exist
        const mdFiles = manifest.files?.filter(file => file.endsWith('.md')) || [];
        
        for (const file of mdFiles) {
          try {
            const res = await fetch(vaultPath + file, { method: 'HEAD' });
            if (res.ok) {
              availableTests.push({
                filename: file,
                displayName: file.replace('.md', '').replace(/-/g, ' '),
                createdTime: new Date(), // Default for web fallback
                modifiedTime: new Date(),
                size: 0
              });
            } else {
              console.log(`File ${file} listed in manifest but not accessible`);
            }
          } catch (e) {
            console.log(`File ${file} listed in manifest but not found`);
          }
        }
        
        return availableTests;
      }
    } catch (e) {
      console.log('Could not read manifest.json:', e.message);
    }

    // If no manifest or forceRefresh, return empty with instructions
    console.warn('No manifest.json found. Please run "npm run update-quizzes" to scan your vault directory for .md files');
    return [];
    
  } catch (error) {
    console.error('Error getting available tests:', error);
    return [];
  }
}

// Utility function to sort tests
export function sortTests(tests, sortBy = 'name', order = 'asc') {
  if (!tests || tests.length === 0) return tests;
  
  const sorted = [...tests].sort((a, b) => {
    let compareValue = 0;
    
    switch (sortBy) {
      case 'name':
        compareValue = a.displayName.localeCompare(b.displayName);
        break;
      case 'filename':
        compareValue = a.filename.localeCompare(b.filename);
        break;
      case 'created':
        compareValue = new Date(a.createdTime) - new Date(b.createdTime);
        break;
      case 'modified':
        compareValue = new Date(a.modifiedTime) - new Date(b.modifiedTime);
        break;
      case 'size':
        compareValue = a.size - b.size;
        break;
      default:
        compareValue = a.displayName.localeCompare(b.displayName);
    }
    
    return order === 'desc' ? -compareValue : compareValue;
  });
  
  return sorted;
}

export async function loadTestFile(filename) {
  try {
    // Check if we're in Electron environment and use IPC
    if (window.electron && window.electron.readVaultFile) {
      console.log('Loading test file via IPC:', filename);
      try {
        const content = await window.electron.readVaultFile(filename);
        if (content) {
          console.log(`Successfully loaded file ${filename} via IPC, content length: ${content.length}`);
          return content;
        } else {
          console.error('File content is null or empty from IPC:', filename);
          return null;
        }
      } catch (error) {
        console.error('Error loading file via IPC:', error);
        return null;
      }
    }
    
    // Fallback to HTTP fetch for web environment
    let vaultPath = getVaultPath();
    const res = await fetch(vaultPath + filename);
    if (!res.ok) {
      throw new Error(`Failed to fetch ${filename}: ${res.status}`);
    }
    return await res.text();
  } catch (error) {
    console.error(`Error loading test file ${filename}:`, error);
    throw error;
  }
}
