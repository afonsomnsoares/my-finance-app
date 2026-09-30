import { useEffect, useId, useRef } from 'react';
import { FiX } from 'react-icons/fi';

/*
 * Diálogo acessível. Antes disto, os modais eram <div onClick> puros:
 * não fechavam com Escape, não anunciavam nada a um leitor de ecrã e o foco
 * continuava a passear pela página por trás.
 */
export default function Modal({ title, onClose, maxWidth = 420, children }) {
  const contentRef = useRef(null);
  const titleId = useId();

  /*
   * `onClose` guardado numa ref para o efeito abaixo poder correr uma única
   * vez, na montagem.
   *
   * Tinha-o nas dependências, e quem usa o Modal passa quase sempre uma arrow
   * function — ou seja, uma identidade nova a cada render. O efeito voltava a
   * correr a cada tecla e chamava focus() outra vez, roubando o foco ao campo
   * onde se estava a escrever. Dava para escrever exatamente um caractere.
   */
  const onCloseRef = useRef(onClose);
  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);

  useEffect(() => {
    const previouslyFocused = document.activeElement;

    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        onCloseRef.current();
        return;
      }
      if (e.key !== 'Tab' || !contentRef.current) return;

      // Prende o Tab dentro do diálogo.
      const focusables = contentRef.current.querySelectorAll(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);

    // Impede a página de fundo de deslizar por trás do diálogo.
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    /*
     * O primeiro campo preenchível, não o primeiro elemento focável.
     * O botão de fechar aparece antes de {children} no DOM, por isso um
     * querySelector que aceitasse 'button' devolvia o ✕ e era esse que ficava
     * focado ao abrir o diálogo.
     */
    const focusTarget = contentRef.current?.querySelector(
      'input:not([type="hidden"]):not([disabled]), select:not([disabled]), textarea:not([disabled])'
    ) || contentRef.current;
    focusTarget?.focus();

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
      if (previouslyFocused instanceof HTMLElement) previouslyFocused.focus();
    };
    // Sem dependências: monta uma vez, limpa ao desmontar.
  }, []);

  return (
    <div className="modal-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div
        className="modal-content"
        ref={contentRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        style={{ maxWidth }}
      >
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h5 className="fw-bold mb-0" id={titleId}>{title}</h5>
          <button
            type="button"
            className="btn btn-sm btn-link text-secondary p-0"
            onClick={onClose}
            aria-label="Fechar"
          >
            <FiX size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
