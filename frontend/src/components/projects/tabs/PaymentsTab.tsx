import { DollarSign, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Payment } from '@/hooks/useProjects';

interface PaymentsTabProps {
  payments: Payment[];
  onAddPayment?: () => void;
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return '—';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatCurrency(amount?: number): string {
  if (amount === undefined || amount === null) return '$0.00';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
}

function PaymentRow({ payment }: { payment: Payment }) {
  return (
    <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/30 transition-colors">
      <div className="flex items-center gap-4">
        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-green-100">
          <DollarSign className="h-5 w-5 text-green-600" />
        </div>
        <div>
          <p className="font-semibold text-lg">{formatCurrency(payment.amount)}</p>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {payment.payment_method && (
              <span className="px-1.5 py-0.5 bg-muted rounded">{payment.payment_method}</span>
            )}
            {payment.check_number && (
              <span>Check #{payment.check_number}</span>
            )}
            {payment.payment_type && (
              <span className="capitalize">{payment.payment_type}</span>
            )}
          </div>
        </div>
      </div>
      <div className="text-right text-sm text-muted-foreground">
        {payment.received_date && (
          <p>Received: {formatDate(payment.received_date)}</p>
        )}
        {payment.deposited_date && (
          <p>Deposited: {formatDate(payment.deposited_date)}</p>
        )}
      </div>
    </div>
  );
}

export function PaymentsTab({ payments, onAddPayment }: PaymentsTabProps) {
  const total = payments.reduce((sum, p) => sum + p.amount, 0);

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <DollarSign className="h-4 w-4 text-muted-foreground" />
          <h3 className="font-medium">Payments</h3>
          <span className="text-sm text-muted-foreground">({payments.length})</span>
        </div>
        <Button variant="ghost" size="sm" onClick={onAddPayment}>
          <Plus className="h-4 w-4 mr-1" />
          Record Payment
        </Button>
      </div>

      {payments.length > 0 ? (
        <>
          <div className="space-y-2">
            {payments.map((payment) => (
              <PaymentRow key={payment.id} payment={payment} />
            ))}
          </div>
          <div className="mt-4 pt-4 border-t text-right">
            <span className="text-muted-foreground">Total Received: </span>
            <span className="font-bold text-lg text-green-600">{formatCurrency(total)}</span>
          </div>
        </>
      ) : (
        <div className="text-center py-8 text-muted-foreground">
          <DollarSign className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>No payments recorded</p>
          <p className="text-sm">Click "Record Payment" to add one</p>
        </div>
      )}
    </div>
  );
}
