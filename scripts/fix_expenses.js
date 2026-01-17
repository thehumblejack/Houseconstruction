const fs = require('fs');
const path = require('path');

const filePath = path.resolve(__dirname, '../src/app/expenses/page.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// Use currentProject.id for ALL relevant inserts

// 1. handleAddExpense
content = content.replace(/await supabase\.from\('expenses'\)\.insert\(\{/, "await supabase.from('expenses').insert({\n                project_id: currentProject.id,");

// 2. handleSaveDeposit
content = content.replace(/await supabase\.from\('deposits'\)\.insert\(\{/, "await supabase.from('deposits').insert({\n                    project_id: currentProject.id,");

// 3. handleSaveExpense (insert)
content = content.replace(/await supabase\.from\('expenses'\)\.insert\(\{/, "await supabase.from('expenses').insert({\n                    project_id: currentProject.id,");

// 4. handleAddSupplier
content = content.replace(/await supabase\.from\('suppliers'\)\.insert\(\{/, "await supabase.from('suppliers').insert({\n                project_id: currentProject.id,");

// 5. handleManualSubmitNew (insert into uploaded_documents)
content = content.replace(/await supabase\s+\.from\('uploaded_documents'\)\s+\.insert\(\{/, "await supabase\n                        .from('uploaded_documents')\n                        .insert({\n                            project_id: currentProject.id,");

fs.writeFileSync(filePath, content);
console.log('Fixed expenses/page.tsx inserts');
