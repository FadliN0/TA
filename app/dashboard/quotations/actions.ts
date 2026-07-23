'use server';

import { createClient } from '@/lib/supabaseServer';
import { revalidatePath } from 'next/cache';

type ActionResult = { success: boolean; error?: string };

export async function deleteQuotationAction(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  try {
    const { error } = await supabase.from('quotations').delete().eq('id', id);
    if (error) throw error;
    revalidatePath('/dashboard/quotations');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// Sinkronisasi harga / keterangan ke master produk (dipakai create & edit)
export async function updateProductFieldAction(
  productId: string,
  field: 'price' | 'remark',
  value: number | string,
): Promise<ActionResult> {
  const supabase = await createClient();
  try {
    const { error } = await supabase
      .from('products')
      .update({ [field]: value })
      .eq('id', productId);
    if (error) throw error;
    revalidatePath('/dashboard/products');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}