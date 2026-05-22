const fs = require('fs');
const content = fs.readFileSync('c:\\Users\\user\\Downloads\\Problem-Statementzip (1)\\artifacts\\sketch-to-component\\src\\pages\\sketch-detail.tsx', 'utf8');

const returnStart = content.lastIndexOf('return (');
const returnEnd = content.lastIndexOf(');');
const returnBlock = content.slice(returnStart, returnEnd);

// Count occurrences of <div and </div
const openDivs = (returnBlock.match(/<div(\s|>)/gi) || []).length;
const closeDivs = (returnBlock.match(/<\/div>/gi) || []).length;

console.log(`Open <div>: ${openDivs}`);
console.log(`Close </div>: ${closeDivs}`);
