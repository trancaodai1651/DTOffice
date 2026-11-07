// "Kho dữ liệu" — the marketing department's asset library and workspace. One folder on this computer (by default
// ~/DT Office/Kho du lieu) that the Asset Manager keeps in order, with:
//   nguon/…            nothing by itself: the folders you link (sources) stay where they are, listed in asset-library.json
//   san-pham/<loại>/<sản phẩm>/goc/        the product's original photos and videos, by category and product
//   bo-anh/<loại>/<sản phẩm>/<nền tảng>-<ngày>/   the image sets the Product Photo agent makes (Facebook, Shopee, TikTok Shop…)
//   bai-dang/<id>/post.json (+ media)     the posts waiting for the CEO to publish (social-accounts.mjs opens them)
//   marketing/<run>/                     what each marketing run delivers (server/team.mjs)
// The marketing team works in this folder when its task has no project of its own. Nothing here is uploaded anywhere.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';

export const IMAGE = /\.(jpe?g|png|webp|gif|heic|heif|avif|bmp|tiff?)$/i;
export const VIDEO = /\.(mp4|mov|m4v|webm|mkv|avi)$/i;
export const PLATFORMS = ['facebook', 'instagram', 'threads', 'tiktok', 'shopee', 'tiktokshop', 'zalo'];
const FOLDERS = ['san-pham', 'bo-anh', 'bai-dang', 'marketing'];
const README = `# Kho dữ liệu Marketing · DT Office

Thư mục làm việc của Đội AI Agent Marketing. Quản lý kho (Asset Manager Agent) giữ cấu trúc này:

- \`san-pham/<loại-sản-phẩm>/<tên-sản-phẩm>/goc/\` — ảnh, video gốc của sản phẩm (bạn chép vào, hoặc liên kết thư mục nguồn trong DT Office).
- \`san-pham/<loại>/<sản-phẩm>/thong-tin.md\` — thông tin sản phẩm: tên, giá, chất liệu, kích thước, điểm nổi bật (chỉ ghi điều có thật).
- \`bo-anh/<loại>/<sản-phẩm>/<nền-tảng>-<YYYY-MM-DD>/\` — bộ ảnh đã làm cho từng nền tảng (Facebook, Instagram, TikTok, Shopee, TikTok Shop).
- \`bai-dang/<mã-bài>/post.json\` — bài chờ CEO duyệt và đăng (Content Creator viết, Social Media xếp lịch).
- \`marketing/<lượt>/\` — kết quả từng lượt giao việc cho đội.
- \`kho.md\` — danh mục kho do Asset Manager cập nhật.

Tên thư mục: chữ thường, không dấu, nối bằng gạch ngang (ví dụ \`ao-thun\`, \`ao-thun-basic-trang\`).
`;

/** A folder's name as the library writes it: lower case, no accents, words joined by "-". */
export function slug(text) {
  return String(text || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);
}

// the files under a folder, counted (images, videos), at most `cap` entries looked at and `depth` levels down
function count(dir, depth = 4, cap = 4000) {
  const out = { images: 0, videos: 0, files: 0 }; let seen = 0;
  const walk = (d, n) => {
    let list = []; try { list = fs.readdirSync(d, { withFileTypes: true }); } catch { return; }
    for (const e of list) {
      if (++seen > cap) return;
      if (e.name.startsWith('.')) continue;
      if (e.isDirectory()) { if (n > 0) walk(path.join(d, e.name), n - 1); continue; }
      out.files++; if (IMAGE.test(e.name)) out.images++; else if (VIDEO.test(e.name)) out.videos++;
    }
  };
  walk(dir, depth);
  return out;
}
const dirsIn = (d) => { try { return fs.readdirSync(d, { withFileTypes: true }).filter((e) => e.isDirectory() && !e.name.startsWith('.')).map((e) => e.name).sort(); } catch { return []; } };
const isDir = (d) => { try { return fs.statSync(d).isDirectory(); } catch { return false; } };

/** A post in bai-dang/<id>/post.json, as the page shows it; null when it can't be read. */
export function readPost(root, id) {
  if (!/^[\w.-]{1,80}$/.test(String(id || ''))) return null;
  const dir = path.join(root, 'bai-dang', id);
  let p; try { p = JSON.parse(fs.readFileSync(path.join(dir, 'post.json'), 'utf8')); } catch { return null; }
  if (!p || typeof p !== 'object') return null;
  const platforms = (Array.isArray(p.platforms) ? p.platforms : [p.platform]).map((x) => String(x || '').toLowerCase().replace(/[^a-z]/g, '')).filter((x) => PLATFORMS.includes(x));
  // A library can move between Windows and macOS/Linux: reject absolute paths from either syntax on every host.
  const media = (Array.isArray(p.media) ? p.media : []).map(String).filter((m) => m && !path.posix.isAbsolute(m) && !path.win32.isAbsolute(m) && !/^[a-z]:/i.test(m) && !m.split(/[\\/]/).includes('..')).slice(0, 40);
  const tags = (Array.isArray(p.hashtags) ? p.hashtags : []).map(String).slice(0, 30);
  return { id, dir, title: String(p.title || id).slice(0, 200), product: String(p.product || '').slice(0, 200), caption: String(p.caption || '').slice(0, 5000), hashtags: tags,
    platforms, accounts: p.accounts && typeof p.accounts === 'object' ? Object.fromEntries(Object.entries(p.accounts).map(([k, v]) => [k, String(v)])) : {},
    media, when: String(p.when || p.schedule || '').slice(0, 40), status: ['draft', 'proposed', 'ready', 'posted'].includes(p.status) ? p.status : 'ready',
    // the publisher's proposed times ("proposed": waiting for the CEO to approve one; approving makes the post "ready")
    proposals: (Array.isArray(p.proposals) ? p.proposals : []).filter((x) => x && typeof x === 'object').map((x) => ({ when: String(x.when || '').slice(0, 40), why: String(x.why || '').slice(0, 300) })).filter((x) => x.when).slice(0, 5),
    approved: p.approved && typeof p.approved === 'object' ? { when: String(p.approved.when || '').slice(0, 40), at: String(p.approved.at || '').slice(0, 40) } : null,
    posted: p.posted && typeof p.posted === 'object' ? p.posted : {}, link: String(p.link || '').slice(0, 500) };
}
/** The text to paste: the caption and its hashtags. */
export const postText = (p) => [p.caption, p.hashtags.length ? p.hashtags.map((h) => (h.startsWith('#') ? h : `#${h}`)).join(' ') : ''].filter(Boolean).join('\n\n');

/**
 * @param {{ dataDir: string, home?: string, now?: () => number }} o
 */
export function createLibrary({ dataDir, home = os.homedir(), now = Date.now }) {
  const file = path.join(dataDir, 'asset-library.json');
  let st = { root: '', sources: [] };
  try { const j = JSON.parse(fs.readFileSync(file, 'utf8')); if (j && typeof j === 'object') st = { root: typeof j.root === 'string' ? j.root : '', sources: Array.isArray(j.sources) ? j.sources.filter((s) => s && typeof s.dir === 'string') : [] }; } catch { /* first time */ }
  const save = () => { try { fs.mkdirSync(dataDir, { recursive: true }); fs.writeFileSync(file, JSON.stringify(st, null, 1)); } catch { /* best effort */ } };
  const root = () => st.root || path.join(home, 'DT Office', 'Kho du lieu');
  /** The library's folders, made when missing; its path. */
  function ensure() {
    const r = root();
    try {
      for (const f of FOLDERS) fs.mkdirSync(path.join(r, f), { recursive: true });
      const readme = path.join(r, 'README.md'); if (!fs.existsSync(readme)) fs.writeFileSync(readme, README);
    } catch { /* a drive gone: out() says so */ }
    return r;
  }
  function out() {
    const r = root(), here = isDir(r);
    const categories = here ? dirsIn(path.join(r, 'san-pham')).map((c) => ({ name: c, products: dirsIn(path.join(r, 'san-pham', c)).slice(0, 200).map((p) => ({ name: p, ...count(path.join(r, 'san-pham', c, p), 3, 1500) })) })) : [];
    const sets = here ? dirsIn(path.join(r, 'bo-anh')).map((c) => ({ name: c, products: dirsIn(path.join(r, 'bo-anh', c)).map((p) => ({ name: p, sets: dirsIn(path.join(r, 'bo-anh', c, p)) })) })) : [];
    const posts = here ? dirsIn(path.join(r, 'bai-dang')).map((id) => readPost(r, id)).filter(Boolean).map(({ dir, ...p }) => p).reverse().slice(0, 100) : [];
    const sources = st.sources.map((s) => ({ ...s, here: isDir(s.dir), ...(isDir(s.dir) ? count(s.dir, 3, 2000) : { images: 0, videos: 0, files: 0 }) }));
    return { root: r, here, custom: !!st.root, sources, categories, sets, posts };
  }
  return {
    root, ensure, out,
    /** Where the library lives: a folder you pick ('' = the default). */
    setRoot(dir) {
      dir = String(dir || '').trim().replace(/^~(?=$|[\\/])/, home);
      if (dir && !path.isAbsolute(dir)) return { ok: false, code: 'badDir' };
      st.root = dir ? path.resolve(dir) : ''; save(); ensure(); return { ok: true };
    },
    /** A folder of yours that holds product photos or videos, linked (not copied): { dir, name, category, product }. */
    addSource({ dir, name = '', category = '', product = '' }) {
      dir = path.resolve(String(dir || '').trim().replace(/^~(?=$|[\\/])/, home));
      if (!String(dir).trim() || !isDir(dir)) return { ok: false, code: 'noDir' };
      if (st.sources.some((s) => path.resolve(s.dir) === dir)) return { ok: false, code: 'dup' };
      if (st.sources.length >= 100) return { ok: false, code: 'full' };
      const s = { id: crypto.randomUUID().slice(0, 8), dir, name: String(name || path.basename(dir)).slice(0, 80), category: slug(category), product: slug(product), at: now() };
      st.sources.push(s); save(); return { ok: true, source: s };
    },
    removeSource(id) { const n = st.sources.length; st.sources = st.sources.filter((s) => s.id !== id); save(); return n !== st.sources.length; },
    /** A folder in the library ('', 'san-pham', 'bo-anh', 'bai-dang' or one of their sub-folders) or a source's, to open. */
    target(what = '') {
      const src = st.sources.find((s) => s.id === what); if (src) return src.dir;
      const rel = String(what || '').replace(/\\/g, '/');
      if (rel.split('/').includes('..')) return null;
      const r = ensure(), p = path.resolve(r, rel);
      return p === r || p.startsWith(r + path.sep) ? (isDir(p) ? p : null) : null;
    },
    post: (id) => readPost(ensure(), id),
    /** A post published on one platform (or every one): written back into its post.json. */
    markPosted(id, platform = '', link = '') {
      const r = ensure(), p = readPost(r, id); if (!p) return false;
      let raw; try { raw = JSON.parse(fs.readFileSync(path.join(p.dir, 'post.json'), 'utf8')); } catch { return false; }
      raw.posted = { ...(raw.posted && typeof raw.posted === 'object' ? raw.posted : {}) };
      for (const pf of platform ? [platform] : p.platforms) raw.posted[pf] = new Date(now()).toISOString();
      if (link) raw.link = String(link).slice(0, 500);
      if (p.platforms.every((pf) => raw.posted[pf])) raw.status = 'posted';
      try { fs.writeFileSync(path.join(p.dir, 'post.json'), JSON.stringify(raw, null, 2)); return true; } catch { return false; }
    },
    /** The CEO approves a proposed post's time (one of the proposals, or a time of their own: "YYYY-MM-DD HH:mm"): the post
     *  is then "ready" to publish. false when the post can't be read or the time is not a time. */
    approve(id, when = '') {
      const r = ensure(), p = readPost(r, id); if (!p || p.status === 'posted') return false;
      const t = String(when || p.when || p.proposals[0]?.when || '').trim();
      if (!/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}$/.test(t)) return false;
      let raw; try { raw = JSON.parse(fs.readFileSync(path.join(p.dir, 'post.json'), 'utf8')); } catch { return false; }
      raw.when = t.replace('T', ' '); raw.status = 'ready'; raw.approved = { when: raw.when, at: new Date(now()).toISOString() };
      try { fs.writeFileSync(path.join(p.dir, 'post.json'), JSON.stringify(raw, null, 2)); return true; } catch { return false; }
    },
    /** What a marketing agent is told about the library: where things are, the folders you linked, what is in stock. */
    brief() {
      const o = out(), lines = [`ASSET LIBRARY ("Kho dữ liệu"): ${o.root}`,
        '- Product originals: san-pham/<category>/<product>/goc/ (facts: san-pham/<category>/<product>/thong-tin.md). Image sets: bo-anh/<category>/<product>/<platform>-<YYYY-MM-DD>/. Posts waiting for the CEO: bai-dang/<post-id>/post.json. Catalogue: kho.md. Folder names: lower case, no accents, words joined by "-".'];
      if (o.sources.length) lines.push('- Folders the CEO linked (read them, never move or delete their files):', ...o.sources.slice(0, 30).map((s) => `  - ${s.dir}${s.category ? ` (category ${s.category}${s.product ? `, product ${s.product}` : ''})` : ''}: ${s.here ? `${s.images} images, ${s.videos} videos` : 'NOT FOUND now'}`));
      if (o.categories.length) lines.push(`- In stock: ${o.categories.slice(0, 30).map((c) => `${c.name} (${c.products.map((p) => p.name).slice(0, 12).join(', ') || 'no product yet'})`).join('; ')}`);
      else lines.push('- No product in san-pham/ yet.');
      const waiting = o.posts.filter((p) => p.status !== 'posted').length;
      lines.push(`- Posts waiting in bai-dang/: ${waiting}.`);
      return lines.join('\n');
    },
  };
}
