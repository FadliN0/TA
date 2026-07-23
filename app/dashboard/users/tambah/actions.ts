'use server';

import { createClient } from '@supabase/supabase-js';

// Client dengan SERVICE ROLE KEY — hanya boleh hidup di server.
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

// ============================================================================
// BUAT USER BARU (logika tidak diubah)
// ============================================================================
export async function createStaffAccount(
  email: string,
  password: string,
  role: string,
) {
  try {
    // Buat User baru di sistem Supabase Auth
    const { data: authData, error: authError } =
      await supabaseAdmin.auth.admin.createUser({
        email: email,
        password: password,
        email_confirm: true, // Langsung aktif tanpa perlu klik link verifikasi email
      });

    if (authError) throw new Error(authError.message);

    // Simpan Hak Akses (Role) ke tabel profiles agar Sidebar bisa membacanya
    if (authData.user) {
      const { error: profileError } = await supabaseAdmin.from('profiles').upsert({
        id: authData.user.id,
        role: role, // Diambil dari pilihan dropdown (admin / atasan)
      });

      if (profileError) throw new Error(profileError.message);
    }

    return {
      success: true,
      message: 'Akun berhasil dibuat & hak akses telah diatur!',
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

async function createUserByAdmin(
  currentUser:{role : string},
  newUser : {username : string; password: string; role: String }
) {
  if (currentUser.role !== 'admin'){
    return { success: false, error: 'Akses ditolak : Hanya Admin'}
  }
}