
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

try {
    const { PDFParse } = require('pdf-parse');

    try {
        const instance = new PDFParse({ verbosity: 0 }, Buffer.alloc(10));
        console.log('Instance created successfully with opts');
        // Get methods from prototype
        const methods = Object.getOwnPropertyNames(Object.getPrototypeOf(instance));
        console.log('Prototype methods:', methods);

        // Check if it has 'extractText' or similar

    } catch (e) {
        console.log('Constructor failed with opts:', e.message);
    }

} catch (e) {
    console.error('Error:', e);
}
