import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import SalesOrderClient from './SalesOrderClient';

export const dynamic = 'force-dynamic';

export default async function SalesOrderListPage() {
  const supabase = createServerComponentClient({ cookies });

  const { data: salesOrders } = await supabase
    .from('sales_orders')
    .select(
      `
        *,
        customers ( company_name )
      `
    )
    .order('created_at', { ascending: false });

  return <SalesOrderClient salesOrders={salesOrders || []} />;
}