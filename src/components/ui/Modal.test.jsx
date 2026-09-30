import { describe, test, expect, vi } from 'vitest';
import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Modal from './Modal';

/*
 * Regressão: o efeito do Modal tinha `onClose` nas dependências, e quem o usa
 * passa quase sempre uma arrow function — identidade nova a cada render. O
 * efeito voltava a correr a cada tecla e chamava focus() outra vez, roubando
 * o foco. Dava para escrever exatamente um caractere antes de o cursor saltar
 * para o botão de fechar.
 */
function Harness() {
  const [value, setValue] = useState('');
  return (
    // onClose inline de propósito: é assim que todas as páginas o usam.
    <Modal title="Teste" onClose={() => {}}>
      <input aria-label="campo" value={value} onChange={(e) => setValue(e.target.value)} />
    </Modal>
  );
}

describe('Modal', () => {
  test('deixa escrever mais do que um caractere', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    const field = screen.getByLabelText('campo');
    await user.click(field);
    await user.keyboard('NVDA');

    expect(field).toHaveValue('NVDA');
  });

  test('o foco não salta para o botão de fechar ao escrever', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    const field = screen.getByLabelText('campo');
    await user.click(field);
    await user.keyboard('abc');

    expect(document.activeElement).toBe(field);
  });

  test('ao abrir, foca o primeiro campo e não o botão de fechar', () => {
    render(<Harness />);
    // O ✕ aparece antes de {children} no DOM; um selector que aceitasse
    // 'button' apanhava-o a ele.
    expect(document.activeElement).toBe(screen.getByLabelText('campo'));
  });

  test('Escape fecha, mesmo com onClose recriado a cada render', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();

    function EscapeHarness() {
      const [v, setV] = useState('');
      return (
        <Modal title="Teste" onClose={() => onClose()}>
          <input aria-label="campo" value={v} onChange={(e) => setV(e.target.value)} />
        </Modal>
      );
    }

    render(<EscapeHarness />);
    await user.keyboard('x');       // provoca um re-render
    await user.keyboard('{Escape}');

    expect(onClose).toHaveBeenCalled();
  });
});
