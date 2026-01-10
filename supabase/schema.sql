-- 1. Create Tables
create table if not exists suppliers (
    id text primary key, -- 'beton', 'fer', etc. (we keep string ids to match existing frontend logic for now)
    name text not null,
    description text,
    address text,
    tva text,
    tel text,
    client_name text,
    color text
);

create table if not exists expenses (
    id uuid default gen_random_uuid() primary key,
    supplier_id text references suppliers(id) on delete cascade not null,
    date text not null, -- Storing as text dd/mm/yyyy to match TS app, ideally should be date type later
    item text not null,
    quantity text,
    price numeric not null,
    status text check (status in ('paid', 'pending')),
    invoice_image text,
    
    -- Specific mostakbel fields
    code_client text,
    client text,
    adresse text,
    cin text,
    lieu_livraison text,
    date_autorisation text,
    num_autorisation text,
    date_b_commande text,
    num_b_commande text,

    -- Specific beton fields
    toupie text,
    chaufeur text,
    pompe text,
    pompiste text,
    heure text,
    adjuvant text,
    classe text,
    
    created_at timestamptz default now()
);

create table if not exists invoice_items (
    id uuid default gen_random_uuid() primary key,
    expense_id uuid references expenses(id) on delete cascade not null,
    code text,
    designation text,
    unit text,
    quantity numeric,
    unit_price numeric,
    unit_price_ht numeric,
    crt text,
    remise numeric,
    total_hre numeric,
    tva text,
    total_ttc numeric,
    
    created_at timestamptz default now()
);

create table if not exists deposits (
    id uuid default gen_random_uuid() primary key,
    supplier_id text references suppliers(id) on delete cascade not null,
    date text not null,
    amount numeric not null,
    receipt_image text,
    ref text,
    payer text,
    commercial text,
    
    created_at timestamptz default now()
);

-- 2. Insert Data
-- Suppliers
insert into suppliers (id, name, description, address, tva, tel, client_name, color) values
('beton', 'STE CAP BETON', 'Centrale à béton - BPE', 'CENTRALE: ZONE INDUSTRIELLE BENI KHIAR KM 0.5', '1453985 B/A/M/000', '27 391 000', null, 'bg-blue-600'),
('fer', 'STE MOSTAKBEL', 'Matériaux de construction & Fer', 'ZONE INDUSTRIELLE - BENI KHIAR', '040122G/A/M/000', '72 229 512', 'SAHBI HEDOUSSA', 'bg-orange-600'),
('ahmed', 'BEN HDYA', 'Matériaux de construction', 'AVENUE AL ANDALOS', '1212601F/B/C/000', '22043349', 'MOHAMED HAMZA HADJ TAIEB', 'bg-emerald-600'),
('ali', 'ALI ELYATIMI', 'Maçonnerie / Tâcheron', null, null, null, null, 'bg-indigo-600')
on conflict (id) do nothing;

-- Deposits (Mostakbel)
insert into deposits (supplier_id, date, amount, receipt_image) values
('fer', '15/11/2025', 5000.000, null),
('fer', '20/12/2025', 3000.000, null);

-- Expenses (STE CAP BETON) - Note: I will use temporary variables or just hardcode lookups if this was a script, but for raw SQL I have to rely on known IDS or standard inserts. Since I am generating the SQL, I will let UUIDs be auto-generated but I need to link items. To make this runnable as a script, I will use a CTE or simply distinct transactions. However, simpler is to just Insert and assume user runs it once. 
-- Wait, I cannot link items easily in sheer sql without returning Ids.
-- I will use a DO block to insert logic.

DO $$
DECLARE
    exp_id uuid;
BEGIN
    -- STE CAP BETON
    -- b4
    INSERT INTO expenses (supplier_id, date, item, client, quantity, price, status, pompiste)
    VALUES ('beton', '14/12/2025', 'REÇU 0000476', 'HAMZA HADJ TAIEB', 'ACOMPTE VIRS.', 3900.000, 'paid', 'WISSEM AB DELAZIZ');
    
    -- b3
    INSERT INTO expenses (supplier_id, date, item, code_client, client, lieu_livraison, quantity, price, status, toupie, chaufeur, pompe, pompiste, heure, adjuvant, classe)
    VALUES ('beton', '03/01/2026', 'BL 000020', '963520', 'ALI--ELYATIMIE', 'MREZGZA A', '10.50 m3', 2100.000, 'paid', '0024 (2231 TU 241)', 'MED ATIGUE', '0014 (8260 TU 196)', 'NADER NOUAJAA', '09:38:00', 'PLX40 (0.6%)', 'C25/30 EQ 350 CPA 42.5 DMAX 20')
    RETURNING id INTO exp_id;
    
    INSERT INTO invoice_items (expense_id, code, designation, unit, quantity, unit_price, total_ttc)
    VALUES (exp_id, 'B5', 'C25/30 EQ 350 CPA 42.5 DMAX 20', 'M3', 10.5, 200.000, 2100.000);

    -- b2
    INSERT INTO expenses (supplier_id, date, item, code_client, client, lieu_livraison, quantity, price, status, toupie, chaufeur, pompe, pompiste, heure, adjuvant, classe)
    VALUES ('beton', '03/01/2026', 'BL 000019', '963520', 'ALI--ELYATIMIE', 'MREZGZA A', '10.50 m3', 2100.000, 'paid', '0019 (4098 TU 231)', 'KAMAL SARDOUK', '0014 (8260 TU 196)', 'NADER NOUAJAA', '09:15:00', 'PLX40 (0.6%)', 'C25/30 EQ 350 CPA 42.5 DMAX 20')
    RETURNING id INTO exp_id;

    INSERT INTO invoice_items (expense_id, code, designation, unit, quantity, unit_price, total_ttc)
    VALUES (exp_id, 'B5', 'C25/30 EQ 350 CPA 42.5 DMAX 20', 'M3', 10.5, 200.000, 2100.000);

    -- b1
    INSERT INTO expenses (supplier_id, date, item, code_client, client, lieu_livraison, quantity, price, status, toupie, chaufeur, pompe, pompiste, heure, adjuvant, classe)
    VALUES ('beton', '03/01/2026', 'BL 000018', '963520', 'ALI--ELYATIMIE', 'MREZGZA A', '11.00 m3', 2200.000, 'paid', '0021 (8804 TU 240)', 'HAITHEM ZAYENIE', '0014 (8260 TU 196)', 'NADER NOUAJAA', '09:03:00', 'PLX40 (0.6%)', 'C25/30 EQ 350 CPA 42.5 DMAX 20')
    RETURNING id INTO exp_id;

    INSERT INTO invoice_items (expense_id, code, designation, unit, quantity, unit_price, total_ttc)
    VALUES (exp_id, 'B5', 'C25/30 EQ 350 CPA 42.5 DMAX 20', 'M3', 11.00, 200.000, 2200.000);

    -- STE MOSTAKBEL
    -- m1
    INSERT INTO expenses (supplier_id, date, item, code_client, client, adresse, cin, lieu_livraison, date_autorisation, date_b_commande, quantity, price, status)
    VALUES ('fer', '31/12/2025', '2518114', '6505', 'SAHBI HEDOUSSA', 'AHF CITE EL WAFA MREZGHA NABEU', '01692387', 'SIEGE', '29/12/2025', '31/12/2025', 'Lot', 2698.042, 'paid')
    RETURNING id INTO exp_id;

    INSERT INTO invoice_items (expense_id, code, designation, crt, unit, quantity, unit_price_ht, remise, total_hre, tva, unit_price, total_ttc)
    VALUES 
    (exp_id, '2526074', 'CONCASAGE 04', '', 'T', 18, 28.011, 0, 504.198, '19%', 33.333, 599.998),
    (exp_id, '2526380', 'TREILLIS SOUDES 15/15/5', '33.00', 'PCE', 33, 40.756, 0, 1344.948, '19%', 48.499, 1600.485),
    (exp_id, '2526380', 'BACHE AGRICOLE', '', 'UNI', 50.900, 9.945, 22, 394.836, '19%', 9.230, 469.851);

    -- m3
    INSERT INTO expenses (supplier_id, date, item, code_client, client, adresse, cin, lieu_livraison, date_autorisation, date_b_commande, quantity, price, status)
    VALUES ('fer', '07/01/2026', '2600130', '6505', 'SAHBI HEDOUSSA', 'AHF CITE EL WAFA MREZGHA NABEU', '01692387', 'SIEGE', '29/12/2025', '05/01/2026', 'Lot Matériaux', 1966.014, 'paid')
    RETURNING id INTO exp_id;
    
    INSERT INTO invoice_items (expense_id, code, designation, unit, quantity, unit_price_ht, remise, total_hre, tva, unit_price, total_ttc)
    VALUES
    (exp_id, '2600038', 'PLAQUE POLYST 1M/1M EP 2CM D16', 'M3', 12, 5.722, 0, 68.664, '19%', 6.809, 81.710),
    (exp_id, '2600267', 'BRIQUE DE 8 BCM EN 224 P', 'PCE', 672, 0.638, 0, 428.736, '19%', 0.759, 510.198),
    (exp_id, '2600267', 'CIMENT CPA 42.5 N CJO', 'PCE', 2, 260.631, 0, 521.262, '19%', 310.152, 620.304),
    (exp_id, '2600269', 'SABLE SUPER M3', 'M3', 7, 42.016, 0, 294.112, '19%', 49.999, 349.993),
    (exp_id, '2600271', 'GRAVIER 04/15', 'PCE', 7, 44.417, 0, 310.919, '19%', 52.856, 369.998),
    (exp_id, 'REDEV', 'REDEVANCE COMPENSATRICE', 'UNI', 2, 2.000, 0, 4.000, '0%', 2.000, 4.000),
    (exp_id, 'FONDS', 'FONDS DE SOUTIEN', 'UNI', 2, 1.000, 0, 2.000, '0%', 1.000, 2.000),
    (exp_id, 'TRANS', 'TRANSPORT 8', 'UNI', 2, 6.402, 0, 12.804, '7%', 6.850, 13.700),
    (exp_id, 'AVIMP', 'AV/IMPOT', 'UNI', 1, 13.119, 0, 13.119, '0%', 13.119, 13.119),
    (exp_id, 'TIMBRE', 'TIMBRE', 'UNI', 1, 1.000, 0, 1.000, '0%', 1.000, 1.000);

    -- m2
    INSERT INTO expenses (supplier_id, date, item, code_client, client, adresse, cin, lieu_livraison, date_autorisation, date_b_commande, quantity, price, status)
    VALUES ('fer', '07/01/2026', 'BON FER 260010 (Partiel)', '6505', 'SAHBI HEDOUSSA', 'AHF CITE EL WAFA MREZGHA NABEU', '01692387', 'SIEGE', '29/12/2025', '07/01/2026', 'Lot Fer 6-10-12', 5223.241, 'paid')
    RETURNING id INTO exp_id;

    INSERT INTO invoice_items (expense_id, code, designation, crt, unit, quantity, unit_price_ht, remise, total_hre, tva, unit_price, total_ttc)
    VALUES
    (exp_id, 'FER06', 'FER ROND DE 06/', '0.500', 'T', 0.500, 2226.891, 0, 1113.446, '19%', 2650.000, 1325.000),
    (exp_id, 'FER10', 'FER ROND DE 10/', '0.504', 'T', 0.504, 2202.372, 0, 1060.046, '19%', 2502.885, 1261.454),
    (exp_id, 'FER12', 'FER ROND DE 12/', '1.020', 'T', 1.020, 2175.603, 0, 2101.502, '19%', 2451.751, 2500.787),
    (exp_id, 'FIL', 'FIL RECUIT C. (Attaché)', '0.030', 'T', 0.030, 3781.512, 0, 113.445, '19%', 4500.000, 135.000),
    (exp_id, 'TIMBRE', 'DROIT DE TIMBRE', '', 'UNI', 1, 1.000, 0, 1.000, '0%', 1.000, 1.000);

    -- BEN HDYA
    -- 1
    INSERT INTO expenses (supplier_id, date, item, quantity, price, status)
    VALUES ('ahmed', '15/12/2025', 'BL25-02481', 'Lot', 5551.029, 'paid')
    RETURNING id INTO exp_id;

    INSERT INTO invoice_items (expense_id, code, designation, unit, quantity, unit_price, total_ttc)
    VALUES
    (exp_id, 'FER10', 'FER DE 10', 'PCE', 80, 18.000, 1439.995),
    (exp_id, 'FER12', 'FER DE 12', 'PCE', 100, 25.000, 2499.952),
    (exp_id, 'FER6', 'FER DE 6', 'PCE', 500, 2.650, 1325.065),
    (exp_id, 'FILDATTACHE', 'FIL DATACHE', 'PCE', 30, 4.501, 135.017),
    (exp_id, 'CIMENTJBEL', 'CIMENT JBEL', 'PCE', 10, 15.000, 150.000);

    -- 2
    INSERT INTO expenses (supplier_id, date, item, quantity, price, status)
    VALUES ('ahmed', '18/12/2025', 'BL25-02482', 'Lot', 2176.776, 'paid')
    RETURNING id INTO exp_id;

    INSERT INTO invoice_items (expense_id, code, designation, unit, quantity, unit_price, total_ttc)
    VALUES
    (exp_id, 'GRAVIER/OM', 'GRAVIER / OM', 'PCE', 1, 110.000, 110.000),
    (exp_id, 'CIMENTCPA', 'CIMENT CPA', 'PCE', 60, 17.000, 1020.020),
    (exp_id, 'FER14', 'FER DE 14', 'PCE', 4, 36.500, 145.998),
    (exp_id, 'SABLE/OM', 'SABLE OM', 'PCE', 3, 90.000, 269.999),
    (exp_id, 'CHARIOT', 'CHARIOT', 'PCE', 1, 25.000, 25.000),
    (exp_id, 'BRIQUE12', 'BRIQUE 12', 'PCE', 840, 0.720, 604.758);

    -- 3
    INSERT INTO expenses (supplier_id, date, item, quantity, price, status)
    VALUES ('ahmed', '29/12/2025', 'BL25-02483', 'Lot', 1370.171, 'paid')
    RETURNING id INTO exp_id;

    INSERT INTO invoice_items (expense_id, code, designation, unit, quantity, unit_price, total_ttc)
    VALUES
    (exp_id, 'GRAVIER/OM', 'GRAVIER / OM', 'PCE', 2, 110.000, 220.000),
    (exp_id, 'BRIQUE12', 'BRIQUE 12', 'PCE', 360, 0.720, 259.182),
    (exp_id, 'CIMENTJBEL', 'CIMENT JBEL', 'PCE', 20, 15.000, 299.999),
    (exp_id, 'SABLE/OM', 'SABLE OM', 'PCE', 1, 90.000, 90.000),
    (exp_id, 'FER12', 'FER DE 12', 'PCE', 20, 25.000, 499.990);

    -- 4
    INSERT INTO expenses (supplier_id, date, item, quantity, price, status)
    VALUES ('ahmed', '30/12/2025', 'BL25-02486', '50 pcs', 36.998, 'paid')
    RETURNING id INTO exp_id;

    INSERT INTO invoice_items (expense_id, code, designation, unit, quantity, unit_price, total_ttc)
    VALUES
    (exp_id, 'BRIQUE12', 'BRIQUE 12', 'PCE', 50, 0.720, 35.998);

    -- ALI ELYATIMI
    INSERT INTO expenses (supplier_id, date, item, quantity, price, status)
    VALUES 
    ('ali', '09/01/2026', 'Paiement Fondation et Chappes', 'Tranche 4', 4000.000, 'paid'),
    ('ali', '07/01/2026', 'Paiement Fondation et Chappes', 'Tranche 3', 4000.000, 'paid'),
    ('ali', '05/01/2026', 'Paiement Fondation et Chappes', 'Tranche 2', 8000.000, 'paid'),
    ('ali', '??', 'Avance sur fondations et chappes', 'Avance Fond.', 10000.000, 'paid');

END $$;
