const { PDFParse } = require('pdf-parse');
const fs = require('fs');

const buffer = fs.readFileSync('attached_assets/Tematica si bibliografia concurs INM 2025_1760210868749.pdf');

// Create parser instance with data option
const parser = new PDFParse({ data: buffer });

// Load and extract text
parser.load().then(() => {
    return parser.getText();
}).then(data => {
    // Output just the text for redirection
    const text = typeof data === 'string' ? data : data.text;
    console.log(text);
}).catch(err => {
    console.error('Error during extraction:', err);
    process.exit(1);
});
