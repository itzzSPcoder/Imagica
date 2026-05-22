const fs = require('fs');
const content = fs.readFileSync('c:\\Users\\user\\Downloads\\Problem-Statementzip (1)\\artifacts\\sketch-to-component\\src\\pages\\sketch-detail.tsx', 'utf8');

const pos = 3029;
console.log('Context around position 3029:');
console.log(content.slice(pos - 100, pos + 100));

// Find line and column
let line = 1;
let character = 1;
for (let i = 0; i < pos; i++) {
  if (content[i] === '\n') {
    line++;
    character = 1;
  } else {
    character++;
  }
}
console.log(`Line: ${line}, Col: ${character}`);
