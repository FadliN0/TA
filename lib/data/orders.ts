import { createServerClient } from '@/lib/supabaseServer';

export async function fetchOrders() {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from('sales_orders')
    .select('*, customers(company_name)')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function fetchOrderById(id: string) {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from('sales_orders')
    .select('*, customers(*), customer_addresses(*), sales_order_items(*, products(*))')
    .eq('id', id)
    .single();
  if (error) throw error;
  return data;
}