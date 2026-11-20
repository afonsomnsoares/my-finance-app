export const CATEGORIES = [
  'Alimentação',
  'Transporte',
  'Hobbies',
  'Saúde',
  'Renda',
  'Despesas Fixas',
  'Entretenimento',
  'Rendimento',
  'Outros',
];

const COLOR_BY_CATEGORY = Object.fromEntries(
  CATEGORIES.map((name, i) => [name, `var(--cat-${i + 1})`])
);

export function categoryColor(name) {
  return COLOR_BY_CATEGORY[name] || 'var(--cat-8)';
}

const HEX_BY_INDEX = [
  '#3987e5', '#d95926', '#199e70', '#c98500',
  '#d55181', '#008300', '#9085e9', '#e66767',
];

export function categoryHex(name) {
  const i = CATEGORIES.indexOf(name);
  return HEX_BY_INDEX[i] || HEX_BY_INDEX[7];
}

export const CATEGORY_ICONS = {
  'Alimentação': '🍽️',
  'Transporte': '🚗',
  'Hobbies': '🎮',
  'Saúde': '💊',
  'Renda': '🏠',
  'Despesas Fixas': '📋',
  'Entretenimento': '🎬',
  'Rendimento': '💶',
  'Outros': '📦',
};
