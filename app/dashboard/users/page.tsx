import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabaseServer'
import { getUsers } from './actions'
import UserClient from './UserClient'

export default async function UsersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role?.toLowerCase() !== 'atasan') redirect('/dashboard')

  const res = await getUsers()          // server memanggil action LANGSUNG
  const users = res.success ? res.data : []

  return <UserClient initialUsers={users ?? []} />
}