'use strict';
/**
 * Fetches the owner's pinned public Sai repository (the app is now called Benchline) and
 * builds it as a separate application at /sai/. Never inject provider API keys into the
 * browser bundle.
 *
 * To publish a newer Benchline, update SAI_COMMIT to that commit on Sai's main branch. If the
 * build then fails with "missing integration anchor", the patched lines below have changed
 * upstream and need updating to match.
 */
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const SAI_REPOSITORY = 'https://github.com/7drbw7mdgf-lgtm/Sai.git';
// Sai main after the Gantt fix and the rename to Benchline (Sai PR #1).
const SAI_COMMIT = '13a8c48e7addea1bd376e8a4b13481eac52853c4';

function removeFeedbackButton(filename) {
  const source = fs.readFileSync(filename, 'utf8');
  const start = source.indexOf('{/* Floating Feedback Button */}');
  const end = source.indexOf('</button>', start);
  if (start < 0 || end < 0) {
    throw Error('Pinned Sai source changed: missing feedback button');
  }
  const next = source.slice(0, start) + source.slice(end + '</button>'.length);
  if (next.includes('id="feedback-trigger-btn"')) {
    throw Error('Feedback button was not removed');
  }
  fs.writeFileSync(filename, next);
}

function replaceRequired(filename, original, replacement) {
  const source = fs.readFileSync(filename, 'utf8');
  if (!source.includes(original)) {
    throw Error(
      'Pinned Sai source changed: missing integration anchor in ' + path.basename(filename),
    );
  }
  fs.writeFileSync(filename, source.replace(original, replacement));
}

function buildSai(root = path.resolve(__dirname, '..')) {
  const source = path.join(root, 'build/sai-source');
  const destination = path.join(root, 'build/sai-dist');
  fs.rmSync(source, { recursive: true, force: true });
  fs.rmSync(destination, { recursive: true, force: true });
  fs.mkdirSync(path.dirname(source), { recursive: true });
  execFileSync('git', ['clone', '--quiet', SAI_REPOSITORY, source], { stdio: 'inherit' });
  execFileSync('git', ['-C', source, 'checkout', '--quiet', '--detach', SAI_COMMIT]);
  const head = execFileSync('git', ['-C', source, 'rev-parse', 'HEAD'], {
    encoding: 'utf8',
  }).trim();
  if (head !== SAI_COMMIT) throw Error('Sai source revision mismatch.');

  const app = path.join(source, 'App.tsx');
  replaceRequired(
    app,
    "import AIAssistantPanel from './components/AIAssistantPanel';",
    "import AIAssistantPanel from './HostedAIPanel';",
  );
  replaceRequired(
    app,
    "import { useHistory } from './hooks/useHistory';",
    "import { useHistory } from './hooks/useHistory';\nimport { loadHostedProject, saveHostedProject, downloadHostedProject, mergeSparkboardTasks, TASK_BRIDGE_KEY, TASK_BRIDGE_CHANNEL } from './HostedPersistence';\nimport HostedMobileShell from './HostedMobileShell';",
  );
  // Benchline opens straight into the workspace with a demo project; a project saved on this
  // device takes its place.
  replaceRequired(
    app,
    'useHistory<ProjectData | null>(initialProjectData);',
    "useHistory<ProjectData | null>(loadHostedProject() ?? initialProjectData);\n    useEffect(() => {\n      const receiveTasks = () => setProjectData(previous => mergeSparkboardTasks(previous));\n      receiveTasks();\n      const onTaskStorage = (event: StorageEvent) => { if (event.key === TASK_BRIDGE_KEY) receiveTasks(); };\n      const onFocus = () => receiveTasks();\n      let channel: BroadcastChannel | null = null;\n      try {\n        channel = new BroadcastChannel(TASK_BRIDGE_CHANNEL);\n        channel.onmessage = () => receiveTasks();\n      } catch { /* storage and focus still import tasks */ }\n      window.addEventListener('storage', onTaskStorage);\n      window.addEventListener('focus', onFocus);\n      document.addEventListener('visibilitychange', onFocus);\n      return () => {\n        window.removeEventListener('storage', onTaskStorage);\n        window.removeEventListener('focus', onFocus);\n        document.removeEventListener('visibilitychange', onFocus);\n        channel?.close();\n      };\n    }, []);\n    useEffect(() => { if (projectData) saveHostedProject(projectData); }, [projectData]);",
  );
  replaceRequired(
    app,
    'onSave={() => {}}',
    'onSave={() => { if (projectData) downloadHostedProject(projectData); }}',
  );
  replaceRequired(
    path.join(source, 'hooks/useHistory.ts'),
    "import { useState, useCallback, useMemo } from 'react';",
    "import { useState, useCallback, useMemo, useRef } from 'react';",
  );
  replaceRequired(
    path.join(source, 'hooks/useHistory.ts'),
    `const [currentIndex, setCurrentIndex] = useState(0);

    const setState = useCallback((newStateOrFn: T | ((prevState: T) => T)) => {
        setHistory(currentHistory => {
            const currentState = currentHistory[currentIndex];`,
    `const [currentIndex, setCurrentIndex] = useState(0);
    const indexRef = useRef(currentIndex);
    indexRef.current = currentIndex;

    const setState = useCallback((newStateOrFn: T | ((prevState: T) => T)) => {
        setHistory(currentHistory => {
            const currentState = currentHistory[indexRef.current];`,
  );
  replaceRequired(
    path.join(source, 'hooks/useHistory.ts'),
    'const newHistory = currentHistory.slice(0, currentIndex + 1);',
    'const newHistory = currentHistory.slice(0, indexRef.current + 1);',
  );
  replaceRequired(
    path.join(source, 'hooks/useHistory.ts'),
    '    }, [currentIndex]);',
    '    }, []);',
  );
  replaceRequired(
    path.join(source, 'components/widgets/MyTasksWidget.tsx'),
    `const currentUser = people.find(p => p.name === 'Alice'); // For demo
        if (!currentUser) return [];
        return tasks.filter(t => t.assignedTo.includes(currentUser.id) && t.completion < 100)
                    .sort((a,b) => a.endDate.getTime() - b.endDate.getTime())
                    .slice(0, 7);`,
    `const currentUser = people.find(p => p.name === 'Alice'); // For demo
        const fromSparkboard = (task: { id: string }) => task.id.startsWith('sparkboard:');
        return tasks.filter(t => t.completion < 100 && (fromSparkboard(t) || (!!currentUser && t.assignedTo.includes(currentUser.id))))
                    .sort((a, b) => Number(fromSparkboard(b)) - Number(fromSparkboard(a)) || a.endDate.getTime() - b.endDate.getTime())
                    .slice(0, 12);`,
  );
  replaceRequired(
    path.join(source, 'components/widgets/MyTasksWidget.tsx'),
    "<p className=\"text-xs text-gray-500 dark:text-gray-400\">Due: {task.endDate.toLocaleDateString('en-US', {month: 'short', day: 'numeric'})}</p>",
    "<p className=\"text-xs text-gray-500 dark:text-gray-400\">{task.id.startsWith('sparkboard:') ? 'From Sparkboard · ' : ''}Due: {task.endDate.toLocaleDateString('en-US', {month: 'short', day: 'numeric'})}</p>",
  );
  replaceRequired(
    app,
    '<SideNavbar currentView={currentView} onViewChange={setCurrentView} onSettings={() => setIsSettingsModalOpen(true)} onAddTask={() => setIsAddTaskPanelOpen(true)} onOpenShortcutHelp={() => setIsShortcutHelpOpen(true)} />',
    '<SideNavbar currentView={currentView} onViewChange={setCurrentView} onSettings={() => setIsSettingsModalOpen(true)} onAddTask={() => setIsAddTaskPanelOpen(true)} onOpenShortcutHelp={() => setIsShortcutHelpOpen(true)} />\n            <HostedMobileShell currentView={currentView} onViewChange={setCurrentView} onAddTask={() => setIsAddTaskPanelOpen(true)} onSettings={() => setIsSettingsModalOpen(true)} onHelp={() => setIsShortcutHelpOpen(true)} />',
  );
  replaceRequired(
    path.join(source, 'components/SideNavbar.tsx'),
    'nav className="h-full w-40 flex flex-col',
    'nav className="benchline-sidebar h-full w-40 flex flex-col',
  );
  replaceRequired(
    path.join(source, 'components/GanttChart.tsx'),
    'className="flex-grow overflow-y-auto overflow-x-hidden relative"',
    "className=\"gantt-timeline flex-grow min-h-0 min-w-0 overflow-auto overscroll-contain relative\"\n                    style={{ overflow: 'auto', WebkitOverflowScrolling: 'touch', touchAction: 'pan-x pan-y' }}",
  );
  replaceRequired(
    path.join(source, 'components/GanttChart.tsx'),
    `            const dx = e.deltaX !== 0 ? e.deltaX : (e.shiftKey ? e.deltaY : 0);
            if (dx !== 0) {
                e.preventDefault();
                timelineEl.scrollLeft += dx;
            }
        };

        sidebarEl.addEventListener('wheel', handleSidebarWheel, { passive: false });
        timelineEl.addEventListener('wheel', handleTimelineWheel, { passive: false });

        return () => {
            sidebarEl.removeEventListener('wheel', handleSidebarWheel);
            timelineEl.removeEventListener('wheel', handleTimelineWheel);
        };`,
    `            const dx = e.deltaX !== 0 ? e.deltaX : (e.shiftKey ? e.deltaY : 0);
            if (dx !== 0) {
                e.preventDefault();
                timelineEl.scrollLeft += dx;
                if (e.deltaX !== 0 && !e.shiftKey) timelineEl.scrollTop += e.deltaY;
            }
        };

        let touchX = 0;
        let touchY = 0;
        const handleSidebarTouchStart = (e: TouchEvent) => {
            const t = e.touches[0];
            if (!t) return;
            touchX = t.clientX;
            touchY = t.clientY;
        };
        const handleSidebarTouchMove = (e: TouchEvent) => {
            const t = e.touches[0];
            if (!t) return;
            const dx = touchX - t.clientX;
            const dy = touchY - t.clientY;
            touchX = t.clientX;
            touchY = t.clientY;
            if (dx === 0 && dy === 0) return;
            e.preventDefault();
            timelineEl.scrollLeft += dx;
            timelineEl.scrollTop += dy;
        };

        sidebarEl.addEventListener('wheel', handleSidebarWheel, { passive: false });
        sidebarEl.addEventListener('touchstart', handleSidebarTouchStart, { passive: true });
        sidebarEl.addEventListener('touchmove', handleSidebarTouchMove, { passive: false });
        timelineEl.addEventListener('wheel', handleTimelineWheel, { passive: false });

        return () => {
            sidebarEl.removeEventListener('wheel', handleSidebarWheel);
            sidebarEl.removeEventListener('touchstart', handleSidebarTouchStart);
            sidebarEl.removeEventListener('touchmove', handleSidebarTouchMove);
            timelineEl.removeEventListener('wheel', handleTimelineWheel);
        };`,
  );
  replaceRequired(
    path.join(source, 'components/TaskSidebar.tsx'),
    'className="flex-grow overflow-y-hidden overflow-x-hidden bg-white dark:bg-gray-900"',
    'className="gantt-task-list flex-grow overflow-y-hidden overflow-x-hidden bg-white dark:bg-gray-900"',
  );
  replaceRequired(
    path.join(source, 'components/GanttChart.tsx'),
    'className="flex-shrink-0 flex items-center px-4 border-t border-[#e6e6e2] dark:border-gray-800"',
    'className="gantt-x-scroll flex-shrink-0 flex items-center px-4 border-t border-[#e6e6e2] dark:border-gray-800"',
  );
  for (const name of ['HostedPersistence.ts', 'HostedAIPanel.tsx', 'HostedMobileShell.tsx']) {
    fs.copyFileSync(path.join(root, 'integration/sai', name), path.join(source, name));
  }
  const pub = path.join(source, 'public');
  fs.mkdirSync(pub, { recursive: true });
  fs.copyFileSync(
    path.join(root, 'integration/sai/manifest.webmanifest'),
    path.join(pub, 'manifest.webmanifest'),
  );
  fs.copyFileSync(path.join(root, 'integration/sai/icon.svg'), path.join(pub, 'icon.svg'));
  const index = path.join(source, 'index.html');
  replaceRequired(
    index,
    '<link rel="icon" type="image/svg+xml" href="/vite.svg" />',
    '<meta name="application-name" content="Benchline project planner" />',
  );
  replaceRequired(
    index,
    '<title>Benchline</title>',
    '<title>Benchline — Project planner · Sparkboard</title>',
  );
  replaceRequired(
    index,
    '<meta name="viewport" content="width=device-width, initial-scale=1.0" />',
    '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />\n  <meta name="theme-color" content="#243f30" />\n  <meta name="mobile-web-app-capable" content="yes" />\n  <meta name="apple-mobile-web-app-capable" content="yes" />\n  <meta name="apple-mobile-web-app-title" content="Benchline" />\n  <link rel="manifest" href="/sai/manifest.webmanifest" />\n  <link rel="apple-touch-icon" href="/sai/icon.svg" />',
  );
  replaceRequired(
    index,
    '</body>',
    '<a id="benchline-sparkboard" href="/?workspace=1" aria-label="Back to Sparkboard" style="color:#4262ff;font:700 13px system-ui;text-decoration:none">← Sparkboard</a>\n</body>',
  );
  removeFeedbackButton(app);
  const env = { ...process.env, GEMINI_API_KEY: '', API_KEY: '' };
  execFileSync('npm', ['install', '--no-audit', '--no-fund'], {
    cwd: source,
    env,
    stdio: 'inherit',
  });
  execFileSync(
    'npm',
    ['run', 'build', '--', '--base', '/sai/', '--outDir', destination, '--emptyOutDir'],
    {
      cwd: source,
      env,
      stdio: 'inherit',
    },
  );
  const html = fs.readFileSync(path.join(destination, 'index.html'), 'utf8');
  if (!html.includes('/sai/assets/')) throw Error('Sai bundle is missing its /sai/ asset base.');
  if (!html.includes('id="benchline-sparkboard"') || !html.includes('manifest.webmanifest'))
    throw Error('Benchline mobile shell was not published.');
  if (!fs.existsSync(path.join(destination, 'manifest.webmanifest')))
    throw Error('Benchline manifest was not published.');
  const scripts = fs
    .readdirSync(path.join(destination, 'assets'))
    .filter((name) => name.endsWith('.js'));
  if (!scripts.length) throw Error('Sai has no built JavaScript.');
  const bundled = scripts
    .map((name) => fs.readFileSync(path.join(destination, 'assets', name), 'utf8'))
    .join('\n');
  if (!bundled.includes('benchline-phone-chrome'))
    throw Error('Benchline phone bar was not bundled.');
  if (!bundled.includes('gantt-timeline') || !bundled.includes('pan-x pan-y'))
    throw Error('Gantt chart was not made scrollable.');
  if (bundled.includes('Send developer feedback'))
    throw Error('Feedback button was still bundled.');
  console.log('Benchline (Sai) static app built from ' + SAI_COMMIT + ' for /sai/.');
}

if (require.main === module) buildSai();
module.exports = { buildSai, SAI_COMMIT, replaceRequired, removeFeedbackButton };
