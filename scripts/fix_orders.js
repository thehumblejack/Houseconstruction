const fs = require('fs');
const path = require('path');

const filePath = path.resolve(__dirname, '../src/app/orders/page.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Fix realtime filter backticks
content = content.replace(/filter: \\`project_id=eq.\$\{currentProject.id\\}\\`/g, 'filter: `project_id=eq.${currentProject.id}`');

// 2. Fix weird spacing in template literals
content = content.replace(/$\{ /g, '${');
content = content.replace(/ \}/g, '}');
content = content.replace(/absolute top - 0 left - 0 w - 1 h - full/g, 'absolute top-0 left-0 w-1 h-full');
content = content.replace(/p - 3 rounded - 2xl/g, 'p-3 rounded-2xl');
content = content.replace(/w - full py - 4 rounded - xl font - black uppercase tracking - widest hover: scale - \[1.01\] transition - all flex justify - center items - center gap - 2 shadow - xl/g, 'w-full py-4 rounded-xl font-black uppercase tracking-widest hover:scale-[1.01] transition-all flex justify-center items-center gap-2 shadow-xl');
content = content.replace(/id: `ref - mos - $\{name\}`/g, 'id: `ref-mos-${name}`');
content = content.replace(/id: `ref - ben - $\{name\}`/g, 'id: `ref-ben-${name}`');

fs.writeFileSync(filePath, content);
console.log('Fixed orders/page.tsx');
