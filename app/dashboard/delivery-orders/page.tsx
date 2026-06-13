// app/dashboard/delivery-orders/page.tsx
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import DeliveryOrderListClient from './DeliveryOrderClient';

export const dynamic = 'force-dynamic';

export default async function DeliveryOrderListPage() {
  const supabase = createServerComponentClient({ cookies });

  const { data, error } = await supabase
    .from('delivery_orders')
    .select(`
      *,
      sales_orders (
        so_number,
        customers ( company_name ),
        sales_order_items ( id, qty )
      ),
      delivery_order_items ( qty_delivered, so_item_id )
    `)
    .order('created_at', { ascending: false });

  if (error) console.error('Gagal memuat data DO:', error.message);

  // OFFLOADING COMPUTATION: deteksi Partial/Completed di server
  const initialOrders = (data || []).map((doItem: any) => {
    let isPartial = false;
    if (doItem.delivery_order_items && doItem.sales_orders?.sales_order_items) {
      for (const doi of doItem.delivery_order_items) {
        const soItem = doItem.sales_orders.sales_order_items.find((si: any) => si.id === doi.so_item_id);
        if (doi.qty_delivered < (soItem?.qty || 0)) { isPartial = true; break; }
      }
    }
    return { ...doItem, calculatedStatus: isPartial ? 'Partial' : 'Completed' };
  });

  return <DeliveryOrderListClient initialOrders={initialOrders} />;
}