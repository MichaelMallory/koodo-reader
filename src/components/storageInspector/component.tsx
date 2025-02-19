import React, { useState } from 'react';
import localforage from 'localforage';
import './storageInspector.css';

interface StorageItem {
  key: string;
  size: number;
  isEPUB: boolean;
  preview: string;
}

export const StorageInspector: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [storageData, setStorageData] = useState<StorageItem[]>([]);

  const inspectStorage = async () => {
    console.log('[Storage Inspector] Scanning storage...');
    const results: StorageItem[] = [];
    
    // Get all keys
    const keys = await localforage.keys();
    console.log('[Storage Inspector] Found keys:', keys);
    
    // Inspect each stored item
    for (const key of keys) {
      try {
        const content = await localforage.getItem<ArrayBuffer>(key);
        if (content) {
          const item: StorageItem = {
            key,
            size: content.byteLength,
            isEPUB: key.toLowerCase().endsWith('.epub'),
            preview: new TextDecoder().decode(content.slice(0, 200)).replace(/[^\x20-\x7E]/g, '')
          };
          results.push(item);
          console.log(`[Storage Inspector] Item: ${key}`, item);
        }
      } catch (error) {
        console.warn(`[Storage Inspector] Failed to inspect key ${key}:`, error);
      }
    }
    
    setStorageData(results);
  };

  const toggleVisibility = () => {
    setIsVisible(!isVisible);
    if (!isVisible) {
      inspectStorage();
    }
  };

  const formatSize = (bytes: number) => {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    return `${size.toFixed(2)} ${units[unitIndex]}`;
  };

  return (
    <div className="storage-inspector">
      <button 
        className="storage-inspector-toggle"
        onClick={toggleVisibility}
        title="Debug: Inspect Storage"
      >
        🔍 Storage
      </button>
      
      {isVisible && (
        <div className="storage-inspector-panel">
          <div className="storage-inspector-header">
            <h3>Storage Inspector</h3>
            <button onClick={() => setIsVisible(false)}>✕</button>
          </div>
          
          <div className="storage-inspector-content">
            <div className="storage-inspector-summary">
              <p>Found {storageData.length} items in storage</p>
              <button onClick={inspectStorage}>Refresh</button>
            </div>
            
            <div className="storage-inspector-items">
              {storageData.map(item => (
                <div key={item.key} className="storage-inspector-item">
                  <div className="storage-inspector-item-header">
                    <span className="key">{item.key}</span>
                    <span className="size">{formatSize(item.size)}</span>
                    <span className={`type ${item.isEPUB ? 'epub' : 'other'}`}>
                      {item.isEPUB ? 'EPUB' : 'Other'}
                    </span>
                  </div>
                  <pre className="preview">{item.preview}</pre>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}; 