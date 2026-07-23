'use server';

import { createClient } from '@/lib/supabaseServer';
import { revalidatePath } from 'next/cache';

type ActionResult = { success: boolean; error?: string };

type BulkProduct = {
  part_code: string;
  part_name: string;
  unit: string;
  price: number;
  remark: string;
};

export async function bulkCreateProductsAction(
  payload: BulkProduct[],
): Promise<ActionResult> {
  const supabase = await createClient();
  try {
    const { error } = await supabase.from('products').insert(payload);
    if (error) {
      if (error.code === '23505') {
        return {
          success: false,
          error: 'Ada Part Code duplikat yang terdeteksi oleh database.',
        };
      }
      throw error;
    }
    revalidatePath('/dashboard/products');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}