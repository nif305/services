import { redirect } from 'next/navigation';

export default function CleaningRedirectPage() {
  redirect('/services/suggestions?type=CLEANING');
}
