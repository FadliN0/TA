import { createServerClient } from '@/lib/supabaseServer';

const supabase = createServerClient();

export async function fetchDeliveryOrders() {
  const { data, error } = await supabase
  .from('delivery_orders')
  .select('*, sales_orders(so_number), customer_addresses(address_type, complete_address)')
  .order('delivery_date', { ascending: false });
  if (error) throw error;
  return data;
}

export async function fetchDeliveryOrderDetails(id: string) {
  const { data, error } = await supabase
    .from('delivery_orders')
    .select('*, customer_addresses(*), delivery_order_items(*, sales_order_items(*, products(*)))')
    .eq('id', id)
    .single();
  if (error) throw error;
  return data;
}