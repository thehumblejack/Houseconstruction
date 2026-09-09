-- ============================================================================
-- Finance — paiements partiels sur créances & dettes
--
-- Chaque versement est un mouvement (finance_movements) relié à sa dette via
-- debt_id. Reste à régler = montant de la dette − Σ versements reliés.
-- Si la dette est supprimée, les mouvements restent (lien mis à null) : on ne
-- perd jamais un enregistrement d'argent. Additif ; RLS existante inchangée.
-- ============================================================================

alter table finance_movements
  add column if not exists debt_id uuid references finance_debts(id) on delete set null;

create index if not exists idx_finance_movements_debt on finance_movements(debt_id);
