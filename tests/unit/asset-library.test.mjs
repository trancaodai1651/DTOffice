// The marketing department's asset library (server/asset-library.mjs) and the Social Media agent's accounts
// (server/social-accounts.mjs): folders made and linked, products and posts read, a post published with the CEO.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createLibrary, postText, readPost, slug } from '../../server/asset-library.mjs';
import { createSocial, SITES } from '../../server/social-accounts.mjs';

const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'office-lib-'));

test('the library: made where it belongs, folders linked, products counted, posts read', () => {
  const home = tmp(), dataDir = tmp(), photos = tmp();
  try {
    const lib = createLibrary({ dataDir, home });
    const root = lib.ensure();
    assert.equal(root, path.join(home, 'DT Office', 'Kho du lieu'));
    for (const f of ['san-pham', 'bo-anh', 'bai-dang', 'marketing', 'README.md']) assert.ok(fs.existsSync(path.join(root, f)), f);
    fs.writeFileSync(path.join(photos, 'a.jpg'), 'x'); fs.writeFileSync(path.join(photos, 'b.PNG'), 'x'); fs.writeFileSync(path.join(photos, 'c.mp4'), 'x');
    const added = lib.addSource({ dir: photos, category: 'Áo thun', product: 'Áo thun basic trắng' });
    assert.equal(added.ok, true); assert.equal(added.source.category, 'ao-thun'); assert.equal(added.source.product, 'ao-thun-basic-trang');
    assert.equal(lib.addSource({ dir: photos }).code, 'dup');
    assert.equal(lib.addSource({ dir: path.join(photos, 'nope') }).code, 'noDir');
    const goc = path.join(root, 'san-pham', 'ao-thun', 'ao-thun-basic-trang', 'goc'); fs.mkdirSync(goc, { recursive: true });
    fs.writeFileSync(path.join(goc, '1.jpg'), 'x'); fs.writeFileSync(path.join(goc, '2.mov'), 'x');
    const post = path.join(root, 'bai-dang', '20261106-ao-thun-facebook-1'); fs.mkdirSync(post, { recursive: true });
    fs.writeFileSync(path.join(post, 'post.json'), JSON.stringify({ title: 'Áo', caption: 'Mát cả ngày', hashtags: ['aothun', '#basic'], platforms: ['facebook', 'Threads', 'myspace'], media: ['01.jpg', '../../secret', 'C:/x.jpg'], status: 'ready' }));
    const out = createLibrary({ dataDir, home }).out();   // (kept across restarts)
    assert.equal(out.sources.length, 1); assert.equal(out.sources[0].images, 2); assert.equal(out.sources[0].videos, 1);
    assert.deepEqual(out.categories, [{ name: 'ao-thun', products: [{ name: 'ao-thun-basic-trang', images: 1, videos: 1, files: 2 }] }]);
    assert.equal(out.posts.length, 1);
    assert.deepEqual(out.posts[0].platforms, ['facebook', 'threads'], 'only the platforms the office knows');
    assert.deepEqual(out.posts[0].media, ['01.jpg'], 'no path out of the post folder');
    assert.equal(postText(out.posts[0]), 'Mát cả ngày\n\n#aothun #basic');
    assert.match(lib.brief(), /ao-thun \(ao-thun-basic-trang\)/);
    assert.match(lib.brief(), /2 images, 1 videos/);
    assert.equal(lib.markPosted('20261106-ao-thun-facebook-1', 'facebook'), true);
    assert.equal(readPost(root, '20261106-ao-thun-facebook-1').status, 'ready', 'one platform of two');
    lib.markPosted('20261106-ao-thun-facebook-1', 'threads');
    assert.equal(readPost(root, '20261106-ao-thun-facebook-1').status, 'posted');
    assert.equal(readPost(root, '../etc'), null);
    assert.equal(lib.target('../..'), null, 'never a folder outside the library');
    assert.equal(lib.target('bo-anh'), path.join(root, 'bo-anh'));
    assert.equal(lib.target(added.source.id), photos);
    assert.equal(lib.removeSource(added.source.id), true);
    assert.equal(lib.setRoot('relative/dir').code, 'badDir');
  } finally { for (const d of [home, dataDir, photos]) fs.rmSync(d, { recursive: true, force: true }); }
});

test('folder names without accents', () => {
  assert.equal(slug('Đầm Maxi Hoa Nhí'), 'dam-maxi-hoa-nhi');
  assert.equal(slug('  Áo thun / basic  '), 'ao-thun-basic');
});

test('social accounts: each in its own browser profile, logged in by the CEO, no password kept', () => {
  const dataDir = tmp(), launched = [];
  try {
    const social = createSocial({ dataDir, browser: () => 'C:/edge.exe', launch: (exe, args) => { launched.push([exe, ...args]); return true; } });
    assert.equal(social.add({ platform: 'myspace', label: 'x' }).code, 'badPlatform');
    assert.equal(social.add({ platform: 'facebook', label: ' ' }).code, 'noLabel');
    const a = social.add({ platform: 'facebook', label: 'Fanpage A' }).account, b = social.add({ platform: 'facebook', label: 'Fanpage B' }).account;
    const t = social.add({ platform: 'threads', label: 'Shop' }).account;
    assert.notEqual(a.id, b.id, 'two accounts on one platform side by side');
    assert.equal(social.login(a.id).ok, true);
    assert.ok(launched[0].includes(`--user-data-dir=${path.join(dataDir, 'social-profiles', a.id)}`), 'its own profile');
    assert.ok(launched[0].includes(SITES.facebook.login));
    social.login(b.id);
    assert.notEqual(launched[0].find((x) => x.startsWith('--user-data-dir')), launched[1].find((x) => x.startsWith('--user-data-dir')), 'never the same browser profile');
    assert.equal(social.publish(t.id, 'Xin chào #shop').ok, true);
    assert.ok(launched.at(-1).at(-1).startsWith('https://www.threads.net/intent/post?text=Xin%20ch'), 'Threads gets the text');
    const again = createSocial({ dataDir, browser: () => 'C:/edge.exe', launch: () => true });
    assert.equal(again.list().length, 3); assert.equal(again.list().find((x) => x.id === a.id).loggedIn, true);
    const saved = fs.readFileSync(path.join(dataDir, 'social-accounts.json'), 'utf8');
    assert.doesNotMatch(saved, /password|cookie|token/i);
    assert.equal(again.remove(a.id), true);
    assert.equal(fs.existsSync(path.join(dataDir, 'social-profiles', a.id)), false, 'its login deleted with it');
    assert.equal(createSocial({ dataDir, browser: () => null }).login(b.id).code, 'noBrowser');
  } finally { fs.rmSync(dataDir, { recursive: true, force: true }); }
});
