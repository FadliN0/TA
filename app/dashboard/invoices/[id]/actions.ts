'use server';

import { createClient } from '@/lib/supabaseServer';
import { revalidatePath } from 'next/cache';

type ActionResult = { success: boolean; error?: string };

export async function saveInvoiceEditsAction(
  invoiceId: string,
  payload: {
    discountAmount: number;
    grandTotal: number;
    dueDateNote: string;
    itemNotes: Array<{ id: string; item_note: string }>;
  },
): Promise<ActionResult> {
  const supabase = await createClient();
  try {
    const { error: invErr } = await supabase
      .from('invoices')
      .update({
        discount_amount: payload.discountAmount,
        grand_total: payload.grandTotal,
        due_date_note: payload.dueDateNote,
      })
      .eq('id', invoiceId);
    if (invErr) throw invErr;

    const results = await Promise.all(
      payload.itemNotes.map((note) =>
        supabase
          .from('invoice_items')
          .update({ item_note: note.item_note })
          .eq('id', note.id),
      ),
    );
    const failed = results.find((res) => res.error);
    if (failed?.error) {
      return {
        success: false,
        error: 'Diskon tersimpan, tetapi sebagian catatan gagal diperbarui.',
      };
    }

    revalidatePath(`/dashboard/invoices/${invoiceId}`);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function recordPaymentAction(
  invoiceId: string,
  payload: {
    amountPaid: number;
    paymentDate: string;
    referenceNumber: string | null;
  },
): Promise<ActionResult> {
  const supabase = await createClient();
  try {
    const { error } = await supabase.from('payments').insert({
      invoice_id: invoiceId,
      amount_paid: payload.amountPaid,
      payment_date: payload.paymentDate,
      payment_method: 'Transfer Bank',
      reference_number: payload.referenceNumber,
      payment_proof_url: null,
    });
    if (error) throw error;

    revalidatePath(`/dashboard/invoices/${invoiceId}`);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function cancelInvoiceAction(
  invoiceId: string,
  reason: string,
): Promise<ActionResult> {
  const supabase = await createClient();
  try {
    const { error } = await supabase.rpc('cancel_invoice', {
      p_invoice_id: invoiceId,
      p_reason: reason,
    });
    if (error) throw error;

    revalidatePath(`/dashboard/invoices/${invoiceId}`);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}