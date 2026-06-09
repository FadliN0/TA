import { createServerClient } from '@/lib/supabaseServer';

export async function fetchCustomers() {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from('customers')
    .select('*, customer_addresses(*)')
    .order('company_name');
  if (error) throw error;
  return data;
}

export async function fetchCustomerById(id: string) {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from('customers')
    .select('*, customer_addresses(*)')
    .eq('id', id)
    .single();
  if (error) throw error;
  return data;
}