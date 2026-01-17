const fs = require('fs');
const path = require('path');

const filePath = path.resolve(__dirname, '../src/app/orders/page.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Fix template literals in logical parts
content = content.replace(/\$\{\s+/g, '${');
content = content.replace(/\s+\}/g, '}');
content = content.replace(/\$\\{/g, '${'); // Handle double escaped if any

// 2. Fix formatted dates (some had spaces)
content = content.replace(/formattedDate = `$\{ d\} \/ $\{ m\} \/ $\{ y\}`/g, 'formattedDate = ');
content = content.replace(/dateVal = `$\{ y\} - $\{ m\} - $\{ d\}`/g, 'dateVal = ');

// 3. Fix project filtering backticks in realtime subscribe (if still broken)
content = content.replace(/filter: `project_id=eq\.\$\{currentProject\.id\\\}`/g, 'filter: ');
// The user fix might have changed it, let's look for what's actually there
content = content.replace(/filter: `project_id=eq\.\$\{currentProject\.id\}`/g, 'filter: ');

// 4. Inject project_id into inserts
// In handleSaveOrder -> orders insert
content = content.replace(/\.from\('orders'\)\s+\.insert\(\{\s+supplier_id: newOrder\.supplierId,/, ".from('orders').insert({\n                        project_id: currentProject.id,\n                        supplier_id: newOrder.supplierId,");

// In handleUpdateStatus -> expenses insert
content = content.replace(/\.from\('expenses'\)\.insert\(\{\s+supplier_id: order\.supplier_id,/, ".from('expenses').insert({\n                    project_id: currentProject.id,\n                    supplier_id: order.supplier_id,");

// In handleUpdateStatus -> invoice_items insert
content = content.replace(/const invoiceItems = order\.items\.map\(i => \(\{/, "const invoiceItems = order.items.map(i => ({\n                        project_id: currentProject.id,");

// 5. Fix remaining weird classNames with spaces
content = content.replace(/p - 3/g, 'p-3').replace(/rounded - 2xl/g, 'rounded-2xl').replace(/rounded - xl/g, 'rounded-xl');
content = content.replace(/w - full/g, 'w-full').replace(/h - full/g, 'h-full');
content = content.replace(/top - 0/g, 'top-0').replace(/left - 0/g, 'left-0');
content = content.replace(/bg - amber - 100/g, 'bg-amber-100').replace(/text - amber - 600/g, 'text-amber-600');
content = content.replace(/bg - blue - 100/g, 'bg-blue-100').replace(/text - blue - 600/g, 'text-blue-600');
content = content.replace(/hover: scale - \[1\.01\]/g, 'hover:scale-[1.01]');

fs.writeFileSync(filePath, content);
console.log('Fixed orders/page.tsx V4');
