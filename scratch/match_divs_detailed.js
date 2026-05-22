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

const stack = [];

function checkDivs(node) {
  if (node.kind === ts.SyntaxKind.JsxOpeningElement && node.tagName.getText(sourceFile) === 'div') {
    const line = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
    stack.push({ name: 'div', line });
  } else if (node.kind === ts.SyntaxKind.JsxClosingElement && node.tagName.getText(sourceFile) === 'div') {
    const line = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
    if (stack.length === 0) {
      console.log(`Unmatched closing </div> at line ${line}`);
    } else {
      const top = stack.pop();
      // console.log(`Matched <div> at line ${top.line} with </div> at line ${line}`);
    }
  } else if (node.kind === ts.SyntaxKind.JsxSelfClosingElement && node.tagName.getText(sourceFile) === 'div') {
    // Self-closing div (not common, but check)
  }
  
  ts.forEachChild(node, checkDivs);
}

const returnStart = fileContent.lastIndexOf('return (');
let mainReturnStatement = null;
function findMainReturn(node) {
  if (node.kind === ts.SyntaxKind.ReturnStatement && node.getStart(sourceFile) >= returnStart) {
    mainReturnStatement = node;
    return;
  }
  ts.forEachChild(node, findMainReturn);
}

findMainReturn(sourceFile);
if (mainReturnStatement) {
  checkDivs(mainReturnStatement);
}

console.log(`Unclosed <div> tags remaining in return statement: ${stack.length}`);
for (const item of stack) {
  console.log(`  <div> opened at line ${item.line}`);
}
