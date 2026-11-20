import { Link } from 'react-router-dom';
import { FiChevronRight } from 'react-icons/fi';
import { formatDate, formatMoney } from '../../utils/format';

export default function RecentTransactions({ transactions, symbol }) {
  if (transactions.length === 0) return null;

  return (
    <section className="ui-section">
      <div className="ui-section__head">
        <h2 className="ui-section__title">Últimos movimentos</h2>
        <Link to="/app/expenses" className="ui-section__link">
          Ver todas <FiChevronRight size={14} />
        </Link>
      </div>

      <div className="ui-card ui-card--tight">
        <table className="ui-table ui-table--stack">
          <thead>
            <tr>
              <th>Data</th>
              <th>Categoria</th>
              <th>Descrição</th>
              <th className="num">Valor</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((tx) => (
              <tr key={tx.id}>
                <td className="muted" data-label="Data" style={{ whiteSpace: 'nowrap' }}>{formatDate(tx.date, 'short')}</td>
                <td data-label="Categoria">
                  <span className="ui-chip">{tx.category}</span>
                </td>
                <td className="muted" data-label="Descrição">{tx.description || '—'}</td>
                <td className="num" data-label="Valor" style={{ fontWeight: 'var(--fw-semibold)', color: tx.kind === 'income' ? 'var(--success)' : undefined }}>
                  {tx.kind === 'income' ? '+' : '−'}{formatMoney(tx.amount, symbol)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
