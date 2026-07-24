import AddUserClient from './AddUserClient';
import { createClient} from '@/lib/supabaseServer';
import { redirect } from 'next/navigation'

export default async function UserManagementPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/dashboard/users');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();
  
  if (profile?.role?.toLowerCase() !== 'atasan') {
    redirect('/dashboard/users');
  }

  return <AddUserClient />;
}