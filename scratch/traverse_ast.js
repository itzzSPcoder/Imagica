const ts = require('typescript');
const fs = require('fs');

const fileName = 'c:\\Users\\user\\Downloads\\Problem-Statementzip (1)\\artifacts\\sketch-to-component\\src\\pages\\sketch-detail.tsx';
const fileContent = fs.readFileSync(fileName, 'utf8');

const sourceFile = ts.createSourceFile(
  fileName,
  fileContent,
  ts.ScriptTarget.Latest,
  true,
  ts.ScriptKind.TSX
);

function printNode(node, depth = 0) {
  const indent = '  '.repeat(depth);
  const kindName = ts.SyntaxKind[node.kind];
  
  // Only print JSX and interesting nodes
  if (kindName.startsWith('Jsx') || kindName === 'ReturnStatement') {
    const { line, character } = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
    console.log(`${indent}${kindName} at line ${line + 1}, col ${character + 1}`);
  }
  
  ts.forEachChild(node, child => printNode(child, depth + 1));
}

console.log('Traversing AST for JSX and Return statements...');
printNode(sourceFile);
