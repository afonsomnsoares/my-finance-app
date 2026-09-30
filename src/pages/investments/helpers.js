/*
 * Pontuação de diversificação, 0–100.
 *
 * Devolve também as razões, porque um número isolado ("65/100") não diz ao
 * utilizador o que fazer a seguir — e era exatamente isso que a página
 * mostrava antes.
 *
 * Isto é uma heurística simples, não uma medida financeira reconhecida: conta
 * quantos ativos há, quantos tipos diferentes, e se algum domina a carteira.
 */
export function calcDiversificationScore(enriched) {
  return calcDiversification(enriched).score;
}

export function calcDiversification(enriched) {
  if (enriched.length === 0) {
    return { score: 0, reasons: [], hint: 'Adiciona o primeiro ativo.' };
  }

  const totalValue = enriched.reduce((s, i) => s + i.costValue, 0);
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
    // A sugestão é o critério não cumprido que mais pontos vale.
    hint: missing.length === 0
      ? 'Carteira bem distribuída.'
      : missing.sort((a, b) => b.points - a.points)[0].label,
  };
}
