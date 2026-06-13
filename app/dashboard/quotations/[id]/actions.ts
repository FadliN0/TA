'use server';

import { createServerClient } from '@/lib/supabaseServer';
import { revalidatePath } from 'next/cache';

type ActionResult = { success: boolean; error?: string };

export async function updateQuotationStatusAction(
  id: string,
  newStatus: string,
): Promise<ActionResult> {
  const supabase = createServerClient();
  try {
    const { error } = await supabase
      .from('quotations')
      .update({ status: newStatus })
      .eq('id', id);
    if (error) throw error;
    revalidatePath(`/dashboard/quotations/${id}`);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

type GenerateSOPayload = {
  quotationId: string;
  poNumber: string;
  customerId: string;
  addressId: string;
  grandTotal: number;
  items: any[];
};

export async function generateSalesOrderAction(
  payload: GenerateSOPayload,
): Promise<{ success: boolean; data?: any; error?: string }> {
  const supabase = createServerClient();
  try {
    const { data, error } = await supabase.rpc('generate_sales_order', {
      p_quotation_id: payload.quotationId,
      p_po_number: payload.poNumber,
      p_customer_id: payload.customerId,
      p_address_id: payload.addressId,
      p_grand_total: payload.grandTotal,
      p_items: payload.items,
    });
    if (error) throw error;
    revalidatePath(`/dashboard/quotations/${payload.quotationId}`);
    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}