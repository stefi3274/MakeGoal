import { ImageResponse } from 'next/og';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'edge';
export const alt = 'MakeGoal';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const VIOLET = '#bf00ff';
const ORANGE = '#ff7a00';
const LOGO_URL = 'https://giflxfycfqanyfaeoedz.supabase.co/storage/v1/object/public/images/logo%20makegoal.jpg';

const supabaseServeur = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL as string,
  process.env.NEXT_PUBLIC_SUPABASE_KEY as string
);

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { data: post } = await supabaseServeur.from('articles').select('*').eq('id', id).single();

  const couleur = post?.sport === 'basketball' ? ORANGE : VIOLET;
  const titre = post?.titre || 'MakeGoal';

  let banniere = '';
  if (post?.quarts_temps?.length || (post?.resultat_details && (post.resultat_details.buts?.length || post.resultat_details.rouges?.length || post.resultat_details.jaunes?.length))) banniere = 'RÉSULTAT DE MATCH';
  else if (post?.classement_type) banniere = 'CLASSEMENT';
  else if (post?.distinction_type === 'Meilleur buteur') banniere = 'MEILLEUR BUTEUR';
  else if (post?.distinction_type === 'Meilleur passeur') banniere = 'MEILLEUR PASSEUR';
  else if (post?.distinction_type) banniere = 'DISTINCTION';
  else if (post?.stats_joueur?.joueurs?.length) banniere = post.stats_joueur.mode === 'comparaison' ? 'COMPARAISON JOUEURS' : 'STATS JOUEUR';
  else if (post?.matchs_jour?.length) banniere = 'MATCHS DU JOUR';

  const aScore = post?.equipe1 && post?.equipe2;

  return new ImageResponse(
    (
      <div style={{ height: '100%', width: '100%', display: 'flex', flexDirection: 'column', background: '#08080b', padding: '64px', position: 'relative' }}>
        <div style={{ position: 'absolute', top: -140, left: -140, width: 480, height: 480, background: couleur, opacity: 0.28, borderRadius: '50%', display: 'flex' }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginBottom: 36 }}>
          <img src={LOGO_URL} width={64} height={64} style={{ borderRadius: 14 }} />
          <div style={{ color: '#fff', fontWeight: 900, fontSize: 38 }}>MakeGoal</div>
        </div>

        {banniere && (
          <div style={{ display: 'flex', background: couleur, color: '#fff', fontWeight: 900, fontSize: 24, padding: '12px 28px', borderRadius: 999, marginBottom: 36, alignSelf: 'flex-start' }}>{banniere}</div>
        )}

        {aScore ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 48, flex: 1 }}>
            <div style={{ display: 'flex', color: '#fff', fontSize: 48, fontWeight: 900, textAlign: 'center', flex: 1, justifyContent: 'center' }}>{post.equipe1}</div>
            <div style={{ display: 'flex', color: couleur, fontSize: 72, fontWeight: 900 }}>
              {post.score1 !== null && post.score1 !== undefined ? post.score1 + ' - ' + post.score2 : 'VS'}
            </div>
            <div style={{ display: 'flex', color: '#fff', fontSize: 48, fontWeight: 900, textAlign: 'center', flex: 1, justifyContent: 'center' }}>{post.equipe2}</div>
          </div>
        ) : (
          <div style={{ display: 'flex', color: '#fff', fontSize: 52, fontWeight: 900, flex: 1, alignItems: 'center', lineHeight: 1.2 }}>{titre}</div>
        )}

        <div style={{ display: 'flex', color: couleur, fontSize: 26, fontWeight: 700 }}>N ap enfòme w</div>
      </div>
    ),
    { ...size }
  );
}
