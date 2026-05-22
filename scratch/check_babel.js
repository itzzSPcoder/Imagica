const fs = require('fs');
const parser = require('@babel/parser');

const code = fs.readFileSync('c:\\Users\\user\\Downloads\\Problem-Statementzip (1)\\artifacts\\sketch-to-component\\src\\pages\\sketch-detail.tsx', 'utf8');

try {
  parser.parse(code, {
    sourceType: 'module',
    plugins: ['typescript', 'jsx']
  });
  console.log('Babel successfully parsed the file!');
} catch (err) {
  console.error('Babel parsing error:');
  console.error(err.message);
  console.error(`At line ${err.loc.line}, column ${err.loc.column}`);
}
