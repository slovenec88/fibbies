// Runs the Android Gradle wrapper on any OS: node scripts/gradle.mjs assembleDebug
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

const win = process.platform === 'win32';
const wrapper = resolve('android', win ? 'gradlew.bat' : 'gradlew');
const r = win
  ? spawnSync('cmd.exe', ['/d', '/c', wrapper, ...process.argv.slice(2)], { cwd: 'android', stdio: 'inherit' })
  : spawnSync(wrapper, process.argv.slice(2), { cwd: 'android', stdio: 'inherit' });
if (r.error) console.error(r.error.message);
process.exit(r.status ?? 1);
