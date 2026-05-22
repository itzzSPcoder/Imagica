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

let returnNode = null;
function findReturn(node) {
  if (node.kind === ts.SyntaxKind.ReturnStatement) {
    const startLine = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
    if (startLine > 420) {
      returnNode = node;
      return;
    }
  }
  ts.forEachChild(node, findReturn);
}

findReturn(sourceFile);

if (!returnNode) {
  console.log('Return statement not found!');
  process.exit(1);
}

console.log('Found main return statement at line:', sourceFile.getLineAndCharacterOfPosition(returnNode.getStart(sourceFile)).line + 1);

// Let's print the immediate children of the return statement
returnNode.forEachChild(child => {
  console.log(`Child: ${ts.SyntaxKind[child.kind]} at line ${sourceFile.getLineAndCharacterOfPosition(child.getStart(sourceFile)).line + 1}`);
});
