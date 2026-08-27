import type { Metadata } from 'next';
import { createClient } from '@supabase/supabase-js';
import PostClient from './PostClient';

const SITE_URL = 'https://makegoal.vercel.app';

const supabaseServeur = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL as string,
  process.env.NEXT_PUBLIC_SUPABASE_KEY as string
);

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const { data: post } = await supabaseServeur
    .from('articles')
    .select('titre, extrait, contenu')
    .eq('id', id)
    .single();

  const titre = post?.titre ? post.titre + ' | MakeGoal' : 'MakeGoal';
  const description = post?.extrait || (post?.contenu ? post.contenu.slice(0, 160) : 'N ap enfòme w — actualités sportives MakeGoal.');
  const url = SITE_URL + '/post/' + id;

  return {
    title: titre,
    description,
    openGraph: {
      title: post?.titre || 'MakeGoal',
      description,
      url,
      siteName: 'MakeGoal',
      type: 'article',
      images: [{ url: SITE_URL + '/post/' + id + '/opengraph-image', width: 1200, height: 630 }]
    },
    twitter: {
      card: 'summary_large_image',
      title: post?.titre || 'MakeGoal',
      description,
      images: [SITE_URL + '/post/' + id + '/opengraph-image']
    }
  };
}

export default function Page() {
  return <PostClient />;
}
