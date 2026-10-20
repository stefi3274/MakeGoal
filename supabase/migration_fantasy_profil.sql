-- Profil d'équipe Fantasy personnalisable : emblème et deux couleurs (maillot).
alter table fantasy_equipes add column if not exists couleur1 text;
alter table fantasy_equipes add column if not exists couleur2 text;
alter table fantasy_equipes add column if not exists embleme text;
notify pgrst, 'reload schema';
