import { createClient } from '@/lib/supabaseServer';
import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import DeliveryOrderDetailClient from './DeliveryOrderDetailClient';

export const dynamic = 'force-dynamic';

export default async function DeliveryOrderDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = await createClient();
  const id = params.id;

  // ── TAHAP 1: deliveryOrder (untuk guard + so_id + address_id) ──
  const { data: deliveryOrder } = await supabase
    .from('delivery_orders')
    .select(`
      *,
      sales_orders (
        po_number,
        customer_id,
        invoices ( invoice_number, status )
      ),
      delivery_order_items ( *, sales_order_items ( *, products ( * ) ) )
    `)
    .eq('id', id)
    .single();

  if (!deliveryOrder) notFound();

  // ── TAHAP 2: 5 query mandiri → paralel ──
  const [soRes, soItemsRes, shippingRes, itemsRes, allDeliveredRes] =
    await Promise.all([
      deliveryOrder.so_id
        ? supabase
            .from('sales_orders')
            .select('*')
            .eq('id', deliveryOrder.so_id)
            .single()
        : Promise.resolve({ data: null }),

      deliveryOrder.so_id
        ? supabase
            .from('sales_order_items')
            .select('id, qty')
            .eq('so_id', deliveryOrder.so_id)
        : Promise.resolve({ data: [] as any[] }),

      deliveryOrder.address_id
        ? supabase
            .from('customer_addresses')
            .select('*')
            .eq('id', deliveryOrder.address_id)
            .single()
        : Promise.resolve({ data: null }),

      // Item milik DO INI (untuk tabel di surat jalan)
      supabase
        .from('delivery_order_items')
        .select(
          `
          id, qty_delivered, so_item_id,
          sales_order_items (
            products ( part_code, part_name, unit, remark )
          )
        `
        )
        .eq('do_id', id),

      // ▼▼▼ BARU: SEMUA pengiriman untuk SO ini (semua DO) → untuk akumulasi partial ▼▼▼
      deliveryOrder.so_id
        ? supabase
            .from('delivery_order_items')
            .select('so_item_id, qty_delivered, delivery_orders!inner(so_id)')
            .eq('delivery_orders.so_id', deliveryOrder.so_id)
        : Promise.resolve({ data: [] as any[] }),
    ]);

  const salesOrder = soRes.data;
  const soItemsOriginal = soItemsRes.data;
  const shippingAddress = shippingRes.data;
  const rawItems = itemsRes.data || [];
  const allDeliveredForSO = allDeliveredRes.data || [];

  // ── TAHAP 3: customer + billing (butuh salesOrder.customer_id) → paralel ──
  let customer: any = null;
  let billingAddress: any = null;

  if (salesOrder?.customer_id) {
    const [custRes, addrsRes] = await Promise.all([
      supabase
        .from('customers')
        .select('*')
        .eq('id', salesOrder.customer_id)
        .single(),
      supabase
        .from('customer_addresses')
        .select('*')
        .eq('customer_id', salesOrder.customer_id),
    ]);

    customer = custRes.data;
    const allAddrs = addrsRes.data;
    if (allAddrs && allAddrs.length > 0) {
      billingAddress =
        allAddrs.find((a: any) => a.address_type?.toLowerCase() === 'billing') ||
        allAddrs[0];
    }
  }

  // ── Ambil nomor invoice (via relasi di TAHAP 1) ──
  // sales_orders bisa objek atau array tergantung Supabase → amankan keduanya
  const soEmbedded = Array.isArray(deliveryOrder.sales_orders)
    ? deliveryOrder.sales_orders[0]
    : deliveryOrder.sales_orders;

  // invoices adalah relasi to-many → berupa array; 1 SO = 1 invoice → ambil [0]
  const invoiceRow = Array.isArray(soEmbedded?.invoices)
    ? soEmbedded.invoices[0]
    : soEmbedded?.invoices;

  // Hanya isi jika flag customer aktif; selain itu null (baris REF INV tak muncul)
  const invoiceNumber = customer?.requires_invoice_on_do
    ? (invoiceRow?.invoice_number ?? null)
    : null;

  // ── NORMALISASI items: pastikan sales_order_items & products berupa OBJEK tunggal ──
  // (Supabase kadang mengembalikan relasi embedded sebagai array)
  const items = rawItems.map((item: any) => {
    const so = Array.isArray(item.sales_order_items)
      ? item.sales_order_items[0]
      : item.sales_order_items;
    const prod = so
      ? Array.isArray(so.products)
        ? so.products[0]
        : so.products
      : null;
    return {
      ...item,
      sales_order_items: so ? { ...so, products: prod ?? null } : null,
    };
  });

  // ── Deteksi partial delivery (LEVEL ORDER, akumulasi semua DO) ──
  // 1) Jumlahkan total qty yang sudah dikirim per baris SO (lintas semua DO)
  const deliveredMap: Record<string, number> = {};
  allDeliveredForSO.forEach((d: any) => {
    if (!d.so_item_id) return;
    deliveredMap[d.so_item_id] =
      (deliveredMap[d.so_item_id] || 0) + Number(d.qty_delivered || 0);
  });

  // 2) Partial jika ADA satu saja baris SO yang total kirimnya < qty dipesan
  //    (termasuk baris SO yang belum pernah dikirim sama sekali)
  let isPartialDelivery = false;
  for (const so of soItemsOriginal || []) {
    const delivered = deliveredMap[so.id] || 0;
    if (delivered < Number(so.qty || 0)) {
      isPartialDelivery = true;
      break;
    }
  }

  return (
    <DeliveryOrderDetailClient
      deliveryOrder={deliveryOrder}
      salesOrder={salesOrder}
      customer={customer}
      billingAddress={billingAddress}
      shippingAddress={shippingAddress}
      items={items}
      isPartialDelivery={isPartialDelivery}
      invoiceNumber={invoiceNumber}
    />
  );
}