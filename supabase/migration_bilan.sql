-- Bilan historique entre deux équipes (totaux : victoires, nuls, buts).
alter table articles add column if not exists bilan_historique jsonb;
notify pgrst, 'reload schema';
