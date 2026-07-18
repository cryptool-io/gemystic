import { requireRole } from '@/lib/auth/guard';
import { Pending } from '@/components/admin/Pending';

export default async function AdminOrders() {
  await requireRole('staff', '/admin/orders');
  return (
    <Pending
      title="Orders"
      summary="View, fulfil and document every order from both fulfilment origins."
      willDo={[
        'List orders with status, customer, total and fulfilment origin (Pakistan or Thailand).',
        'Mark paid → processing → shipped → delivered, emailing the customer at each step.',
        'Generate the shipping paperwork: commercial invoice, packing list, certificate of origin.',
        'Capture tracking numbers and push shipping notices to the customer by email and on-site.',
        'Trigger a team notification the moment an order is placed or a payment fails.',
      ]}
    />
  );
}
