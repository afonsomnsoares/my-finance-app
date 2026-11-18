export const GOAL_OPTIONS = [
  { value: 'save', label: 'Poupar dinheiro', desc: 'Construir uma reserva financeira sólida' },
  { value: 'track', label: 'Controlar despesas', desc: 'Saber exactamente para onde vai o dinheiro' },
  { value: 'debt', label: 'Pagar dívidas', desc: 'Reduzir empréstimos e cartões de crédito' },
  { value: 'invest', label: 'Investir', desc: 'Fazer o teu dinheiro crescer a longo prazo' },
];

export const EMPLOYMENT_OPTIONS = [
  { value: 'employed', label: 'Empregado por conta de outrem' },
  { value: 'self-employed', label: 'Trabalhador independente' },
  { value: 'student', label: 'Estudante' },
  { value: 'unemployed', label: 'Desempregado' },
  { value: 'retired', label: 'Reformado' },
];

export const EXPERIENCE_OPTIONS = [
  { value: 'beginner', label: 'Iniciante', desc: 'Estou a começar a organizar as finanças' },
  { value: 'intermediate', label: 'Intermédio', desc: 'Já faço algum controlo de despesas' },
  { value: 'advanced', label: 'Avançado', desc: 'Tenho orçamento detalhado e poupança regular' },
];

const toLabels = (options) => Object.fromEntries(options.map((o) => [o.value, o.label]));

export const GOAL_LABELS = toLabels(GOAL_OPTIONS);
export const EMPLOYMENT_LABELS = toLabels(EMPLOYMENT_OPTIONS);
export const EXPERIENCE_LABELS = toLabels(EXPERIENCE_OPTIONS);
