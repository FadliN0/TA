import { createServerClient } from '@/lib/supabaseServer';

const supabase = createServerClient();

export async function fetchSalesOrders() {
  const { data, error } = await supabase
    .from('sales_orders')
    .select('*, customers(company_name), customer_addresses(address_type, complete_address)')
    .order('created_at', { ascending: false });
    
  if (error) throw error;
  return data;
}

export async function fetchSalesOrderDetails(id: string) {
  const { data, error } = await supabase
    .from('sales_orders')
    .select('*, customers(*), customer_addresses(*), sales_order_items(*, products(*))')
    .eq('id', id)
    .single();
    
  if (error) throw error;
  return data;
}