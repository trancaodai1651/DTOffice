import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createTasks } from '../../server/tasks.mjs';

test('long employee instructions reach Codex on stdin without losing the skill at the end', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'office-prompt-'));
  try {
    const fake = path.join(dir, 'codex.mjs');
    fs.writeFileSync(fake, `import fs from 'node:fs'; const text=process.argv.at(-1)==='-'?fs.readFileSync(0,'utf8'):process.argv.at(-1); console.log(JSON.stringify({type:'item.completed',item:{type:'agent_message',text}}));`);
    let resolve; const done = new Promise(r => { resolve = r; });
    const tasks = createTasks({ dataDir: dir, claude: () => null, codex: () => fake, env: () => ({ ...process.env }), onDone: resolve });
    const text = 'Role instructions\n'.repeat(1500) + 'END-ROLE-SKILL';
    assert.equal(tasks.start({ dir, text, agent: 'codex', role: 'frontend', team: 'direct-test' }).ok, true);
    const result = await done; assert.equal(result.result, text); assert.equal(result.error, '');
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
