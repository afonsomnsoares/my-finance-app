import { roundMoney, sumMoneyProducts, sumNumbers } from '../../utils/money';

export function portfolioView(investments, prices) {
  const enriched = investments.map((inv) => {
    const quote = prices[inv.name];
    const comparable = quote?.price != null && quote.currency === inv.currency;
    const costValue = roundMoney(inv.amount * inv.buyPrice);
    const currentPrice = comparable ? quote.price : null;
    const currentValue = currentPrice != null ? roundMoney(inv.amount * currentPrice) : null;
    const pl = currentValue != null ? roundMoney(currentValue - costValue) : null;
    const plPercent = pl != null && costValue > 0 ? (pl / costValue) * 100 : null;
    return {
      ...inv,
      comparable,
      quoteCurrency: quote?.currency || null,
      currentPrice,
      currentValue,
      costValue,
      pl,
      plPercent,
      dailyChange: quote?.changePercent,
    };
  });

  const groups = [];
  for (const currency of [...new Set(enriched.filter((row) => row.comparable).map((row) => row.currency))]) {
    const rows = enriched.filter((row) => row.comparable && row.currency === currency);
    const cost = sumMoneyProducts(rows, 'amount', 'buyPrice');
    const current = sumMoneyProducts(
      rows.map((row) => ({ amount: row.amount, price: row.currentPrice })),
      'amount',
      'price'
    );
    groups.push({
      currency,
      cost,
      current,
      pl: roundMoney(current - cost),
      count: rows.length,
    });
  }

  const costByCurrency = {};
  for (const row of enriched) {
    costByCurrency[row.currency] = (costByCurrency[row.currency] || 0) + row.costValue;
  }
  for (const row of enriched) {
    const base = costByCurrency[row.currency] || 0;
    row.allocation = base > 0 ? (row.costValue / base) * 100 : 0;
  }

  return {
    enriched,
    groups,
    excluded: enriched.filter((row) => !row.comparable).length,
  };
}

export function calcDiversificationScore(enriched) {
  return calcDiversification(enriched).score;
}

export function calcDiversification(enriched) {
  if (enriched.length === 0) {
    return { score: 0, reasons: [], hint: 'Adiciona o primeiro ativo.' };
  }

  const totalValue = sumNumbers(enriched.map((i) => i.costValue));
  if (totalValue <= 0) {
    return { score: 0, reasons: [], hint: 'Os ativos não têm valor de compra registado.' };
  }

  const types = new Set(enriched.map((i) => i.type));
  const maxAlloc = Math.max(...enriched.map((i) => i.allocation));

  const criteria = [
    { met: enriched.length >= 3, points: 20, label: 'Pelo menos 3 ativos' },
    { met: enriched.length >= 5, points: 10, label: 'Pelo menos 5 ativos' },
    { met: enriched.length >= 8, points: 10, label: 'Pelo menos 8 ativos' },
    { met: types.size >= 2, points: 20, label: 'Mais de um tipo de ativo' },
    { met: types.size >= 3, points: 15, label: 'Três ou mais tipos' },
    { met: maxAlloc < 50, points: 15, label: 'Nenhum ativo passa de 50%' },
    { met: maxAlloc < 30, points: 10, label: 'Nenhum ativo passa de 30%' },
  ];

  const score = Math.min(
    criteria.reduce((s, c) => s + (c.met ? c.points : 0), 0),
    100
  );

  const missing = criteria.filter((c) => !c.met);

  return {
    score,
    reasons: criteria,

    hint: missing.length === 0
      ? 'Carteira bem distribuída.'
      : missing.sort((a, b) => b.points - a.points)[0].label,
  };
}
