'use server';

import { createClient } from '@supabase/supabase-js';

// Fungsi rahasia ini hanya berjalan di Server, aman dari browser!
export async function createStaffAccount(email: string, password: string) {
  try {
    // Membangun Supabase Client dengan Kunci Master (VIP)
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY! // <-- Kunci master yang baru kita pasang
    );

    // Perintah khusus Admin untuk membuat User baru tanpa auto-login
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true, // Langsung aktif tanpa perlu klik link verifikasi email
    });

    if (error) throw new Error(error.message);

    return { success: true, message: 'Akun berhasil dibuat!' };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}