'use server';

import { createServerActionClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';

// ─── TAMBAH ALAMAT ────────────────────────────────────────────────────────────
export async function addAddress(
  customerId: string,
  formData: {
    address_type: string;
    complete_address: string;
    pic_name: string;
    pic_phone: string;
    is_default: boolean;
  }
) {
  const supabase = createServerActionClient({ cookies });

  // Jika diset sebagai utama, nonaktifkan is_default alamat lain dulu
  if (formData.is_default) {
    await supabase
      .from('customer_addresses')
      .update({ is_default: false })
      .eq('customer_id', customerId);
  }

  const { error } = await supabase.from('customer_addresses').insert([{
    customer_id: customerId,
    address_type: formData.address_type,
    complete_address: formData.complete_address,
    pic_name: formData.pic_name,
    pic_phone: formData.pic_phone,
    is_default: formData.is_default,
  }]);

  if (error) throw new Error(error.message);

  revalidatePath(`/dashboard/customers/${customerId}`);
}

// ─── EDIT ALAMAT ──────────────────────────────────────────────────────────────
export async function updateAddress(
  customerId: string,
  addressId: string,
  formData: {
    address_type: string;
    complete_address: string;
    pic_name: string;
    pic_phone: string;
    is_default: boolean;
  }
) {
  const supabase = createServerActionClient({ cookies });

  if (formData.is_default) {
    await supabase
      .from('customer_addresses')
      .update({ is_default: false })
      .eq('customer_id', customerId);
  }

  const { error } = await supabase
    .from('customer_addresses')
    .update({
      address_type: formData.address_type,
      complete_address: formData.complete_address,
      pic_name: formData.pic_name,
      pic_phone: formData.pic_phone,
      is_default: formData.is_default,
    })
    .eq('id', addressId);

  if (error) throw new Error(error.message);

  revalidatePath(`/dashboard/customers/${customerId}`);
}

// ─── HAPUS ALAMAT ─────────────────────────────────────────────────────────────
export async function deleteAddress(customerId: string, addressId: string) {
  const supabase = createServerActionClient({ cookies });

  const { error } = await supabase
    .from('customer_addresses')
    .delete()
    .eq('id', addressId);

  if (error) throw new Error(error.message);

  revalidatePath(`/dashboard/customers/${customerId}`);
}