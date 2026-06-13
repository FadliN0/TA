'use server';

import { createServerClient } from '@/lib/supabaseServer';
import { revalidatePath } from 'next/cache';


export async function deleteSalesOrderAction(id: string) {
  const supabase = createServerClient();

  const { error } = await supabase.from('sales_orders').delete().eq('id', id);
  if (error) throw new Error(error.message);

  revalidatePath('/dashboard/sales-orders');
  return { success: true };
}