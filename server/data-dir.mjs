// Where the office keeps its data (prefs, the phone PIN, the history vault, the other AI tools' sign-ins, its log):
// data/ in the folder it runs from, for a clone of the repository; ~/.my-office when npm installed it (in a node_modules
// folder, which `npm install -g my-office@latest` or npx's cache replaces whole). OFFICE_DATA_DIR wins: the tests, a
// second copy.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// The desktop app (src-tauri/) ships the office with a .office-app file beside it: its folder is replaced by every
// update, so its data lives in ~/.my-office too.
export function dataDir(root, env = process.env) {
  if (env.OFFICE_DATA_DIR) return path.resolve(env.OFFICE_DATA_DIR);
  const shipped = path.resolve(root).split(/[\\/]/).includes('node_modules') || fs.existsSync(path.join(root, '.office-app'));
  return shipped ? path.join(os.homedir(), '.my-office') : path.join(root, 'data');
}
