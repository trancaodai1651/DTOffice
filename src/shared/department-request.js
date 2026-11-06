// Explicit delegation in chat/CLI work. Merely discussing the feature must not launch a paid team run.
export const MANAGERS = { pm: 'dev', cto: 'dev', cmo: 'marketing' };
export function departmentRequest(text) {
  const value = String(text || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').toLowerCase().trim();
  if (/^(?:khong|dung|chua|do not|don't|how|why|tai sao|lam sao)\b/.test(value)) return null;
  const match = /^(?:hay\s+)?(?:giao(?: viec| nhiem vu)?(?: (?:nay|cho))?|nho|yeu cau|assign(?: this)? to)\s+(?:cho\s+)?(?:quan ly(?: phong)?|truong phong|manager(?: of)?|pm|cto|cmo)\s*(dev|development|marketing|markting)?\b/.exec(value);
  if (!match) return null;
  const marketing = /marketing|markting|cmo/.test(match[0]);
  return { team: marketing ? 'marketing' : 'dev', lead: marketing ? 'cmo' : /cto/.test(match[0]) ? 'cto' : 'pm' };
}
