// Route an actual news assignment before choosing an ordinary conversation or DEV team.
// Mentions of the reader inside a software change request still belong to the developers.
export function specialistRequest(text) {
  const topic = String(text || '').trim();
  const plain = topic.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();
  if (!plain || /\b(?:sua|fix|debug|refactor|implement|build|xay dung|tao|viet|add|repair|change|update)\b.{0,70}\b(?:tinh nang|chuc nang|giao dien|luong|logic|routing|feature|module|component|code|api|app|news reader|nhan su doc bao)\b/.test(plain)) return null;
  const news = /\b(?:doc|tong hop|diem|tom tat|cap nhat|tim|tra cuu)\s+(?:giup\s+(?:toi|minh)\s+)?(?:cac\s+)?(?:bai\s+)?(?:bao|tin tuc|thoi su|ban tin)\b|\b(?:read|summarize|summarise|research|find|round up|recap)\s+(?:the\s+|recent\s+|latest\s+|today.s\s+)*(?:news|headlines)\b/.exec(plain);
  if (!news) return null;
  // A mention in a story, a question about the employee, or a refusal is not an assignment.
  const before = plain.slice(0, news.index).trim(), after = plain.slice(news.index + news[0].length).trim();
  const requestPrefix = /^(?:(?:hay|vui long|lam on|nho|giup(?: toi| minh)?|toi (?:muon|can)|minh (?:muon|can)|cho(?: toi| minh)?|giao(?: cho)?|xin|ban co the|co the|ban|em|anh|chi|nhan su|chuyen vien|news reader|please|can you|could you|would you|help me|i (?:want|need) you to)\s*)*$/;
  if (!requestPrefix.test(before) || /^(?:la ai|la gi|o dau|co nghia|nghia la|hoat dong|lam gi|does what|means what)\b/.test(after)) return null;
  return { kind: 'news', topic };
}

// An exact session binding wins over a project match, including after a fast job finishes.
export function specialistForSession({ sid, cwd, jobs = [] }) {
  const exact = sid && jobs.find((j) => j.sid === sid);
  if (exact) return exact;
  const normalized = (value) => { const dir = String(value || '').replace(/\\/g, '/').replace(/\/$/, ''); return /^[a-z]:\//i.test(dir) ? dir.toLowerCase() : dir; };
  const directory = normalized(cwd);
  return directory && jobs.find((j) => !j.sid && ['run', 'print'].includes(j.status) && normalized(j.dir) === directory) || null;
}
