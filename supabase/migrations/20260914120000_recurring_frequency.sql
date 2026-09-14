-- Prévisions : fréquence des éléments récurrents (mensuel / trimestriel / annuel).
-- Ex. RIOTS 144$/an, domaines GoDaddy/an, PS Plus/trimestre. Défaut : mensuel
-- (compatible avec l'existant). Additif ; RLS inchangée.
alter table finance_recurring
  add column if not exists frequency text not null default 'monthly';
