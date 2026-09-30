import { toLocalDateKey } from './format';

export function groupByCategory(transactions) {
  return transactions.reduce((acc, t) => {
    acc[t.category] = (acc[t.category] || 0) + t.amount;
    return acc;
  }, {});
}

export function isThisMonth(dateStr) {
  const date = new Date(dateStr);
  const now = new Date();
  return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
}

export function isLastMonth(dateStr) {
  const date = new Date(dateStr);
  const now = new Date();
  const last = new Date(now.getFullYear(), now.getMonth() - 1);
  return date.getMonth() === last.getMonth() && date.getFullYear() === last.getFullYear();
}

export function getLast30DaysData(transactions) {
  const now = new Date();
  const from = new Date(now);
  from.setDate(from.getDate() - 29);
  from.setHours(0, 0, 0, 0);
  const to = new Date(now);
  to.setHours(23, 59, 59, 999);
  return getDailyData(transactions, from, to);
}

export function getDailyData(transactions, from, to) {
  if (!from || !to) return [];

  const days = {};
  const cur = new Date(from);
  cur.setHours(0, 0, 0, 0);
  const end = new Date(to);
  end.setHours(0, 0, 0, 0);

  while (cur <= end) {
    const key = toLocalDateKey(cur);
    days[key] = {
      date: key,
      label: cur.toLocaleDateString('pt-PT', { day: '2-digit', month: 'short' }),
      total: 0,
    };
    cur.setDate(cur.getDate() + 1);
  }

  transactions.forEach((t) => {
    const d = new Date(t.date);
    d.setHours(0, 0, 0, 0);
    const key = toLocalDateKey(d);
    if (days[key]) {
      days[key].total += t.amount;
    }
  });

  return Object.values(days);
}

export function getMonthlyComparison(transactions, monthCount = 6) {
  const result = [];

  for (let i = monthCount - 1; i >= 0; i -= 1) {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() - i);
    const month = d.getMonth();
    const year = d.getFullYear();
    const label = d.toLocaleDateString('pt-PT', { month: 'short', year: '2-digit' });

    const total = transactions
      .filter((t) => {
        const td = new Date(t.date);
        return td.getMonth() === month && td.getFullYear() === year;
      })
      .reduce((sum, t) => sum + t.amount, 0);

    result.push({ label, total, isCurrent: i === 0 });
  }

  return result;
}

export function getCategoryChartData(transactions) {
  return Object.entries(groupByCategory(transactions))
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
}

export function calcTrend(current, previous) {
  if (previous === 0 && current === 0) return { percent: 0, direction: 'neutral' };
  if (previous === 0) return { percent: 100, direction: 'up' };
  const percent = Math.round(((current - previous) / previous) * 100);
  if (percent > 0) return { percent, direction: 'up' };
  if (percent < 0) return { percent, direction: 'down' };
  return { percent: 0, direction: 'neutral' };
}

export const CHART_COLORS = [
  '#0d6efd',
  '#6610f2',
  '#6f42c1',
  '#d63384',
  '#dc3545',
  '#fd7e14',
  '#ffc107',
  '#198754',
  '#20c997',
  '#0dcaf0',
];

/* ═══════════════════════════════════════════════════════════════════
   Séries temporais — o que a página de Análises passou a responder.
   ═══════════════════════════════════════════════════════════════════ */

/*
 * Total gasto em cada um dos últimos N meses.
 *
 * Substitui getMonthlyComparison, que recebia as transações JÁ filtradas pelo
 * período escolhido — com o filtro por omissão ("este mês"), um gráfico de seis
 * meses só podia ter uma barra preenchida. Esta função exige o histórico
 * completo e devolve sempre N meses, mesmo os vazios, para a linha do tempo
 * não ter buracos.
 */
export function getMonthlyHistory(transactions, months = 12) {
  const now = new Date();
  const buckets = [];

  for (let i = months - 1; i >= 0; i -= 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    buckets.push({
      key: `${d.getFullYear()}-${d.getMonth()}`,
      label: d.toLocaleDateString('pt-PT', { month: 'short' }),
      fullLabel: d.toLocaleDateString('pt-PT', { month: 'long', year: 'numeric' }),
      year: d.getFullYear(),
      month: d.getMonth(),
      total: 0,
      count: 0,
      isCurrent: i === 0,
    });
  }

  const index = new Map(buckets.map((b) => [b.key, b]));

  transactions.forEach((t) => {
    const d = new Date(t.date);
    const bucket = index.get(`${d.getFullYear()}-${d.getMonth()}`);
    if (bucket) {
      bucket.total += t.amount;
      bucket.count += 1;
    }
  });

  buckets.forEach((b) => { b.total = Math.round(b.total * 100) / 100; });
  return buckets;
}

/*
 * Que categorias estão a crescer e quais estão a encolher.
 *
 * Compara a média mensal dos últimos `window` meses completos com a dos
 * `window` meses anteriores. Usa médias e não totais porque os dois períodos
 * podem ter um número diferente de meses com dados — comparar somas daria a
 * ilusão de crescimento só por haver mais histórico de um lado.
 *
 * O mês em curso fica de fora: está incompleto e apareceria sempre a "descer".
 */
export function getCategoryTrends(transactions, window = 3) {
  const now = new Date();
  const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const recentFrom = new Date(now.getFullYear(), now.getMonth() - window, 1);
  const previousFrom = new Date(now.getFullYear(), now.getMonth() - window * 2, 1);

  const recent = {};
  const previous = {};

  transactions.forEach((t) => {
    const d = new Date(t.date);
    if (d >= startOfThisMonth) return;
    if (d >= recentFrom) recent[t.category] = (recent[t.category] || 0) + t.amount;
    else if (d >= previousFrom) previous[t.category] = (previous[t.category] || 0) + t.amount;
  });

  const categories = new Set([...Object.keys(recent), ...Object.keys(previous)]);

  return [...categories]
    .map((category) => {
      const now_ = (recent[category] || 0) / window;
      const before = (previous[category] || 0) / window;
      const delta = now_ - before;
      // Sem base de comparação, "subiu 100%" seria enganador.
      const percent = before > 0 ? (delta / before) * 100 : null;
      return {
        category,
        current: Math.round(now_ * 100) / 100,
        previous: Math.round(before * 100) / 100,
        delta: Math.round(delta * 100) / 100,
        percent: percent === null ? null : Math.round(percent),
        isNew: before === 0 && now_ > 0,
      };
    })
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
}

/*
 * Média mensal, ignorando os meses sem qualquer registo — incluir meses vazios
 * (antes de a app começar a ser usada) puxaria a média artificialmente para
 * baixo.
 */
export function getMonthlyAverage(history) {
  const withData = history.filter((m) => m.count > 0);
  if (withData.length === 0) return 0;
  return Math.round((withData.reduce((s, m) => s + m.total, 0) / withData.length) * 100) / 100;
}
