const { pathToFileURL } = require('url');

let pdfjsPromise;

function loadPdfjs() {
  if (!pdfjsPromise) {
    pdfjsPromise = import('pdfjs-dist/legacy/build/pdf.mjs').then((pdfjs) => {
      const worker = require.resolve('pdfjs-dist/legacy/build/pdf.worker.mjs');
      pdfjs.GlobalWorkerOptions.workerSrc = pathToFileURL(worker).href;
      return pdfjs;
    });
  }
  return pdfjsPromise;
}

/*
 * Text items keep their position. A Santander statement is a table, and the
 * columns only stay columns while x/y survive; joining the page into one
 * string glues the balance onto the amount.
 */
async function extractPdfItems(buffer, password) {
  const pdfjs = await loadPdfjs();
  let doc;
  try {
    doc = await pdfjs.getDocument({
      data: new Uint8Array(buffer),
      password: password || undefined,
      verbosity: 0,
      isEvalSupported: false,
      useSystemFonts: true,
    }).promise;
  } catch (error) {
    if (error?.name === 'PasswordException') {
      const code = error.code === 2 ? 'password_incorrect' : 'password_required';
      const wrapped = new Error(code);
      wrapped.code = code;
      throw wrapped;
    }
    throw error;
  }

  try {
    const items = [];
    for (let pageNumber = 1; pageNumber <= doc.numPages; pageNumber += 1) {
      const page = await doc.getPage(pageNumber);
      const content = await page.getTextContent();
      // PDF y grows upward and resets every page. Shift each page below the
      // previous one so a movement on page 2 is not read as part of page 1.
      const pageShift = (doc.numPages - pageNumber) * 100000;
      for (const item of content.items) {
        if (!item.str || !String(item.str).trim()) continue;
        const [, , , , x, y] = item.transform;
        items.push({ str: item.str, x, y: y + pageShift });
      }
    }
    return items;
  } finally {
    await doc.destroy();
  }
}

module.exports = { extractPdfItems };
