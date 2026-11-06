// Department integration fixture: no real AI calls, no credentials, no external network.
import fs from 'node:fs';
import path from 'node:path';
const args = process.argv.slice(2), codex = args[0] === 'exec';
if (args[0] === 'auth') { console.log(JSON.stringify({ loggedIn: true })); process.exit(0); }
if (args[0] === '--version') { console.log('2.1.316'); process.exit(0); }
const prompt = codex ? (args.at(-1) === '-' ? fs.readFileSync(0, 'utf8') : args.at(-1)) : (args[1]?.includes('supplied on stdin') ? fs.readFileSync(0, 'utf8') : args[1]);
const role = /You are the ([A-Z]+) Agent/.exec(prompt)?.[1].toLowerCase() || '';
const result = role === 'pm' ? 'Manager plan\nROLES: frontend' : role === 'cmo' ? 'Marketing plan\nROLES: copywriter' : 'Fixture completed\nVERDICT: PASS';
const report = /Write your own report to (.+?) \(create/.exec(prompt)?.[1];
if (report) { fs.mkdirSync(path.dirname(report), { recursive: true }); fs.writeFileSync(report, result); }
const sid = `employee-${codex ? 'codex' : 'claude'}-${process.pid}`;
const out = data => console.log(JSON.stringify(data));
out(codex ? { type: 'thread.started', thread_id: sid } : { type: 'system', subtype: 'init', session_id: sid });
await new Promise(resolve => setTimeout(resolve, 60));
const event = async (hook, extra = {}) => fetch(`http://127.0.0.1:${process.env.OFFICE_PORT}/event`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ session_id: sid, cwd: process.cwd(), agent: codex ? 'codex' : 'claude', hook_event_name: hook, ...extra }) });
await event('SessionStart'); await event('UserPromptSubmit', { prompt: `Fixture assignment for ${role || 'single session'}` });
await new Promise(resolve => setTimeout(resolve, Number(process.env.EMPLOYEE_DELAY) || 300));
await event('Stop', { last_assistant_message: result });
out(codex ? { type: 'item.completed', item: { type: 'agent_message', text: result } } : { type: 'result', result, is_error: false });
