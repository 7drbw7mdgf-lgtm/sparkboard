const fs = require('node:fs');
const path = require('node:path');
const { build } = require('esbuild');
const root = path.resolve(__dirname, '..');
const packages = ['auth-js'];
const license = packages
  .map(
    (name) =>
      `/* @supabase/${name}\n${fs.readFileSync(path.join(root, 'node_modules/@supabase', name, 'LICENSE'), 'utf8')}\n*/`,
  )
  .join('\n');
build({
  stdin: {
    contents: "export {AuthClient} from '@supabase/auth-js';",
    resolveDir: root,
    sourcefile: 'supabase-entry.js',
  },
  bundle: true,
  format: 'esm',
  platform: 'browser',
  target: 'es2022',
  minify: true,
  legalComments: 'inline',
  banner: { js: license },
  outfile: path.join(root, 'src/vendor/supabase.js'),
}).catch(() => process.exit(1));
