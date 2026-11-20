import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { FiChevronRight } from 'react-icons/fi';
import { api } from '../../utils/api';
import { formatMoney, formatPercent, formatSignedMoney, getCurrencySymbol } from '../../utils/format';
import { portfolioView } from '../investments/helpers';

export default function InvestmentSummary({ symbol }) {
  const [investments, setInvestments] = useState(null);
  const [prices, setPrices] = useState({});
  const [homeCurrency, setHomeCurrency] = useState('EUR');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [invRes, meRes] = await Promise.all([
          api.get('/api/investments'),
          api.get('/api/me').catch(() => null),
        ]);
        if (cancelled) return;
        setInvestments(invRes.data);
        if (meRes?.data?.currency) setHomeCurrency(meRes.data.currency);

        const symbols = invRes.data.map((i) => i.name).filter(Boolean);
        if (symbols.length === 0) return;
        const { data: quotes } = await api.get(`/api/market/prices?symbols=${symbols.join(',')}`);
        if (!cancelled) setPrices(quotes);
      } catch {
        if (!cancelled) setInvestments([]);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const { primary, hasPrices, excluded } = useMemo(() => {
    const list = investments || [];
    const { groups, excluded: skipped } = portfolioView(list, prices);
    const main = groups.find((group) => group.currency === homeCurrency) || (groups.length === 1 ? groups[0] : null);
    return {
      primary: main,
      hasPrices: Boolean(main),
      excluded: skipped,
    };
  }, [investments, prices, homeCurrency]);

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

  const cost = primary?.cost || 0;
  const current = primary?.current || 0;
  const pl = primary?.pl || 0;
  const plPercent = cost > 0 ? (pl / cost) * 100 : 0;
  const gain = pl >= 0;
  const displaySymbol = getCurrencySymbol(primary?.currency || homeCurrency) || symbol;

  return (
    <div className="ui-card">
      <div className="ui-card__header">
        <div>
          <h3 className="ui-card__title">Carteira</h3>
          <p className="ui-card__subtitle">
            {investments.length} ativos
            {excluded > 0 ? ` · ${excluded} fora do total` : ''}
          </p>
        </div>
        <Link to="/app/investments" className="ui-section__link">
          Gerir <FiChevronRight size={14} />
        </Link>
      </div>

      <span className="ui-eyebrow">{hasPrices ? 'Valor atual' : 'Investido'}</span>
      <p style={{ fontSize: 'var(--fs-2xl)', fontWeight: 'var(--fw-bold)', margin: 0, letterSpacing: '-0.02em' }}>
        {hasPrices ? formatMoney(current, displaySymbol) : '—'}
      </p>

      {hasPrices ? (
        <p style={{ margin: 'var(--sp-2) 0 0', fontSize: 'var(--fs-sm)' }}>
          <span className={`ui-delta ui-delta--${gain ? 'gain' : 'loss'}`}>
            {formatSignedMoney(pl, displaySymbol)} ({formatPercent(plPercent, { decimals: 1, signed: true })})
          </span>
          <span style={{ color: 'var(--text-muted)' }}> sobre {formatMoney(cost, displaySymbol)}</span>
        </p>
      ) : (
        <p style={{ margin: 'var(--sp-2) 0 0', fontSize: 'var(--fs-xs)', color: 'var(--text-subtle)' }}>
          Sem cotações comparáveis na moeda da carteira.
        </p>
      )}
    </div>
  );
}
