"use server";
import { createClient } from '@/lib/supabaseServer';
import { revalidatePath } from 'next/cache';

// Fungsi 1: Simpan Target Perusahaan
export async function saveCompanyTargetAction(month: number, year: number, target_amount: number) {
  const supabase = await createClient();
  
  // Logika Upsert/Delete/Insert persis seperti kode lama Anda, tapi jalan di Server
  const { error: upsertErr } = await supabase
    .from('company_targets')
    .upsert({ month, year, target_amount }, { onConflict: 'month,year' });

  if (upsertErr) {
    await supabase.from('company_targets').delete().eq('month', month).eq('year', year);
    const { error: insertErr } = await supabase.from('company_targets').insert({ month, year, target_amount });
    if (insertErr) throw new Error(insertErr.message);
  }

  // Wajib! Memberitahu Next.js untuk memperbarui halaman
  revalidatePath('/dashboard/customer-targets'); 
  return { success: true };
}

// Fungsi 2: Simpan Target Pelanggan
export async function saveCustomerTargetAction(customerId: string, month: number, year: number, target_amount: number) {
  const supabase = await createClient();
  
  const { error: upsertErr } = await supabase
    .from('customer_targets')
    .upsert({ customer_id: customerId, month, year, target_amount }, { onConflict: 'customer_id,month,year' });

  if (upsertErr) {
    await supabase.from('customer_targets').delete().eq('customer_id', customerId).eq('month', month).eq('year', year);
    const { error: insertErr } = await supabase.from('customer_targets').insert({ customer_id: customerId, month, year, target_amount });
    if (insertErr) throw new Error(insertErr.message);
  }

  revalidatePath('/dashboard/customer-targets');
  return { success: true };
}

export async function getCustomerHistoryAction(custId: string) {
  const supabase = await createClient()

  // (idealnya) cek user login/role dulu di sini ← keamanan!

  const { data, error } = await supabase
    .from('v_transaction_lifecycle')
    .select('invoice_date, payment_status, total_order_value')
    .eq('customer_id', custId)
    .order('invoice_date', { ascending: false })

  if (error) return { success: false, data: [] }
  return { success: true, data: data ?? [] }
}