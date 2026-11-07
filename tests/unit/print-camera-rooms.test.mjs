// The print room and the camera room (server/print-farm.mjs, server/cameras.mjs, server/lan-proto.mjs): the LAN
// protocols' pieces, the filament stock, the printers (with stand-in links), a Dahua camera behind Digest auth.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import net from 'node:net';
import crypto from 'node:crypto';
import { crc32, digestHeader, digestGet, isLanHost, mqttConnect, mqttParse, mqttPublish, mqttMessage, mqttLength } from '../../server/lan-proto.mjs';
import { bambuState, createPrintFarm, ffPackets, ffTcp, flashforgeHttpState, flashforgeTcpState } from '../../server/print-farm.mjs';
import { createCameras } from '../../server/cameras.mjs';
import { createLibrary, readPost } from '../../server/asset-library.mjs';

const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'office-rooms-'));
const listen = (srv) => new Promise((r) => srv.listen(0, '127.0.0.1', () => r(srv.address().port)));

test('MQTT packets: lengths, CONNECT, PUBLISH, and a stream split into packets', () => {
  assert.deepEqual([...mqttLength(0)], [0]); assert.deepEqual([...mqttLength(127)], [127]); assert.deepEqual([...mqttLength(128)], [0x80, 1]); assert.deepEqual([...mqttLength(16384)], [0x80, 0x80, 1]);
  const c = mqttConnect({ clientId: 'x', username: 'bblp', password: '12345678' });
  assert.equal(c[0], 0x10); assert.equal(c.subarray(4, 8).toString(), 'MQTT'); assert.equal(c[9], 0xc2, 'user + password + clean session');
  const big = mqttPublish('device/SN/report', { print: { gcode_state: 'RUNNING', mc_percent: 42, pad: 'x'.repeat(300) } });
  const two = Buffer.concat([big, mqttPublish('a', 'b')]);
  const half = mqttParse(two.subarray(0, 50));
  assert.equal(half.packets.length, 0, 'an incomplete packet waits'); assert.equal(half.rest.length, 50);
  const all = mqttParse(two);
  assert.equal(all.packets.length, 2); assert.equal(all.rest.length, 0);
  const m = mqttMessage(all.packets[0]);
  assert.equal(m.topic, 'device/SN/report'); assert.equal(JSON.parse(m.payload).print.mc_percent, 42);
});

test('Digest auth (RFC 2617 example), Basic, CRC-32 and LAN addresses', () => {
  const h = digestHeader({ challenge: 'Digest realm="testrealm@host.com", qop="auth,auth-int", nonce="dcd98b7102dd2f0e8b11d0f600bfb0c093", opaque="5ccc069c403ebaf9f0171e9517f40e41"', uri: '/dir/index.html', user: 'Mufasa', pass: 'Circle Of Life', cnonce: '0a4f113b' });
  assert.match(h, /response="6629fae49393a05397450978507c4ef1"/);
  assert.match(h, /qop=auth, nc=00000001, cnonce="0a4f113b"/);
  assert.equal(digestHeader({ challenge: 'Basic realm="x"', uri: '/', user: 'a', pass: 'b' }), `Basic ${Buffer.from('a:b').toString('base64')}`);
  assert.equal(crc32(Buffer.from('123456789')), 0xcbf43926);
  for (const ok of ['192.168.1.50', '10.0.0.2', '172.16.5.1', '172.31.0.1', '169.254.1.1', '127.0.0.1', 'printer.local']) assert.equal(isLanHost(ok), true, ok);
  for (const no of ['8.8.8.8', '172.32.0.1', 'example.com', '192.168.1.300', '', 'http://192.168.1.2']) assert.equal(isLanHost(no), false, no);
});

test('each printer kind\'s report, as one state', () => {
  assert.deepEqual(bambuState({ gcode_state: 'RUNNING', mc_percent: 37, mc_remaining_time: 52, subtask_name: 'gear', nozzle_temper: 220.4, bed_temper: 60, layer_num: 12, total_layer_num: 80 }),
    { state: 'printing', percent: 37, left: 52, file: 'gear', nozzle: 220.4, bed: 60, layer: 12, layers: 80, error: '' });
  assert.equal(bambuState({ gcode_state: 'IDLE' }).state, 'free');
  assert.equal(bambuState({ gcode_state: 'FINISH', mc_percent: 100 }).state, 'done');
  assert.equal(bambuState({ gcode_state: 'PAUSE' }).state, 'paused');
  const ff = flashforgeHttpState({ status: 'printing', printProgress: 0.534, printFileName: 'box.gcode', estimatedTime: 1800 });
  assert.equal(ff.state, 'printing'); assert.equal(ff.percent, 53.4); assert.equal(ff.left, 30); assert.equal(ff.file, 'box.gcode');
  assert.equal(flashforgeHttpState({ status: 'ready' }).state, 'free');
  const tcp = flashforgeTcpState('CMD M119 Received.\r\nMachineStatus: BUILDING_FROM_SD\r\nCurrentFile: cup.gx\r\nok\r\n', 'CMD M27 Received.\r\nSD printing byte 37/100\r\nok\r\n');
  assert.equal(tcp.state, 'printing'); assert.equal(tcp.percent, 37); assert.equal(tcp.file, 'cup.gx');
  assert.equal(flashforgeTcpState('MachineStatus: READY').state, 'free');
});

test('Flashforge TCP: each command answered up to its "ok"; the file sent in 4096-byte packets with a CRC', async () => {
  const got = [];
  const srv = net.createServer((s) => {
    let buf = Buffer.alloc(0);
    s.on('data', (d) => {
      buf = Buffer.concat([buf, d]);
      for (;;) {
        if (buf.length >= 4 && buf.readUInt32BE(0) === 0x5a5aa5a5) { if (buf.length < 16 + 4096) return; got.push(['packet', buf.readUInt32BE(4), buf.readUInt32BE(8)]); buf = buf.subarray(16 + 4096); continue; }
        const i = buf.indexOf('\r\n'); if (i < 0) return;
        const line = buf.subarray(0, i).toString(); buf = buf.subarray(i + 2); got.push(line);
        s.write(line.startsWith('~M119') ? 'CMD M119 Received.\r\nMachineStatus: READY\r\nok\r\n' : `CMD ${line.slice(1, 5)} Received.\r\nok\r\n`);
      }
    });
  });
  const port = await listen(srv);
  try {
    const out = await ffTcp('127.0.0.1', [{ cmd: '~M601 S1' }, { cmd: '~M119' }], { port });
    assert.equal(out.length, 2); assert.match(out[1], /MachineStatus: READY/);
    const data = crypto.randomBytes(5000), packets = ffPackets(data);
    assert.equal(packets.length, 2 * (16 + 4096)); assert.equal(packets.readUInt32BE(12), crc32(data.subarray(0, 4096)));
    await ffTcp('127.0.0.1', [{ cmd: `~M28 ${data.length} 0:/user/a.gcode` }, { cmd: '~M29', pre: packets }, { cmd: '~M23 0:/user/a.gcode' }], { port });
    assert.deepEqual(got.slice(2), ['~M28 5000 0:/user/a.gcode', ['packet', 0, 4096], ['packet', 1, 904], '~M29', '~M23 0:/user/a.gcode']);
  } finally { srv.close(); }
});

test('the filament stock: added, the same kind merged, used down to 0, removed', () => {
  const farm = createPrintFarm({ dataDir: tmp() });
  assert.equal(farm.addFilament({ material: 'PLA', brand: 'Bambu Lab' }).code, 'missing');
  assert.equal(farm.addFilament({ material: 'PLA', brand: 'Bambu Lab', color: 'Đen', qty: -1 }).code, 'badQty');
  const a = farm.addFilament({ material: 'PLA', brand: 'Bambu Lab', color: 'Đen', hex: '#111111', qty: 3, weight: 1000 });
  assert.equal(a.ok, true); assert.equal(a.filament.hex, '#111111');
  const b = farm.addFilament({ material: 'PLA', brand: 'Bambu Lab', color: 'đen', qty: 2, weight: 1000 });
  assert.equal(b.merged, true); assert.equal(b.filament.qty, 5);
  farm.addFilament({ material: 'PETG', brand: 'Cailab', color: 'Trắng', qty: 1 });
  assert.equal(farm.out().filaments.length, 2);
  assert.equal(farm.editFilament(a.filament.id, { delta: -9 }).filament.qty, 0, 'never below 0');
  assert.equal(farm.removeFilament(a.filament.id), true);
  assert.deepEqual(farm.out().filaments.map((f) => f.material), ['PETG']);
  assert.ok(farm.out().materials.includes('PETG') && farm.out().brands.includes('Cailab'));
});

test('printers: LAN only, codes kept off the page, a file only to a free printer', async () => {
  const dir = tmp(), sent = [], state = { now: 'printing' };
  const fake = () => ({ status: async () => ({ state: state.now, percent: state.now === 'printing' ? 40 : null }), print: async (file, name) => { sent.push([fs.readFileSync(file, 'utf8'), name]); return { ok: true, file: name }; }, close() {} });
  const farm = createPrintFarm({ dataDir: dir, links: { bambu: fake, flashforge: fake } });
  assert.equal(farm.addPrinter({ kind: 'bambu', ip: '8.8.8.8', serial: 'S', code: 'C' }).code, 'notLan');
  assert.equal(farm.addPrinter({ kind: 'bambu', ip: '192.168.1.20' }).code, 'bambuNeeds');
  assert.equal(farm.addPrinter({ kind: 'robot', ip: '192.168.1.20' }).code, 'badKind');
  const p = farm.addPrinter({ kind: 'bambu', name: 'A1', ip: '192.168.1.20', serial: '03919A123456789', code: '87654321' }).printer;
  const f = farm.addPrinter({ kind: 'flashforge', ip: '192.168.1.21' }).printer;
  assert.equal(p.hasCode, true); assert.equal(p.serial, '…6789'); assert.equal(JSON.stringify(farm.out()).includes('87654321'), false, 'the access code never goes to the page');
  assert.equal(f.mode, 'tcp');
  const g = path.join(dir, 'part.gcode'); fs.writeFileSync(g, 'G28\nG1 X10\n');
  assert.equal((await farm.print(p.id, g, 'part.txt')).code, 'notGcode');
  assert.equal((await farm.print(p.id, g, 'part.gcode')).code, 'busy', 'it is printing');
  const st = await farm.refresh();
  assert.equal(st[0].state.percent, 40);
  state.now = 'done';
  assert.deepEqual(await farm.print(p.id, g, 'part.gcode'), { ok: true, file: 'part.gcode' });
  assert.deepEqual(sent, [['G28\nG1 X10\n', 'part.gcode']]);
  assert.equal(farm.out().printers[0].state.state, 'printing');
  state.now = 'offline';
  assert.equal((await farm.print(f.id, g, 'part.gcode')).code, 'offline');
  const again = createPrintFarm({ dataDir: dir });
  assert.equal(again.out().printers.length, 2, 'kept on this computer');
  assert.equal(again.removePrinter(f.id), true);
});

test('a Dahua camera: Digest auth, the snapshot, a wrong password, the MJPEG stream', async () => {
  const realm = 'Login to 4L0123', nonce = '1234567890', user = 'admin', pass = 'Cam@2026';
  const md5 = (s) => crypto.createHash('md5').update(s).digest('hex');
  const srv = http.createServer((req, res) => {
    const a = String(req.headers.authorization || ''), f = Object.fromEntries([...a.matchAll(/(\w+)="?([^",]*)"?/g)].map((m) => [m[1], m[2]]));
    const ok = a.startsWith('Digest ') && f.response === md5(`${md5(`${user}:${realm}:${pass}`)}:${nonce}:${f.nc}:${f.cnonce}:auth:${md5(`GET:${f.uri}`)}`);
    if (!ok) { res.writeHead(401, { 'WWW-Authenticate': `Digest realm="${realm}", qop="auth", nonce="${nonce}", opaque="abc"` }).end(); return; }
    if (req.url.startsWith('/cgi-bin/snapshot.cgi?channel=2')) { res.writeHead(200, { 'Content-Type': 'image/jpeg' }).end(Buffer.from([0xff, 0xd8, 0xff, 0xd9])); return; }
    if (req.url.startsWith('/cgi-bin/mjpg/video.cgi')) { res.writeHead(200, { 'Content-Type': 'multipart/x-mixed-replace; boundary=myboundary' }); res.end('--myboundary\r\n'); return; }
    res.writeHead(404).end();
  });
  const port = await listen(srv);
  try {
    const r = await digestGet({ host: '127.0.0.1', port, path: '/cgi-bin/snapshot.cgi?channel=2', user, pass });
    assert.equal(r.statusCode, 200); r.resume();
    const cams = createCameras({ dataDir: tmp() });
    assert.equal(cams.add({ ip: '1.2.3.4' }).code, 'notLan');
    const c = cams.add({ name: 'Cửa hàng', ip: '127.0.0.1', port, channel: 2, user, pass }).camera;
    assert.equal(c.hasPassword, true); assert.equal(JSON.stringify(cams.out()).includes(pass), false, 'the password never goes to the page');
    const snap = await cams.snapshot(c.id);
    assert.equal(snap.ok, true); assert.equal(snap.type, 'image/jpeg'); assert.equal(snap.body.length, 4);
    const wrong = cams.add({ ip: '127.0.0.1', port, channel: 2, user, pass: 'nope' }).camera;
    assert.equal((await cams.snapshot(wrong.id)).code, 'auth');
    const chunks = [];
    const res = new (await import('node:stream')).PassThrough(); res.writeHead = (code, h) => { chunks.push(['head', code, h['Content-Type']]); return res; };
    const live = await cams.stream(c.id, res);
    assert.equal(live.ok, true);
    for await (const d of res) chunks.push(String(d));
    assert.equal(chunks[0][1], 200); assert.match(chunks[0][2], /multipart/); assert.match(chunks[1], /myboundary/);
    assert.equal(cams.edit(c.id, { name: 'Kho', pass: '' }).camera.hasPassword, true, 'an empty password keeps the old one');
    assert.equal(cams.remove(wrong.id), true);
  } finally { srv.close(); }
});

test('the publisher proposes times, the CEO approves one: only then the post is ready', () => {
  const dir = tmp(), root = path.join(dir, 'kho'), lib = createLibrary({ dataDir: path.join(dir, 'data'), home: dir, now: () => Date.parse('2026-11-07T08:00:00Z') });
  lib.setRoot(root);
  const post = path.join(root, 'bai-dang', '20261107-ao-tiktok-1'); fs.mkdirSync(post, { recursive: true });
  fs.writeFileSync(path.join(post, 'post.json'), JSON.stringify({ title: 'Áo', caption: 'x', platforms: ['tiktok'], when: '2026-11-08 20:00', status: 'proposed',
    proposals: [{ when: '2026-11-08 20:00', why: 'giờ cao điểm' }, { when: '2026-11-08 12:00', why: 'nghỉ trưa' }] }));
  const p = readPost(root, '20261107-ao-tiktok-1');
  assert.equal(p.status, 'proposed'); assert.equal(p.proposals.length, 2); assert.equal(p.proposals[1].why, 'nghỉ trưa');
  assert.equal(lib.approve('20261107-ao-tiktok-1', 'tomorrow'), false, 'not a time');
  assert.equal(lib.approve('20261107-ao-tiktok-1', '2026-11-08 12:00'), true);
  const after = readPost(root, '20261107-ao-tiktok-1');
  assert.equal(after.status, 'ready'); assert.equal(after.when, '2026-11-08 12:00'); assert.equal(after.approved.when, '2026-11-08 12:00');
  assert.equal(lib.approve('nope', '2026-11-08 12:00'), false);
});
