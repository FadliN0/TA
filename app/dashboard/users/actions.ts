'use server';

import { createClient } from '@supabase/supabase-js';

// Client dengan SERVICE ROLE KEY — hanya boleh hidup di server.
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

// ============================================================================
// AMBIL DATA MASTER USER (untuk tabel ala Odoo)
// ============================================================================
export async function getUsers() {
  try {
    // Mengambil data id, email, dan role dari tabel 'profiles'
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select('id, email, role')
      .order('email', { ascending: true }); // Diurutkan berdasarkan email abjad A-Z

    if (error) throw error;
    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ============================================================================
// PAKSA GANTI PASSWORD (untuk tombol ubah sandi)
// ============================================================================
export async function updateUserPassword(userId: string, newPassword: string) {
  try {
    // Menembak langsung ke modul Auth Supabase menggunakan akses Admin
    const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      password: newPassword,
    });

    if (error) throw error;
    return { success: true, message: 'Password berhasil diubah!' };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}