import React from 'react';

// Hosted Benchline has no server-side Gemini proxy. Never send personal project data
// to an AI API with a static/bundled browser key.
const HostedAIPanel: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Benchline AI assistant"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4"
    >
      <div className="w-full max-w-lg rounded-xl bg-white p-7 shadow-2xl dark:bg-gray-900 dark:text-white">
        <h2 className="mb-3 text-xl font-bold">AI assistant is not enabled</h2>
        <p className="mb-5 text-sm leading-relaxed">
          Benchline's project planner, tasks, Gantt chart, calendar and notes work without AI. The
          hosted AI assistant requires a secure server-side Gemini integration. No API key is
          embedded in this website.
        </p>
        <button
          type="button"
          className="rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white"
          onClick={onClose}
        >
          Close
        </button>
      </div>
    </div>
  );
};
export default HostedAIPanel;
