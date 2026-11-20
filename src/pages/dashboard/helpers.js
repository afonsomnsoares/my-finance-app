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
