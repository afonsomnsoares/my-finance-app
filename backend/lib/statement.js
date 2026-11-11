const categories = require('../constants/categories');

const DATE_RE = /(\d{2})[/\-.](\d{2})[/\-.](\d{4})/;
const AMOUNT_RE = /-?\d{1,3}(?:\.\d{3})*,\d{2}-?/g;

/*
 * Longer phrases first, so "uber eats" is food and a plain "uber" stays a ride.
 * Matching is accent-insensitive and only looks for the phrase as written.
 */
const RULES = [
  ['Alimentação', ['uber eats', 'bolt food', 'glovo', 'pingo doce', 'continente', 'minipreco', 'mercadona', 'intermarche', 'auchan', 'lidl', 'mcdonald', 'burger king', 'restaurante', 'padaria', 'starbucks', 'pizza hut']],
  ['Transporte', ['via verde', 'easyjet', 'ryanair', 'tap air', 'estacionamento', 'portagem', 'fertagus', 'carris', 'metro', 'repsol', 'uber', 'bolt', 'galp', 'prio']],
  ['Saúde', ['farmacia', 'hospital', 'clinica', 'dentista', 'wells']],
  ['Renda', ['senhorio', 'condominio', 'aluguer', 'renda']],
  ['Despesas Fixas', ['gas natural', 'eletricidade', 'iberdrola', 'endesa', 'vodafone', 'seguro', 'edp', 'meo', 'epal']],
  ['Entretenimento', ['prime video', 'disney', 'netflix', 'spotify', 'playstation', 'cinema', 'steam', 'hbo']],
  ['Hobbies', ['decathlon', 'worten', 'fnac', 'ikea']],
].flatMap(([category, phrases]) => phrases.map((phrase) => [phrase, category]))
  .sort((a, b) => b[0].length - a[0].length);

function fold(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase();
}

function categorize(description) {
  const text = fold(description);
  const hit = RULES.find(([phrase]) => text.includes(phrase));
  return hit ? hit[1] : 'Outros';
}

function parseEuro(raw) {
  if (raw == null) return null;
  const source = String(raw).replace(/\s/g, '').replace('€', '');
  if (!/\d/.test(source)) return null;
  const negative = source.startsWith('-') || source.endsWith('-') || /D$/i.test(source);
  const digits = source.replace(/[^\d,.-]/g, '').replace(/-/g, '');
  const lastComma = digits.lastIndexOf(',');
  const lastDot = digits.lastIndexOf('.');
  let normal = digits;
  if (lastComma > lastDot) normal = digits.replace(/\./g, '').replace(',', '.');
  else if (lastDot > lastComma) normal = digits.replace(/,/g, '');
  const value = Number(normal);
  if (!Number.isFinite(value)) return null;
  const signed = negative ? -Math.abs(value) : value;
  return Math.round(signed * 100) / 100;
}

function isoDate(day, month, year) {
  const d = Number(day);
  const m = Number(month);
  const y = Number(year);
  if (m < 1 || m > 12 || d < 1 || d > 31 || y < 1900 || y > 2200) return null;
  return `${String(y).padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

function columnRole(label) {
  const text = fold(label);
  if (text.includes('saldo')) return 'balance';
  if (text.includes('credito')) return 'credit';
  if (text.includes('debito')) return 'debit';
  if (text.includes('data') && text.includes('valor')) return 'valueDate';
  if (text.includes('data')) return 'date';
  if (text.includes('montante') || text.includes('importe') || text === 'valor') return 'amount';
  if (text.includes('desc') || text.includes('movimento') || text.includes('detalhe')) return 'description';
  return null;
}

function groupLines(items) {
  const usable = items
    .filter((item) => item && String(item.str || '').trim())
    .sort((a, b) => b.y - a.y || a.x - b.x);
  const lines = [];
  for (const item of usable) {
    const last = lines[lines.length - 1];
    if (last && Math.abs(last.y - item.y) <= 3) last.items.push(item);
    else lines.push({ y: item.y, items: [item] });
  }
  for (const line of lines) line.items.sort((a, b) => a.x - b.x);
  return lines;
}

function headerColumns(items) {
  const sorted = [...items].sort((a, b) => a.x - b.x);
  const columns = [];
  for (const item of sorted) {
    const previous = columns[columns.length - 1];
    if (previous && item.x - (previous.end ?? previous.x) < 28) {
      previous.label += ` ${item.str}`;
      previous.end = item.x + String(item.str).length * 4;
    } else {
      const role = columnRole(item.str);
      columns.push({ x: item.x, end: item.x + String(item.str).length * 4, label: item.str, role });
    }
  }
  return columns
    .map((column) => ({ ...column, role: columnRole(column.label) }))
    .filter((column) => column.role);
}

function findHeader(lines) {
  for (let index = 0; index < lines.length; index += 1) {
    const columns = headerColumns(lines[index].items);
    const roles = new Set(columns.map((column) => column.role));
    const hasMoney = roles.has('amount') || roles.has('debit') || roles.has('credit');
    if (roles.has('date') && roles.has('description') && hasMoney) {
      return { index, columns };
    }
  }
  return null;
}

function columnAt(x, columns) {
  for (let index = 0; index < columns.length; index += 1) {
    const start = index === 0 ? -Infinity : (columns[index - 1].x + columns[index].x) / 2;
    const end = index === columns.length - 1 ? Infinity : (columns[index].x + columns[index + 1].x) / 2;
    if (x >= start && x < end) return columns[index];
  }
  return null;
}

function cellText(items, columns, role) {
  if (!columns.some((column) => column.role === role)) return '';
  const parts = items.filter((item) => columnAt(item.x, columns)?.role === role);
  return parts.map((item) => item.str).join(' ').replace(/\s+/g, ' ').trim();
}

function movementFromCells(dateText, description, money) {
  const dateMatch = String(dateText).match(DATE_RE);
  const date = dateMatch ? isoDate(dateMatch[1], dateMatch[2], dateMatch[3]) : null;
  const descriptionClean = String(description || '').replace(/\s+/g, ' ').trim();
  if (!date || !descriptionClean || money == null || money === 0) return null;
  if (/^(saldo|total)\b/.test(fold(descriptionClean))) return null;
  return { date, description: descriptionClean.slice(0, 200), amount: Math.abs(money), incoming: money > 0 };
}

function parsePositioned(lines, header) {
  const movements = [];
  for (const line of lines.slice(header.index + 1)) {
    const text = line.items.map((item) => item.str).join(' ');
    if (/^(pagina|page)\b/i.test(fold(text))) continue;

    const dateText = cellText(line.items, header.columns, 'date');
    const description = cellText(line.items, header.columns, 'description');
    const debit = parseEuro(cellText(line.items, header.columns, 'debit'));
    const credit = parseEuro(cellText(line.items, header.columns, 'credit'));
    const amount = parseEuro(cellText(line.items, header.columns, 'amount'));

    let signed = null;
    if (debit) signed = -Math.abs(debit);
    else if (credit) signed = Math.abs(credit);
    else if (amount) signed = amount;

    const movement = movementFromCells(dateText || text, description || text, signed);
    if (!movement) {
      if (movements.length > 0 && description && !dateText && !signed) {
        const previous = movements[movements.length - 1];
        previous.description = `${previous.description} ${description}`.replace(/\s+/g, ' ').trim().slice(0, 200);
        previous.category = categorize(previous.description);
      }
      continue;
    }
    movement.category = categorize(movement.description);
    movements.push(movement);
  }
  return movements;
}

function parseFlat(lines) {
  const movements = [];
  for (const line of lines) {
    const text = line.items.map((item) => item.str).join(' ').replace(/\s+/g, ' ').trim();
    const dateMatch = text.match(DATE_RE);
    if (!dateMatch) continue;
    const amounts = [...text.matchAll(AMOUNT_RE)];
    if (amounts.length === 0) continue;
    const raw = amounts.length >= 2 ? amounts[amounts.length - 2][0] : amounts[0][0];
    const signed = parseEuro(raw);
    let description = text.slice(dateMatch.index + dateMatch[0].length);
    const secondDate = description.match(DATE_RE);
    if (secondDate && secondDate.index < 4) description = description.slice(secondDate.index + secondDate[0].length);
    for (const amount of amounts) description = description.replace(amount[0], ' ');
    description = description.replace(/€/g, ' ').replace(/\s+/g, ' ').trim();
    const movement = movementFromCells(dateMatch[0], description, signed);
    if (!movement) continue;
    movement.category = categorize(movement.description);
    movements.push(movement);
  }
  return movements;
}

function parseStatement(items) {
  const lines = groupLines(items);
  const header = findHeader(lines);
  const movements = header ? parsePositioned(lines, header) : parseFlat(lines);
  const seen = new Set();
  const unique = [];
  for (const movement of movements) {
    const key = `${movement.date}|${movement.amount.toFixed(2)}|${fold(movement.description)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    if (!categories.includes(movement.category)) movement.category = 'Outros';
    unique.push(movement);
  }
  return {
    expenses: unique.filter((movement) => !movement.incoming).map(({ incoming, ...rest }) => rest),
    incoming: unique.filter((movement) => movement.incoming).length,
  };
}

module.exports = { parseStatement, categorize, parseEuro, fold };
