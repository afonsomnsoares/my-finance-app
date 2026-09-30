import { describe, test, expect } from 'vitest';
import { getMonthlyHistory, getCategoryTrends, getMonthlyAverage } from './analytics';

// Uma transação em `monthsBack` meses atrás, no dia 10 (longe das fronteiras).
const tx = (monthsBack, amount, category = 'Alimentação') => {
  const now = new Date();
  return {
    date: new Date(now.getFullYear(), now.getMonth() - monthsBack, 10, 12).toISOString(),
    amount,
    category,
  };
};

describe('getMonthlyHistory', () => {
  test('devolve sempre N meses, incluindo os vazios', () => {
    const h = getMonthlyHistory([tx(0, 100)], 6);
    expect(h).toHaveLength(6);
    expect(h.filter((m) => m.total === 0)).toHaveLength(5);
  });

  test('coloca cada transação no seu mês', () => {
    const h = getMonthlyHistory([tx(0, 100), tx(1, 200), tx(2, 300)], 6);
    expect(h[5].total).toBe(100); // mês atual, último do array
    expect(h[4].total).toBe(200);
    expect(h[3].total).toBe(300);
  });

  test('marca o mês corrente', () => {
    const h = getMonthlyHistory([], 6);
    expect(h[5].isCurrent).toBe(true);
    expect(h.filter((m) => m.isCurrent)).toHaveLength(1);
  });

  test('ignora transações fora da janela', () => {
    const h = getMonthlyHistory([tx(0, 100), tx(20, 999)], 6);
    expect(h.reduce((s, m) => s + m.total, 0)).toBe(100);
  });

  /*
   * A regressão que motivou esta função: o gráfico de 6 meses era alimentado
   * com transações que a API já tinha filtrado para um único mês, por isso
   * cinco das seis barras estavam sempre vazias. O teste garante que, dado o
   * histórico completo, os meses anteriores aparecem preenchidos.
   */
  test('com histórico completo, os meses anteriores não ficam vazios', () => {
    const history = [tx(0, 50), tx(1, 60), tx(2, 70), tx(3, 80), tx(4, 90), tx(5, 100)];
    const h = getMonthlyHistory(history, 6);
    expect(h.every((m) => m.total > 0)).toBe(true);
  });
});

describe('getMonthlyAverage', () => {
  test('ignora meses sem registos', () => {
    // 3 meses com 100 e 3 vazios: a média é 100, não 50.
    const h = getMonthlyHistory([tx(0, 100), tx(1, 100), tx(2, 100)], 6);
    expect(getMonthlyAverage(h)).toBe(100);
  });

  test('devolve 0 sem dados nenhuns', () => {
    expect(getMonthlyAverage(getMonthlyHistory([], 6))).toBe(0);
  });
});

describe('getCategoryTrends', () => {
  test('deteta uma categoria a crescer', () => {
    const data = [
      tx(1, 200, 'Hobbies'), tx(2, 200, 'Hobbies'), tx(3, 200, 'Hobbies'),
      tx(4, 100, 'Hobbies'), tx(5, 100, 'Hobbies'), tx(6, 100, 'Hobbies'),
    ];
    const [hobbies] = getCategoryTrends(data, 3).filter((t) => t.category === 'Hobbies');
    expect(hobbies.current).toBe(200);
    expect(hobbies.previous).toBe(100);
    expect(hobbies.percent).toBe(100);
  });

  test('exclui o mês em curso, que está incompleto', () => {
    // Só há gastos este mês: não há nada completo para comparar.
    expect(getCategoryTrends([tx(0, 500, 'Renda')], 3)).toHaveLength(0);
  });

  test('marca como nova uma categoria sem histórico anterior', () => {
    const [t] = getCategoryTrends([tx(1, 80, 'Saúde')], 3);
    expect(t.isNew).toBe(true);
    expect(t.percent).toBeNull(); // "+100%" sobre zero seria enganador
  });

  test('ordena pela maior variação absoluta', () => {
    const data = [
      tx(1, 300, 'Renda'), tx(4, 100, 'Renda'),
      tx(1, 20, 'Saúde'), tx(4, 10, 'Saúde'),
    ];
    expect(getCategoryTrends(data, 3)[0].category).toBe('Renda');
  });
});
