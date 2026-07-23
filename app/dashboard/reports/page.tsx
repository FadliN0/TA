import { createClient } from '@/lib/supabaseServer';
import { cookies } from 'next/headers';
import ReportsClient from './ReportsClient';

export const dynamic = 'force-dynamic';

export default async function AdvancedReportsPage() {
  const supabase = await createClient();

  // Data klien ditarik sekali di server, dipakai bersama oleh kedua tab
  const { data: customers } = await supabase
    .from('customers')
    .select('id, company_name')
    .order('company_name');

  return <ReportsClient initialCustomers={customers || []} />;
}