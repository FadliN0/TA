import { createServerClient } from '@/lib/supabaseServer';

export async function fetchUsers() {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, full_name, role')
    .order('email');
  if (error) throw error;
  return data;
}

export async function fetchUserById(id: string) {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', id)
    .single();
  if (error) throw error;
  return data;
}