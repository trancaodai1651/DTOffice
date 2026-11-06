// The office's specialists: staff who work alone for you, each in a folder of their own.
//   news   "Nhân sự đọc báo": asks you a topic, searches Vietnamese and foreign news on the web (Claude Code's WebSearch, or
//          Codex with live web search), writes a summary report (bao-cao.html), which the office prints to PDF with the
//          computer's own Edge or Chrome; then asks whether to make a video of it.
//   video  "Nhân sự edit video": takes the brief (or the news report), its footage (found on the web, free to use, or a
//          folder of yours) and where to save; plans the video with the content skills in server/skills/video
//          (short-video scripts, storytelling, hooks, platform fit, content safety) and cuts it with ffmpeg.
// Each job is one CLI session (server/tasks.mjs) with the flags it needs; the jobs are kept in data/specialists.json.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFile, spawn } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { findMediaTool } from './media-tools.mjs';
import { renderVideo, verifyVideo } from './video-tools.mjs';
import { createT } from '../src/i18n/index.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const SKILLS_DIR = path.join(HERE, 'skills', 'video');
const WIN = process.platform === 'win32', MAC = process.platform === 'darwin';

/** The skills the video editor learns from (each a folder with a SKILL.md and its references). */
export function videoSkills(dir = SKILLS_DIR) {
  try { return fs.readdirSync(dir).filter((n) => fs.existsSync(path.join(dir, n, 'SKILL.md'))).sort(); } catch { return []; }
}
const slug = (s) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'viec';
const day = (ms) => new Date(ms).toISOString().slice(0, 10);

/* ---------- the tools on this computer ---------- */
function onPath(name) {
  for (const d of String(process.env.PATH || '').split(path.delimiter)) {
    for (const ext of WIN ? ['.exe', '.cmd', ''] : ['']) { const f = path.join(d, name + ext); try { if (fs.statSync(f).isFile()) return f; } catch { /* not here */ } }
  }
  return null;
}
/** ffmpeg: on the PATH, or where winget / Homebrew put it. */
export function findFfmpeg() {
  return findMediaTool('ffmpeg');
}
/** A Chromium browser that can print a page to PDF without a window (Edge on Windows, Chrome/Edge on a Mac). */
export function findBrowser() {
  const pf = process.env.ProgramFiles || 'C:\\Program Files', pf86 = process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)', local = process.env.LOCALAPPDATA || '';
  const known = WIN ? [path.join(pf86, 'Microsoft', 'Edge', 'Application', 'msedge.exe'), path.join(pf, 'Microsoft', 'Edge', 'Application', 'msedge.exe'), path.join(pf, 'Google', 'Chrome', 'Application', 'chrome.exe'), path.join(local, 'Google', 'Chrome', 'Application', 'chrome.exe')]
    : MAC ? ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge', '/Applications/Chromium.app/Contents/MacOS/Chromium', '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser']
      : [];
  return known.find((f) => fs.existsSync(f)) || (!WIN && !MAC ? ['google-chrome', 'chromium', 'chromium-browser', 'microsoft-edge'].map(onPath).find(Boolean) : null) || null;
}
/** The report page printed to PDF; resolves to the PDF's path, or '' when it couldn't be. */
export function printPdf(html, pdf, browser = findBrowser(), timeout = 120_000) {
  if (!browser || !fs.existsSync(html)) return Promise.resolve('');
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'dt-office-pdf-'));
  return new Promise((resolve) => {
    execFile(browser, ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--no-pdf-header-footer', '--run-all-compositor-stages-before-draw', '--virtual-time-budget=8000', `--user-data-dir=${profile}`, `--print-to-pdf=${pdf}`, pathToFileURL(html).href], { timeout, windowsHide: true }, () => {
      try { fs.rmSync(profile, { recursive: true, force: true }); } catch { /* the browser still holds it */ }
      resolve(fs.existsSync(pdf) && fs.statSync(pdf).size > 0 ? pdf : '');
    });
  });
}

/* ---------- what each one is told ---------- */
export function newsPrompt({ topic, lang = 'vi', since = 7 }) {
  const vi = lang === 'vi';
  return [
    'You are the NEWS READER of "DT Office" (Nhân sự đọc báo). The CEO (the user) asked you to read the news on this topic:',
    'This assignment belongs to you. Read the sources and write the report yourself; do not hand it to another office employee or create a subagent to do it.',
    '', `TOPIC: ${topic}`, '',
    `1. Search the web for recent coverage (the last ${since} days, longer only when there is too little), in BOTH:`,
    '   - Vietnamese press: e.g. VnExpress, Tuổi Trẻ, Thanh Niên, VietnamNet, Dân Trí, Znews, Báo Chính phủ, VTV, Nhân Dân, Người Lao Động.',
    '   - Foreign press: e.g. Reuters, AP, AFP, BBC, Bloomberg, Financial Times, The Guardian, Nikkei Asia, Al Jazeera, CNN, The New York Times.',
    '   Read at least 4 Vietnamese and 4 foreign articles when they exist; prefer primary reporting over aggregators.',
    '2. Never invent an article, a quote, a number or a date. Every claim in the report must come from a source you read; say so when sources disagree, and when something is not confirmed.',
    `3. Write the report in ${vi ? 'Vietnamese' : 'English'} as ONE self-contained HTML file, bao-cao.html, in the current folder (inline CSS, no external files or scripts, A4-friendly, readable fonts, UTF-8):`,
    '   - title (the topic) and the date of the report;',
    '   - a 5–8 line executive summary;',
    '   - key points / timeline;',
    '   - "Báo Việt Nam nói gì" and "Báo nước ngoài nói gì" (or the English equivalents): how each side covers it, and where they differ;',
    '   - what to watch next;',
    '   - sources: a numbered list with outlet, title, date and link, cited in the text as [1], [2]…',
    '4. Also write bao-cao.md with the same content in Markdown. Do not create a PDF yourself: the office prints bao-cao.html to PDF.',
    `5. End your answer with a 3–5 line summary in ${vi ? 'Vietnamese' : 'English'} and 2–3 ideas for a short video made from this report.`,
  ].join('\n');
}
export function videoPrompt({ brief, source, input = '', news = null, out, ffmpeg = '', skills = [], lang = 'vi', format = 'short' }) {
  const vi = lang === 'vi', sk = skills.map((n) => `- .claude/skills/${n}/SKILL.md`);
  return [
    'You are the VIDEO EDITOR of "DT Office" (Nhân sự edit video). The CEO (the user) asked for a video:',
    '', `BRIEF: ${brief || (news ? 'a video made from the news report below' : '(none given: make the best video from the material)')}`,
    `FORMAT: ${format === 'long' ? 'a horizontal 16:9 video of 1–3 minutes' : 'a vertical 9:16 short (Reels/TikTok/Shorts) of 20–60 seconds'}`,
    `SAVE TO: ${out} (this folder; the finished video and everything you make stay here)`, '',
    'Read VIDEO-TOOLS.md in this folder before downloading or rendering. It gives the exact Node helper commands and video-plan.json schema.',
    'Do not automate Chrome or bypass browser/tool restrictions. Use the HTTPS download helper with public direct media URLs; it uses the OS certificate store. Never disable TLS verification. If a site refuses access, choose another licensed source or create explicitly labelled original title-card graphics.',
    'First learn your skills: read every SKILL.md below (and the references they point to when you use them). Use short-video-reels and storytelling-million-views for the script and the hook, viral-content-concepts for the angle, facebook-content-safety (and brand-trust-building when there is a brand) before anything is published, the growth skills for the caption and where it fits:',
    ...sk, '',
    'FOOTAGE:',
    ...(source === 'folder' ? [`- Use the user's own files in: ${input} (videos, images, audio). Read them there; never change, move or delete them. Copy or transcode into this folder what you need.`]
      : [`- Find footage on the web that is free to use: Pexels, Pixabay, Mixkit, Wikimedia Commons, NASA, archive.org public domain, or the outlets' own embeddable material only when their licence allows it. Download into ./tu-lieu/. Never use material whose licence you could not check. Record every file's source, author and licence in nguon-tu-lieu.md.`]),
    ...(news ? [`- The content comes from the news report: ${news} (read bao-cao.md / bao-cao.html there). Keep its facts and cite the outlets on screen or in the caption.`] : []),
    '',
    'WORK:',
    '1. Plan: kich-ban.md with the viewer promise, 3 hook options and the one you chose, the beat sheet, the shot list (time · visual · on-screen text · audio/edit), the caption and hashtags.',
    `2. Cut it with ffmpeg${ffmpeg ? ` (${ffmpeg})` : ''}: trim, order the shots, scale/crop to the format, on-screen text (drawtext with a font that has Vietnamese characters, e.g. Arial or Segoe UI on Windows, Arial Unicode on a Mac), transitions, music or voice only when free to use, loudness normalised. Write the exact commands to dung-video.ps1 (Windows) or dung-video.sh (macOS/Linux) so it can be made again, then run them.`,
    '3. Export video-final.mp4 (H.264 + AAC, 30 fps) and a cover image cover.jpg. Check the result with ffprobe (duration, size, streams).',
    'Always write video-plan.json with the actual scenes and source/license metadata. Run the render helper unless you already produced a verified custom FFmpeg export (e.g. with licensed narration/music); verify a custom export using the helper verify command. If stock footage cannot be downloaded, render original illustrated title cards instead, clearly label them as graphics and describe the substitution. A script or shot list alone is not a finished video. The default helper creates silent AAC when no licensed audio is available; disclose it.',
    ...(ffmpeg ? [] : ['ffmpeg is NOT installed on this computer: report the missing dependency and request installation. Do not claim that a script or a plan is a finished export. The current desktop installer includes ffmpeg and ffprobe.']),
    '4. Run the content-safety check on the script, the text and the footage; fix what it finds.',
    `5. End your answer in ${vi ? 'Vietnamese' : 'English'}: what you made, the files, the length, the sources used, and what the CEO should check before posting.`,
  ].join('\n');
}

/**
 * @param {{ dataDir: string, lang: () => string, start: (o: object) => { ok: boolean, task?: object, code?: string }, stop: (taskId: string) => void,
 *   onChange?: (job: object, what: string) => void, home?: string, now?: () => number, ffmpeg?: () => string | null, browser?: () => string | null }} o
 */
export function createSpecialists({ dataDir, lang, start, stop, onChange = () => {}, home = os.homedir(), now = Date.now, ffmpeg = findFfmpeg, browser = findBrowser }) {
  const file = path.join(dataDir, 'specialists.json');
  let jobs = []; const recover = [];
  try { jobs = JSON.parse(fs.readFileSync(file, 'utf8')).jobs || []; } catch { /* none yet */ }
  for (const j of jobs) {
    if (['run', 'print', 'render'].includes(j.status)) j.status = 'stopped';
    if (j.kind === 'video' && ['done', 'fail'].includes(j.status) && (!j.video || !fs.existsSync(j.video))) {
      j.video = ''; j.status = 'fail';
      const candidate = path.join(j.dir, 'video-final.mp4');
      if (fs.existsSync(candidate)) { j.status = 'render'; recover.push([j, candidate]); }
    }
  }
  const save = () => { try { fs.mkdirSync(dataDir, { recursive: true }); fs.writeFileSync(file, JSON.stringify({ jobs: jobs.slice(0, 40) }, null, 1)); } catch { /* best effort */ } };
  const pub = (j) => ({ id: j.id, kind: j.kind, topic: j.topic, brief: j.brief, source: j.source, input: j.input, from: j.from || null, dir: j.dir, status: j.status, at: j.at, end: j.end || 0,
    sid: j.sid || null, task: j.task || null, pdf: j.pdf || '', video: j.video || '', summary: j.summary || '', agent: j.agent, model: j.model, effort: j.effort, asked: !!j.asked });
  const defaults = () => ({ news: path.join(home, 'Documents', 'DT Office', 'Bao chi'), video: path.join(home, 'Videos', 'DT Office') });
  const folder = (root, title) => { const d = path.join(root, `${day(now())}-${slug(title)}`); let f = d, i = 2; while (fs.existsSync(f)) f = `${d}-${i++}`; fs.mkdirSync(f, { recursive: true }); return f; };
  const absolute = (p) => { const s = String(p || '').trim().replace(/^["']|["']$/g, '').replace(/^~(?=$|[\\/])/, home); return s && path.isAbsolute(s) ? path.resolve(s) : ''; };
  // A repaired export may have been created after an older app incorrectly marked the job done.
  for (const [j, candidate] of recover) verifyVideo(candidate, j.format).then(proof => {
    j.video = candidate; j.status = 'done'; j.summary = createT(lang())('specialists.video.exportVerified', { seconds: proof.duration.toFixed(1), width: proof.width, height: proof.height }); save(); onChange(pub(j), 'done');
  }).catch(error => { j.status = 'fail'; j.summary = createT(lang())('specialists.video.exportFailed', { why: error.message }); save(); onChange(pub(j), 'fail'); });

  function run(j, prompt, args) {
    const got = start({ dir: j.dir, text: prompt, agent: j.agent, model: j.model, effort: j.effort, role: j.kind === 'news' ? 'news' : 'video', ask: j.topic || j.brief || '', args, perm: 'specialist' });
    if (!got?.ok) { j.status = 'fail'; j.summary = got?.code || 'error'; j.end = now(); }
    else { j.task = got.task.id; j.status = 'run'; }
    jobs.unshift(j); jobs = jobs.slice(0, 40); save(); onChange(pub(j), got?.ok ? 'start' : 'fail');
    return got?.ok ? { ok: true, job: pub(j) } : { ok: false, code: got?.code || 'error' };
  }
  return {
    list: () => jobs.map(pub),
    get: (id) => { const j = jobs.find((x) => x.id === id); return j ? pub(j) : null; },
    raw: (id) => jobs.find((x) => x.id === id) || null,
    defaults,
    tools: () => ({ ffmpeg: ffmpeg() || '', ffprobe: findMediaTool('ffprobe') || '', browser: browser() || '', skills: videoSkills() }),
    bind(task, sid) { const j = jobs.find((x) => x.task === task); if (!j || !sid || j.sid === sid) return; j.sid = sid; save(); onChange(pub(j), 'bind'); },
    /** { topic, dir?, agent, model, effort } -> { ok, job } | { ok: false, code } */
    news({ topic, dir = '', agent = 'claude', model = '', effort = '' }) {
      topic = String(topic || '').trim().slice(0, 500);
      if (!topic) return { ok: false, code: 'empty' };
      if (jobs.some((j) => j.kind === 'news' && ['run', 'print'].includes(j.status))) return { ok: false, code: 'specialistBusy' };
      const root = dir ? absolute(dir) : defaults().news; if (!root) return { ok: false, code: 'badDir' };
      const j = { id: crypto.randomUUID().slice(0, 8), kind: 'news', topic, agent: agent === 'codex' ? 'codex' : 'claude', model, effort, at: now(), dir: folder(root, topic) };
      return run(j, newsPrompt({ topic, lang: lang() }), { claude: ['--allowedTools', 'WebSearch WebFetch Read Write Edit Glob Grep'], codex: ['-c', 'web_search="live"'] });
    },
    /** { brief, source: 'web' | 'folder', input (a folder, for 'folder'), from (a news job), out (where to save), format, agent, model, effort } */
    video({ brief = '', source = 'web', input = '', from = '', out = '', format = 'short', agent = 'claude', model = '', effort = '' }) {
      brief = String(brief || '').trim().slice(0, 2000);
      const news = from ? jobs.find((x) => x.id === from && x.kind === 'news') : null;
      if (!brief && !news) return { ok: false, code: 'empty' };
      if (jobs.some((j) => j.kind === 'video' && ['run', 'print', 'render'].includes(j.status))) return { ok: false, code: 'specialistBusy' };
      const src = source === 'folder' ? 'folder' : 'web', inDir = src === 'folder' ? absolute(input) : '';
      if (src === 'folder' && !(inDir && fs.existsSync(inDir) && fs.statSync(inDir).isDirectory())) return { ok: false, code: 'noInput' };
      const root = out ? absolute(out) : defaults().video; if (!root) return { ok: false, code: 'badDir' };
      const j = { id: crypto.randomUUID().slice(0, 8), kind: 'video', brief, source: src, input: inDir, from: news?.id || '', format: format === 'long' ? 'long' : 'short', agent: agent === 'codex' ? 'codex' : 'claude', model, effort, at: now(), dir: folder(root, brief || news?.topic || 'video') };
      if (news) news.asked = true;
      // the skills, where Claude Code finds them on its own and Codex is told to read them
      const skills = videoSkills();
      for (const n of skills) fs.cpSync(path.join(SKILLS_DIR, n), path.join(j.dir, '.claude', 'skills', n), { recursive: true });
      const ff = ffmpeg() || '';
      const helper = path.join(HERE, 'video-tools.mjs'), cmd = `${WIN ? '& ' : ''}${JSON.stringify(process.execPath)} ${JSON.stringify(helper)}`;
      fs.writeFileSync(path.join(j.dir, 'VIDEO-TOOLS.md'), `# Local video tools\n\nFFmpeg: ${ff || 'not installed'}\nFFprobe: ${findMediaTool('ffprobe') || 'not installed'}\n\nUse these commands from this job folder (no Chrome automation):\n\n${cmd} doctor\n${cmd} download "https://public-host/path/file.mp4" "tu-lieu/clip.mp4"\n${cmd} render video-plan.json\n${cmd} verify video-final.mp4\n\nManifest example:\n\n${JSON.stringify({ format: j.format, scenes: [{ type: 'title', duration: 5, text: 'Title and dated facts', color: '#17253b' }, { type: 'clip', file: 'tu-lieu/clip.mp4', duration: 5, text: 'Caption', source: 'https://source-page', license: 'license checked at URL' }] }, null, 2)}\n\nFor unavailable footage use type=title scenes explicitly identified as original graphics. Audio is silent AAC; do not claim narration or music. Fonts support Vietnamese. Copy user footage into this folder, never alter originals.\n`);
      const claude = ['--allowedTools', 'Bash Read Write Edit Glob Grep WebSearch WebFetch Skill', ...(inDir ? ['--add-dir', inDir] : []), ...(news ? ['--add-dir', news.dir] : [])];
      const codex = ['-c', 'web_search="live"', '-c', 'sandbox_workspace_write.network_access=true'];
      return run(j, videoPrompt({ brief, source: src, input: inDir, news: news?.dir || null, out: j.dir, ffmpeg: ff, skills, lang: lang(), format: j.format }), { claude, codex });
    },
    /** A task ended: if it was a specialist's, its result (the news report printed to PDF). */
    async taskDone(t) {
      const j = jobs.find((x) => x.task === t.id); if (!j) return false;
      if (t.sid) j.sid = t.sid;
      j.summary = String(t.result || t.error || '').trim().slice(-1500);
      if (t.stopped) { j.status = 'stopped'; j.end = now(); save(); onChange(pub(j), 'stopped'); return true; }
      if (t.error && !t.result) { j.status = 'fail'; j.end = now(); save(); onChange(pub(j), 'fail'); return true; }
      if (j.kind === 'news') {
        j.status = 'print'; save(); onChange(pub(j), 'print');
        const html = path.join(j.dir, 'bao-cao.html'), own = path.join(j.dir, 'bao-cao.pdf');
        j.pdf = fs.existsSync(own) ? own : await printPdf(html, own, browser());
        if (!j.pdf && fs.existsSync(html)) j.html = html;
      } else {
        j.status = 'render'; save(); onChange(pub(j), 'render');
        const v = path.join(j.dir, 'video-final.mp4'), manifest = path.join(j.dir, 'video-plan.json');
        try {
          let proof;
          try { proof = await verifyVideo(v, j.format); }
          catch (error) { if (!fs.existsSync(manifest)) throw error; await renderVideo(j.dir, JSON.parse(fs.readFileSync(manifest, 'utf8'))); proof = await verifyVideo(v, j.format); }
          j.video = v;
          j.summary += `\n\n${createT(lang())('specialists.video.exportVerified', { seconds: proof.duration.toFixed(1), width: proof.width, height: proof.height })}`;
          fs.writeFileSync(path.join(j.dir, 'export-verified.json'), JSON.stringify(proof, null, 2));
        } catch (e) {
          j.video = ''; j.status = 'fail'; j.summary = createT(lang())('specialists.video.exportFailed', { why: String(e.message || e).slice(0, 700) }); j.end = now(); save(); onChange(pub(j), 'fail'); return true;
        }
      }
      j.status = 'done'; j.end = now(); save(); onChange(pub(j), 'done');
      return true;
    },
    halt(id) { const j = jobs.find((x) => x.id === id && x.status === 'run'); if (!j) return false; if (j.task) stop(j.task); return true; },
    /** What to open for a job: its PDF (or its HTML when no PDF), its video, or its folder. */
    target(id, what) {
      const j = jobs.find((x) => x.id === id); if (!j) return '';
      const f = what === 'pdf' ? j.pdf || j.html || '' : what === 'video' ? j.video : j.dir;
      return f && fs.existsSync(f) ? f : '';
    },
  };
}

/** Open a file or folder with the computer's own app (Explorer, Finder, the PDF reader, the video player). */
export function openPath(p) {
  const [cmd, args] = MAC ? ['open', [p]] : WIN ? ['explorer.exe', [p]] : ['xdg-open', [p]];
  try { spawn(cmd, args, { stdio: 'ignore', detached: true, windowsHide: false }).unref(); return true; } catch { return false; }
}
/** How to install ffmpeg here, as a terminal command (winget on Windows, Homebrew on a Mac). */
export const ffmpegInstall = () => (WIN ? ['winget', 'install', '--id', 'Gyan.FFmpeg', '-e'] : MAC ? ['brew', 'install', 'ffmpeg'] : ['sudo', 'apt-get', 'install', '-y', 'ffmpeg']);
