import { createServerClient } from '@/lib/supabaseServer';

const supabase = createServerClient();

export async function fetchUsers() {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, full_name, role, created_at')
    .order('created_at', { ascending: false });
    
  if (error) throw error;
  return data;
}

export async function fetchUserById(id: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', id)
    .single();
    
  if (error) throw error;
  return data;
}