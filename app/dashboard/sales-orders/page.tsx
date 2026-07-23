import { createClient } from '@/lib/supabaseServer';
import SalesOrderClient from './SalesOrderClient';

export const dynamic = 'force-dynamic';

export default async function SalesOrderListPage() {
  const supabase = await createClient();

  const { data: rows } = await supabase
    .from('sales_orders')
    .select(
      `*,customers ( company_name )
      invoices ( id, status, canceled_at )
      `
    )
    .order('created_at', { ascending: false });

    const salesOrders = (rows || []).map((so: any) => ({
      ...so,
      hasInvoice: (so.invoices || []).some(
        (inv: any) => !inv.canceled_at && inv.status !== 'Cancelled'
      ),
    }));

  return <SalesOrderClient salesOrders={salesOrders || []} />;
}