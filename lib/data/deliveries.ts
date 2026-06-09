import { createServerClient } from '@/lib/supabaseServer';

export async function fetchDeliveries() {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from('delivery_orders')
    .select('*, sales_orders(so_number, customers(company_name)), delivery_order_items(*)')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function fetchDeliveryById(id: string) {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from('delivery_orders')
    .select('*, customer_addresses(*), sales_orders(*, customers(*)), delivery_order_items(*, sales_order_items(*, products(*)))')
    .eq('id', id)
    .single();
  if (error) throw error;
  return data;
}