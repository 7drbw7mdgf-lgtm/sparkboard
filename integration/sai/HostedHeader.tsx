import React, { useEffect, useRef, useState } from 'react';
import { View, SearchResult, ProjectData } from './types';
import SearchResultsPanel from './components/SearchResultsPanel';

interface Props {
  currentView: View;
  onLoad: () => void;
  onSave: () => void;
  onTimeframe: () => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  isSearchPanelOpen: boolean;
  onSearchFocusChange: (focused: boolean) => void;
  searchResults: SearchResult[];
  onSearchResultSelect: (item: SearchResult) => void;
  projectData: ProjectData | null;
  onAddTask?: () => void;
  onHelp?: () => void;
  onViewChange?: (view: View) => void;
}

export default function HostedHeader({
  currentView,
  onLoad,
  onSave,
  onTimeframe,
  undo,
  redo,
  canUndo,
  canRedo,
  searchQuery,
  onSearchChange,
  isSearchPanelOpen,
  onSearchFocusChange,
  searchResults,
  onSearchResultSelect,
  projectData,
  onAddTask,
  onHelp,
  onViewChange,
}: Props) {
  const [mobileSearch, setMobileSearch] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const projectMenu = useRef<HTMLDetailsElement>(null);
  const searchInput = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const close = (event: PointerEvent) => {
      if (event.target instanceof Node) {
        if (searchRef.current && !searchRef.current.contains(event.target))
          onSearchFocusChange(false);
        if (projectMenu.current && !projectMenu.current.contains(event.target))
          projectMenu.current.open = false;
      }
    };
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, [onSearchFocusChange]);

  // Sparkboard-like commands. Never steal shortcuts while editing text or using a dialog.
  useEffect(() => {
    const handleShortcuts = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.isComposing) return;
      const target = event.target;
      const typing = target instanceof HTMLElement &&
        (target.matches('input, textarea, select, [contenteditable="true"]') ||
          !!target.closest('[contenteditable="true"]'));
      const modalOpen = !!document.querySelector('dialog[open], [role="dialog"]');
      if (typing || modalOpen) return;
      const modifier = event.metaKey || event.ctrlKey;
      if (modifier && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        focusSearch();
        return;
      }
      if (modifier && event.key.toLowerCase() === 'z') {
        if (event.shiftKey) {
          if (!canRedo) return;
          redo();
        } else {
          if (!canUndo) return;
          undo();
        }
        event.preventDefault();
        return;
      }
      if (modifier && event.key.toLowerCase() === 'y') {
        if (!canRedo) return;
        event.preventDefault();
        redo();
        return;
      }
      if (!modifier && !event.altKey && event.key === '?' && onHelp) {
        event.preventDefault();
        onHelp();
        return;
      }
      if (modifier || event.altKey || event.shiftKey) return;
      if (onViewChange && ['1', '2', '3', '4', '5'].includes(event.key)) {
        const destinations = [View.HOME, View.TASKS, View.GANTT, View.CALENDAR, View.KANBAN];
        event.preventDefault();
        onViewChange(destinations[Number(event.key) - 1]);
        return;
      }
      if (event.key.toLowerCase() === 'n' && onAddTask) {
        event.preventDefault();
        onAddTask();
      } else if (event.key === '/' && searchInput.current) {
        event.preventDefault();
        focusSearch();
      } else if (event.key === '?' && onHelp) {
        event.preventDefault();
        onHelp();
      }
    };
    document.addEventListener('keydown', handleShortcuts);
    return () => document.removeEventListener('keydown', handleShortcuts);
  }, [canUndo, canRedo, undo, redo, onAddTask, onHelp, onViewChange]);

  const focusSearch = () => {
    setMobileSearch(true);
    window.requestAnimationFrame(() => searchInput.current?.focus());
  };
  const menuButton = (label: string, action: () => void, disabled = false) => (
    <button
      type="button"
      disabled={disabled}
      className="block min-h-10 w-full rounded-lg px-3 text-left text-sm text-[#3e4754] hover:bg-[#f2f5fa] disabled:opacity-35 dark:text-gray-200 dark:hover:bg-gray-800"
      onClick={() => {
        projectMenu.current && (projectMenu.current.open = false);
        action();
      }}
    >
      {label}
    </button>
  );
  return (
    <header className="benchline-app-header relative z-30 flex h-[62px] shrink-0 items-center justify-between gap-3 border-b border-[#e5e8ee] bg-white px-5 dark:border-gray-800 dark:bg-gray-900 md:px-7">
      <div className="flex min-w-0 items-center gap-3">
        <span
          aria-label="Benchline"
          className="shrink-0 text-[19px] font-bold tracking-tight text-[#292c31] dark:text-white"
        >
          benchline<span className="text-[#4262ff]">.</span>
        </span>
        <span className="hidden truncate border-l border-[#e5e8ee] pl-3 text-sm text-[#697184] dark:border-gray-700 dark:text-gray-400 sm:inline">
          {currentView === View.HOME
            ? 'Overview'
            : currentView === View.GANTT
              ? 'Timeline'
              : currentView}
        </span>
      </div>
      <div className="flex min-w-0 items-center justify-end gap-3">
        <div className="benchline-top-actions" role="group" aria-label="Project editing">
          <button type="button" onClick={undo} disabled={!canUndo} title="Undo (⌘/Ctrl+Z)" aria-label="Undo change">↶</button>
          <button type="button" onClick={redo} disabled={!canRedo} title="Redo (⌘/Ctrl+Shift+Z)" aria-label="Redo change">↷</button>
          {onAddTask && <button type="button" className="benchline-top-new" onClick={onAddTask} title="New task (N)">+ Task</button>}
        </div>
        <button
          type="button"
          onClick={focusSearch}
          className="rounded-lg px-2 py-2 text-lg text-[#596678] hover:bg-[#f3f6fc] dark:text-gray-300 md:hidden"
          aria-label="Search project"
          title="Search project"
        >
          ⌕
        </button>
        <div
          ref={searchRef}
          className={'relative ' + (mobileSearch ? 'benchline-search-open' : '')}
        >
          <input
            ref={searchInput}
            id="global-search-bar"
            type="search"
            aria-label="Search project tasks and meetings"
            placeholder="Search tasks, meetings…"
            value={searchQuery}
            onChange={(event) => onSearchChange(event.target.value)}
            onFocus={() => onSearchFocusChange(true)}
            onKeyDown={(event) => {
              if (event.key === 'Escape') {
                setMobileSearch(false);
                onSearchFocusChange(false);
                searchInput.current?.blur();
              }
            }}
            className="h-9 w-[min(260px,34vw)] rounded-lg border border-[#e5e8ee] bg-[#f8f9fb] px-3 text-sm text-[#292c31] outline-none focus:border-[#4262ff] focus:ring-1 focus:ring-[#4262ff] dark:border-gray-700 dark:bg-gray-800 dark:text-white"
          />
          {isSearchPanelOpen && projectData && (
            <SearchResultsPanel
              results={searchResults}
              onSelect={(item) => {
                onSearchResultSelect(item);
                setMobileSearch(false);
              }}
              projectData={projectData}
            />
          )}
        </div>
        <details ref={projectMenu} className="relative">
          <summary className="flex min-h-9 cursor-pointer list-none items-center gap-2 rounded-lg border border-[#e5e8ee] px-3 text-sm font-semibold text-[#465063] hover:bg-[#f5f6f8] dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800">
            Project{' '}
            <span aria-hidden="true" className="text-xs">
              ⌄
            </span>
          </summary>
          <div className="absolute right-0 top-[calc(100%+8px)] z-50 w-[218px] rounded-xl border border-[#e5e8ee] bg-white p-2 shadow-lg dark:border-gray-700 dark:bg-gray-900">
            {menuButton('Download project backup', onSave)}
            {menuButton('Change project dates', onTimeframe)}
            {onHelp && menuButton('Keyboard shortcuts', onHelp)}
            <div className="my-1 border-t border-[#edf0f3] dark:border-gray-800" />
            <div className="flex gap-1">
              {menuButton('Undo', undo, !canUndo)}
              {menuButton('Redo', redo, !canRedo)}
            </div>
            <div className="my-1 border-t border-[#edf0f3] dark:border-gray-800" />
            {menuButton('Load sample project', () => {
              if (
                window.confirm(
                  'Replace your current project with the sample project? Download a backup first if you want to keep your work.',
                )
              )
                onLoad();
            })}
          </div>
        </details>
      </div>
    </header>
  );
}
