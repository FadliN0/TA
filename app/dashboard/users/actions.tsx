'use server';

import { createClient } from '@supabase/supabase-js';

// Fungsi rahasia ini hanya berjalan di Server, aman dari browser!
export async function createStaffAccount(email: string, password: string, role: string) {
  try {
    // Membangun Supabase Client dengan Kunci Master (VIP)
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY! 
    );

    // 1. Buat User baru di sistem Supabase Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true, // Langsung aktif tanpa perlu klik link verifikasi email
    });

    if (authError) throw new Error(authError.message);

    // 2. Simpan Hak Akses (Role) ke tabel profiles agar Sidebar bisa membacanya
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