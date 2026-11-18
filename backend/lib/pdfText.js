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

  const MAX_PAGES = 50;
  if (doc.numPages > MAX_PAGES) {
    const wrapped = new Error('pdf_too_large');
    wrapped.code = 'pdf_too_large';
    await doc.destroy();
    throw wrapped;
  }

  try {
    const items = [];
    for (let pageNumber = 1; pageNumber <= doc.numPages; pageNumber += 1) {
      const page = await doc.getPage(pageNumber);
      const content = await page.getTextContent();

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
