// People keep their names when the conversation title, task or project changes.
// Use the CLI's persistent session id so reconnecting the office gives the same name.
const FAMILY = ['Nguyễn', 'Trần', 'Lê', 'Phạm', 'Hoàng', 'Đặng', 'Bùi', 'Đỗ', 'Hồ', 'Vũ', 'Dương', 'Mai'];
const NAMES = {
  claude: ['Minh An', 'Khánh Linh', 'Gia Bảo', 'Ngọc Anh', 'Đức Minh', 'Thanh Hà', 'Tuấn Kiệt', 'Phương Chi', 'Quang Huy', 'Bảo Ngọc', 'Hải Đăng', 'Thảo Vy'],
  codex: ['Gia Huy', 'Minh Khang', 'Anh Thư', 'Đức Anh', 'Hoài An', 'Tuệ Minh', 'Nhật Nam', 'Khánh Vy', 'Thanh Phong', 'Ngọc Mai', 'Bảo Long', 'Hà My'],
};
function hash(value) {
  let n = 2166136261;
  for (const ch of String(value)) { n ^= ch.charCodeAt(0); n = Math.imul(n, 16777619); }
  return n >>> 0;
}

export function personnelName(agent, id) {
  const names = NAMES[agent] || NAMES.claude, h = hash(`${agent || 'claude'}:${id || ''}`);
  return `${FAMILY[h % FAMILY.length]} ${names[Math.floor(h / FAMILY.length) % names.length]}`;
}

export function sessionName(session) {
  if (!session) return '';
  if (session.role) return session.title || session.name || '';
  return session.personnelName || personnelName(session.agent || 'claude', session.sid || session.key || session.id || session.name);
}
