
import { createServerClient } from '@/lib/supabaseServer';
import { revalidatePath } from 'next/cache';

// Fungsi 1: Simpan Target Perusahaan
export async function saveCompanyTargetAction(month: number, year: number, target_amount: number) {
  const supabase = createServerClient();
  
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
  const supabase = createServerClient();
  
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