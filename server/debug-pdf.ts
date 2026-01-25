
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

try {
    const pdfModule = require('pdf-parse');
    console.log('Type of module:', typeof pdfModule);
    console.log('Is Array?', Array.isArray(pdfModule));
    console.log('Keys:', Object.keys(pdfModule));

    if (typeof pdfModule === 'function') {
        console.log('Module IS a function');
    } else {
        console.log('Module is NOT a function');
    }

    if (pdfModule.default) {
        console.log('Has default export:', typeof pdfModule.default);
    }

    if (pdfModule.PDFParse) {
        console.log('Has PDFParse export:', typeof pdfModule.PDFParse);
    }

} catch (e) {
    console.error('Error requiring:', e);
}
