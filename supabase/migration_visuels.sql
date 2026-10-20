-- Visuels libres (écusson, drapeau, photo joueur) pour tous les types de post.
alter table articles add column if not exists visuels jsonb;
notify pgrst, 'reload schema';
