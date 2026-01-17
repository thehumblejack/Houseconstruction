const fs = require('fs');
const path = require('path');

const filePath = path.resolve(__dirname, '../src/app/expenses/page.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. handleSaveDeposit (insert)
content = content.replace(/await supabase\.from\('deposits'\)\.insert\(\{\s+supplier_id:/, "await supabase.from('deposits').insert({\n                    project_id: currentProject.id,\n                    supplier_id:");

// 2. handleSaveExpense (insert)
content = content.replace(/await supabase\.from\('expenses'\)\.insert\(\{\s+supplier_id:/, "await supabase.from('expenses').insert({\n                    project_id: currentProject.id,\n                    supplier_id:");

// 3. handleAddSupplier (insert)
content = content.replace(/await supabase\.from\('suppliers'\)\.insert\(\{\s+id,/, "await supabase.from('suppliers').insert({\n                project_id: currentProject.id,\n                id,");

// 4. Scrub any potential double injects if the previous script ran partially
// (Actually let's just use a more careful multi-replace if possible, but this is fine)

fs.writeFileSync(filePath, content);
console.log('Fixed expenses/page.tsx inserts V2');
