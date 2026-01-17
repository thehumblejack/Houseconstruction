const fs = require('fs');
const path = require('path');

const filePath = path.resolve(__dirname, '../src/app/orders/page.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// The backslash escaping might have been doubled or quadrupled by the shell/cat process.
// Let's look for exactly what is in the file.
content = content.replace(/filter: \\`/g, "filter: `").replace(/\{currentProject.id\\\}\\`/g, "{currentProject.id}`").replace(/\\\\/g, "\\");

fs.writeFileSync(filePath, content);
console.log('Fixed orders/page.tsx V2');
