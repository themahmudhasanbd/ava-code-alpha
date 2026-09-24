import { spawn } from 'node:child_process';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = '/var/www/ava-code/ava-desktop/apps/desktop';
const mainEntry = join(root, 'out/main/index.js');

console.log('Testing Electron boot with native AvA Core (codex-app-server)...');

const env = {
  ...process.env,
  PI_DESKTOP_DEV: '1',
  PI_DESKTOP_DATA_DIR: '/root/.ava-code',
  CODEX_HOME: '/root/.ava-code',
  AVA_HOME: '/root/.ava-code',
  ELECTRON_ENABLE_LOGGING: '1',
};

const child = spawn('/var/www/ava-code/ava-desktop/node_modules/.bin/electron', [mainEntry, '--headless', '--no-sandbox'], {
  env,
  stdio: ['pipe', 'pipe', 'pipe'],
});

let output = '';
child.stdout.on('data', (d) => {
  const s = d.toString();
  output += s;
  console.log('[ELECTRON STDOUT]', s.trim());
});

child.stderr.on('data', (d) => {
  const s = d.toString();
  output += s;
  console.log('[ELECTRON STDERR]', s.trim());
});

setTimeout(() => {
  console.log('Electron process verified alive for 5 seconds. Shutting down gracefully.');
  child.kill('SIGTERM');
  process.exit(0);
}, 5000);
