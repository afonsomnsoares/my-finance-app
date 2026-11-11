import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { FiChevronRight } from 'react-icons/fi';
import { api } from '../../utils/api';
import { formatMoney, formatPercent, formatSignedMoney } from '../../utils/format';

/*
 * Resumo da carteira. Mostra o valor atual e o ganho/perda — e mais nada,
 * porque a página de Investimentos existe para o detalhe.
 */
export default function InvestmentSummary({ symbol }) {
  const [investments, setInvestments] = useState(null);
  const [prices, setPrices] = useState({});

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await api.get('/api/investments');
        if (cancelled) return;
        setInvestments(data);

        const symbols = data.map((i) => i.name).filter(Boolean);
        if (symbols.length === 0) return;
        const { data: quotes } = await api.get(`/api/market/prices?symbols=${symbols.join(',')}`);
        if (!cancelled) setPrices(quotes);
      } catch {
        if (!cancelled) setInvestments([]);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const { cost, current, hasPrices } = useMemo(() => {
    const list = investments || [];
    return {
      cost: list.reduce((s, i) => s + i.amount * i.buyPrice, 0),
      current: list.reduce((s, i) => s + (prices[i.name]?.price ? i.amount * prices[i.name].price : 0), 0),
      hasPrices: list.some((i) => prices[i.name]?.price),
    };
  }, [investments, prices]);

  if (investments === null) return null;

  if (investments.length === 0) {
    return (
      <div className="ui-card">
        <div className="ui-card__header">
          <div>
            <h3 className="ui-card__title">Carteira</h3>
            <p className="ui-card__subtitle">Ainda sem ativos</p>
          </div>
        </div>
        <p style={{ margin: '0 0 var(--sp-4)', fontSize: 'var(--fs-sm)', color: 'var(--text-muted)' }}>
          Regista o primeiro investimento para acompanhares o valor da carteira.
        </p>
        <Link to="/app/investments" className="ui-btn ui-btn--secondary ui-btn--sm">
          Adicionar ativo <FiChevronRight size={14} />
        </Link>
      </div>
    );
  }

  const pl = current - cost;
  const plPercent = cost > 0 ? (pl / cost) * 100 : 0;
  const gain = pl >= 0;

  return (
    <div className="ui-card">
      <div className="ui-card__header">
        <div>
          <h3 className="ui-card__title">Carteira</h3>
          <p className="ui-card__subtitle">{investments.length} ativos</p>
        </div>
        <Link to="/app/investments" className="ui-section__link">
          Gerir <FiChevronRight size={14} />
        </Link>
      </div>

      <span className="ui-eyebrow">{hasPrices ? 'Valor atual' : 'Investido'}</span>
      <p style={{ fontSize: 'var(--fs-2xl)', fontWeight: 'var(--fw-bold)', margin: 0, letterSpacing: '-0.02em' }}>
        {formatMoney(hasPrices ? current : cost, symbol)}
      </p>

      {hasPrices ? (
        <p style={{ margin: 'var(--sp-2) 0 0', fontSize: 'var(--fs-sm)' }}>
          <span className={`ui-delta ui-delta--${gain ? 'gain' : 'loss'}`}>
            {formatSignedMoney(pl, symbol)} ({formatPercent(plPercent, { decimals: 1, signed: true })})
          </span>
          <span style={{ color: 'var(--text-muted)' }}> sobre {formatMoney(cost, symbol)}</span>
        </p>
      ) : (
        <p style={{ margin: 'var(--sp-2) 0 0', fontSize: 'var(--fs-xs)', color: 'var(--text-subtle)' }}>
          Cotações indisponíveis de momento.
        </p>
      )}
    </div>
  );
}
