'use server';

import { createServerClient } from '@/lib/supabaseServer';
import { revalidatePath } from 'next/cache';


export async function updateSalesOrderStatusAction(id: string, newStatus: string) {
  if (newStatus === 'Completed') {
    throw new Error(
      'Status Completed hanya bisa diubah otomatis oleh sistem ketika semua Surat Jalan (DO) sudah terkirim!'
    );
  }

  const supabase = createServerClient();

  // Validasi server-side: cegah pembatalan jika sudah ada DO / Invoice
  if (newStatus === 'Cancelled') {
    const [{ count: doCount }, { count: invCount }] = await Promise.all([
      supabase.from('delivery_orders').select('id', { count: 'exact', head: true }).eq('so_id', id),
      supabase.from('invoices').select('id', { count: 'exact', head: true }).eq('so_id', id),
    ]);
    if ((doCount || 0) > 0 || (invCount || 0) > 0) {
      throw new Error(
        'Tidak bisa membatalkan SO ini karena Surat Jalan (DO) atau Invoice sudah diterbitkan!'
      );
    }
  }

  const { error } = await supabase.from('sales_orders').update({ status: newStatus }).eq('id', id);
  if (error) throw new Error(error.message);

  revalidatePath(`/dashboard/sales-orders/${id}`);
  revalidatePath('/dashboard/sales-orders');
  return { success: true, status: newStatus };
}

/**
 * Terbitkan Invoice penagihan dari sebuah SO.
 * Nomor invoice & seluruh rincian digenerate oleh stored procedure
 * 'generate_full_invoice_from_so' (due date default 30 hari).
 */
export async function createInvoiceFromSoAction(id: string) {
  const supabase = createServerClient();

  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + 30);
  const formattedDueDate = dueDate.toISOString().split('T')[0];

  const { data, error } = await supabase.rpc('generate_full_invoice_from_so', {
    p_so_id: id,
    p_due_date: formattedDueDate,
  });

  if (error) throw new Error(error.message || error.details);

  revalidatePath(`/dashboard/sales-orders/${id}`);
  revalidatePath('/dashboard/invoices');
  return { invoice_number: data?.invoice_number as string };
}