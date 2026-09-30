import { useEffect, useState } from 'react';
import { api } from '../../utils/api';
import { formatPercent } from '../../utils/format';

/*
 * Fita de cotações dos ativos que o utilizador realmente tem.
 *
 * Antes mostrava uma lista fixa — NVDA, Bitcoin, Lockheed Martin — que não
 * tinha relação nenhuma com o dinheiro de quem estava a olhar. Num painel de
 * finanças pessoais, o espaço é para os teus ativos; se não tiveres nenhum, a
 * fita não aparece de todo.
 */
export default function MarketTicker() {
  const [quotes, setQuotes] = useState([]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const { data: investments } = await api.get('/api/investments');
        const symbols = [...new Set(investments.map((i) => i.name).filter(Boolean))];
        if (symbols.length === 0 || cancelled) return;

        const { data } = await api.get(`/api/market/prices?symbols=${symbols.join(',')}`);
        if (!cancelled) setQuotes(Object.values(data));
      } catch { /* a fita é opcional */ }
    };

    load();
    const interval = setInterval(load, 60000);
    return () => { cancelled = true; clearInterval(interval); };
  }, []);

  if (quotes.length === 0) return null;

  // Duplicada para o deslize em ciclo não ter costura visível.
  const items = [...quotes, ...quotes];

  return (
    <section className="ui-section" aria-label="Cotações dos teus ativos">
      <div className="market-ticker-wrap">
        <div className="market-ticker">
          {items.map((item, i) => (
            <div key={`${item.symbol}-${i}`} className="market-ticker__item" aria-hidden={i >= quotes.length}>
              <span className="market-ticker__name">{item.symbol}</span>
              <span className="market-ticker__price">
                {item.price?.toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) ?? '—'}
              </span>
              <span className={`ui-delta ui-delta--${item.changePercent >= 0 ? 'gain' : 'loss'}`}>
                {formatPercent(item.changePercent ?? 0, { decimals: 2, signed: true })}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
