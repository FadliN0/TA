'use server'
import { createAdminClient } from '@/lib/supabaseAdmin'
import { assertCanManageUsers } from '@/lib/auth-guards'

export async function getUsers() {
  try {
    await assertCanManageUsers()                 // 🛡️ gerbang
    const supabaseAdmin = createAdminClient()     // 🧹 helper (bukan inline)
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select('id, username, role')               // 📝 username, BUKAN email
      .order('username', { ascending: true })
    if (error) throw error
    return { success: true, data }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function updateUserPassword(userId: string, newPassword: string) {
  try {
    await assertCanManageUsers()                 // 🛡️ gerbang (WAJIB!)
    if (newPassword.length < 6) throw new Error('Password minimal 6 karakter')
    const supabaseAdmin = createAdminClient()
    const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      password: newPassword,
    })
    if (error) throw error
    return { success: true, message: 'Password berhasil diubah!' }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}