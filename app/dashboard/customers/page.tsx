// app/dashboard/customers/page.tsx
import { createClient } from '@/lib/supabaseServer';
import CustomersClient from './CustomersClient';

export const dynamic = 'force-dynamic';

export default async function CustomersPage() {
  const supabase = await createClient();
  
  const { data: customers } = await supabase
    .from('customers')
    .select(`*, customer_addresses (*)`)
    .order('company_name', { ascending: true });

  return <CustomersClient initialCustomers={customers || []} />;
}