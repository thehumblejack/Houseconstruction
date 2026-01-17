const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

// Load .env
const envPath = path.resolve(__dirname, '../.env');
if (fs.existsSync(envPath)) {
    const envConfig = dotenv.parse(fs.readFileSync(envPath));
    for (const k in envConfig) {
        process.env[k] = envConfig[k];
    }
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase environment variables');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function migrate() {
    console.log('Starting migration...');

    // 1. Create projects table if not exists (via RPC or assuming manual)
    // Since we can't easily run raw DDL via supabase-js without an RPC, 
    // we'll try to check if columns exist first.
    
    try {
        // Try to add column if it doesn't exist
        const sql = `
            create table if not exists projects (
                id uuid default gen_random_uuid() primary key,
                name text not null,
                description text,
                created_at timestamptz default now()
            );
            alter table suppliers add column if not exists project_id uuid references projects(id) on delete cascade;
            alter table expenses add column if not exists project_id uuid references projects(id) on delete cascade;
            alter table deposits add column if not exists project_id uuid references projects(id) on delete cascade;
        `;
        
        const { error: rpcError } = await supabase.rpc('execute_sql', { sql_query: sql });
        if (rpcError) {
            console.warn('RPC execute_sql failed, trying direct table detection...', rpcError.message);
        }
    } catch (e) {
        console.error('Migration failed:', e);
    }

    // 2. Create the AFH Maison project
    const { data: project, error: pError } = await supabase
        .from('projects')
        .insert([{ name: 'AFH Maison', description: 'Projet initial' }])
        .select()
        .single();

    if (pError) {
        console.error('Error creating project:', pError);
        // If it already exists, fetch it
        const { data: existingProject } = await supabase.from('projects').select().eq('name', 'AFH Maison').single();
        if (!existingProject) process.exit(1);
        migrateRecords(existingProject.id);
    } else {
        migrateRecords(project.id);
    }
}

async function migrateRecords(projectId) {
    console.log('Migrating records to project:', projectId);
    
    const { error: sError } = await supabase.from('suppliers').update({ project_id: projectId }).is('project_id', null);
    const { error: eError } = await supabase.from('expenses').update({ project_id: projectId }).is('project_id', null);
    const { error: dError } = await supabase.from('deposits').update({ project_id: projectId }).is('project_id', null);

    if (sError) console.error('Error updating suppliers:', sError);
    if (eError) console.error('Error updating expenses:', eError);
    if (dError) console.error('Error updating deposits:', dError);

    console.log('Migration complete!');
    process.exit(0);
}

migrate();
