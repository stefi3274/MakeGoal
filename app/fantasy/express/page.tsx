import { redirect } from 'next/navigation';

// L'ancien mode « Express » est devenu le seul mode de MakeGoal Fantasy.
export default function FantasyExpress() {
  redirect('/fantasy');
}
