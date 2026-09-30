import { FiPlus, FiTrendingUp } from 'react-icons/fi';
import { Button } from '../../components/ui';

export default function Empty({ onAdd }) {
  return (
    <div className="ui-card">
      <div className="ui-empty">
        <FiTrendingUp size={32} style={{ color: 'var(--text-subtle)' }} aria-hidden="true" />
        <h2 className="ui-empty__title">Carteira vazia</h2>
        <p className="ui-empty__text">
          Adiciona ações, ETFs, criptomoedas ou commodities usando o ticker —
          por exemplo <code>AAPL</code>, <code>VOO</code> ou <code>BTC-USD</code>.
        </p>
        <Button variant="primary" onClick={onAdd} icon={<FiPlus size={15} />}>Adicionar ativo</Button>
      </div>
    </div>
  );
}
