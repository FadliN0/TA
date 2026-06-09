import { createServerClient } from '@/lib/supabaseServer';

const supabase = createServerClient();

export async function fetchQuotations() {
  const { data, error } = await supabase
    .from('quotations')
    .select('*, customers(company_name), customer_addresses(address_type, complete_address)')
    .order('created_at', { ascending: false });
    
  if (error) throw error;
  return data;
}

export async function fetchQuotationDetails(id: string) {
  const { data, error } = await supabase
    .from('quotations')
    .select('*, customers(*), customer_addresses(*), quotation_items(*, products(*))')
    .eq('id', id)
    .single();
    
  if (error) throw error;
  return data;
}
 