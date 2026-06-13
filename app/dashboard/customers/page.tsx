// app/dashboard/customers/page.tsx
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import CustomersClient from './CustomersClient';

export const dynamic = 'force-dynamic';

export default async function CustomersPage() {
  const supabase = createServerComponentClient({ cookies });

  const { data: customers } = await supabase
    .from('customers')
    .select(`*, customer_addresses (*)`)
    .order('company_name', { ascending: true });

  return <CustomersClient initialCustomers={customers || []} />;
}