import { createServerClient } from '@/lib/supabaseServer';

const supabase = createServerClient();

export async function fetchInvoices() {
  const { data, error } = await supabase
  .from('invoices')
  .select('*, sales_orders(so_number, customers(company_name))')
  .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function fetchInvoiceDetails(id: string) {
  const { data, error } = await supabase
    .from('invoices')
    .select('*, invoice_items(*, sales_order_items(*, products(*))), payments(*)')
    .eq('id', id)
    .single();
  if (error) throw error;
  return data;
}