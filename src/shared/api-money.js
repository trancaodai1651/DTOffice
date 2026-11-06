// USD per million tokens, standard short-context API-equivalent rates.
// Source checked 2026-11-06: https://developers.openai.com/api/docs/pricing
export const API_PRICES = { 'gpt-6-astra': [10, 1, 50], 'gpt-6.1-sol': [2, .1, 10], 'gpt-6.1-terra': [1, .05, 5], 'gpt-6-luna': [.1, .01, .5], 'gpt-5.6-sol': [4, .4, 20], 'gpt-5.3-codex': [1.75, .175, 14] };
export function apiEstimate(model, usage) {
  const rate = API_PRICES[model]; if (!rate) return null;
  const input = Math.max(0, Number(usage.input) || 0), cached = Math.min(input, Math.max(0, Number(usage.cached) || 0));
  return ((input - cached) * rate[0] + cached * rate[1] + Math.max(0, Number(usage.output) || 0) * rate[2]) / 1e6;
}
export function exchangeRate() { try { const n = Number(localStorage.getItem('office-usd-vnd')); if (n >= 1 && n <= 1000000) return n; } catch { /* server/private storage */ } return 25000; }
export function apiMoney(value, rate = exchangeRate()) {
  const n = Math.max(0, Number(value) || 0);
  return `${n.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 4 })} · ≈ ${Math.round(n * rate).toLocaleString('vi-VN')} ₫`;
}
