import { PDFParse } from 'pdf-parse';
import fs from 'fs';

const buffer = fs.readFileSync('attached_assets/Tematica si bibliografia concurs INM 2025_1760210868749.pdf');
const parser = new PDFParse({});
await parser.load(buffer);
const text = await parser.getText();
console.log(text);
