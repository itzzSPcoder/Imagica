const fs = require('fs');
const content = fs.readFileSync('c:\\Users\\user\\Downloads\\Problem-Statementzip (1)\\artifacts\\sketch-to-component\\src\\pages\\sketch-detail.tsx', 'utf8');

const returnStartPos = content.lastIndexOf('return (');
const returnEndPos = content.lastIndexOf(');');
const returnBlock = content.slice(returnStartPos, returnEndPos);

console.log('Scanning return block starting at pos:', returnStartPos);

// Count tags
const regex = /<\/?([a-zA-Z0-9:-]+)(?:\s+[^>]*?)?(\/?)>/g;
let match;
const tagStack = [];

while ((match = regex.exec(returnBlock)) !== null) {
  const fullTag = match[0];
  const tagName = match[1];
  const isClosing = fullTag.startsWith('</');
  const isSelfClosing = match[2] === '/' || fullTag.endsWith('/>');
  
  if (isSelfClosing) {
    continue;
  }
  
  // Exclude some expressions that look like tags but aren't
  if (tagName.includes('=>') || tagName === 'React.StrictMode') {
    continue;
  }
  
  const line = getLineOfPos(returnStartPos + match.index);
  
  if (isClosing) {
    if (tagStack.length === 0) {
      console.log(`Unmatched closing tag '</${tagName}>' at line ${line}`);
    } else {
      const top = tagStack.pop();
      if (top.name !== tagName) {
        console.log(`Mismatch: Tag '<${top.name}>' opened at line ${top.line} closed by '</${tagName}>' at line ${line}`);
      }
    }
  } else {
    tagStack.push({ name: tagName, line });
  }
}

if (tagStack.length > 0) {
  console.log('Unclosed tags remaining in stack:');
  for (const item of tagStack) {
    console.log(`  '<${item.name}>' opened at line ${item.line}`);
  }
} else {
  console.log('All JSX tags are perfectly balanced!');
}

function getLineOfPos(pos) {
  let line = 1;
  for (let i = 0; i < pos; i++) {
    if (content[i] === '\n') {
      line++;
    }
  }
  return line;
}
