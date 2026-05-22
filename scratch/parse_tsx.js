const ts = require('typescript');
const fs = require('fs');

const fileName = 'c:\\Users\\user\\Downloads\\Problem-Statementzip (1)\\artifacts\\sketch-to-component\\src\\pages\\sketch-detail.tsx';
const fileContent = fs.readFileSync(fileName, 'utf8');

const scanner = ts.createScanner(ts.ScriptTarget.Latest, true, ts.LanguageVariant.JSX, fileContent);

let token = scanner.scan();
const stack = [];

while (token !== ts.SyntaxKind.EndOfFileToken) {
  const pos = scanner.getTextPos();
  const text = scanner.getTokenText();
  
  if (token === ts.SyntaxKind.OpenBraceToken) {
    stack.push({ type: '{', pos });
  } else if (token === ts.SyntaxKind.CloseBraceToken) {
    if (stack.length === 0) {
      console.log(`Unmatched '}' at position ${pos}`);
    } else {
      const top = stack.pop();
      if (top.type !== '{') {
        console.log(`Mismatch: '${top.type}' closed by '}' at position ${pos}`);
      }
    }
  } else if (token === ts.SyntaxKind.OpenParenToken) {
    stack.push({ type: '(', pos });
  } else if (token === ts.SyntaxKind.CloseParenToken) {
    if (stack.length === 0) {
      console.log(`Unmatched ')' at position ${pos}`);
    } else {
      const top = stack.pop();
      if (top.type !== '(') {
        console.log(`Mismatch: '${top.type}' closed by ')' at position ${pos}`);
      }
    }
  } else if (token === ts.SyntaxKind.OpenBracketToken) {
    stack.push({ type: '[', pos });
  } else if (token === ts.SyntaxKind.CloseBracketToken) {
    if (stack.length === 0) {
      console.log(`Unmatched ']' at position ${pos}`);
    } else {
      const top = stack.pop();
      if (top.type !== '[') {
        console.log(`Mismatch: '${top.type}' closed by ']' at position ${pos}`);
      }
    }
  }
  
  token = scanner.scan();
}

console.log('Scan complete.');
if (stack.length > 0) {
  console.log(`Remaining unclosed tokens in stack: ${stack.length}`);
  for (const item of stack) {
    const { line, character } = getLineCol(item.pos);
    console.log(`  '${item.type}' at line ${line}, col ${character}`);
  }
} else {
  console.log('All tokens are perfectly balanced!');
}

function getLineCol(pos) {
  let line = 1;
  let character = 1;
  for (let i = 0; i < pos; i++) {
    if (fileContent[i] === '\n') {
      line++;
      character = 1;
    } else {
      character++;
    }
  }
  return { line, character };
}
