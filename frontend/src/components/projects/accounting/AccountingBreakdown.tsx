import { useState } from 'react';
import { ChevronDown, ChevronRight, FileText, DollarSign, Clock, Receipt } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getTypeAcronym, getTypeLabel } from '@/lib/constants';
import type { Estimate, Payment, LaborEntry, Receipt as ReceiptType } from '@/hooks/useProjects';

// Fixed display order for estimate type groups
const ESTIMATE_TYPE_ORDER = ['mitigation', 'remediation', 'abatement', 'reconstruction', 'remodel'];

function formatCurrency(amount?: number): string {
  if (amount === undefined || amount === null) return '$0.00';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

interface BreakdownSectionProps {
  title: string;
  icon: React.ReactNode;
  count: number;
  total?: number;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

function BreakdownSection({ title, icon, count, total, children, defaultOpen = false }: BreakdownSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border rounded-md overflow-hidden">
      <button
        className="w-full flex items-center justify-between p-2 hover:bg-muted/50 transition-colors"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-2">
          {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          <span className="text-muted-foreground">{icon}</span>
          <span className="text-sm font-medium">{title}</span>
          <span className="text-xs text-muted-foreground">({count})</span>
        </div>
        {total !== undefined && (
          <span className="text-sm font-medium">{formatCurrency(total)}</span>
        )}
      </button>
      {isOpen && (
        <div className="border-t bg-muted/20 p-2">
          {children}
        </div>
      )}
    </div>
  );
}

interface EstimatesBreakdownProps {
  estimates: Estimate[];
}

/**
 * Calculate the total using only the latest version per estimate_type.
 * This ensures revisions don't double-count in the total.
 */
function getLatestEstimatesTotal(estimates: Estimate[]): number {
  const latestByType = new Map<string, Estimate>();

  for (const est of estimates) {
    const type = est.estimate_type || '';
    const existing = latestByType.get(type);
    if (!existing || est.version > existing.version) {
      latestByType.set(type, est);
    }
  }

  return Array.from(latestByType.values()).reduce((sum, e) => sum + (e.amount || 0), 0);
}

// Sub-section for estimate type groups (collapsible)
interface EstimateTypeGroupProps {
  type: string;
  estimates: Estimate[];
  latestAmount: number;
  getStatusColor: (status: string) => string;
}

function EstimateTypeGroup({ type, estimates, latestAmount, getStatusColor }: EstimateTypeGroupProps) {
  const [isOpen, setIsOpen] = useState(true);

  // Sort by version descending (newest first)
  const sortedEstimates = [...estimates].sort((a, b) => b.version - a.version);

  return (
    <div className="border rounded overflow-hidden">
      <button
        className="w-full flex items-center justify-between p-1.5 hover:bg-muted/30 transition-colors bg-muted/10"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-2">
          {isOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
          <span className="text-xs font-medium">{getTypeLabel(type)}</span>
          <span className="text-[10px] text-muted-foreground">({estimates.length})</span>
        </div>
        <span className="text-xs font-medium">{formatCurrency(latestAmount)}</span>
      </button>
      {isOpen && (
        <div className="border-t p-1.5 space-y-1">
          {sortedEstimates.map((estimate) => (
            <div key={estimate.id} className="flex items-center justify-between text-xs p-1.5 rounded bg-background">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">v{estimate.version}</span>
                <span className={cn("px-1.5 py-0.5 rounded capitalize text-[10px] font-medium", getStatusColor(estimate.status))}>
                  {estimate.status}
                </span>
              </div>
              <span className="font-medium">{formatCurrency(estimate.amount)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function EstimatesBreakdown({ estimates }: EstimatesBreakdownProps) {
  if (estimates.length === 0) return null;

  // Only sum latest version per estimate_type for the total
  const total = getLatestEstimatesTotal(estimates);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'text-green-600 bg-green-100';
      case 'submitted': return 'text-blue-600 bg-blue-100';
      case 'draft': return 'text-gray-600 bg-gray-100';
      case 'denied': return 'text-red-600 bg-red-100';
      default: return 'text-yellow-600 bg-yellow-100';
    }
  };

  // Group estimates by type
  const estimatesByType = estimates.reduce((acc, est) => {
    const type = est.estimate_type || 'other';
    if (!acc[type]) {
      acc[type] = [];
    }
    acc[type].push(est);
    return acc;
  }, {} as Record<string, Estimate[]>);

  // Get latest amount for each type (for display in the group header)
  const latestAmountByType = (type: string): number => {
    const typeEstimates = estimatesByType[type] || [];
    if (typeEstimates.length === 0) return 0;
    const latest = typeEstimates.reduce((max, est) =>
      est.version > max.version ? est : max
    );
    return latest.amount || 0;
  };

  // Filter to only types that have estimates, in the specified order
  const orderedTypes = ESTIMATE_TYPE_ORDER.filter(type => estimatesByType[type]?.length > 0);

  // Add any types not in our predefined order (edge case for legacy data)
  const otherTypes = Object.keys(estimatesByType).filter(
    type => !ESTIMATE_TYPE_ORDER.includes(type)
  );

  return (
    <BreakdownSection
      title="Estimates"
      icon={<FileText className="h-4 w-4" />}
      count={estimates.length}
      total={total}
    >
      <div className="space-y-2">
        {orderedTypes.map((type) => (
          <EstimateTypeGroup
            key={type}
            type={type}
            estimates={estimatesByType[type]}
            latestAmount={latestAmountByType(type)}
            getStatusColor={getStatusColor}
          />
        ))}
        {otherTypes.map((type) => (
          <EstimateTypeGroup
            key={type}
            type={type}
            estimates={estimatesByType[type]}
            latestAmount={latestAmountByType(type)}
            getStatusColor={getStatusColor}
          />
        ))}
      </div>
    </BreakdownSection>
  );
}

interface PaymentsBreakdownProps {
  payments: Payment[];
}

export function PaymentsBreakdown({ payments }: PaymentsBreakdownProps) {
  if (payments.length === 0) return null;

  const total = payments.reduce((sum, p) => sum + p.amount, 0);

  return (
    <BreakdownSection
      title="Payments"
      icon={<DollarSign className="h-4 w-4" />}
      count={payments.length}
      total={total}
    >
      <div className="space-y-1">
        {payments.map((payment) => (
          <div key={payment.id} className="flex items-center justify-between text-xs p-1.5 rounded bg-background">
            <div className="flex items-center gap-2 text-muted-foreground">
              <span>{formatDate(payment.received_date)}</span>
              {payment.payment_method && (
                <span className="px-1.5 py-0.5 rounded bg-muted text-[10px]">{payment.payment_method}</span>
              )}
            </div>
            <span className="font-medium text-green-600">{formatCurrency(payment.amount)}</span>
          </div>
        ))}
      </div>
    </BreakdownSection>
  );
}

interface LaborBreakdownProps {
  laborEntries: LaborEntry[];
}

export function LaborBreakdown({ laborEntries }: LaborBreakdownProps) {
  if (laborEntries.length === 0) return null;

  const totalHours = laborEntries.reduce((sum, e) => sum + e.hours, 0);
  const totalCost = laborEntries.reduce((sum, e) => sum + (e.hours * (e.hourly_rate || 0)), 0);

  // Group by employee
  const byEmployee = laborEntries.reduce((acc, entry) => {
    const name = entry.employee_name || 'Unassigned';
    if (!acc[name]) {
      acc[name] = { hours: 0, cost: 0 };
    }
    acc[name].hours += entry.hours;
    acc[name].cost += entry.hours * (entry.hourly_rate || 0);
    return acc;
  }, {} as Record<string, { hours: number; cost: number }>);

  return (
    <BreakdownSection
      title="Labor"
      icon={<Clock className="h-4 w-4" />}
      count={laborEntries.length}
      total={totalCost}
    >
      <div className="space-y-1">
        <div className="text-xs text-muted-foreground mb-2">
          Total: {totalHours.toFixed(1)} hours
        </div>
        {Object.entries(byEmployee).map(([name, data]) => (
          <div key={name} className="flex items-center justify-between text-xs p-1.5 rounded bg-background">
            <div className="flex items-center gap-2">
              <span className="font-medium">{name}</span>
              <span className="text-muted-foreground">{data.hours.toFixed(1)} hrs</span>
            </div>
            <span className="font-medium">{formatCurrency(data.cost)}</span>
          </div>
        ))}
      </div>
    </BreakdownSection>
  );
}

interface ReceiptsBreakdownProps {
  receipts: ReceiptType[];
}

export function ReceiptsBreakdown({ receipts }: ReceiptsBreakdownProps) {
  if (receipts.length === 0) return null;

  const total = receipts.reduce((sum, r) => sum + r.amount, 0);

  // Group by category
  const byCategory = receipts.reduce((acc, receipt) => {
    const cat = receipt.expense_category || 'other';
    if (!acc[cat]) {
      acc[cat] = { count: 0, total: 0 };
    }
    acc[cat].count += 1;
    acc[cat].total += receipt.amount;
    return acc;
  }, {} as Record<string, { count: number; total: number }>);

  const categoryLabels: Record<string, string> = {
    materials: 'Materials',
    equipment_rental: 'Equipment Rental',
    subcontractor: 'Subcontractor',
    disposal: 'Disposal',
    permit: 'Permits',
    supplies: 'Supplies',
    other: 'Other',
  };

  return (
    <BreakdownSection
      title="Receipts"
      icon={<Receipt className="h-4 w-4" />}
      count={receipts.length}
      total={total}
    >
      <div className="space-y-1">
        {Object.entries(byCategory).map(([category, data]) => (
          <div key={category} className="flex items-center justify-between text-xs p-1.5 rounded bg-background">
            <div className="flex items-center gap-2">
              <span className="font-medium">{categoryLabels[category] || category}</span>
              <span className="text-muted-foreground">({data.count})</span>
            </div>
            <span className="font-medium">{formatCurrency(data.total)}</span>
          </div>
        ))}
      </div>
    </BreakdownSection>
  );
}
