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
  // OFFLOADING COMPUTATION: deteksi Partial/Completed di server
  const initialOrders = (data || []).map((doItem: any) => {
    const soItems = doItem.sales_orders?.sales_order_items || [];
    const doItems = doItem.delivery_order_items || [];

    // qty yang dikirim di DO INI, diakumulasi per so_item_id
    const deliveredInThisDO: Record<string, number> = {};
    for (const doi of doItems) {
      if (!doi.so_item_id) continue;
      deliveredInThisDO[doi.so_item_id] =
        (deliveredInThisDO[doi.so_item_id] || 0) + Number(doi.qty_delivered || 0);
    }

    // Partial jika ADA baris SO yang belum terpenuhi
    // (termasuk baris SO yang sama sekali tidak ada di DO ini)
    let isPartial = false;
    for (const si of soItems) {
      const delivered = deliveredInThisDO[si.id] || 0;
      if (delivered < Number(si.qty || 0)) { isPartial = true; break; }
    }

    return { ...doItem, calculatedStatus: isPartial ? 'Partial' : 'Completed' };
  });

  return <DeliveryOrderListClient initialOrders={initialOrders} />;
}