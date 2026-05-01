import { redirect } from 'next/navigation';

export default function RootPage() {
  // Langsung arahkan siapa pun yang membuka rute utama "/" ke rute "/dashboard"
  redirect('/dashboard');
}