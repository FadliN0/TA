import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import InvoiceClient from './InvoiceClient';

export const dynamic = 'force-dynamic';

export default async function InvoiceListPage() {
  const supabase = createServerComponentClient({ cookies });

  const { data: invoices } = await supabase
    .from('invoices')
    .select('*, customers ( company_name ), sales_orders ( so_number )')
    .order('created_at', { ascending: false });

  return <InvoiceClient invoices={invoices || []} />;
}