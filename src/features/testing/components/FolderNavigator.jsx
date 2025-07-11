import React, { useState, useEffect } from 'react';

const FolderNavigator = ({ onTestSelect, searchTerm = '', sortBy = 'name', sortOrder = 'asc' }) => {
  const [folderStructure, setFolderStructure] = useState({ files: [], folders: {} });
  const [expandedFolders, setExpandedFolders] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load folder structure from localStorage on mount
  useEffect(() => {
    const savedExpanded = localStorage.getItem('expandedFolders');
    if (savedExpanded) {
      setExpandedFolders(new Set(JSON.parse(savedExpanded)));
    }
  }, []);

  // Save expanded folders to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('expandedFolders', JSON.stringify([...expandedFolders]));
  }, [expandedFolders]);

  useEffect(() => {
    const loadFolderStructure = async () => {
      try {
        setLoading(true);
        
        if (window.electron?.getFolderStructure) {
          // Electron environment - use folder structure API
          const structure = await window.electron.getFolderStructure();
          setFolderStructure(structure);
        } else {
          // Web environment - fallback to flat file list
          const response = await fetch('/vault/manifest.json');
          if (response.ok) {
            const manifest = await response.json();
            const webStructure = buildWebFolderStructure(manifest.files || []);
            setFolderStructure(webStructure);
          } else {
            throw new Error('Could not load vault manifest');
          }
        }
        
        setError(null);
      } catch (err) {
        setError('Failed to load vault structure');
        console.error('Error loading folder structure:', err);
      } finally {
        setLoading(false);
      }
    };

    loadFolderStructure();
  }, []);

  // Build folder structure for web environment from flat file list
  const buildWebFolderStructure = (files) => {
    const structure = { files: [], folders: {} };
    
    files.forEach(filename => {
      if (!filename.endsWith('.md')) return;
      
      const parts = filename.split('/');
      if (parts.length === 1) {
        // Root level file
        structure.files.push({
          filename,
          displayName: filename.replace('.md', ''),
          folderPath: '',
          isInSubfolder: false,
          createdTime: new Date(),
          modifiedTime: new Date(),
          size: 0
        });
      } else {
        // File in subfolder - build nested structure
        let currentLevel = structure.folders;
        let currentPath = '';
        
        for (let i = 0; i < parts.length - 1; i++) {
          const folderName = parts[i];
          currentPath = currentPath ? `${currentPath}/${folderName}` : folderName;
          
          if (!currentLevel[folderName]) {
            currentLevel[folderName] = {
              name: folderName,
              path: currentPath,
              files: [],
              folders: {}
            };
          }
          currentLevel = currentLevel[folderName].folders;
        }
        
        // Add file to the final folder
        const finalFolderPath = parts.slice(0, -1).join('/');
        const finalFolder = getFolderByPath(structure, finalFolderPath);
        if (finalFolder) {
          finalFolder.files.push({
            filename,
            displayName: parts[parts.length - 1].replace('.md', ''),
            folderPath: finalFolderPath,
            isInSubfolder: true,
            createdTime: new Date(),
            modifiedTime: new Date(),
            size: 0
          });
        }
      }
    });
    
    return structure;
  };

  const getFolderByPath = (structure, path) => {
    if (!path) return structure;
    
    const parts = path.split('/');
    let current = structure.folders;
    
    for (const part of parts) {
      if (current[part]) {
        current = current[part];
        if (parts.indexOf(part) === parts.length - 1) {
          return current;
        }
        current = current.folders;
      } else {
        return null;
      }
    }
    
    return null;
  };

  const toggleFolder = (folderPath) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(folderPath)) {
      newExpanded.delete(folderPath);
    } else {
      newExpanded.add(folderPath);
    }
    setExpandedFolders(newExpanded);
  };

  const handleTestSelect = (test) => {
    onTestSelect(test);
  };

  const filterBySearch = (text) => {
    if (!searchTerm) return true;
    return text.toLowerCase().includes(searchTerm.toLowerCase());
  };

  // Sort files based on current sort settings
  const sortFiles = (files) => {
    return [...files].sort((a, b) => {
      let aValue, bValue;
      
      switch (sortBy) {
        case 'name':
          aValue = a.displayName.toLowerCase();
          bValue = b.displayName.toLowerCase();
          break;
        case 'created':
          aValue = a.createdTime || new Date(0);
          bValue = b.createdTime || new Date(0);
          break;
        case 'modified':
          aValue = a.modifiedTime || new Date(0);
          bValue = b.modifiedTime || new Date(0);
          break;
        default:
          aValue = a.displayName.toLowerCase();
          bValue = b.displayName.toLowerCase();
      }
      
      if (sortBy === 'created' || sortBy === 'modified') {
        // For dates, convert to timestamps for comparison
        aValue = aValue instanceof Date ? aValue.getTime() : new Date(aValue).getTime();
        bValue = bValue instanceof Date ? bValue.getTime() : new Date(bValue).getTime();
      }
      
      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  };

  const renderFile = (file, isBookmark = false) => {
    if (!filterBySearch(file.displayName)) return null;
    
    return (
      <div
        key={file.filename}
        className={`flex items-center p-3 rounded-lg cursor-pointer transition-all duration-200 hover:bg-gray-100 dark:hover:bg-gray-700 ${
          isBookmark ? 'bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700' : 'hover:shadow-md'
        }`}
        onClick={() => handleTestSelect(file)}
      >
        <span className="text-lg mr-3">{isBookmark ? '📚' : '📄'}</span>
        <div className="flex-1">
          <div className={`font-medium ${isBookmark ? 'text-yellow-800 dark:text-yellow-200' : 'text-gray-900 dark:text-gray-100'}`}>
            {file.displayName}
          </div>
          {file.isInSubfolder && (
            <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">
              📁 {file.folderPath}
            </div>
          )}
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400">
          {formatFileSize(file.size)}
        </div>
      </div>
    );
  };

  const renderFolder = (folder, level = 0) => {
    const isExpanded = expandedFolders.has(folder.path);
    const hasMatchingContent = searchTerm ? 
      folder.files.some(file => filterBySearch(file.displayName)) || 
      Object.values(folder.folders).some(subfolder => hasMatchingFiles(subfolder)) 
      : true;

    if (!hasMatchingContent) return null;

    return (
      <div key={folder.path} className="mb-2">
        <div
          className="flex items-center p-3 rounded-lg cursor-pointer transition-all duration-200 hover:bg-gray-50 dark:hover:bg-gray-800"
          onClick={() => toggleFolder(folder.path)}
          style={{ marginLeft: `${level * 20}px` }}
        >
          <span className="text-lg mr-3">📁</span>
          <span className="font-medium text-gray-900 dark:text-gray-100 flex-1">
            {folder.name}
          </span>
          <span className="text-gray-500 dark:text-gray-400 transition-transform duration-200 transform">
            {isExpanded ? '▼' : '▶'}
          </span>
        </div>
        
        {isExpanded && (
          <div className="mt-2" style={{ marginLeft: `${(level + 1) * 20}px` }}>
            {/* Render files in this folder */}
            {sortFiles(folder.files).map(file => renderFile(file))}
            
            {/* Render subfolders */}
            {Object.values(folder.folders).map(subfolder => renderFolder(subfolder, level + 1))}
          </div>
        )}
      </div>
    );
  };

  const hasMatchingFiles = (folder) => {
    return folder.files.some(file => filterBySearch(file.displayName)) ||
           Object.values(folder.folders).some(subfolder => hasMatchingFiles(subfolder));
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        <span className="ml-3 text-gray-600 dark:text-gray-300">Loading vault structure...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center p-8">
        <div className="text-red-600 dark:text-red-400 mb-4">{error}</div>
        <button 
          onClick={() => window.location.reload()} 
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  // Separate bookmarks from regular files
  const bookmarkFile = folderStructure.files.find(file => file.filename === 'bookmarks.md');
  const regularFiles = folderStructure.files.filter(file => file.filename !== 'bookmarks.md');

  // Sort files and folders
  const sortedRegularFiles = sortFiles(regularFiles);
  const sortedFolders = sortFiles(Object.values(folderStructure.folders).flatMap(folder => [folder, ...Object.values(folder.folders)]));

  return (
    <div className="space-y-3">
      {/* Bookmarks file (if exists) */}
      {bookmarkFile && renderFile(bookmarkFile, true)}
      
      {/* Root level files */}
      {sortedRegularFiles.map(file => renderFile(file))}
      
      {/* Folders */}
      {sortedFolders.map(folder => renderFolder(folder))}
      
      {/* Empty state */}
      {regularFiles.length === 0 && Object.keys(folderStructure.folders).length === 0 && !bookmarkFile && (
        <div className="text-center p-8 text-gray-500 dark:text-gray-400">
          <p className="text-lg">No quizzes found</p>
          <p className="text-sm mt-2">Add some .md files to your vault to get started</p>
        </div>
      )}
    </div>
  );
};

export default FolderNavigator;