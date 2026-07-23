'use server';

import { createClient } from '@/lib/supabaseServer';
import { revalidatePath } from 'next/cache';

// ─── TAMBAH PELANGGAN BARU ────────────────────────────────────────────────────
export async function addCustomer(formData: {
  company_name: string;
  email: string;
  phone: string;
  requires_invoice_on_do: boolean; 
  addresses: {
    id?: string;
    address_type: string;
    pic_name: string;
    pic_phone: string;
    complete_address: string;
    is_default: boolean;
  }[];
}) {
  const supabase = await createClient();

  const { data: newCustomer, error: custError } = await supabase
    .from('customers')
    .insert([{
      company_name: formData.company_name,
      email: formData.email,
      phone: formData.phone,
      requires_invoice_on_do: formData.requires_invoice_on_do,
    }])
    .select()
    .single();

  if (custError) throw new Error(custError.message);

  if (formData.addresses.length > 0) {
    const { error: addrError } = await supabase
      .from('customer_addresses')
      .insert(
        formData.addresses.map(addr => ({
          customer_id: newCustomer.id,
          address_type: addr.address_type,
          pic_name: addr.pic_name,
          pic_phone: addr.pic_phone,
          complete_address: addr.complete_address,
          is_default: addr.is_default,
        }))
      );
    if (addrError) throw new Error(addrError.message);
  }

  revalidatePath('/dashboard/customers');
}

// ─── EDIT PELANGGAN ───────────────────────────────────────────────────────────
export async function updateCustomer(formData: {
  id: string;
  company_name: string;
  email: string;
  phone: string;
  requires_invoice_on_do: boolean;
  addresses: {
    id?: string;
    address_type: string;
    pic_name: string;
    pic_phone: string;
    complete_address: string;
    is_default: boolean;
  }[];
}) {
  const supabase = await createClient();

  const { error: custError } = await supabase
    .from('customers')
    .update({
      company_name: formData.company_name,
      email: formData.email,
      phone: formData.phone,
      requires_invoice_on_do: formData.requires_invoice_on_do,
    })
    .eq('id', formData.id);

  if (custError) throw new Error(custError.message);

  // ▼▼▼ BARU: hapus alamat yang dibuang user dari modal ▼▼▼
  const { data: existing } = await supabase
    .from('customer_addresses')
    .select('id')
    .eq('customer_id', formData.id);

  const keptIds = new Set(
    formData.addresses.filter(a => a.id).map(a => a.id)
  );
  const toDelete = (existing ?? [])
    .filter(row => !keptIds.has(row.id))
    .map(row => row.id);

  if (toDelete.length > 0) {
    const { error } = await supabase
      .from('customer_addresses')
      .delete()
      .in('id', toDelete);
    if (error) throw new Error(error.message);
  }

  const toUpdate = formData.addresses.filter(a => a.id);
  const toInsert = formData.addresses.filter(a => !a.id);

  if (toUpdate.length > 0) {
    const { error } = await supabase.from('customer_addresses').upsert(
      toUpdate.map(addr => ({
        id: addr.id,
        customer_id: formData.id,
        address_type: addr.address_type,
        pic_name: addr.pic_name,
        pic_phone: addr.pic_phone,
        complete_address: addr.complete_address,
        is_default: addr.is_default,
      }))
    );
    if (error) throw new Error(error.message);
  }

  if (toInsert.length > 0) {
    const { error } = await supabase.from('customer_addresses').insert(
      toInsert.map(addr => ({
        customer_id: formData.id,
        address_type: addr.address_type,
        pic_name: addr.pic_name,
        pic_phone: addr.pic_phone,
        complete_address: addr.complete_address,
        is_default: addr.is_default,
      }))
    );
    if (error) throw new Error(error.message);
  }

  revalidatePath('/dashboard/customers');
}

// ─── HAPUS PELANGGAN ──────────────────────────────────────────────────────────
export async function deleteCustomer(customerId: string) {
  const supabase = await createClient();

  // Hapus alamat dulu (kalau belum ada CASCADE di DB)
  await supabase.from('customer_addresses').delete().eq('customer_id', customerId);

  const { error } = await supabase.from('customers').delete().eq('id', customerId);
  if (error) throw new Error(error.message);

  revalidatePath('/dashboard/customers');
}