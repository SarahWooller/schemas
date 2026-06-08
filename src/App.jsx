import React from 'react';
import SchemaViewer from './SchemaViewer';
import schemaData from './merged.json';

function App() {
  return (
    // This wrapper forces a full-screen background with a small pad
    <div className="h-screen w-screen bg-gray-200 p-4 box-border">
      {/* This is the actual "window" for the application */}
      <div className="flex flex-row h-full w-full bg-white shadow-2xl rounded-xl overflow-hidden border border-gray-300">
        <SchemaViewer schema={schemaData} />
      </div>
    </div>
  );
}

export default App;