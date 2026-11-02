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
    "import { useHistory } from './hooks/useHistory';\nimport { loadHostedProject, saveHostedProject, downloadHostedProject, mergeSparkboardTasks, TASK_BRIDGE_KEY } from './HostedPersistence';",
  );
  // Benchline opens straight into the workspace with a demo project; a project saved on this
  // device takes its place.
  replaceRequired(
    app,
    'useHistory<ProjectData | null>(initialProjectData);',
    'useHistory<ProjectData | null>(loadHostedProject() ?? initialProjectData);\n    useEffect(() => {\n      const receiveTasks = () => setProjectData(previous => mergeSparkboardTasks(previous));\n      receiveTasks();\n      const onTaskStorage = (event: StorageEvent) => { if (event.key === TASK_BRIDGE_KEY) receiveTasks(); };\n      window.addEventListener(\'storage\', onTaskStorage);\n      return () => window.removeEventListener(\'storage\', onTaskStorage);\n    }, []);\n    useEffect(() => { if (projectData) saveHostedProject(projectData); }, [projectData]);',
  );
  replaceRequired(
    app,
    'onSave={() => {}}',
    'onSave={() => { if (projectData) downloadHostedProject(projectData); }}',
  );
  for (const name of ['HostedPersistence.ts', 'HostedAIPanel.tsx']) {
    fs.copyFileSync(path.join(root, 'integration/sai', name), path.join(source, name));
  }
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
    '</body>',
    '<a href="/" aria-label="Back to Sparkboard" style="position:fixed;bottom:15px;right:15px;z-index:9999;border-radius:999px;background:#274332;color:white;padding:10px 14px;text-decoration:none;font:700 12px system-ui;box-shadow:0 4px 18px #1113">← Sparkboard</a>\n</body>',
  );
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
  if (!fs.readdirSync(path.join(destination, 'assets')).some((name) => name.endsWith('.js')))
    throw Error('Sai has no built JavaScript.');
  console.log('Benchline (Sai) static app built from ' + SAI_COMMIT + ' for /sai/.');
}

if (require.main === module) buildSai();
module.exports = { buildSai, SAI_COMMIT, replaceRequired };
