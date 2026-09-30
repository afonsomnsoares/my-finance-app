/*
 * Cor por categoria — atribuída por IDENTIDADE, nunca por posição.
 *
 * Isto é a regra que mais se viola em dashboards: pintar a maior fatia de azul,
 * a segunda de laranja, e por aí. Quando o utilizador muda o filtro e a ordem
 * muda, todas as cores trocam e a leitura anterior deixa de valer. Aqui
 * "Alimentação" é sempre --cat-1, apareça ela em primeiro ou em oitavo.
 *
 * A ordem dos slots foi validada para daltonismo contra a superfície escura
 * (pior par adjacente ΔE 8.4 protan) — ver tokens.css. Não acrescentar uma
 * nona cor: uma nona categoria agrupa-se em "Outros".
 */

export const CATEGORIES = [
  'Alimentação',
  'Transporte',
  'Hobbies',
  'Saúde',
  'Renda',
  'Despesas Fixas',
  'Entretenimento',
  'Outros',
];

const COLOR_BY_CATEGORY = Object.fromEntries(
  CATEGORIES.map((name, i) => [name, `var(--cat-${i + 1})`])
);

export function categoryColor(name) {
  return COLOR_BY_CATEGORY[name] || 'var(--cat-8)';
}

/*
 * Recharts precisa de um valor de cor resolvido, não de uma custom property,
 * quando desenha para canvas ou quando calcula gradientes. Em SVG var() passa,
 * mas o fallback evita marcas invisíveis se o token faltar.
 */
const HEX_BY_INDEX = [
  '#3987e5', '#d95926', '#199e70', '#c98500',
  '#d55181', '#008300', '#9085e9', '#e66767',
];

export function categoryHex(name) {
  const i = CATEGORIES.indexOf(name);
  return i >= 0 ? HEX_BY_INDEX[i] : HEX_BY_INDEX[7];
}

/*
 * Ícones. Mantidos porque ajudam o reconhecimento rápido numa lista longa,
 * mas nunca são o único sinal — a categoria vem sempre escrita ao lado.
 */
export const CATEGORY_ICONS = {
  'Alimentação': '🍽️',
  'Transporte': '🚗',
  'Hobbies': '🎮',
  'Saúde': '💊',
  'Renda': '🏠',
  'Despesas Fixas': '📋',
  'Entretenimento': '🎬',
  'Outros': '📦',
};
