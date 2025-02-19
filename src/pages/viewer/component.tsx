import React from 'react';
import { StorageInspector } from '../../components/storageInspector/component';

// ... rest of imports ...

export const Viewer: React.FC = () => {
  // ... existing component code ...

  return (
    <div className="viewer">
      {/* ... existing JSX ... */}
      <StorageInspector />
    </div>
  );
} 