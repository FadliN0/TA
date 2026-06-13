import UserClient from './UserClient';
import { getUsers } from './actions';

export const dynamic = 'force-dynamic';

export default async function MasterDataUserPage() {
  // Data pengguna ditarik di server (pakai service-role admin client)
  const result = await getUsers();
  const initialUsers = result.success && result.data ? result.data : [];

  return <UserClient initialUsers={initialUsers} />;
}