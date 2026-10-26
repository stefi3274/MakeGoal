-- Hook (phrase d'accroche au début de chaque vidéo) : posts et FootQuizz.
alter table articles add column if not exists hook text;
alter table quizz_foot add column if not exists hook text;
notify pgrst, 'reload schema';
