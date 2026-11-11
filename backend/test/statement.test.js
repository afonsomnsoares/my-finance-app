const { test } = require('node:test');
const assert = require('node:assert/strict');
const PDFDocument = require('pdfkit');

const { parseStatement, categorize } = require('../lib/statement');
const { extractPdfItems } = require('../lib/pdfText');

function pdfBuffer(write, options = {}) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 40, ...options });
    const chunks = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
    write(doc);
    doc.end();
  });
}

test('a merchant phrase picks the category and an unknown one stays Outros', () => {
  assert.equal(categorize('COMPRA CONTINENTE COLOMBO'), 'Alimentação');
  assert.equal(categorize('UBER TRIP LISBOA'), 'Transporte');
  assert.equal(categorize('UBER EATS JANTAR'), 'Alimentação');
  assert.equal(categorize('PAGAMENTO DESCONHECIDO'), 'Outros');
});

test('positioned columns separate the amount from the balance', () => {
  const items = [
    { str: 'Data', x: 40, y: 700 },
    { str: 'Descrição', x: 140, y: 700 },
    { str: 'Montante', x: 360, y: 700 },
    { str: 'Saldo', x: 470, y: 700 },
    { str: '01-11-2026', x: 40, y: 670 },
    { str: 'COMPRA CONTINENTE', x: 140, y: 670 },
    { str: '-12,40', x: 360, y: 670 },
    { str: '1.000,00', x: 470, y: 670 },
    { str: '02-11-2026', x: 40, y: 640 },
    { str: 'ORDENADO', x: 140, y: 640 },
    { str: '1.500,00', x: 360, y: 640 },
    { str: '2.500,00', x: 470, y: 640 },
  ];

  const parsed = parseStatement(items);
  assert.equal(parsed.incoming, 1);
  assert.deepEqual(parsed.expenses, [{
    date: '2026-11-01',
    description: 'COMPRA CONTINENTE',
    amount: 12.4,
    category: 'Alimentação',
  }]);
});

test('a Santander-style PDF becomes expenses and drops money coming in', async () => {
  const buffer = await pdfBuffer((doc) => {
    doc.fontSize(10);
    const row = (y, cells) => {
      doc.text(cells[0], 40, y, { lineBreak: false, width: 90 });
      doc.text(cells[1], 140, y, { lineBreak: false, width: 200 });
      doc.text(cells[2], 360, y, { lineBreak: false, width: 90 });
      doc.text(cells[3], 470, y, { lineBreak: false, width: 90 });
    };
    row(80, ['Data', 'Descrição', 'Montante', 'Saldo']);
    row(110, ['01-11-2026', 'COMPRA CONTINENTE LISBOA', '-12,40', '1.000,00']);
    row(132, ['02-11-2026', 'UBER TRIP', '-8,00', '992,00']);
    row(154, ['03-11-2026', 'ORDENADO NOVEMBRO', '1.500,00', '2.492,00']);
  });

  const parsed = parseStatement(await extractPdfItems(buffer));
  assert.equal(parsed.incoming, 1);
  assert.equal(parsed.expenses.length, 2);
  assert.equal(parsed.expenses[0].category, 'Alimentação');
  assert.equal(parsed.expenses[0].amount, 12.4);
  assert.equal(parsed.expenses[1].category, 'Transporte');
  assert.equal(parsed.expenses[1].date, '2026-11-02');
});

test('a password-protected PDF is rejected until the password is given', async () => {
  const buffer = await pdfBuffer((doc) => {
    doc.text('Data', 40, 80);
  }, { userPassword: 'segredo', ownerPassword: 'segredo-owner' });

  await assert.rejects(() => extractPdfItems(buffer), (error) => error.code === 'password_required');
  const items = await extractPdfItems(buffer, 'segredo');
  assert.ok(items.some((item) => item.str.includes('Data')));
});
