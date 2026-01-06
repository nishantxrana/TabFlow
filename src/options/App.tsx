/**
 * TabFlow – Options Page Root Component
 *
 * Settings, backup, and tier management UI.
 */

import React from "react";

const App: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-primary-600 px-6 py-4 shadow">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-xl font-semibold text-white">TabFlow Settings</h1>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-2xl mx-auto px-6 py-8">
        {/* Tier Display */}
        <section className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Your Plan</h2>
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-sm font-medium text-gray-800">
              Free Tier
            </span>
            <span className="text-sm text-gray-500">
              Up to 100 saved tabs
            </span>
          </div>
        </section>

        {/* Settings Form */}
        <section className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Backup Settings</h2>

          {/* Auto Backup Toggle */}
          <div className="flex items-center justify-between py-3 border-b border-gray-100">
            <div>
              <p className="text-sm font-medium text-gray-900">Auto Backup</p>
              <p className="text-sm text-gray-500">
                Automatically backup your sessions
              </p>
            </div>
            <button
              type="button"
              className="relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent bg-primary-600 transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
              role="switch"
              aria-checked="true"
            >
              <span className="translate-x-5 pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out" />
            </button>
          </div>

          {/* Backup Frequency */}
          <div className="flex items-center justify-between py-3">
            <div>
              <p className="text-sm font-medium text-gray-900">Backup Frequency</p>
              <p className="text-sm text-gray-500">
                How often to create automatic backups
              </p>
            </div>
            <select className="rounded border border-gray-300 px-3 py-1.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500">
              <option value="1">Every hour</option>
              <option value="6">Every 6 hours</option>
              <option value="24">Every 24 hours</option>
            </select>
          </div>
        </section>

        {/* Backup Section */}
        <section className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Data Management</h2>

          <div className="space-y-4">
            {/* Export */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-900">Export Data</p>
                <p className="text-sm text-gray-500">
                  Download all your sessions as a JSON file
                </p>
              </div>
              <button
                className="rounded bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 transition-colors"
                onClick={() => console.log("Export data")}
              >
                Export
              </button>
            </div>

            {/* Import */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-900">Import Data</p>
                <p className="text-sm text-gray-500">
                  Restore sessions from a backup file
                </p>
              </div>
              <button
                className="rounded bg-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-300 transition-colors"
                onClick={() => console.log("Import data")}
              >
                Import
              </button>
            </div>

            {/* Last Backup */}
            <div className="pt-3 border-t border-gray-100">
              <p className="text-xs text-gray-400">
                Last backup: Never
              </p>
            </div>
          </div>
        </section>

        {/* About */}
        <section className="text-center text-sm text-gray-400">
          <p>TabFlow v0.1.0</p>
          <p className="mt-1">
            A local-first, reliability-focused tab manager
          </p>
        </section>
      </main>
    </div>
  );
};

export default App;

