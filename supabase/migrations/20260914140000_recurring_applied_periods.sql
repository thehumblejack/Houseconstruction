-- Prévisions : suivi des échéances déjà « procédées » (réglées), par période.
-- Tableau JSON de clés de période (ex. ["2026-Q2","2026-Q3"] ou ["2026-08"]).
-- Permet de cocher/décocher chaque occurrence passée dans la fenêtre d'édition,
-- indépendamment des mouvements. Additif ; défaut vide ; RLS inchangée.
alter table finance_recurring
  add column if not exists applied_periods text default '[]';
