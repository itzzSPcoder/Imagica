const fs = require('fs');
const content = fs.readFileSync('c:\\Users\\user\\Downloads\\Problem-Statementzip (1)\\artifacts\\sketch-to-component\\src\\pages\\sketch-detail.tsx', 'utf8');

const stack = [];
const lines = content.split('\n');

let inString = false;
let stringChar = '';
let stringStartLine = 0;
let stringStartCol = 0;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  for (let j = 0; j < line.length; j++) {
    const char = line[j];
    
    if (inString) {
      if (char === stringChar && line[j - 1] !== '\\') {
        inString = false;
      }
      continue;
    }
    
    if (char === '"' || char === "'" || char === '`') {
      inString = true;
      stringChar = char;
      stringStartLine = i + 1;
      stringStartCol = j + 1;
      continue;
    }
    
    if (char === '/' && line[j + 1] === '/') {
      break; // Ignore line comments
    }

    if (char === '(' || char === '{' || char === '[') {
      stack.push({ char, line: i + 1, col: j + 1 });
    } else if (char === ')' || char === '}' || char === ']') {
      if (stack.length === 0) {
        console.log(`Unmatched closing character '${char}' at line ${i + 1}, col ${j + 1}`);
      } else {
        const top = stack.pop();
        const matches = (top.char === '(' && char === ')') ||
                        (top.char === '{' && char === '}') ||
                        (top.char === '[' && char === ']');
        if (!matches) {
          console.log(`Mismatch: '${top.char}' opened at line ${top.line}, col ${top.col} closed by '${char}' at line ${i + 1}, col ${j + 1}`);
        }
      }
    }
  }
}

if (inString) {
  console.log(`Unclosed string literal starting with '${stringChar}' at line ${stringStartLine}, col ${stringStartCol}`);
}

if (stack.length > 0) {
  console.log("Unclosed brackets/braces remaining in stack:");
  for (const item of stack) {
    console.log(`  '${item.char}' at line ${item.line}, col ${item.col}`);
  }
} else {
  console.log("All brackets/braces are balanced!");
}
