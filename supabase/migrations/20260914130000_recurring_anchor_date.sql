-- Prévisions : date de référence pour calculer la prochaine échéance des
-- éléments trimestriels et annuels (ex. RIOTS dû le 15 mars → prochaine
-- occurrence calculée à partir de là). Nullable ; le mensuel utilise le jour.
alter table finance_recurring
  add column if not exists anchor_date date;
