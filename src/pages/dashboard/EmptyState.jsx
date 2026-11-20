import { FiPlusCircle } from 'react-icons/fi';
import { Button } from '../../components/ui';

export default function EmptyState({ onAdd }) {
  return (
    <div className="ui-card">
      <div className="ui-empty">
        <FiPlusCircle size={32} style={{ color: 'var(--text-subtle)' }} aria-hidden="true" />
        <h2 className="ui-empty__title">Ainda não há despesas</h2>
        <p className="ui-empty__text">
          Regista a primeira despesa para começares a ver totais, tendências e o teu orçamento.
        </p>
        <Button variant="primary" onClick={onAdd}>Registar despesa</Button>
      </div>
    </div>
  );
}
