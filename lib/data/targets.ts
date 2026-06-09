import { createServerClient } from '@/lib/supabaseServer';

export async function fetchCompanyTarget(month: number, year: number) {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from('company_targets')
    .select('*')
    .eq('month', month)
    .eq('year', year)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function fetchCustomerTargets(month: number, year: number) {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from('customer_targets')
    .select('*, customers(company_name)')
    .eq('month', month)
    .eq('year', year);
  if (error) throw error;
  return data;
}