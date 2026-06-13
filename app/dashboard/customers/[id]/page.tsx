// app/dashboard/customers/[id]/page.tsx
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import CustomerDetailClient from './CustomerDetailClient';

export const dynamic = 'force-dynamic';

export default async function CustomerDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createServerComponentClient({ cookies });

  const [{ data: customer }, { data: addresses }] = await Promise.all([
    supabase.from('customers').select('*').eq('id', params.id).single(),
    supabase
      .from('customer_addresses')
      .select('*')
      .eq('customer_id', params.id)
      .order('is_default', { ascending: false }),
  ]);

  if (!customer) notFound();

  return (
    <CustomerDetailClient
      initialCustomer={customer}
      initialAddresses={addresses || []}
    />
  );
}