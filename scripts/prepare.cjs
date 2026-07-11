const { existsSync } = require('node:fs');
const { spawnSync } = require('node:child_process');
const path = require('node:path');

const compiler = path.join(process.cwd(), 'node_modules', 'typescript', 'bin', 'tsc');

if (!existsSync(compiler)) {
  // GitHub installs use the committed dist output because npm omits devDependencies
  // while preparing a git dependency.
  process.exit(0);
}

const result = spawnSync(process.execPath, [path.join(process.cwd(), 'scripts', 'build.cjs')], { stdio: 'inherit' });
process.exit(result.status ?? 1);
