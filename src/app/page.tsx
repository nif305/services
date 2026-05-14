import { redirect } from 'next/navigation';

export default function DashboardRedirectPage() {
  redirect('/services/requests');
}
