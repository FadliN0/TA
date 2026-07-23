'use server';

import { createClient } from '@/lib/supabaseServer';
import { revalidatePath } from 'next/cache';

type ActionResult = { success: boolean; error?: string };

type UpdateQuotationPayload = {
  customerId: string;
  addressId: string;
  validUntil: string;
  mrNumber: string;
  notes: string;
  grandTotal: number;
  items: any[];
};

export async function updateQuotationAction(
  id: string,
  payload: UpdateQuotationPayload,
): Promise<ActionResult> {
  const supabase = await createClient();
  try {
    const { error: qErr } = await supabase
      .from('quotations')
      .update({
        customer_id: payload.customerId,
        address_id: payload.addressId,
        valid_until: payload.validUntil,
        mr_number: payload.mrNumber,
        notes: payload.notes,
        grand_total: payload.grandTotal,
        status: 'Draft',
      })
      .eq('id', id);
    if (qErr) throw qErr;

    const { error: delErr } = await supabase
      .from('quotation_items')
      .delete()
      .eq('quotation_id', id);
    if (delErr) throw delErr;

    const { error: iErr } = await supabase
      .from('quotation_items')
      .insert(payload.items);
    if (iErr) throw iErr;

    revalidatePath(`/dashboard/quotations/${id}`);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}