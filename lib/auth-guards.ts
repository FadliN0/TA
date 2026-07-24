import { createClient } from '@/lib/supabaseServer'

export async function assertCanManageUsers() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Belum login')

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()

  if (profile?.role?.toLowerCase() !== 'atasan') {
    throw new Error('Akses ditolak: hanya Atasan')
  }
  return user
}