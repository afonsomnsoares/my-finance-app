import { useEffect, useRef, useState } from 'react';
import { FiSend, FiX } from 'react-icons/fi';
import { api } from '../utils/api';

const OPENING = 'Pergunta sobre os teus gastos, orçamentos ou posições. Uso só os dados desta conta — e envio um resumo financeiro ao Grok (xAI) para responder.';
const MAX_MESSAGES = 12;

export default function GrokPanel({ open, onClose }) {
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const listRef = useRef(null);
  const inputRef = useRef(null);
  const busyRef = useRef(false);

  useEffect(() => {
    if (!open) return undefined;
    inputRef.current?.focus();
    const onKey = (event) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (open) listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages, open, busy]);

  if (!open) return null;

  const resetConversation = () => {
    setMessages([]);
    setError('');
    setDraft('');
  };

  const send = async (event) => {
    event.preventDefault();
    const content = draft.trim();

    if (!content || busyRef.current) return;

    if (messages.length + 1 > MAX_MESSAGES) {
      setError('A conversa atingiu o limite. Começa uma nova.');
      return;
    }

    const previous = messages;
    const next = [...messages, { role: 'user', content }];
    busyRef.current = true;
    setMessages(next);
    setDraft('');
    setError('');
    setBusy(true);
    try {
      const { data } = await api.post('/api/assistant', { messages: next });
      setMessages([...next, { role: 'assistant', content: data.reply }]);
    } catch (err) {

      setMessages(previous);
      setDraft(content);
      const code = err.response?.data?.code;
      const message = err.response?.data?.error;
      if (code === 'grok_not_configured') {
        setError('O assistente ainda não está configurado neste servidor.');
      } else if (err.response?.status === 400 && /too long|Conversation/i.test(message || '')) {
        setError('A conversa atingiu o limite. Começa uma nova.');
      } else {
        setError(message || 'O Grok não conseguiu responder.');
      }
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  };

  return (
    <section className="grok" role="dialog" aria-modal="true" aria-labelledby="grok-title">
      <header className="grok__head">
        <div>
          <span className="ui-eyebrow">Assistente</span>
          <h2 id="grok-title">Grok</h2>
        </div>
        <div className="grok__actions">
          {messages.length > 0 && (
            <button type="button" className="grok__reset" onClick={resetConversation}>
              Nova conversa
            </button>
          )}
          <button type="button" className="grok__close" onClick={onClose} aria-label="Fechar o Grok">
            <FiX size={16} />
          </button>
        </div>
      </header>

      <div className="grok__log" ref={listRef}>
        <p className="grok__hint">{OPENING}</p>
        {messages.map((message, index) => (
          <p key={`${message.role}-${index}`} className={`grok__msg grok__msg--${message.role}`}>
            {message.content}
          </p>
        ))}
        {busy && <p className="grok__msg grok__msg--assistant">A pensar…</p>}
        {error && <p className="grok__error" role="alert">{error}</p>}
      </div>

      <form className="grok__form" onSubmit={send}>
        <textarea
          id="grok-input"
          ref={inputRef}
          aria-label="Mensagem para o Grok"
          rows={2}
          maxLength={1500}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault();
              event.currentTarget.form?.requestSubmit();
            }
          }}
          placeholder="Quanto gastei este mês?"
          disabled={busy}
        />
        <button type="submit" className="topbar__cta" disabled={busy || !draft.trim()} aria-label="Enviar">
          <FiSend size={15} aria-hidden="true" />
        </button>
      </form>
    </section>
  );
}
