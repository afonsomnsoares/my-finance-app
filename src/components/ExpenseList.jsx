import { FiArrowDown, FiArrowUp, FiEdit2, FiTrash2 } from 'react-icons/fi';
import { formatDate, formatMoney } from '../utils/format';

const COLUMNS = [
  { field: 'date', label: 'Data' },
  { field: 'category', label: 'Categoria' },
  { field: 'description', label: 'Descrição' },
  { field: 'amount', label: 'Valor', numeric: true },
];

function SortIcon({ active, direction }) {
  if (!active) return null;
  const Icon = direction === 'asc' ? FiArrowUp : FiArrowDown;
  return <Icon size={11} style={{ marginLeft: 4 }} aria-hidden="true" />;
}

/*
 * Lista de despesas.
 *
 * As ações deixaram de ser dois botões com contorno — um deles vermelho — em
 * cada uma das 33 linhas. Trinta e três botões vermelhos permanentes fazem da
 * ação mais destrutiva da página a coisa mais visível dela. Agora aparecem ao
 * passar o rato (e ao navegar por teclado, via :focus-within), e o vermelho
 * só surge no hover do próprio botão de apagar.
 */
export default function ExpenseList({
  transactions, symbol, onEdit, onDelete, sortField, sortDirection, onSort,
}) {
  if (transactions.length === 0) {
    return (
      <div className="ui-empty">
        <p className="ui-empty__title">Nenhuma despesa encontrada</p>
        <p className="ui-empty__text">Experimenta alargar o período ou limpar os filtros.</p>
      </div>
    );
  }

  return (
    <div>
      <table className="ui-table ui-table--rows ui-table--stack">
        <thead>
          <tr>
            {COLUMNS.map(({ field, label, numeric }) => {
              const active = sortField === field;
              return (
                <th key={field} className={numeric ? 'num' : undefined}>
                  <button
                    type="button"
                    className="ui-table__sort"
                    onClick={() => onSort?.(field)}
                    aria-sort={active ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'}
                  >
                    {label}
                    <SortIcon active={active} direction={sortDirection} />
                  </button>
                </th>
              );
            })}
            <th className="num"><span className="sr-only">Ações</span></th>
          </tr>
        </thead>
        <tbody>
          {transactions.map((tx) => (
            <tr key={tx.id}>
              <td className="muted" data-label="Data" style={{ whiteSpace: 'nowrap' }}>{formatDate(tx.date, 'full')}</td>
              <td data-label="Categoria">{tx.category}</td>
              <td className="muted" data-label="Descrição" style={{ maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {tx.description || '—'}
              </td>
              <td className="num" data-label="Valor" style={{ fontWeight: 'var(--fw-semibold)' }}>
                −{formatMoney(tx.amount, symbol)}
              </td>
              <td className="num" data-label="">
                <div className="ui-rowactions">
                  <button type="button" className="ui-iconbtn" onClick={() => onEdit(tx)} aria-label={`Editar despesa de ${formatMoney(tx.amount, symbol)}`}>
                    <FiEdit2 size={14} />
                  </button>
                  <button type="button" className="ui-iconbtn ui-iconbtn--danger" onClick={() => onDelete(tx.id)} aria-label={`Apagar despesa de ${formatMoney(tx.amount, symbol)}`}>
                    <FiTrash2 size={14} />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
