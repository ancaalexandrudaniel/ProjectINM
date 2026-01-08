const pdf = require('pdf-parse');
const fs = require('fs');

const buffer = fs.readFileSync('attached_assets/Tematica si bibliografia concurs INM 2025_1760210868749.pdf');
pdf(buffer).then(data => {
    console.log(data.text);
}).catch(err => console.error(err));
