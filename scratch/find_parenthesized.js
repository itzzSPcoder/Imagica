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

let parenthesizedExpr = null;
function findParenthesized(node) {
  if (node.kind === ts.SyntaxKind.ParenthesizedExpression) {
    const startLine = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
    if (startLine >= 426) {
      parenthesizedExpr = node;
      return;
    }
  }
  ts.forEachChild(node, findParenthesized);
}

findParenthesized(sourceFile);

if (!parenthesizedExpr) {
  console.log('ParenthesizedExpression not found!');
  process.exit(1);
}

console.log('Found ParenthesizedExpression at line:', sourceFile.getLineAndCharacterOfPosition(parenthesizedExpr.getStart(sourceFile)).line + 1);

// Immediate child of ParenthesizedExpression is the expression itself
const expr = parenthesizedExpr.expression;
console.log(`Expression kind: ${ts.SyntaxKind[expr.kind]} starting at line ${sourceFile.getLineAndCharacterOfPosition(expr.getStart(sourceFile)).line + 1}`);

// Check if the expression matches the full span of the JSX, ending at the closing tag
const endLine = sourceFile.getLineAndCharacterOfPosition(expr.getEnd()).line + 1;
console.log(`Expression ends at line: ${endLine}`);

// Are there parsing errors on parenthesizedExpr?
const diagnostics = sourceFile.parseDiagnostics.filter(diag => {
  return diag.start >= parenthesizedExpr.getStart(sourceFile) && diag.start <= parenthesizedExpr.getEnd();
});

console.log(`Parsing errors in ParenthesizedExpression: ${diagnostics.length}`);
for (const diag of diagnostics) {
  const message = ts.flattenDiagnosticMessageText(diag.messageText, '\n');
  const { line, character } = sourceFile.getLineAndCharacterOfPosition(diag.start);
  console.log(`  Line ${line + 1}, col ${character + 1}: ${message}`);
}
