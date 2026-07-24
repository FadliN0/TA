'use server';
import { createClient } from '@/lib/supabaseServer';
import { createAdminClient } from '@/lib/supabaseAdmin';
import { usernameToEmail } from '@/lib/auth-utils'


async function assertAdmin(){
  const supabase = await createClient();
  const { data: {user}} = await supabase.auth.getUser();
  if (!user) throw new Error('Akses ditolak : User belum login');

  const {data: profile} =await supabase
  .from('profiles').select('role').eq('id', user.id).single();

  if (profile?.role?.toLowerCase() !== 'atasan'){
    throw new Error('Akses ditolak : Hanya Atasan')
  }
}

export async function createStaffAccount(
  username: string,
  password: string,
  role: string,
) {
  try {
    await assertAdmin();
    const cleanUsername = username.trim().toLowerCase();
    const email = usernameToEmail(username);

    const supabaseAdmin = createAdminClient();

    const {data: authData, error: authError} = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (authError) {
      if (authError.message.includes('already exists')) {
        throw Error( 'Username Sudah Dipakai');
    }
      throw Error(authError.message);
    }
    if (authData.user) {
      const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .upsert({
        id: authData.user.id,
        username: cleanUsername,
        role,
      });
      if (profileError) 
        throw new Error(profileError.message);
    }
    return { success: true, message: 'Akun Berhasil Dibuat'}
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
