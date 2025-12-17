import { useState } from 'react';
import { Clock, Receipt, FileText, Plus, ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { LaborEntry, Receipt as ReceiptType, WorkOrder } from '@/hooks/useProjects';

interface ExpensesTabProps {
  laborEntries: LaborEntry[];
  receipts: ReceiptType[];
  workOrders: WorkOrder[];
  onAddLabor: () => void;
  onEditLabor: (entry: LaborEntry) => void;
  onAddReceipt: () => void;
  onEditReceipt: (receipt: ReceiptType) => void;
  onAddWorkOrder: () => void;
  onEditWorkOrder: (workOrder: WorkOrder) => void;
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

const CATEGORY_LABELS: Record<string, string> = {
  materials: 'Materials',
  equipment_rental: 'Equipment Rental',
  subcontractor: 'Subcontractor',
  disposal: 'Disposal',
  permit: 'Permits',
  supplies: 'Supplies',
  other: 'Other',
  demo: 'Demo / Tear-out',
  drying: 'Drying Setup',
  cleanup: 'Cleanup',
  monitoring: 'Monitoring',
  repair: 'Repair',
  admin: 'Admin / Documentation',
  travel: 'Travel',
};

interface CollapsibleSectionProps {
  title: string;
  icon: React.ReactNode;
  count: number;
  total?: number;
  onAdd: () => void;
  addLabel: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

function CollapsibleSection({
  title,
  icon,
  count,
  total,
  onAdd,
  addLabel,
  children,
  defaultOpen = true,
}: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="flex items-center justify-between p-3 bg-muted/30">
        <button
          className="flex items-center gap-2 hover:text-primary transition-colors"
          onClick={() => setIsOpen(!isOpen)}
        >
          {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          <span className="text-muted-foreground">{icon}</span>
          <span className="font-medium">{title}</span>
          <span className="text-sm text-muted-foreground">({count})</span>
        </button>
        <div className="flex items-center gap-3">
          {total !== undefined && count > 0 && (
            <span className="text-sm font-medium">{formatCurrency(total)}</span>
          )}
          <Button variant="ghost" size="sm" onClick={onAdd}>
            <Plus className="h-4 w-4 mr-1" />
            {addLabel}
          </Button>
        </div>
      </div>
      {isOpen && <div className="p-3 border-t bg-background">{children}</div>}
    </div>
  );
}

function LaborEntryRow({
  entry,
  onClick,
}: {
  entry: LaborEntry;
  onClick: () => void;
}) {
  const total = entry.hours * (entry.hourly_rate || 0);

  return (
    <div
      className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/30 transition-colors cursor-pointer"
      onClick={onClick}
    >
      <div className="flex items-center gap-4">
        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-100">
          <Clock className="h-5 w-5 text-blue-600" />
        </div>
        <div>
          <p className="font-medium">
            {entry.hours} hours
            {entry.hourly_rate && (
              <span className="text-muted-foreground font-normal"> @ ${entry.hourly_rate}/hr</span>
            )}
          </p>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {entry.work_category && (
              <span className="px-1.5 py-0.5 bg-muted rounded">
                {CATEGORY_LABELS[entry.work_category] || entry.work_category}
              </span>
            )}
            {entry.employee_name && <span>{entry.employee_name}</span>}
            {entry.description && (
              <span className="truncate max-w-[200px]">{entry.description}</span>
            )}
          </div>
        </div>
      </div>
      <div className="text-right">
        <p className="font-medium">{formatCurrency(total)}</p>
        <p className="text-xs text-muted-foreground">{formatDate(entry.work_date)}</p>
      </div>
    </div>
  );
}

function ReceiptRow({
  receipt,
  onClick,
}: {
  receipt: ReceiptType;
  onClick: () => void;
}) {
  return (
    <div
      className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/30 transition-colors cursor-pointer"
      onClick={onClick}
    >
      <div className="flex items-center gap-4">
        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-orange-100">
          <Receipt className="h-5 w-5 text-orange-600" />
        </div>
        <div>
          <p className="font-medium">{receipt.description}</p>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {receipt.expense_category && (
              <span className="px-1.5 py-0.5 bg-muted rounded">
                {CATEGORY_LABELS[receipt.expense_category] || receipt.expense_category}
              </span>
            )}
            {receipt.paid_by && <span>{receipt.paid_by.replace('_', ' ')}</span>}
            {receipt.reimbursable && (
              <span className="text-green-600 font-medium">Reimbursable</span>
            )}
          </div>
        </div>
      </div>
      <div className="text-right">
        <p className="font-medium">{formatCurrency(receipt.amount)}</p>
        <p className="text-xs text-muted-foreground">{formatDate(receipt.expense_date)}</p>
      </div>
    </div>
  );
}

function WorkOrderRow({
  workOrder,
  onClick,
}: {
  workOrder: WorkOrder;
  onClick: () => void;
}) {
  const statusColors: Record<string, string> = {
    draft: 'text-gray-600 bg-gray-100',
    approved: 'text-green-600 bg-green-100',
    in_progress: 'text-blue-600 bg-blue-100',
    completed: 'text-green-700 bg-green-100',
    cancelled: 'text-red-600 bg-red-100',
  };

  return (
    <div
      className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/30 transition-colors cursor-pointer"
      onClick={onClick}
    >
      <div className="flex items-center gap-4">
        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-purple-100">
          <FileText className="h-5 w-5 text-purple-600" />
        </div>
        <div>
          <p className="font-medium">
            {workOrder.work_order_number && (
              <span className="text-muted-foreground font-normal mr-2">
                {workOrder.work_order_number}
              </span>
            )}
            {workOrder.title}
          </p>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span
              className={cn(
                'px-1.5 py-0.5 rounded capitalize text-[10px] font-medium',
                statusColors[workOrder.status] || 'text-gray-600 bg-gray-100'
              )}
            >
              {workOrder.status.replace('_', ' ')}
            </span>
            {workOrder.description && (
              <span className="truncate max-w-[200px]">{workOrder.description}</span>
            )}
          </div>
        </div>
      </div>
      <div className="text-right">
        {workOrder.budget_amount !== undefined && workOrder.budget_amount !== null && (
          <p className="font-medium">{formatCurrency(workOrder.budget_amount)}</p>
        )}
        {workOrder.created_at && (
          <p className="text-xs text-muted-foreground">{formatDate(workOrder.created_at)}</p>
        )}
      </div>
    </div>
  );
}

export function ExpensesTab({
  laborEntries,
  receipts,
  workOrders,
  onAddLabor,
  onEditLabor,
  onAddReceipt,
  onEditReceipt,
  onAddWorkOrder,
  onEditWorkOrder,
}: ExpensesTabProps) {
  const laborTotal = laborEntries.reduce(
    (sum, e) => sum + e.hours * (e.hourly_rate || 0),
    0
  );
  const receiptsTotal = receipts.reduce((sum, r) => sum + r.amount, 0);
  const workOrdersTotal = workOrders.reduce(
    (sum, w) => sum + (w.budget_amount || 0),
    0
  );
  const grandTotal = laborTotal + receiptsTotal;

  return (
    <div className="p-4 space-y-4">
      {/* Summary */}
      <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
        <span className="text-muted-foreground">Total Expenses</span>
        <span className="font-bold text-lg">{formatCurrency(grandTotal)}</span>
      </div>

      {/* Labor Section */}
      <CollapsibleSection
        title="Labor"
        icon={<Clock className="h-4 w-4" />}
        count={laborEntries.length}
        total={laborTotal}
        onAdd={onAddLabor}
        addLabel="Log Hours"
      >
        {laborEntries.length > 0 ? (
          <div className="space-y-2">
            {laborEntries.map((entry) => (
              <LaborEntryRow
                key={entry.id}
                entry={entry}
                onClick={() => onEditLabor(entry)}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-6 text-muted-foreground">
            <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No labor entries</p>
            <p className="text-sm">Click "Log Hours" to add one</p>
          </div>
        )}
      </CollapsibleSection>

      {/* Receipts Section */}
      <CollapsibleSection
        title="Receipts"
        icon={<Receipt className="h-4 w-4" />}
        count={receipts.length}
        total={receiptsTotal}
        onAdd={onAddReceipt}
        addLabel="Add Receipt"
      >
        {receipts.length > 0 ? (
          <div className="space-y-2">
            {receipts.map((receipt) => (
              <ReceiptRow
                key={receipt.id}
                receipt={receipt}
                onClick={() => onEditReceipt(receipt)}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-6 text-muted-foreground">
            <Receipt className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No receipts</p>
            <p className="text-sm">Click "Add Receipt" to add one</p>
          </div>
        )}
      </CollapsibleSection>

      {/* Work Orders Section */}
      <CollapsibleSection
        title="Work Orders"
        icon={<FileText className="h-4 w-4" />}
        count={workOrders.length}
        total={workOrdersTotal}
        onAdd={onAddWorkOrder}
        addLabel="Create Work Order"
      >
        {workOrders.length > 0 ? (
          <div className="space-y-2">
            {workOrders.map((workOrder) => (
              <WorkOrderRow
                key={workOrder.id}
                workOrder={workOrder}
                onClick={() => onEditWorkOrder(workOrder)}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-6 text-muted-foreground">
            <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No work orders</p>
            <p className="text-sm">Click "Create Work Order" to add one</p>
          </div>
        )}
      </CollapsibleSection>
    </div>
  );
}
