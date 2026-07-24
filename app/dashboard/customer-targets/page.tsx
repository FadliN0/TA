// app/dashboard/customer-targets/page.tsx
import { createClient } from '@/lib/supabaseServer';
import TargetManagementClient from './TargetClient';

export const dynamic = 'force-dynamic'; 

export default async function TargetManagementPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; year?: string }>;
}) {
  const supabase = await createClient();

  // Sinkron → siapkan dulu (tak ada await)
  const { month, year } = await searchParams;
  const currentMonth = month
    ? parseInt(month)
    : new Date().getMonth() + 1;
  const currentYear = year
    ? parseInt(year)
    : new Date().getFullYear();

  // 4 query mandiri → jalankan bersamaan
  const [compTargetRes, customersRes, custTargetsRes, allSalesRes] =
    await Promise.all([
      supabase
        .from('company_targets')
        .select('*')
        .eq('month', currentMonth)
        .eq('year', currentYear)
        .maybeSingle(),
      supabase
        .from('customers')
        .select('id, company_name')
        .order('company_name'),
      supabase
        .from('customer_targets')
        .select('*')
        .eq('month', currentMonth)
        .eq('year', currentYear),
      supabase
        .from('v_transaction_lifecycle')
        .select('customer_id, invoice_date, payment_status, total_order_value'),
    ]);

  // Ambil .data dari tiap respons
  const compTarget = compTargetRes.data;
  const customers = customersRes.data;
  const custTargets = custTargetsRes.data;
  const allSales = allSalesRes.data;

  // --- Sisanya SAMA PERSIS seperti kodemu ---
  const filteredSales =
    allSales?.filter((trx) => {
      if (trx.payment_status === 'Uninvoiced') return false;
      if (!trx.invoice_date) return false;
      const d = new Date(trx.invoice_date);
      return d.getMonth() + 1 === currentMonth && d.getFullYear() === currentYear;
    }) || [];

  const initialCustomerData =
    customers?.map((cust) => {
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
        achievement_percentage:
          targetAmount > 0 ? (actual / targetAmount) * 100 : 0,
      };
    }) || [];

  return (
    <TargetManagementClient
      initialMonth={currentMonth}
      initialYear={currentYear}
      initialCompanyTarget={Number(compTarget?.target_amount || 0)}
      initialCustomerData={initialCustomerData}
    />
  );
}