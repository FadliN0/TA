'use server';

import { createClient } from '@/lib/supabaseServer';
import { revalidatePath } from 'next/cache';

type ActionResult = { success: boolean; error?: string };

type CreateQuotationPayload = {
  quotationNumber: string;
  customerId: string;
  addressId: string;
  validUntil: string;
  mrNumber: string | null;
  grandTotal: number;
  notes: string | null;
  items: any[];
};

export async function getCustomerAddressesAction(customerId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('customer_addresses')
    .select('*')
    .eq('customer_id', customerId);

  if (error) {
    console.error('Gagal mengambil alamat:', error.message);
    return [];
  }
  return data || [];
}

export async function createQuotationAction(
  payload: CreateQuotationPayload,
): Promise<ActionResult> {
  const supabase = await createClient();
  try {
    const { error } = await supabase.rpc('create_quotation_transaction', {
      p_quotation_number: payload.quotationNumber,
      p_customer_id: payload.customerId,
      p_address_id: payload.addressId,
      p_valid_until: payload.validUntil,
      p_mr_number: payload.mrNumber,
      p_grand_total: payload.grandTotal,
      p_notes: payload.notes,
      p_items: payload.items,
    });
    if (error) throw error;
    revalidatePath('/dashboard/quotations');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}