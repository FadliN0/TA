import { createClient } from '@/lib/supabaseServer';
import QuotationClient from './QuotationClient';

export const dynamic = 'force-dynamic';

export default async function QuotationsPage() {
  const supabase = await createClient();

  const { data: quotations } = await supabase
    .from('quotations')
    .select(`*, customers ( company_name )`)
    .order('created_at', { ascending: false });

  return <QuotationClient initialQuotations={quotations || []} />;
}