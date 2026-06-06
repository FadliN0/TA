// app/dashboard/customer-targets/page.tsx
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import TargetManagementClient from './TargetClient';

// Memaksa Next.js untuk selalu mengambil data terbaru (tidak di-cache)
export const dynamic = 'force-dynamic'; 

export default async function TargetManagementPage({
  searchParams,
}: {
  searchParams: { month?: string; year?: string };
}) {
  const supabase = createServerComponentClient({ cookies });

  const currentMonth = searchParams.month ? parseInt(searchParams.month) : new Date().getMonth() + 1;
  const currentYear = searchParams.year ? parseInt(searchParams.year) : new Date().getFullYear();

  // 1. Ambil Company Target
  const { data: compTarget } = await supabase
    .from('company_targets')
    .select('*')
    .eq('month', currentMonth)
    .eq('year', currentYear)
    .maybeSingle();

  // 2. KUNCI PERBAIKAN: Ambil SELURUH Pelanggan dari Master Data
  // Ini memastikan semua baris pelanggan muncul di UI agar bisa diisi targetnya
  const { data: customers } = await supabase
    .from('customers')
    .select('id, company_name')
    .order('company_name');

  // 3. Ambil data Target Pelanggan untuk bulan ini
  const { data: custTargets } = await supabase
    .from('customer_targets')
    .select('*')
    .eq('month', currentMonth)
    .eq('year', currentYear);

  // 4. Ambil data Invoice (Actual Sales) menggunakan View Lifecycle
  const { data: allSales } = await supabase
    .from('v_transaction_lifecycle')
    .select('customer_id, invoice_date, payment_status, total_order_value');

  // Filter sales hanya untuk bulan dan tahun yang dipilih
  const filteredSales = allSales?.filter((trx) => {
    if (trx.payment_status === 'Uninvoiced') return false;
    if (!trx.invoice_date) return false;
    const d = new Date(trx.invoice_date);
    return (d.getMonth() + 1) === currentMonth && d.getFullYear() === currentYear;
  }) || [];

  // 5. OFFLOADING COMPUTATION (Berjalan secepat kilat di Server)
  // Kita gabungkan Master Pelanggan + Target + Actual Sales
  const initialCustomerData = customers?.map((cust) => {
    const targetRow = custTargets?.find((t) => t.customer_id === cust.id);
    const targetAmount = Number(targetRow?.target_amount || 0);
    
    const actual = filteredSales
      .filter((s) => s.customer_id === cust.id)
      .reduce((sum, item) => sum + Number(item.total_order_value || 0), 0);

    return {
      customer_id: cust.id,
      company_name: cust.company_name,
      target_amount: targetAmount,
      target_id: targetRow?.id,
      achieved_amount: actual,
      achievement_percentage: targetAmount > 0 ? (actual / targetAmount) * 100 : 0
    };
  }) || [];

  // Kirim data matang ke Komponen Client
  return (
    <TargetManagementClient
      initialMonth={currentMonth}
      initialYear={currentYear}
      initialCompanyTarget={Number(compTarget?.target_amount || 0)}
      initialCustomerData={initialCustomerData}
    />
  );
}