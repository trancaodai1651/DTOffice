// The office's AI Agent teams (TEAMS), the first of them "Đội AI Agent Dev": a software team of 15 agents, run by you, the CEO.
// More teams, each for its own kind of work, join TEAMS later; the guide (người hướng dẫn) picks the team(s) a task
// needs (routeTeams), and when it needs more than one they work it one after another, each reading what the one before
// it left. The staff are shared by every task: a member at work on one task is called for another only once done.
// You give a goal to the PM or the CTO; the team works it
// through five stages, one after the other. Every member is a session of its own (Claude Code or Codex, the model and
// effort you chose) that does its own job and nobody else's, and writes its own report:
//   1. plan    PM, Product Owner, BA (and the CTO when the goal went to the CTO), side by side. The PM also says which
//              of the other roles this goal needs (a "ROLES:" line): only those are called after.
//   2. design  Solution Architect, and UI/UX when there are screens, side by side
//   3. build   the engineers the PM named (Frontend, Backend, Desktop/Mobile, AI Engineer), one after another, each in
//              its own part of the code and reading what the one before it did
//   4. verify  QA Tester and Code Reviewer (and Security when named), one after another, each with its own verdict, PASS
//              or FAIL; one FAIL is enough: the engineers fix what was found, each in its own part, and it is verified
//              again, twice at most
//   5. ship    DevOps (and Database when named), one after another: build, packaging, migrations, how to deploy and
//              watch it; nothing published unless the goal asks for it
//   then       the PM (or the CTO) reports to the CEO.
// Reports: .ai-office/team/<run>/<n>-<stage>-<role>.md, each reading the ones before it. The stages that change the code
// run their members one at a time, so two of them never edit the same file at once; the others side by side, as many as
// the office runs at a time (server/tasks.mjs), the rest waiting their turn.
import fs from 'node:fs';
import { MANAGERS } from '../src/shared/department-request.js';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

/** The 15 roles, by group, and what each does (said to the model in English; their names on screen are the page's). */
export const ROLES = [
  { id: 'cto', group: 'lead', duty: 'Owns the technical direction: the stack, the architecture decisions and their trade-offs, technical risk, and the final technical sign-off.' },
  { id: 'pm', group: 'lead', duty: 'Owns delivery: breaks the goal into a plan with milestones and tasks, assigns them to the right roles, tracks progress and reports to the CEO.' },
  { id: 'po', group: 'lead', duty: 'Owns the product: the user value, the scope (what is in and out), priorities, and acceptance criteria for each feature.' },
  { id: 'ba', group: 'design', duty: 'Analyses the requirements: user stories, business rules, edge cases, data needed, and questions that must be settled.' },
  { id: 'architect', group: 'design', duty: 'Designs the solution: components and their boundaries, data model, APIs, folder structure, and how it fits the existing code.' },
  { id: 'uiux', group: 'design', duty: 'Designs the user experience: screens, flows, states (empty, loading, error), accessibility and the look, consistent with what exists.' },
  { id: 'frontend', group: 'dev', duty: 'Builds the user interface and its client-side logic, following the UI/UX design and the existing conventions.' },
  { id: 'backend', group: 'dev', duty: 'Builds the server side: APIs, business logic, validation, integrations and their error handling.' },
  { id: 'app', group: 'dev', duty: 'Builds the desktop and mobile parts (app shells, native integration, packaging specifics) when the goal needs them.' },
  { id: 'ai', group: 'dev', duty: 'Builds the AI parts: model calls, prompts, agents, evaluation, and keeps them safe and cheap.' },
  { id: 'qa', group: 'quality', duty: 'Tests: writes and runs automated tests for the acceptance criteria, tries edge cases, and reports each bug with steps to reproduce.' },
  { id: 'reviewer', group: 'quality', duty: 'Reviews the code: correctness, readability, consistency with the codebase, performance, and things that will hurt later.' },
  { id: 'security', group: 'ops', duty: 'Checks security: secrets, input validation, auth, dependencies, data exposure; anything that must be fixed before shipping.' },
  { id: 'devops', group: 'ops', duty: 'Ships it: build and packaging, CI, configuration, how to deploy, monitor and roll back. Never publishes or deploys unless the goal asks.' },
  { id: 'database', group: 'ops', duty: 'Owns the data: schema and migrations, indexes, backups, data integrity and how the data is kept over time.' },
];
export const GROUPS = ['lead', 'design', 'dev', 'quality', 'ops'];
/** "Đội AI Agent Marketing": one department, one agent per position, run by its Marketing Manager (CMO). You give the goal
 *  to the manager; it plans with Research and Strategy and names (a "ROLES:" line) the positions the goal needs: only
 *  those are called after. Deliverables are files in the project (marketing/<run>/) and in the asset library
 *  (server/asset-library.mjs: products, image sets, the posts queued for Social Media); the agents post, send and pay for
 *  nothing: the CEO publishes a queued post from the Social panel, on an account saved there (server/social-accounts.mjs).
 *  Each position also learns the office's skills for it (server/skills/marketing/). */
export const MARKETING_ROLES = [
  { id: 'cmo', group: 'mlead', duty: 'Marketing Manager: receives the goal from the CEO, sets the objective, budget split and KPIs, assigns each part to the right position, keeps everyone on one message, and reports to the CEO.' },
  { id: 'research', group: 'mstrategy', duty: 'Market research: the market and its size, competitors, customer segments, insights and the evidence behind them (say what is assumed).' },
  { id: 'strategist', group: 'mstrategy', duty: 'Marketing strategy: positioning, target personas, the customer journey, channel mix, marketing plan and timeline.' },
  { id: 'brand', group: 'mstrategy', duty: 'Brand: brand identity, voice and tone, key messages and the guidelines everyone else must follow.' },
  { id: 'product', group: 'mstrategy', duty: 'Product marketing: value proposition, features turned into benefits, pricing and offer framing, launch plan, sales enablement.' },
  { id: 'content', group: 'mcontent', duty: 'Content strategy: content pillars, the editorial calendar, formats per channel, and the creative brief each producer works from.' },
  { id: 'creator', group: 'mcontent', duty: 'Social content creator: finds the content ideas (angles, hooks, series, trends that fit the brand) from the products in the asset library, writes each social post ready to publish (hook, body, CTA, hashtags, which photo or video goes with it) and hands it to Social Media as a post package in the library\'s bai-dang/.' },
  { id: 'copywriter', group: 'mcontent', duty: 'Copywriting: headlines, ad copy, landing page and website copy, posts, scripts and CTAs, in the brand voice.' },
  { id: 'designer', group: 'mcontent', duty: 'Graphic design: visual concepts, key visuals, layouts and specifications for banners, posts and print (as briefs, mockups or SVG/HTML when possible).' },
  { id: 'motion', group: 'mcontent', duty: 'Video and motion content: short-video ideas, scripts, storyboards, shot lists and editing notes for TikTok, Reels, YouTube.' },
  { id: 'seo', group: 'mchannel', duty: 'SEO: keyword research, search intent, on-page optimisation, content outlines for search, technical SEO checks.' },
  { id: 'ads', group: 'mchannel', duty: 'Performance ads: paid campaigns on Google, Meta, TikTok: structure, audiences, budgets, bids, ad sets and A/B tests. Never spends money.' },
  { id: 'social', group: 'mchannel', duty: 'Social media and publishing: runs the office\'s saved accounts on Facebook, Instagram, Threads, TikTok (and the Shopee / TikTok Shop listings), the posting calendar and the queue of posts in the asset library (bai-dang/): picks the account and time of each post and gets it ready for the CEO to publish with one click; community replies and engagement.' },
  { id: 'email', group: 'mchannel', duty: 'Email and CRM: segments, automated journeys, newsletters, email copy and subject lines, retention and loyalty. Never sends.' },
  { id: 'pr', group: 'mchannel', duty: 'PR and communications: press releases, media list, story angles, crisis lines and Q&A.' },
  { id: 'kol', group: 'mchannel', duty: 'KOL, influencers and affiliates: selection criteria, brief, collaboration plan and costs, partnerships and community.' },
  { id: 'events', group: 'mchannel', duty: 'Events and activation: online and offline events, webinars, promotions and trade marketing, run sheets and checklists.' },
  { id: 'librarian', group: 'massets', duty: 'Asset manager ("Kho dữ liệu"): keeps the asset library in order: the product photos and videos (from the folders the CEO links) filed by category and product, each product\'s facts sheet, the catalogue (kho.md), names without accents, nothing lost or duplicated; tells the others what exists and what is missing.' },
  { id: 'photo', group: 'massets', duty: 'Product photo designer: turns a product\'s photos from the asset library into finished image sets for each platform (Facebook, Instagram, TikTok, Threads posts; Shopee and TikTok Shop listings): crops and sizes to each platform\'s specs, cleans and evens the light, white-background main images, detail and benefit images with short text; saves them by category and product in bo-anh/.' },
  { id: 'editor', group: 'mquality', duty: 'Editor and brand compliance: checks every deliverable for accuracy, brand voice, spelling, claims that cannot be backed and advertising law/platform policy.' },
  { id: 'analytics', group: 'mquality', duty: 'Marketing analytics: KPIs and targets, tracking plan (UTM, pixels, events), dashboards and how results will be measured and reported.' },
];
export const MARKETING_GROUPS = ['mlead', 'mstrategy', 'mcontent', 'mchannel', 'massets', 'mquality'];
// who produces (side by side, each its own files); Social Media comes after the review, to queue what passed (mpublish)
const MK_MAKERS = ['creator', 'copywriter', 'designer', 'photo', 'motion', 'librarian', 'seo', 'ads', 'email', 'pr', 'kol', 'events'];
const MK_POSTS = ['social', 'creator', 'photo'];   // (any of these named: the posts go to Social Media's queue)
export const MARKETING_STAGES = [
  { key: 'mplan', roles: ['cmo', 'research', 'strategist'], always: ['cmo', 'research', 'strategist'], parallel: true, task: 'Plan the goal, each from your own role: read first what the project already holds about the product, the brand and past marketing (README, docs, marketing/). Do not produce the final content in this stage.' },
  { key: 'mstrategy', roles: ['brand', 'product', 'content'], always: ['content'], parallel: true, task: 'Turn the plan into the message and the brief, each from your own role: what we say, to whom, in which voice, in which formats. Do not produce the final content in this stage.' },
  { key: 'mproduce', roles: MK_MAKERS, always: [], parallel: true, task: 'Produce your own deliverables from the plan and the brief, ready to use, as files in marketing/<run>/ (posts, image sets and library work where your role says). Do not post, publish, send or spend anything anywhere.' },
  { key: 'mreview', roles: ['editor', 'analytics'], always: ['editor', 'analytics'], parallel: false, task: 'Review every deliverable from your own role, the post packages in bai-dang/ and the image sets in bo-anh/ included. Fix only small, certain problems (a typo, a wrong link); list the rest. End your report and your answer with a line that is exactly "VERDICT: PASS" when it can be used, or "VERDICT: FAIL" followed by the problems that must be fixed.' },
  { key: 'mpublish', roles: ['social'], always: [], parallel: false, task: 'Get the reviewed posts ready to publish: for each post package of this run in bai-dang/, choose the account (from the saved accounts listed below) and the time for each platform, check the caption fits each platform, set "status": "ready", and write the posting calendar. Do not open a browser and do not post: the CEO publishes each post from the Social panel.' },
];
const MK_FIX = { key: 'mfix', roles: MK_MAKERS, always: [], parallel: true, task: 'Fix every problem the review found in your own deliverables (read its reports).' };
/** The AI Agent teams, and the words of a task that call for each (lower case, Vietnamese and English). Each team runs its
 *  stages (STAGES for the dev team); a new team adds its own roles and stages here, and its room in the office. */
export const TEAMS = [
  { id: 'dev', roles: ROLES.map((r) => r.id), stages: () => STAGES,
    name: 'AI Agent Dev', kind: 'software', plan: 'plan', check: 'verify', fix: () => FIX, fallback: ['frontend', 'backend'],
    words: ['code', 'app', 'web', 'api', 'bug', 'lỗi', 'tính năng', 'feature', 'giao diện', 'ui', 'ux', 'server', 'backend', 'frontend', 'database', 'test', 'build', 'deploy', 'phần mềm', 'software', 'module', 'fix', 'sửa', 'refactor', 'mobile', 'desktop', 'trang', 'màn hình', 'screen', 'dữ liệu', 'data', 'ai', 'agent', 'nhân sự', 'văn phòng', 'office'] },
  { id: 'marketing', roles: MARKETING_ROLES.map((r) => r.id), stages: () => MARKETING_STAGES, lead: 'cmo',
    name: 'AI Agent Marketing', kind: 'marketing', plan: 'mplan', check: 'mreview', fix: () => MK_FIX, fallback: ['creator', 'designer'],
    words: ['marketing', 'quảng cáo', 'quảng bá', 'ads', 'seo', 'content', 'nội dung', 'bài viết', 'bài đăng', 'đăng bài', 'viết bài', 'caption', 'hashtag', 'copywriting', 'slogan', 'thương hiệu', 'brand', 'chiến dịch', 'campaign', 'truyền thông', 'pr', 'thông cáo', 'mạng xã hội', 'social', 'facebook', 'fanpage', 'tiktok', 'instagram', 'threads', 'zalo', 'youtube', 'shopee', 'lazada', 'tiktok shop', 'sàn', 'email marketing', 'newsletter', 'kol', 'koc', 'influencer', 'sự kiện', 'event', 'khuyến mãi', 'ưu đãi', 'promotion', 'ra mắt', 'launch', 'bán hàng', 'doanh số', 'khách hàng', 'thị trường', 'đối thủ', 'landing page', 'tiếp thị', 'livestream', 'sản phẩm', 'ảnh sản phẩm', 'bộ ảnh', 'hình ảnh', 'kho ảnh', 'kho dữ liệu', 'ý tưởng'] },
];
// words that say little about the kind of work ("nhân sự", "dữ liệu"…): half a word when choosing the team
const WEAK = new Set(['nhân sự', 'ai', 'agent', 'data', 'dữ liệu', 'trang', 'văn phòng', 'office', 'sản phẩm', 'hình ảnh', 'ý tưởng', 'khách hàng', 'sàn']);
const ALL_ROLES = [...ROLES, ...MARKETING_ROLES];
const teamOf = (id) => TEAMS.find((t) => t.id === id) || TEAMS[0];
const teamNow = (run) => teamOf(run?.teams?.[run?.ti || 0]);
/** Who leads a team in this run: the Marketing Manager for marketing; for dev, the PM or the CTO the goal went to. */
const leadOf = (run, team = teamNow(run)) => run?.directRole || team.lead || (run?.lead === 'cto' ? 'cto' : 'pm');
const isCheck = (key) => TEAMS.some((t) => checkOf(t) === key);
const fixOf = (team) => team.fix?.() || FIX, checkOf = (team) => team.check || 'verify', fallbackOf = (team) => team.fallback || ['frontend', 'backend'];
const isFix = (key) => TEAMS.some((t) => fixOf(t).key === key);
const isPlan = (key) => TEAMS.some((t) => (t.plan || 'plan') === key);
/** The team(s) a task needs, best first, each with the words that matched; the dev team when none matched. */
export function routeTeams(text) {
  const low = ` ${String(text || '').toLowerCase()} `;
  const hit = (w) => (/^[a-z]+$/.test(w) ? new RegExp(`[^a-z]${w}[^a-z]`).test(low) : low.includes(w));
  const found = TEAMS.map((t) => ({ id: t.id, words: t.words.filter(hit) }));
  const all = found.flatMap((x) => x.words);
  // a word inside a longer one that matched ("dữ liệu" in "kho dữ liệu") is that one's; the vague words count half
  const out = found.map((x) => ({ ...x, words: x.words.filter((w) => !all.some((o) => o !== w && o.length > w.length && o.includes(w) && !x.words.includes(o))) }))
    .map((x) => ({ ...x, score: x.words.reduce((n, w) => n + (WEAK.has(w) ? 0.5 : 1), 0) }))
    .filter((x) => x.words.length).sort((a, b) => b.score - a.score).map(({ id, words }) => ({ id, words }));
  return out.length ? out : [{ id: TEAMS[0].id, words: [] }];
}
/** The stages, in order: their members (always: who is there whatever the goal; maybe: only when the PM named them),
 *  whether they work side by side, and what each must leave behind. */
export const STAGES = [
  { key: 'plan', roles: ['pm', 'po', 'ba'], always: ['pm', 'po', 'ba'], parallel: true, task: 'Plan the goal, each from your own role: read the code that exists first. Do not write product code in this stage.' },
  { key: 'design', roles: ['architect', 'uiux'], always: ['architect'], parallel: true, task: 'Design the solution from the plan, each from your own role. Fit what exists; keep it as simple as the goal allows. Do not write product code in this stage.' },
  { key: 'build', roles: ['frontend', 'backend', 'app', 'ai'], always: [], parallel: false, task: 'Build it: implement your own part of the plan and the design in the code, following the codebase\'s conventions; run the build and the existing tests, and fix what you break.' },
  { key: 'verify', roles: ['qa', 'reviewer', 'security'], always: ['qa', 'reviewer'], parallel: false, task: 'Verify the work from your own role. Fix only small, certain problems in your own field; list the rest. End your report and your answer with a line that is exactly "VERDICT: PASS" when it can ship, or "VERDICT: FAIL" followed by the problems that must be fixed.' },
  { key: 'ship', roles: ['devops', 'database'], always: ['devops'], parallel: false, task: 'Prepare it to ship from your own role. Do not push, publish or deploy anywhere unless the CEO\'s goal explicitly asks for it.' },
];
const FIX = { key: 'fix', roles: ['frontend', 'backend', 'app', 'ai'], always: [], parallel: false, task: 'Fix every problem the verification found in your own part of the code (read its reports), then run the build and the tests again.' };
const REPORT = { key: 'report', roles: [], always: [], parallel: false, task: 'Report to the CEO: read every report of this run and write a short summary: what was delivered, who did what, how it was verified, what is left, risks, and what the CEO should decide next.' };
const MAX_FIXES = 2;
// what each role does in each stage, beyond its duty
const FOCUS = {
  pm: 'Restate the goal and the scope, break it into tasks and assign each to a role. End your report with a line "ROLES: …" naming, from architect, uiux, frontend, backend, app, ai, security, database, only the roles this goal needs (QA, Code Reviewer and DevOps always take part).',
  po: 'Say what value it brings, what is in and out of scope, the priorities, and acceptance criteria for each part.',
  ba: 'Write the user stories, business rules, edge cases and the data needed; answer open questions with the most sensible choice and say so.',
  cto: 'Settle the technical direction: the stack, the main decisions and their trade-offs, the technical risks.',
  architect: 'Give the components and their boundaries, the data model, the APIs and the files to add or change.',
  uiux: 'Give the screens, the flows and their states (empty, loading, error), consistent with what exists.',
  qa: 'Run the tests and add tests for the acceptance criteria; try the edge cases; report each bug with steps to reproduce.',
  reviewer: 'Review the changes: correctness, readability, consistency with the codebase, performance.',
  security: 'Check secrets, input validation, auth, dependencies and data exposure.',
  devops: 'Build and package it, check the configuration and CI, write how to deploy, monitor and roll back.',
  database: 'Check the schema and migrations, indexes, backups and data integrity.',
  cmo: `Restate the goal as a marketing objective with KPIs, target audience, budget split and timeline; break it into tasks and assign each to a position. End your report with a line "ROLES: …" naming, from brand, product, content, ${MK_MAKERS.join(', ')}, social, only the positions this goal needs (Research, Strategist, Content, Editor and Analytics always take part). Posts for social networks: creator writes them, photo makes their images from the asset library, social queues them for the CEO; product images for Shopee / TikTok Shop: photo (with librarian when the products' photos are not filed yet).`,
  creator: 'From the brief and the products in the asset library, list the content ideas worth making (angle, hook, format, platform) and pick the best; write each post in full, ready to publish, one post package per post in bai-dang/<post-id>/ (post.json as your skill says, its images or video copied or referenced from bo-anh/ or san-pham/). Never invent a product fact: take it from thong-tin.md or say what is missing.',
  librarian: 'Scan the folders the CEO linked and the library; file each product\'s originals under san-pham/<category>/<product>/goc/ (copy, never move or delete the CEO\'s files), start a thong-tin.md for each product from what is known, update kho.md (the catalogue: category, product, number of photos/videos, what is missing), and list duplicates or unusable files.',
  photo: 'Make the image sets the goal asks for from the product\'s photos in the library, with the image tools on this computer (sharp in Node, or ffmpeg): sizes and specs per platform as your skill says, saved in bo-anh/<category>/<product>/<platform>-<YYYY-MM-DD>/ with a short README (which file is for what). Check every file opens and has the right size.',
  social: 'Check each post package against each platform\'s rules and limits, give it an account and a time, set "status": "ready" and write the calendar (marketing/<run>/social-calendar.md). Say which accounts are missing (the CEO adds them in the Social panel).',
  research: 'Give the market, competitors, segments and insights this goal rests on; mark what is assumed and how to check it.',
  strategist: 'Give the positioning, personas, customer journey, channel mix and the timeline of the campaign.',
  brand: 'Give the key message, voice and tone, and the do and do not list for everyone producing content.',
  product: 'Give the value proposition, benefits, offer and pricing framing, and the launch angle.',
  content: 'Write the content plan and calendar, and a short creative brief for each position that produces.',
  editor: 'Check accuracy, brand voice, spelling, unbacked claims, advertising law and platform policies.',
  analytics: 'Give KPIs and targets, the tracking plan (UTM, pixels, events) and how to measure and report; check every deliverable is measurable.',
};
const roleOf = (id) => ALL_ROLES.find((r) => r.id === id);
/** The office's own training for a marketing role: server/skills/marketing/_team.md (every position) and <role>.md. */
export const MK_SKILLS_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), 'skills', 'marketing');
export function builtinSkills(role, dir = MK_SKILLS_DIR) {
  if (!MARKETING_ROLES.some((r) => r.id === role)) return '';
  const read = (f) => { try { return fs.readFileSync(path.join(dir, f), 'utf8').trim(); } catch { return ''; } };
  return [read('_team.md'), read(`${role}.md`)].filter(Boolean).join('\n\n');
}
const fileOf = (run, n, key, role) => path.posix.join('.ai-office', 'team', run.id, `${n}-${key}-${role}.md`);

/** The roles the PM named in its plan ("ROLES: frontend, backend"), or null when it named none. */
export function rolesOf(text) {
  const m = /^\s*ROLES?\s*:\s*(.+)$/im.exec(String(text || '')); if (!m) return null;
  const ids = ALL_ROLES.map((r) => r.id), got = m[1].toLowerCase().split(/[\s,;/]+/).map((w) => w.replace(/[^a-z]/g, '')).filter((w) => ids.includes(w));
  return got.length ? [...new Set(got)] : null;
}
/** Who works in a stage of this run: its members always there, and those the PM named (all of them when it named none). */
export function membersOf(run, stage) {
  const team = teamNow(run);
  if (stage.key === 'report') return [leadOf(run, team)];
  const named = run.named, pick = stage.roles.filter((r) => stage.always.includes(r) || !named || named.includes(r));
  if (stage.key === 'plan' && run.lead === 'cto') pick.unshift('cto');
  if (stage.key === 'mpublish') return !named || named.some((r) => MK_POSTS.includes(r)) ? ['social'] : [];   // (posts made: Social Media queues them)
  if ((stage.key === 'mproduce' || stage.key === 'mfix') && !named) return [...fallbackOf(team)];   // (the manager named nobody: those most goals need, not all twelve)
  if (stage.key === 'mproduce' && !pick.length && named.includes('social')) return [];   // (only posts to queue: straight to the review and Social Media)
  if ((stage.key === 'build' || stage.key === 'mproduce' || isFix(stage.key)) && !pick.length) return stage.roles.filter((r) => fallbackOf(team).includes(r));   // (nobody named who makes it: those who make most things)
  return pick;
}

/** What one member's session is told: the team, its own role and only that, the goal, what to read, where to write. */
export function rolePrompt({ run, stage, n, role, mates, lang, earlier, context = '' }) {
  const R = roleOf(role), others = mates.filter((m) => m !== role), team = teamNow(run);
  return [
    `You are the ${role.toUpperCase()} Agent of the "${team.name || team.id}" team (${team.kind || team.id}) in "DT Office". The CEO (the user) gave this goal to the ${leadOf(run, team).toUpperCase()}${(run.teams || []).length > 1 ? ` (teams on it, in order: ${run.teams.join(', ')}; yours now: ${run.teams[run.ti || 0]})` : ''}:`,
    '', `GOAL: ${run.goal}`, '',
    `This session is yours alone: stage ${n} (${stage.key}), running on ${run.agent === 'codex' ? 'Codex CLI' : 'Claude Code'}${run.model ? `, model ${run.model}` : ''}${run.effort ? `, effort ${run.effort}` : ''} (write exactly that in your notes).`,
    `Your role: ${R.duty}`,
    ...(FOCUS[role] ? [`In this stage: ${FOCUS[role]}`] : []),
    `The stage's task: ${stage.task.replace('<run>', run.id)}`,
    ...(team.id === 'marketing' ? [`Put your deliverables (plans, copy, scripts, calendars, briefs, designs) in marketing/${run.id}/ in the project, one file or folder per deliverable, named for your role; post packages, product files and image sets go in the asset library as described below. Do not change the product's code. Never post, publish, send email or messages, or spend any budget, and never log in anywhere or ask for a password: prepare everything ready for the CEO to approve and publish (the CEO publishes a post from the Social panel, on the accounts saved there).`] : []),
    ...(context ? ['', context] : []),
    ...(others.length ? ['', 'Your colleagues in this stage are separate agents, each in its own session. Do not do their work:', ...others.map((m) => `- ${m.toUpperCase()} Agent: ${roleOf(m).duty}`)] : []),
    '',
    ...(earlier.length ? ['Read these reports first (the stages before you, and the colleagues before you in this one):', ...earlier.map((f) => `- ${f}`), ''] : []),
    'Before anything, read the project memory as its CLAUDE.md / AGENTS.md rules say (.ai-office/).',
    `Write your own report to ${fileOf(run, n, stage.key, role)} (create the folders): what you did, decisions, files changed, what the next ones must know. When you are done, add your entry to the project memory as its rules say.`,
    `Write the report and your final answer in ${lang === 'vi' ? 'Vietnamese' : 'English'}. End with a short summary (3–6 lines) of what you did.`,
  ].join('\n');
}
/** The verification's verdict, from its answer or its report: 'pass', 'fail', or '' when it gave none. */
export function verdictOf(text) {
  const m = /VERDICT:\s*(PASS|FAIL)/i.exec(String(text || ''));
  return m ? m[1].toLowerCase() : '';
}

/**
 * @param {{ dataDir: string, lang: () => string, start: (run: object, stage: object, prompt: string, role: string) => { ok: boolean, task?: object, code?: string }, stop: (taskId: string) => void, onChange?: (run: object, what: string, extra?: object) => void, now?: () => number }} o
 * start: one member's session; { ok: false, code: 'busy' } when the office runs as many as it can: it waits its turn.
 */
export function createTeam({ dataDir, lang, start, stop, onChange = () => {}, now = Date.now, context = () => '' }) {
  const file = path.join(dataDir, 'team.json');
  let runs = [], roleSkills = {};
  try { const saved = JSON.parse(fs.readFileSync(path.join(dataDir, 'role-skills.json'), 'utf8')); if (saved && typeof saved === 'object' && !Array.isArray(saved)) roleSkills = Object.fromEntries(Object.entries(saved).filter(([role, text]) => [...ROLES, ...MARKETING_ROLES].some(r => r.id === role) && typeof text === 'string' && text.length <= 20000)); } catch { /* no assignments yet */ }
  try { runs = JSON.parse(fs.readFileSync(file, 'utf8')).runs || []; } catch { /* none yet */ }
  // an office that stopped while a run was going: that run is over
  for (const r of runs) if (r.status === 'run') { r.status = 'stopped'; for (const s of r.stages) { if (s.state === 'run') s.state = 'stopped'; for (const j of s.jobs || []) if (j.state === 'run' || j.state === 'wait') j.state = 'stopped'; } }
  const save = () => { try { fs.mkdirSync(dataDir, { recursive: true }); fs.writeFileSync(file, JSON.stringify({ runs: runs.slice(0, 20) }, null, 1)); } catch { /* best effort */ } };
  const pub = (r) => ({ id: r.id, directRole: r.directRole || '', teams: r.teams || ['dev'], ti: r.ti || 0, dir: r.dir, goal: r.goal, lead: r.lead, agent: r.agent, model: r.model, effort: r.effort, status: r.status, at: r.at, end: r.end || 0, fixes: r.fixes, named: r.named || null,
    stages: r.stages.map(({ key, team, roles, state, verdict, jobs = [] }) => ({ key, team: team || 'dev', roles, state, verdict, jobs: jobs.map(({ role, state: js, verdict: v, summary, held, at }) => ({ role, state: js, verdict: v, summary, held: held || null, at: at || 0 })) })) });
  const end = (r, status, what, extra) => { r.status = status; r.end = now(); save(); onChange(r, what, extra); };

  // the next stage of a run, once the one before it is done
  // the stage after `last` (null: the run is over)
  function stageAfter(r, last) {
    const team = teamNow(r);
    if (r.directRole && last) { end(r, 'done', 'done'); return null; }
    if (r.directRole) return { key: 'direct', roles: [r.directRole], parallel: false };
    if (!last) return teamOf(r.teams?.[0]).stages()[0];
    if (isCheck(last.key) && last.verdict !== 'pass' && r.fixes < MAX_FIXES) { r.fixes++; return fixOf(team); }
    if (isFix(last.key)) return team.stages().find((s) => s.key === checkOf(team));
    if (isCheck(last.key) && last.verdict !== 'pass') return REPORT;   // (still failing after the fixes: nothing shipped, the CEO is told)
    if (last.key === 'report' && (r.ti || 0) + 1 < (r.teams || []).length) { r.ti = (r.ti || 0) + 1; r.fixes = 0; r.named = null; onChange(r, 'team', { team: r.teams[r.ti] }); return teamOf(r.teams[r.ti]).stages()[0]; }   // (the next team, reading what this one left)
    if (last.key === 'report') { end(r, 'done', 'done'); return null; }
    if (last.key === 'ship') return REPORT;
    const st = teamOf(r.teams?.[r.ti || 0]).stages(), i = st.findIndex((s) => s.key === last.key); return st[i + 1] || REPORT;
  }
  function nextStage(r) {
    if (r.status !== 'run') return;
    let last = r.stages.at(-1), stage = null, roles = [];
    for (let k = 0; k < 12; k++) {
      stage = stageAfter(r, last); if (!stage) return;
      roles = r.directRole ? [r.directRole] : membersOf(r, stage);
      if (roles.length || stage.key === 'report') break;
      last = { key: stage.key, verdict: 'pass' };   // (nobody this goal needs in it: the stage after it)
    }
    const n = r.stages.length + 1;
    const s = { key: stage.key, team: r.teams?.[r.ti || 0] || 'dev', n, roles, parallel: stage.parallel, state: 'run', verdict: '', jobs: roles.map((role) => ({ role, state: 'wait', task: null, file: fileOf(r, n, stage.key, role), summary: '', verdict: '' })) };
    r.stages.push(s); save(); onChange(r, 'stage', { stage: s });
    launch(r);
  }
  // start whoever may start now: in a stage side by side, everyone (as the office allows); one after another, the next
  // who holds a member back: the same person at work on another task, or (for the stages that change code) a colleague
  // changing the same project's code for another task
  const EDITS = new Set(['build', 'fix', 'direct']);
  function heldBy(r, s, role) {
    for (const x of runs) {
      if (x === r || x.status !== 'run') continue;
      const xs = x.stages.at(-1); if (!xs) continue;
      for (const j of xs.jobs || []) {
        if (j.state !== 'run') continue;
        if (j.role === role) return { run: x.id, role, why: 'member' };
        if (EDITS.has(s.key) && EDITS.has(xs.key) && x.dir === r.dir) return { run: x.id, role: j.role, why: 'code' };
      }
    }
    return null;
  }
  function launch(r) {
    const s = r.stages.at(-1); if (!s || r.status !== 'run') return;
    const stage = s.key === 'direct' ? { key: 'direct', task: 'Complete this assignment yourself in your role. Do not delegate it or start a team workflow. Create and verify the requested deliverables. Publish only if the CEO explicitly requested publishing.' } : [...teamOf(s.team).stages(), fixOf(teamOf(s.team)), REPORT].find((x) => x.key === s.key);
    for (const j of s.jobs) {
      if (j.state !== 'wait') continue;
      if (!s.parallel && s.jobs.some((x) => x.state === 'run')) return;
      const held = heldBy(r, s, j.role);
      if (held) { if (held.run !== j.held?.run || held.role !== j.held?.role) { j.held = held; save(); onChange(r, 'held', { stage: s, job: j, by: held }); } if (!s.parallel) return; continue; }   // (waits: called once that one is done)
      j.held = null;
      const before = [...r.stages.slice(0, -1).flatMap((x) => (x.jobs || []).filter((y) => y.state === 'done').map((y) => y.file)), ...(s.parallel ? [] : s.jobs.filter((x) => x.state === 'done').map((x) => x.file))];
      const skill = roleSkills[j.role], learned = builtinSkills(j.role);
      let ctx = ''; try { ctx = context(r, j.role, teamOf(s.team)) || ''; } catch { /* the library unreadable: the prompt without it */ }
      const got = start(r, s, rolePrompt({ run: r, stage, n: s.n, role: j.role, mates: s.roles, lang: lang(), earlier: before, context: ctx })
        + (learned ? `\n\nYour training (the office's skills for your role; follow them):\n${learned}` : '')
        + (skill ? `\n\nAssigned role skill (user instructions):\n${skill}\nApply this skill to your role in this task.` : ''), j.role);
      if (!got?.ok && got?.code === 'busy') return;   // (the office is running as many as it can: when one ends)
      if (!got?.ok) { j.state = 'fail'; j.summary = got?.code || 'error'; s.state = 'fail'; end(r, 'fail', 'fail', { code: got?.code }); return; }
      j.task = got.task.id; j.state = 'run'; j.at = now(); save(); onChange(r, 'job', { stage: s, job: j });
      if (!s.parallel) return;
    }
  }
  // every member of a stage done: its verdict, then the next stage
  function stageDone(r, s) {
    s.state = 'done';
    if (isCheck(s.key)) s.verdict = s.jobs.some((x) => x.verdict === 'fail') ? 'fail' : s.jobs.some((x) => x.verdict === 'pass') ? 'pass' : 'fail';   // (one FAIL is enough; nobody saying PASS is no pass)
    save(); onChange(r, 'stageDone', { stage: s });
    nextStage(r);
  }
  // the other tasks, the oldest first: a member just freed goes to whoever waited longest
  function others(r) { for (const x of [...runs].reverse()) if (x !== r && x.status === 'run') launch(x); }
  return {
    ROLES, STAGES, TEAMS, MARKETING_ROLES, MARKETING_STAGES,
    skills: () => ({ ...roleSkills }),
    setSkill(role, content) {
      if (![...ROLES, ...MARKETING_ROLES].some(r => r.id === role) || typeof content !== 'string' || content.length > 20000) return false;
      const next = { ...roleSkills }; if (content.trim()) next[role] = content.trim(); else delete next[role];
      fs.mkdirSync(dataDir, { recursive: true }); fs.writeFileSync(path.join(dataDir, 'role-skills.json'), JSON.stringify(next, null, 2)); roleSkills = next; return true;
    },
    /** Who a session was: { run, role, team } for a member's session, else null (what eats the plan). */
    whoSid(sid) { for (const r of runs) for (const s of r.stages) for (const j of s.jobs || []) if (sid && j.sid === sid) return { run: r.id, role: j.role, team: s.team || 'dev' }; return null; },
    list: () => runs.map(pub),
    get: (id) => { const r = runs.find((x) => x.id === id); return r ? pub(r) : null; },
    /** A goal from the CEO: { dir, goal, lead: 'pm' | 'cto', agent, model, effort, teams } -> { ok, run } | { ok: false, code }.
     *  Tasks run side by side; a member already at work on one is called for another once done (held). */
    begin({ dir, goal, lead = 'pm', agent = 'claude', model = '', effort = '', teams = null, role = '', account }) {
      goal = String(goal || '').trim().slice(0, 4000);
      if (!goal) return { ok: false, code: 'empty' };
      role = String(role || '');
      if (role && ![...ROLES, ...MARKETING_ROLES].some(r => r.id === role)) return { ok: false, code: 'badRole' };
      // Selecting a department manager is a delegation, not a one-person "direct" job.
      const manager = MANAGERS[role];
      if (manager) { lead = role; teams = [manager]; role = ''; }
      const ids = [...new Set((Array.isArray(teams) ? teams : []).filter((x) => TEAMS.some((t) => t.id === x)))];
      const list = role ? [MARKETING_ROLES.some(r => r.id === role) ? 'marketing' : 'dev'] : ids.length ? ids : lead === 'cmo' ? ['marketing'] : [TEAMS[0].id];
      const r = { teams: list, directRole: role, ti: 0, id: `${new Date(now()).toISOString().slice(0, 10)}-${crypto.randomUUID().slice(2, 8)}`, dir, goal, lead: role || teamOf(list[0]).lead || (lead === 'cto' ? 'cto' : 'pm'), agent: agent === 'codex' ? 'codex' : 'claude', model, effort, status: 'run', at: now(), fixes: 0, named: null, stages: [] };
      if (typeof account === 'string') r.account = account;   // account label only; never credentials
      runs.unshift(r); runs = runs.slice(0, 20);
      onChange(r, 'begin');
      nextStage(r);
      return r.status === 'fail' ? { ok: false, code: r.stages[0]?.jobs?.[0]?.summary || 'error' } : { ok: true, run: pub(r) };
    },
    /** A task ended: if it was a member's, its stage goes on; the next stage once all of its members are done. */
    taskDone(t) {
      const r = runs.find((x) => x.stages.some((s) => (s.jobs || []).some((j) => j.task === t.id)));
      if (!r) { others(null); return false; }   // (someone else's task ended: room for a member waiting)
      const s = r.stages.find((x) => (x.jobs || []).some((j) => j.task === t.id)), j = s.jobs.find((x) => x.task === t.id);
      let report = ''; try { report = fs.readFileSync(path.join(r.dir, j.file), 'utf8'); } catch { /* it wrote none */ }
      j.summary = String(t.result || t.error || '').trim().slice(-1200);
      if (t.sid) j.sid = t.sid;
      if (isCheck(s.key)) j.verdict = verdictOf(t.result) || verdictOf(report) || (t.error ? 'fail' : '');
      if (isPlan(s.key) && j.role === (teamOf(s.team).lead || 'pm')) r.named = rolesOf(report) || rolesOf(t.result);   // (the PM's assignment: who works after)
      if (t.stopped || r.status !== 'run') { j.state = 'stopped'; if (r.status === 'run') end(r, 'stopped', 'stopped'); else save(); return true; }
      if (t.error && !t.result) { j.state = 'fail'; s.state = 'fail'; end(r, 'fail', 'fail', { stage: s, job: j }); return true; }
      j.state = 'done'; save(); onChange(r, 'jobDone', { stage: s, job: j });
      if (s.jobs.some((x) => x.state !== 'done')) { launch(r); others(r); return true; }
      stageDone(r, s); others(r);
      return true;
    },
    /** A run stopped (by the CEO, the office closing under it) or failed, carried on where it was: the members of its
     *  stage who hadn't finished start again; those who had keep their work. false when it can't be. */
    resume(id) {
      const r = runs.find((x) => x.id === id && (x.status === 'stopped' || x.status === 'fail')); if (!r) return false;
      r.status = 'run'; r.end = 0;
      const s = r.stages.at(-1);
      if (!s) { save(); onChange(r, 'resume'); nextStage(r); return true; }
      s.state = 'run';
      for (const j of s.jobs || []) if (j.state !== 'done') { j.state = 'wait'; j.task = null; }
      save(); onChange(r, 'resume', { stage: s });
      if (!(s.jobs || []).some((j) => j.state === 'wait')) stageDone(r, s); else launch(r);
      return true;
    },
    /** Stopped by the CEO: every member at work is stopped too. */
    halt(id) {
      const r = runs.find((x) => x.id === id && x.status === 'run'); if (!r) return false;
      const s = r.stages.at(-1);
      if (s) { s.state = 'stopped'; for (const j of s.jobs || []) { if (j.state === 'run' && j.task) stop(j.task); if (j.state === 'run' || j.state === 'wait') j.state = 'stopped'; } }
      end(r, 'stopped', 'stopped'); return true;
    },
  };
}
