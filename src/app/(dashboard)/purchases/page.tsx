import { redirect } from 'next/navigation';

export default function PurchasesRedirectPage() {
  redirect('/services/suggestions?type=PURCHASE');
}
