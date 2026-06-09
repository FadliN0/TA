import { createServerClient } from '@/lib/supabaseServer';

const supabase = createServerClient();

export async function fetchCompanyTargets() {
  const { data, error } = await supabase.from('company_targets').select('*').order('target_year', { ascending: false });
  if (error) throw error;
  return data;
}

export async function fetchCustomerTargets() {
  const { data, error } = await supabase.from('customer_targets').select('*, customers(company_name)').order('target_year', { ascending: false });
  if (error) throw error;
  return data;
}