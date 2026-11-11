import { useRef, useState } from 'react';
import { FiUpload } from 'react-icons/fi';

import { api } from '../utils/api';
import { formatDate, formatMoney } from '../utils/format';
import { Button, Field, Modal } from './ui';

/*
 * One PDF in, expenses out. The server reads the Santander movement list,
 * decides the category from the description, and skips money coming in.
 */
export default function StatementImport({ symbol, onImported }) {
  const inputRef = useRef(null);
  const fileRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [password, setPassword] = useState('');
  const [needPassword, setNeedPassword] = useState(false);
  const [result, setResult] = useState(null);

  const send = async (file, pwd) => {
    setBusy(true);
    setError('');
    const body = new FormData();
    body.append('file', file);
    if (pwd) body.append('password', pwd);
    try {
      const { data } = await api.post('/api/transactions/import', body);
      setNeedPassword(false);
      setPassword('');
      setResult(data);
      if (data.created > 0) onImported();
    } catch (err) {
      const code = err.response?.data?.code;
      const message = err.response?.data?.error || 'Não foi possível importar o extrato.';
      if (code === 'password_required' || code === 'password_incorrect') setNeedPassword(true);
      setError(message);
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const onFile = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    fileRef.current = file;
    setPassword('');
    send(file, '');
  };

  const close = () => {
    setResult(null);
    setNeedPassword(false);
    setError('');
    setPassword('');
    fileRef.current = null;
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,.pdf"
        hidden
        onChange={onFile}
      />
      <Button
        variant="secondary"
        onClick={() => inputRef.current?.click()}
        disabled={busy}
        icon={<FiUpload size={15} />}
      >
        {busy ? 'A ler o extrato…' : 'Importar extrato'}
      </Button>

      {(needPassword || (error && !result)) && (
        <Modal title="Importar extrato" onClose={close} maxWidth={440}>
          {needPassword ? (
            <form
              onSubmit={(event) => {
                event.preventDefault();
                if (fileRef.current) send(fileRef.current, password);
              }}
            >
              <p className="ui-card__subtitle" style={{ marginBottom: 'var(--sp-4)' }}>
                O Santander protegeu este PDF. A palavra-passe fica só neste pedido e não é guardada.
              </p>
              <Field
                label="Palavra-passe do PDF"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="off"
                required
              />
              {error && <div className="ui-alert ui-alert--danger" role="alert" style={{ marginTop: 'var(--sp-4)' }}>{error}</div>}
              <div style={{ display: 'flex', gap: 'var(--sp-2)', marginTop: 'var(--sp-5)' }}>
                <Button type="submit" variant="primary" disabled={busy || !password}>
                  {busy ? 'A ler…' : 'Importar'}
                </Button>
                <Button type="button" variant="ghost" onClick={close}>Cancelar</Button>
              </div>
            </form>
          ) : (
            <>
              <div className="ui-alert ui-alert--danger" role="alert">{error}</div>
              <div style={{ marginTop: 'var(--sp-4)' }}>
                <Button variant="primary" onClick={close}>Fechar</Button>
              </div>
            </>
          )}
        </Modal>
      )}

      {result && (
        <Modal title="Extrato importado" onClose={close} maxWidth={560}>
          <p className="ui-card__subtitle" style={{ marginBottom: 'var(--sp-4)' }}>
            {result.created === 1 ? '1 despesa criada.' : `${result.created} despesas criadas.`}
            {result.skippedDuplicates > 0 && ` ${result.skippedDuplicates} já existiam e ficaram de fora.`}
            {result.skippedIncoming > 0 && ` ${result.skippedIncoming} entradas de dinheiro foram ignoradas.`}
          </p>
          {result.expenses.length > 0 && (
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 'var(--sp-2)', maxHeight: 320, overflow: 'auto' }}>
              {result.expenses.map((expense) => (
                <li key={`${expense.date}-${expense.amount}-${expense.description}`} style={{ display: 'flex', justifyContent: 'space-between', gap: 'var(--sp-3)', fontSize: 'var(--fs-sm)' }}>
                  <span>
                    <strong>{expense.description}</strong>
                    <span style={{ display: 'block', color: 'var(--text-muted)' }}>
                      {formatDate(`${expense.date}T00:00:00.000Z`, 'full')} · {expense.category}
                    </span>
                  </span>
                  <span>{formatMoney(expense.amount, symbol)}</span>
                </li>
              ))}
            </ul>
          )}
          <div style={{ marginTop: 'var(--sp-5)' }}>
            <Button variant="primary" onClick={close}>Fechar</Button>
          </div>
        </Modal>
      )}
    </>
  );
}
