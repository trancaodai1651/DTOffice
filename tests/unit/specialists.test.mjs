// The specialists (server/specialists.mjs): the news reader (topic -> Vietnamese and foreign news -> a PDF summary) and
// the video editor (its skills, its footage, where it saves), each a CLI session of its own.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createSpecialists, newsPrompt, videoPrompt, videoSkills } from '../../server/specialists.mjs';

const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'office-spec-'));
function harness({ ffmpeg = null } = {}) {
  const home = tmp(), started = [], events = [];
  const sp = createSpecialists({
    dataDir: path.join(home, 'data'), lang: () => 'vi', home,
    start: (o) => { const t = { id: `t${started.length + 1}`, ...o }; started.push(t); return { ok: true, task: t }; },
    stop: (id) => events.push(['stop', id]), onChange: (j, what) => events.push([what, j.kind]),
    ffmpeg: () => ffmpeg, browser: () => null,
  });
  return { home, sp, started, events };
}

test('the video editor learns the nine content skills bundled with the office', () => {
  const names = videoSkills();
  assert.equal(names.length, 9);
  for (const n of ['short-video-reels', 'storytelling-million-views', 'viral-content-concepts', 'facebook-content-safety']) assert.ok(names.includes(n), n);
});

test('what the news reader is told: both presses, no invention, one HTML report', () => {
  const p = newsPrompt({ topic: 'giá vàng', lang: 'vi' });
  assert.match(p, /TOPIC: giá vàng/);
  assert.match(p, /VnExpress/); assert.match(p, /Reuters/);
  assert.match(p, /Never invent/);
  assert.match(p, /bao-cao\.html/);
  assert.match(p, /Vietnamese/);
});

test('a news job: its own folder, web search on, the summary kept; the PDF falls back to the HTML', async () => {
  const h = harness();
  assert.equal(h.sp.news({ topic: '' }).code, 'empty');
  const r = h.sp.news({ topic: 'Xe điện ở Mỹ', agent: 'codex' });
  assert.equal(r.ok, true);
  const t = h.started[0];
  assert.equal(t.role, 'news'); assert.equal(t.perm, 'specialist');
  assert.ok(t.dir.startsWith(path.join(h.home, 'Documents', 'DT Office', 'Bao chi')));
  assert.match(path.basename(t.dir), /xe-dien-o-my$/);
  assert.deepEqual(t.args.codex, ['-c', 'web_search="live"']);
  assert.match(t.args.claude.join(' '), /WebSearch/);
  assert.doesNotMatch(t.args.claude.join(' '), /Bash/, 'the reader runs no commands');
  fs.writeFileSync(path.join(t.dir, 'bao-cao.html'), '<h1>x</h1>');
  assert.equal(await h.sp.taskDone({ id: t.id, result: 'Tóm tắt…' }), true);
  const j = h.sp.list()[0];
  assert.equal(j.status, 'done'); assert.equal(j.pdf, ''); assert.equal(j.summary, 'Tóm tắt…');
  assert.equal(h.sp.target(j.id, 'pdf'), path.join(t.dir, 'bao-cao.html'), 'no browser to print with: the HTML is opened instead');
  assert.equal(await h.sp.taskDone({ id: 'other' }), false);
});

test('a video job: from the news report, its skills copied in, its footage folder checked, ffmpeg said', () => {
  const h = harness();
  const n = h.sp.news({ topic: 'Giá vàng' }); h.started[0].done = true;
  assert.equal(h.sp.video({ brief: 'x', source: 'folder', input: path.join(h.home, 'nope') }).code, 'noInput');
  const footage = fs.mkdtempSync(path.join(h.home, 'raw-'));
  const r = h.sp.video({ brief: '', from: n.job.id, source: 'folder', input: footage, out: path.join(h.home, 'out') });
  assert.equal(r.ok, true);
  const t = h.started[1];
  assert.equal(t.role, 'video');
  assert.ok(t.dir.startsWith(path.join(h.home, 'out')));
  assert.ok(fs.existsSync(path.join(t.dir, '.claude', 'skills', 'short-video-reels', 'SKILL.md')));
  assert.ok(t.args.claude.includes('--add-dir') && t.args.claude.includes(footage));
  assert.match(t.text, /never change, move or delete them/);
  assert.match(t.text, /bao-cao\.md/);
  assert.match(t.text, /ffmpeg is NOT installed/);
  assert.equal(h.sp.get(n.job.id).asked, true, 'the reader\'s question is answered');
  const web = videoPrompt({ brief: 'b', source: 'web', out: 'o', ffmpeg: 'ffmpeg', skills: ['a'] });
  assert.match(web, /Pexels/); assert.match(web, /nguon-tu-lieu\.md/); assert.doesNotMatch(web, /NOT installed/);
});
