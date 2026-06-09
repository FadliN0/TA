import { createServerClient } from '@/lib/supabaseServer';

// Dipakai di: dashboard/page.tsx, customer-targets/page.tsx, TargetClient.tsx
export async function fetchTransactionLifecycle() {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from('v_transaction_lifecycle')
    .select('*')
    .order('so_date', { ascending: false });
  if (error) throw error;
  return data;
}

// Dipakai di: tracking/page.tsx
export async function fetchDocumentTracking() {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from('view_document_tracking')
    .select('*')
    .order('so_date', { ascending: false });
  if (error) throw error;
  return data;
}

// Dipakai di: reports/components/TransactionsTab.tsx
export async function fetchFinanceReports(startDate: string, endDate: string, customerId?: string) {
  const supabase = createServerClient();
  let query = supabase
    .from('view_finance_reports')
    .select('*')
    .gte('so_date', startDate)
    .lte('so_date', endDate)
    .order('so_date', { ascending: false });

  if (customerId) {
    query = query.eq('customer_id', customerId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data;
}