import { createServerClient } from '@/lib/supabaseServer';

export async function fetchQuotations() {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from('quotations')
    .select('*, customers(company_name)')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function fetchQuotationById(id: string) {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from('quotations')
    .select('*, customers(*), customer_addresses(*), quotation_items(*, products(*))')
    .eq('id', id)
    .single();
  if (error) throw error;
  return data;
}