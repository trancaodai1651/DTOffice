// The models and effort levels work can be given with (📋 Giao việc): Claude Code's (its --model / --effort, the same
// for every account) and Codex's (the list Codex itself keeps in $CODEX_HOME/models_cache.json, each model with the
// reasoning efforts it takes; `-m` and `-c model_reasoning_effort=`). '' is "the CLI's own default" for both.
import fs from 'node:fs';
import path from 'node:path';

export const CLAUDE_EFFORTS = ['low', 'medium', 'high', 'xhigh', 'max'];
// (aliases would follow the newest model; the full names say which one it is)
export const CLAUDE_MODELS = [
  { id: 'claude-fable-5-1', name: 'Fable 5.1', efforts: CLAUDE_EFFORTS },
  { id: 'claude-opus-5-5', name: 'Opus 5.5', efforts: CLAUDE_EFFORTS },
  { id: 'claude-sonnet-5-5', name: 'Sonnet 5.5', efforts: CLAUDE_EFFORTS },
  { id: 'claude-haiku-5-5', name: 'Haiku 5.5', efforts: CLAUDE_EFFORTS },
];
const CODEX_EFFORTS = ['low', 'medium', 'high', 'xhigh'];

/** Codex's models as Codex lists them (hidden ones left out), newest first as it keeps them; [] when it has no list yet. */
export function codexModels(home) {
  let j;
  try { j = JSON.parse(fs.readFileSync(path.join(home, 'models_cache.json'), 'utf8')); } catch { return []; }
  const list = Array.isArray(j?.models) ? j.models : [];
  return list.filter((m) => m && (m.slug || m.id) && (m.visibility ?? 'list') === 'list').map((m) => {
    const efforts = (m.supported_reasoning_levels || m.supported_reasoning_efforts || []).map((e) => String(e?.effort ?? e)).filter(Boolean);
    return { id: String(m.slug || m.id), name: String(m.display_name || m.slug || m.id), efforts: efforts.length ? efforts : CODEX_EFFORTS, def: m.default_reasoning_level ? String(m.default_reasoning_level) : '' };
  });
}

/** Both lists, for the page: { claude: [...], codex: [...] } (each model: { id, name, efforts, def? }). */
export function agentModels(codexHome) {
  return { claude: CLAUDE_MODELS, codex: codexModels(codexHome) };
}

// what a request may carry: a model and an effort its CLI knows, or nothing (its default). A model name not on the
// list (one set by hand, a newer one) is let through when it looks like one, never anything a command line would read
// as more than a name.
const NAME = /^[A-Za-z0-9][A-Za-z0-9._:[\]-]{0,63}$/;
export function pickRun(agent, { model, effort } = {}, codexHome = '') {
  const list = agent === 'codex' ? codexModels(codexHome) : CLAUDE_MODELS;
  const m = String(model || '').trim(), e = String(effort || '').trim();
  const known = list.find((x) => x.id === m);
  const okModel = !m ? '' : known || NAME.test(m) ? m : '';
  const efforts = known?.efforts || (agent === 'codex' ? [...CODEX_EFFORTS, 'max', 'ultra'] : CLAUDE_EFFORTS);
  return { model: okModel, effort: e && efforts.includes(e) ? e : '' };
}

/** The command-line words for that model and effort. */
export function runArgs(agent, { model = '', effort = '' } = {}) {
  if (agent === 'codex') return [...(model ? ['-m', model] : []), ...(effort ? ['-c', `model_reasoning_effort="${effort}"`] : [])];
  return [...(model ? ['--model', model] : []), ...(effort ? ['--effort', effort] : [])];
}
