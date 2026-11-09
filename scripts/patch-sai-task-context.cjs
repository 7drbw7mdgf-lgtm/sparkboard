'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { swap } = require('./patch-sai-gantt.cjs');
module.exports.patchHostedTaskContext = (root) => {
  const types = path.join(root, 'types.ts');
  fs.writeFileSync(
    types,
    swap(
      fs.readFileSync(types, 'utf8'),
      'export interface Task {',
      'export interface Task {\n    sparkboardOrigin?: { boardId: string; nodeId: string };',
    ),
  );
  const file = path.join(root, 'App.tsx');
  let source = fs.readFileSync(file, 'utf8');
  source = swap(
    source,
    "import HostedTasksSwitch from './HostedTasksSwitch';",
    "import HostedTasksSwitch from './HostedTasksSwitch';\nimport HostedTaskContext from './HostedTaskContext';",
  );
  source = swap(
    source,
    '            {(editingTaskId && projectData) &&',
    '            <HostedTaskContext projectData={projectData} editingTaskId={editingTaskId} onOpenTask={setEditingTaskId} />\n            {(editingTaskId && projectData) &&',
  );
  fs.writeFileSync(file, source);
};
