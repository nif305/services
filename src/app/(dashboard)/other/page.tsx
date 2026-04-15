import { redirect } from 'next/navigation';

export default function OtherRedirectPage() {
  redirect('/services/suggestions?type=OTHER');
}
