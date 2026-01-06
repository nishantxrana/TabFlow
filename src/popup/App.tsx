/**
 * TabFlow – Popup Root Component
 *
 * Main popup UI shell. Coordinates state and message passing.
 */

import React from "react";

const App: React.FC = () => {
  return (
    <div className="w-popup min-h-[300px] max-h-popup overflow-hidden bg-white">
      {/* Header */}
      <header className="bg-primary-600 px-4 py-3">
        <h1 className="text-lg font-semibold text-white">TabFlow</h1>
      </header>

      {/* Main Content */}
      <main className="p-4">
        {/* TODO: ActionBar component */}
        <div className="mb-4 flex gap-2">
          <button
            className="rounded bg-primary-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-primary-700 transition-colors"
            onClick={() => console.log("Save session")}
          >
            Save Session
          </button>
          <button
            className="rounded bg-gray-200 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-300 transition-colors"
            onClick={() => console.log("Undo")}
          >
            Undo
          </button>
        </div>

        {/* TODO: SearchBar component */}
        <div className="mb-4">
          <input
            type="text"
            placeholder="Search tabs..."
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
        </div>

        {/* TODO: SessionList component */}
        <div className="space-y-2">
          <p className="text-sm text-gray-500 text-center py-8">
            No saved sessions yet.
            <br />
            Click "Save Session" to get started.
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 px-4 py-2 text-xs text-gray-400 text-center">
        TabFlow v0.1.0
      </footer>
    </div>
  );
};

export default App;

