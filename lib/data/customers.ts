import { supabase } from '@/lib/supabase';

export async function fetchCustomers() {
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .order('company_name', { ascending: true });
    
  if (error) throw error;
  return data;
}

export async function fetchCustomerDetails(id: string) {
  const { data, error } = await supabase
    .from('customers')
    .select('*, customer_addresses(*)')
    .eq('id', id)
    .single();
    
  if (error) throw error;
  return data;
}