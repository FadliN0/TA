'use server';

import { createClient } from '@supabase/supabase-js';

// Membangun Supabase Client dengan Kunci Master (VIP)
// Dideklarasikan 1 kali di luar agar bisa dipakai oleh semua fungsi di bawahnya
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! 
);

// ============================================================================
// 1. FUNGSI UNTUK MEMBUAT USER BARU (Sudah Anda miliki, tidak diubah logikanya)
// ============================================================================
export async function createStaffAccount(email: string, password: string, role: string) {
  try {
    // Buat User baru di sistem Supabase Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true, // Langsung aktif tanpa perlu klik link verifikasi email
    });

    if (authError) throw new Error(authError.message);

    // Simpan Hak Akses (Role) ke tabel profiles agar Sidebar bisa membacanya
    if (authData.user) {
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .upsert({ 
          id: authData.user.id, 
          role: role // Diambil dari pilihan dropdown (admin / atasan)
        });

      if (profileError) throw new Error(profileError.message);
    }

    return { success: true, message: 'Akun berhasil dibuat & hak akses telah diatur!' };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ============================================================================
// 2. FUNGSI UNTUK MENGAMBIL DATA MASTER USER (Untuk tabel ala Odoo)
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
// 3. FUNGSI UNTUK MEMAKSA GANTI PASSWORD (Untuk tombol ubah sandi)
// ============================================================================
export async function updateUserPassword(userId: string, newPassword: string) {
  try {
    // Menembak langsung ke modul Auth Supabase menggunakan akses Admin
    const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      password: newPassword
    });

    if (error) throw error;
    return { success: true, message: 'Password berhasil diubah!' };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}