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

export async function getAvailableTests(forceRefresh = false) {
  try {
    let availableTests = [];
    
    // Check if we're in an Electron environment
    if (window.electron && window.electron.listVaultFiles) {
      // In Electron, use IPC to get files
      console.log('Getting vault files via Electron IPC...');
      try {
        const files = await window.electron.listVaultFiles();
        console.log('Vault files from IPC:', files);
        
        if (files && files.length > 0) {
          for (const file of files) {
            availableTests.push({
              filename: file,
              displayName: file.replace('.md', '').replace(/-/g, ' ')
            });
          }
          console.log('Successfully loaded', availableTests.length, 'quiz files from Electron');
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
                displayName: file
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
