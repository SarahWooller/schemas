import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';

// Import the markdown file as raw text using Vite's ?raw suffix
import welcomeText from './text.md?raw';

// Helper to extract $ref from various JSON Schema structures
const extractRef = (schemaNode) => {
  if (!schemaNode) return null;
  if (schemaNode.$ref) return schemaNode.$ref;
  if (schemaNode.allOf?.[0]?.$ref) return schemaNode.allOf[0].$ref;

  // Dig into anyOf to find direct refs or refs nested inside array items
  if (schemaNode.anyOf) {
    for (const item of schemaNode.anyOf) {
      if (item.$ref) return item.$ref;
      if (item.items?.$ref) return item.items.$ref;
    }
  }

  // Dig into direct items
  if (schemaNode.items?.$ref) return schemaNode.items.$ref;

  // Dig into items that have anyOf
  if (schemaNode.items?.anyOf) {
    for (const item of schemaNode.items.anyOf) {
      if (item.$ref) return item.$ref;
    }
  }
  return null;
};

// Helper to resolve the $ref string against the $defs object
const resolveRef = (refStr, fullSchema) => {
  if (!refStr || !fullSchema.$defs) return null;
  const defKey = refStr.replace('#/$defs/', '');
  return fullSchema.$defs[defKey];
};

// Component for the recursive navigation tree
const NavItem = ({ name, nodeData, fullSchema, onSelect, depth = 0 }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const refStr = extractRef(nodeData);
  const resolvedDef = resolveRef(refStr, fullSchema);

  // A node has children if it resolves to a definition that has its own properties
  const childrenObj = resolvedDef?.properties || nodeData?.properties;
  const hasChildren = childrenObj && Object.keys(childrenObj).length > 0;

  const handleToggle = (e) => {
    e.stopPropagation();
    setIsExpanded(!isExpanded);
    onSelect(name, nodeData, refStr);
  };

  return (
    <li className={`pl-${depth === 0 ? 0 : 4} mt-2`}>
      <div
        className="flex items-center cursor-pointer hover:text-blue-600 transition-colors"
        onClick={handleToggle}
      >
        {hasChildren && (
          <span className="mr-2 text-gray-500 w-4 inline-block text-center">
            {isExpanded ? '▼' : '▶'}
          </span>
        )}
        {!hasChildren && <span className="mr-2 w-4 inline-block"></span>}
        <span className="font-medium text-lg capitalize">{name}</span>
      </div>

      {isExpanded && hasChildren && (
        <ul className="border-l-2 border-gray-200 ml-2 mt-1">
          {Object.entries(childrenObj).map(([childKey, childData]) => (
            <NavItem
              key={childKey}
              name={childKey}
              nodeData={childData}
              fullSchema={fullSchema}
              onSelect={onSelect}
              depth={depth + 1}
            />
          ))}
        </ul>
      )}
    </li>
  );
};

export default function SchemaViewer({ schema }) {
  // Add state to track if we are showing the welcome markdown or the schema details
  const [isWelcomeView, setIsWelcomeView] = useState(true);

  const [selectedTitle, setSelectedTitle] = useState('');
  const [selectedData, setSelectedData] = useState(null);
  const [selectedTypeLabel, setSelectedTypeLabel] = useState('');

  const handleSelect = (name, data, refStr) => {
    setIsWelcomeView(false);
    setSelectedTitle(name);
    setSelectedData(data);

    // Determine the type label to display and identify arrays of refs
    let typeLabel = data.type || 'object';

    if (refStr) {
      const baseName = refStr.replace('#/$defs/', '');
      const isArray = data.type === 'array' ||
                      data.items ||
                      (data.anyOf && data.anyOf.some(i => i.type === 'array'));

      typeLabel = isArray ? `Array of ${baseName}` : baseName;
    } else if (data.anyOf && data.anyOf.some(i => i.type === 'array')) {
      typeLabel = 'array';
    }

    setSelectedTypeLabel(typeLabel);
  };

  // Renderer for the main display panel
  const renderMainDisplay = () => {
    if (!selectedData) return null;

    if (Array.isArray(selectedData)) {
      return (
        <ul className="list-disc list-inside mt-4 text-xl space-y-2">
          {selectedData.map((item, index) => (
            <li key={index} className="text-gray-700">{item}</li>
          ))}
        </ul>
      );
    }

    if (typeof selectedData === 'string') {
      return <p className="mt-4 text-xl text-gray-700">{selectedData}</p>;
    }

    return (
      <div className="mt-6 space-y-6 text-xl">
        {selectedData.description && (
          <div>
            <h3 className="font-semibold text-gray-900">Description</h3>
            <p className="text-gray-700 mt-1">{selectedData.description}</p>
          </div>
        )}

        {selectedData.guidance && (
          <div>
            <h3 className="font-semibold text-gray-900">Guidance</h3>
            <p className="text-gray-700 mt-1 whitespace-pre-line">{selectedData.guidance}</p>
          </div>
        )}

        {selectedData.examples && selectedData.examples.length > 0 && (
          <div>
            <h3 className="font-semibold text-gray-900">Examples</h3>
            <ul className="list-disc list-inside mt-1 text-gray-700">
              {selectedData.examples.map((ex, i) => (
                <li key={i}>{ex}</li>
              ))}
            </ul>
          </div>
        )}

        <div>
          <h3 className="font-semibold text-gray-900">Type</h3>
          <p className="text-gray-700 mt-1">{selectedTypeLabel}</p>
        </div>

        {selectedData.default !== undefined && (
          <div>
            <h3 className="font-semibold text-gray-900">Default</h3>
            <p className="text-gray-700 mt-1">
              {selectedData.default === null ? 'null' : String(selectedData.default)}
            </p>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-row h-full w-full font-sans text-lg">

      {/* LEFT PANEL: Main Display (3/4 width) */}
      <div className="w-3/4 p-10 overflow-y-auto">
        {isWelcomeView ? (
          <div className="prose max-w-none prose-lg text-gray-800">
            <ReactMarkdown>{welcomeText}</ReactMarkdown>
          </div>
        ) : (
          <>
            <h1 className="text-4xl font-bold text-gray-900 capitalize border-b pb-4 mb-6">
              {selectedTitle}
            </h1>
            {renderMainDisplay()}
          </>
        )}
      </div>

      {/* RIGHT PANEL: Navigation (1/4 width) */}
      <div className="w-1/4 p-6 bg-gray-50 border-l border-gray-200 overflow-y-auto shadow-inner">
        <h2
          className="text-2xl font-bold text-gray-800 mb-6 cursor-pointer hover:text-blue-600 transition-colors"
          onClick={() => setIsWelcomeView(true)}
          title="Click to return to welcome page"
        >
          Schema Explorer
        </h2>
        <ul className="space-y-3">
          {['title', 'type', 'required', 'included', 'visibleSections'].map((key) => {
            if (schema[key]) {
              return (
                <li
                  key={key}
                  className="cursor-pointer font-medium text-lg capitalize hover:text-blue-600 pl-4"
                  onClick={() => handleSelect(key, schema[key], null)}
                >
                  {key}
                </li>
              );
            }
            return null;
          })}

          {schema.properties && (
            <li className="mt-4">
              <span className="font-bold text-xl text-gray-800 uppercase tracking-wide">Properties</span>
              <ul className="mt-3">
                {Object.entries(schema.properties).map(([key, data]) => (
                  <NavItem
                    key={key}
                    name={key}
                    nodeData={data}
                    fullSchema={schema}
                    onSelect={handleSelect}
                  />
                ))}
              </ul>
            </li>
          )}
        </ul>
      </div>
    </div>
  );
}