const { existsSync, rmSync } = require('node:fs');
const { spawnSync } = require('node:child_process');
const path = require('node:path');

const compiler = path.join(process.cwd(), 'node_modules', 'typescript', 'bin', 'tsc');

if (!existsSync(compiler)) {
  console.error('TypeScript compiler is not installed. Run npm ci before building.');
  process.exit(1);
}

rmSync(path.join(process.cwd(), 'dist'), { recursive: true, force: true });
const result = spawnSync(process.execPath, [compiler, '--project', 'tsconfig.json'], { stdio: 'inherit' });
process.exit(result.status ?? 1);
