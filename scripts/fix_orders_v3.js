const fs = require('fs');
const path = require('path');

const filePath = path.resolve(__dirname, '../src/app/orders/page.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Fix the template literal interpolation blocks that got messed up with spaces
// Search for: id: `ref - mos - ${ name}`
content = content.replace(/id: `ref - mos - \$\{ name\}`/g, 'id: `ref-mos-\${name}`');
content = content.replace(/id: `ref - ben - \$\{ name\}`/g, 'id: `ref-ben-\${name}`');

// 2. Fix the real-time filter which has extra backslashes and backticks
// From: filter: \`project_id=eq.${currentProject.id}\`
// to: filter: `project_id=eq.${currentProject.id}`
content = content.replace(/filter: \\`project_id=eq\.\$\{currentProject\.id\}\\`/g, 'filter: `project_id=eq.${currentProject.id}`');

// 3. Fix weird classes like "w - full"
content = content.replace(/w - full/g, 'w-full');
content = content.replace(/h - full/g, 'h-full');
content = content.replace(/top - 0/g, 'top-0');
content = content.replace(/left - 0/g, 'left-0');
content = content.replace(/p - 3/g, 'p-3');
content = content.replace(/rounded - 2xl/g, 'rounded-2xl');
content = content.replace(/rounded - xl/g, 'rounded-xl');
content = content.replace(/font - black/g, 'font-black');
content = content.replace(/uppercase tracking - widest/g, 'uppercase tracking-widest');
content = content.replace(/hover: scale - \[1\.01\]/g, 'hover:scale-[1.01]');

fs.writeFileSync(filePath, content);
console.log('Fixed orders/page.tsx V3');
