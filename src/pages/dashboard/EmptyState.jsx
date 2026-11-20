import { FiPlusCircle } from 'react-icons/fi';
import { Button } from '../../components/ui';

export default function EmptyState({ onAdd }) {
  return (
    <div className="ui-card">
      <div className="ui-empty">
        <FiPlusCircle size={40} style={{ color: 'var(--accent-hover)' }} aria-hidden="true" />
        <h2 className="ui-empty__title">Começa pelo primeiro movimento</h2>
        <p className="ui-empty__text">
          Regista uma entrada ou uma despesa — ou importa o extrato — para o painel ganhar vida.
        </p>
        <Button variant="primary" onClick={onAdd}>Nova transação</Button>
      </div>
    </div>
  );
}
