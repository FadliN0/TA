import AddUserClient from './AddUserClient';
import { getCurrentUser } from '@/lib/session'
import { redirect } from 'next/navigation'

export default function UserManagementPage() {
  const currentUser = getCurrentUser();

  if (!currentUser || currentUser.role !== 'atasan') {
    redirect('/dashboard/users');
  } 
  return <AddUserClient />;
}