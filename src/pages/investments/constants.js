export const TYPES = [
  { value: 'stock', label: 'Ação' },
  { value: 'etf', label: 'ETF' },
  { value: 'crypto', label: 'Cripto' },
  { value: 'commodity', label: 'Commodity' },
];

export const TYPE_COLORS = {
  stock: 'var(--cat-1)',
  etf: 'var(--cat-2)',
  crypto: 'var(--cat-3)',
  commodity: 'var(--cat-4)',
};

export const TYPE_HEX = {
  stock: '#3987e5',
  etf: '#d95926',
  crypto: '#199e70',
  commodity: '#c98500',
};

export const SORT_OPTIONS = [
  { value: 'pl', label: 'Maior ganho' },
  { value: 'plAsc', label: 'Maior perda' },
  { value: 'allocation', label: 'Alocação' },
  { value: 'daily', label: 'Variação diária' },
  { value: 'name', label: 'Nome' },
];
