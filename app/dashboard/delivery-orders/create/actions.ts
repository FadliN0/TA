'use server';
import { createServerClient } from '@/lib/supabaseServer';
import { revalidatePath } from 'next/cache';

export async function createDeliveryOrderAction(
  so_id: string,
  address_id: string,
  items: Array<{ so_item_id: string; qty_delivered: number }>,
) {
  const supabase = createServerClient();
  const today = new Date().toISOString().split('T')[0];

  const { data, error } = await supabase.rpc('create_do_transaction', {
    p_so_id: so_id,
    p_address_id: address_id,
    p_delivery_date: today,
    p_items: items,
  });

  if (error) throw new Error(error.message || 'Gagal menyimpan Surat Jalan');

  revalidatePath('/dashboard/delivery-orders');
  revalidatePath(`/dashboard/sales-orders/${so_id}`);
  return { success: true, do_id: data?.do_id as string };
}