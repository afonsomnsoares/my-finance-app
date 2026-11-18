import { fromCents, toCents } from '../../utils/money';

export function getMonthDays(transactions, reference = new Date()) {
  const now = new Date();
  const year = reference.getFullYear();
  const month = reference.getMonth();

  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const dailyCents = {};
  transactions.forEach((t) => {
    const d = new Date(t.date);
    if (d.getMonth() === month && d.getFullYear() === year) {
      const day = d.getDate();
      dailyCents[day] = (dailyCents[day] || 0) + toCents(t.amount);
    }
  });
  const result = [];
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day);
    const dayName = date.toLocaleDateString('pt-PT', { weekday: 'short' });
    const total = fromCents(dailyCents[day] || 0);
    const isToday = isCurrentMonth && day === now.getDate();
    const isFuture = isCurrentMonth && day > now.getDate();
    result.push({ day, dayName, total, isToday, isFuture });
  }
  return result;
}

export function calcHealthScore(user, spentThisMonth) {
  if (!user) return 0;
  let score = 0;
  if (user.onboardingCompleted) score += 15;
  if (user.monthlyIncome > 0) score += 15;
  if (user.monthlyExpenses > 0) score += 15;
  if (user.savingsTarget > 0) score += 15;
  if (user.financialGoal) score += 10;
  if (user.fixedExpenses > 0) score += 10;
  if (user.monthlyIncome > 0 && user.monthlyExpenses > 0 && spentThisMonth <= user.monthlyIncome * 0.7) score += 10;
  if (user.employmentStatus) score += 5;
  if (user.budgetingExperience) score += 5;
  return Math.min(score, 100);
}
