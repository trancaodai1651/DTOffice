// The Social Media agent's accounts: each social or shop account you add (Facebook, Instagram, Threads, TikTok, Shopee,
// TikTok Shop, Zalo) gets a browser profile of its own on this computer (data/social-profiles/<id>), opened in the
// computer's Edge or Chrome. You log in there yourself, once: the profile keeps the login, so many accounts stay signed in
// side by side and never mix. The office stores no password, cookie or token itself — only the account's name, platform
// and its profile folder.
// Publishing a post (asset-library.mjs bai-dang/) is done with you: "Đăng" opens that account's posting page, the caption
// goes to your clipboard (the page copies it) and the post's media folder opens, ready to drop in. Threads gets the text
// filled in. Nothing is posted without you pressing the platform's own Post button: the platforms forbid automated posting.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawn } from 'node:child_process';
import { findBrowser } from './specialists.mjs';
import { PLATFORMS } from './asset-library.mjs';

export const SITES = {
  facebook: { login: 'https://www.facebook.com/login', post: () => 'https://www.facebook.com/', home: 'https://www.facebook.com/' },
  instagram: { login: 'https://www.instagram.com/accounts/login/', post: () => 'https://www.instagram.com/', home: 'https://www.instagram.com/' },
  threads: { login: 'https://www.threads.net/login', post: (text) => `https://www.threads.net/intent/post?text=${encodeURIComponent(String(text || '').slice(0, 500))}`, home: 'https://www.threads.net/' },
  tiktok: { login: 'https://www.tiktok.com/login', post: () => 'https://www.tiktok.com/tiktokstudio/upload', home: 'https://www.tiktok.com/' },
  shopee: { login: 'https://banhang.shopee.vn/', post: () => 'https://banhang.shopee.vn/portal/product/new', home: 'https://banhang.shopee.vn/' },
  tiktokshop: { login: 'https://seller-vn.tiktok.com/', post: () => 'https://seller-vn.tiktok.com/product/create', home: 'https://seller-vn.tiktok.com/' },
  zalo: { login: 'https://oa.zalo.me/', post: () => 'https://oa.zalo.me/', home: 'https://oa.zalo.me/' },
};

/**
 * @param {{ dataDir: string, browser?: () => string|null, launch?: (exe: string, args: string[]) => boolean, now?: () => number }} o
 */
export function createSocial({ dataDir, browser = findBrowser, launch, now = Date.now }) {
  const file = path.join(dataDir, 'social-accounts.json'), profiles = path.join(dataDir, 'social-profiles');
  let accounts = [];
  try { const j = JSON.parse(fs.readFileSync(file, 'utf8')); accounts = (Array.isArray(j?.accounts) ? j.accounts : []).filter((a) => a && /^[a-f0-9]{8}$/.test(a.id) && PLATFORMS.includes(a.platform)); } catch { /* none yet */ }
  const save = () => { try { fs.mkdirSync(dataDir, { recursive: true }); fs.writeFileSync(file, JSON.stringify({ accounts }, null, 1)); } catch { /* best effort */ } };
  const run = launch || ((exe, args) => { try { spawn(exe, args, { stdio: 'ignore', detached: true, windowsHide: false }).unref(); return true; } catch { return false; } });
  const profileOf = (id) => path.join(profiles, id);
  // that account's own browser window on a page
  function open(a, url) {
    const exe = browser(); if (!exe) return { ok: false, code: 'noBrowser' };
    fs.mkdirSync(profileOf(a.id), { recursive: true });
    const ok = run(exe, [`--user-data-dir=${profileOf(a.id)}`, '--no-first-run', '--no-default-browser-check', '--new-window', url]);
    return ok ? { ok: true } : { ok: false, code: 'noBrowser' };
  }
  const pub = (a) => ({ id: a.id, platform: a.platform, label: a.label, note: a.note || '', at: a.at, used: a.used || 0, loggedIn: !!a.loggedIn });
  return {
    PLATFORMS, SITES,
    list: () => accounts.map(pub),
    /** An account: its platform and a name you know it by (the page name, the shop's name…). */
    add({ platform, label, note = '' }) {
      platform = String(platform || '').toLowerCase();
      if (!PLATFORMS.includes(platform)) return { ok: false, code: 'badPlatform' };
      label = String(label || '').trim().slice(0, 80); if (!label) return { ok: false, code: 'noLabel' };
      if (accounts.length >= 60) return { ok: false, code: 'full' };
      const a = { id: crypto.randomBytes(4).toString('hex'), platform, label, note: String(note || '').slice(0, 200), at: now() };
      accounts.push(a); save(); return { ok: true, account: pub(a) };
    },
    /** Taken off, its browser profile (and the login kept in it) deleted from this computer. */
    remove(id) {
      const a = accounts.find((x) => x.id === id); if (!a) return false;
      accounts = accounts.filter((x) => x !== a); save();
      try { fs.rmSync(profileOf(a.id), { recursive: true, force: true }); } catch { /* the browser still has it open: gone next time */ }
      return true;
    },
    /** Its browser window on the login page: you sign in there, the profile keeps it. */
    login(id) { const a = accounts.find((x) => x.id === id); if (!a) return { ok: false, code: 'noAccount' }; const r = open(a, SITES[a.platform].login); if (r.ok) { a.loggedIn = true; save(); } return r; },
    /** Its browser window on its home page (to check, reply to comments…). */
    visit(id) { const a = accounts.find((x) => x.id === id); if (!a) return { ok: false, code: 'noAccount' }; return open(a, SITES[a.platform].home); },
    /** A post, on that account: its posting page opened (Threads with the text in). The caller copies the text and opens the media. */
    publish(id, text) {
      const a = accounts.find((x) => x.id === id); if (!a) return { ok: false, code: 'noAccount' };
      const r = open(a, SITES[a.platform].post(text)); if (r.ok) { a.used = now(); save(); }
      return { ...r, platform: a.platform };
    },
  };
}
