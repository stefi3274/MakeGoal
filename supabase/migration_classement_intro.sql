-- Page d'ouverture de la vidéo du classement : photo à la place de la coupe et titre au choix.
alter table public.articles add column if not exists classement_photo text;
alter table public.articles add column if not exists classement_intro text;
