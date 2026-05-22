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

const diagnostics = sourceFile.parseDiagnostics;

console.log(`Found ${diagnostics.length} syntax diagnostics:`);
for (const diag of diagnostics) {
  const message = ts.flattenDiagnosticMessageText(diag.messageText, '\n');
  const { line, character } = sourceFile.getLineAndCharacterOfPosition(diag.start);
  console.log(`${fileName} (${line + 1},${character + 1}): ${message}`);
}
