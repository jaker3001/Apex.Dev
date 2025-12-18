import { Calculator } from 'lucide-react';
import { AccountingMetrics } from './AccountingMetrics';
import { AccountingActions } from './AccountingActions';
import {
  EstimatesBreakdown,
  PaymentsBreakdown,
  LaborBreakdown,
  ReceiptsBreakdown,
} from './AccountingBreakdown';
import type {
  AccountingSummary,
  Estimate,
  Payment,
  LaborEntry,
  Receipt,
} from '@/hooks/useProjects';

interface AccountingModuleProps {
  summary?: AccountingSummary;
  estimates: Estimate[];
  payments: Payment[];
  laborEntries: LaborEntry[];
  receipts: Receipt[];
  readyToInvoice?: boolean;
  onAddEstimate: () => void;
  onAddReceipt: () => void;
  onAddLabor: () => void;
  onAddWorkOrder: () => void;
  onToggleReadyToInvoice: () => void;
  isToggling?: boolean;
  isLoading?: boolean;
}

// Default empty summary
const defaultSummary: AccountingSummary = {
  total_estimates: 0,
  approved_estimates: 0,
  pending_estimates: 0,
  total_paid: 0,
  balance_due: 0,
  work_order_budget: 0,
  total_labor_cost: 0,
  total_labor_hours: 0,
  billable_labor_cost: 0,
  billable_labor_hours: 0,
  total_materials_cost: 0,
  total_expenses: 0,
  reimbursable_expenses: 0,
  gross_profit: 0,
  gross_profit_percentage: 0,
  estimate_count: 0,
  payment_count: 0,
  labor_entry_count: 0,
  receipt_count: 0,
  work_order_count: 0,
};

export function AccountingModule({
  summary = defaultSummary,
  estimates,
  payments,
  laborEntries,
  receipts,
  readyToInvoice = false,
  onAddEstimate,
  onAddReceipt,
  onAddLabor,
  onAddWorkOrder,
  onToggleReadyToInvoice,
  isToggling = false,
  isLoading = false,
}: AccountingModuleProps) {
  if (isLoading) {
    return (
      <div className="border rounded-lg bg-card p-4">
        <div className="flex items-center gap-2 mb-4">
          <Calculator className="h-5 w-5 text-muted-foreground" />
          <h2 className="font-semibold">Accounting</h2>
        </div>
        <div className="animate-pulse space-y-3">
          <div className="h-16 bg-muted rounded"></div>
          <div className="h-16 bg-muted rounded"></div>
          <div className="h-10 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="border rounded-lg bg-card">
      {/* Header */}
      <div className="flex items-center gap-2 p-4 border-b">
        <Calculator className="h-5 w-5 text-muted-foreground" />
        <h2 className="font-semibold">Accounting</h2>
      </div>

      {/* Metrics */}
      <div className="p-4 border-b">
        <AccountingMetrics summary={summary} />
      </div>

      {/* Actions */}
      <div className="p-4 border-b">
        <AccountingActions
          readyToInvoice={readyToInvoice}
          onAddEstimate={onAddEstimate}
          onAddReceipt={onAddReceipt}
          onAddLabor={onAddLabor}
          onAddWorkOrder={onAddWorkOrder}
          onToggleReadyToInvoice={onToggleReadyToInvoice}
          isToggling={isToggling}
        />
      </div>

      {/* Breakdowns */}
      <div className="p-4 space-y-2">
        <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
          Breakdown
        </h3>
        <EstimatesBreakdown estimates={estimates} />
        <PaymentsBreakdown payments={payments} />
        <LaborBreakdown laborEntries={laborEntries} />
        <ReceiptsBreakdown receipts={receipts} />

        {estimates.length === 0 && payments.length === 0 && laborEntries.length === 0 && receipts.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">
            No financial data yet
          </p>
        )}
      </div>
    </div>
  );
}
