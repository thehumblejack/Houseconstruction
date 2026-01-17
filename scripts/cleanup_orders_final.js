const fs = require('fs');
const path = require('path');

const filePath = path.resolve(__dirname, '../src/app/orders/page.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// A list of broken patterns and their fixes
// 1. General space cleanup in template literals
content = content.replace(/\$\{ /g, '${').replace(/ \}/g, '}');

// 2. Specific fix for real-time filter which is severely mangled
content = content.replace(/filter: \`project_id=eq\.\\\$\{currentProject\.id\}\` \}, fetchData\)/, "filter: `project_id=eq.${currentProject.id}` }, fetchData)");
content = content.replace(/filter: \`project_id=eq\.\\\$\{currentProject\.id\}\\\`\}, fetchData\)/, "filter: `project_id=eq.${currentProject.id}` }, fetchData)");

// 3. Fix IDs
content = content.replace(/id: `ref- mos - \$\{name\}`/g, 'id: `ref-mos-${name}`');
content = content.replace(/id: `ref - ben - \$\{name\}`/g, 'id: `ref-ben-${name}`');
content = content.replace(/id: `\$\{res\.id\} - \$\{sIdx\}`/g, 'id: `${res.id}-${sIdx}`');

// 4. Fix ClassNames
content = content.replace(/p - 3 rounded - 2xl/g, 'p-3 rounded-2xl');
content = content.replace(/top - 0/g, 'top-0');
content = content.replace(/left - 0/g, 'left-0');
content = content.replace(/w - 1/g, 'w-1');
content = content.replace(/h - full/g, 'h-full');
content = content.replace(/w - full/g, 'w-full');
content = content.replace(/py - 4/g, 'py-4');
content = content.replace(/rounded - xl/g, 'rounded-xl');
content = content.replace(/font - black/g, 'font-black');
content = content.replace(/uppercase tracking - widest/g, 'uppercase tracking-widest');
content = content.replace(/hover: scale - \[1\.01\]/g, 'hover:scale-[1.01]');
content = content.replace(/transition - all/g, 'transition-all');
content = content.replace(/flex justify - center/g, 'flex justify-center');
content = content.replace(/items - center/g, 'items-center');
content = content.replace(/gap - 2/g, 'gap-2');
content = content.replace(/shadow - xl/g, 'shadow-xl');

// 5. Date formatting
content = content.replace(/\$\{d\}\s+\/\s+\$\{m\}\s+\/\s+\$\{y\}/g, '${d}/${m}/${y}');
content = content.replace(/\$\{y\}\s+-\s+\$\{m\}\s+-\s+\$\{d\}/g, '${y}-${m}-${d}');

// 6. Fix any accidental string escaping in return objects
content = content.replace(/item: `Commande du \$\{order\.date\}`/g, 'item: `Commande du ${order.date}`');

fs.writeFileSync(filePath, content);
console.log('Final cleanup of orders/page.tsx done');
