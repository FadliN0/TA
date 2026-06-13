'use server';

import { createServerClient } from '@/lib/supabaseServer';

type ReportResult = { success: boolean; data?: any[]; error?: string };

type TransactionsFilter = {
  startDate: string;
  endDate: string;
  customerId: string;
};

// Tarik laporan transaksi keuangan (Laporan Transaksi / SO)
export async function fetchTransactionsReportAction(
  filter: TransactionsFilter,
): Promise<ReportResult> {
  const supabase = createServerClient();
  try {
    let query = supabase
      .from('view_finance_reports')
      .select('*')
      .gte('so_date', filter.startDate)
      .lte('so_date', filter.endDate)
      .order('so_date', { ascending: false });

    if (filter.customerId) query = query.eq('customer_id', filter.customerId);

    const { data, error } = await query;
    if (error) throw error;
    return { success: true, data: data || [] };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

type ProductHistoryFilter = {
  search: string;
  customerId: string;
};

// Tarik riwayat penjualan barang (Riwayat Barang)
export async function fetchProductHistoryAction(
  filter: ProductHistoryFilter,
): Promise<ReportResult> {
  const supabase = createServerClient();
  try {
    let query = supabase.from('sales_order_items').select(`
      qty, unit_price, total_price,
      products!inner(part_code, part_name, unit),
      sales_orders!inner(so_number, created_at, customer_id, customers(company_name))
    `);

    if (filter.search.trim()) {
      query = query.or(
        `part_code.ilike.%${filter.search}%,part_name.ilike.%${filter.search}%`,
        { foreignTable: 'products' },
      );
    }
    if (filter.customerId) {
      query = query.eq('sales_orders.customer_id', filter.customerId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return { success: true, data: data || [] };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}