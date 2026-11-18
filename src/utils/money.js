export function toCents(value) {
  return Math.round(Number(value) * 100);
}

export function fromCents(cents) {
  return cents / 100;
}

export function roundMoney(value) {
  return fromCents(toCents(value));
}

export function sumAmounts(rows, key = 'amount') {
  const cents = rows.reduce((sum, row) => sum + toCents(row[key]), 0);
  return fromCents(cents);
}

export function sumNumbers(values) {
  const cents = values.reduce((sum, value) => sum + toCents(value), 0);
  return fromCents(cents);
}

export function addMoney(...values) {
  return sumNumbers(values);
}

export function sumMoneyProducts(rows, quantityKey, priceKey) {
  const cents = rows.reduce((sum, row) => {
    const quantity = Number(row[quantityKey]);
    const price = Number(row[priceKey]);
    if (!Number.isFinite(quantity) || !Number.isFinite(price)) return sum;
    return sum + toCents(quantity * price);
  }, 0);
  return fromCents(cents);
}
