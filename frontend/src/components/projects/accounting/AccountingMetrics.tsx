import { DollarSign, Clock, TrendingUp, FileText, Receipt, Briefcase } from 'lucide-react';
import type { AccountingSummary } from '@/hooks/useProjects';

interface AccountingMetricsProps {
  summary: AccountingSummary;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
}

function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

function formatHours(hours: number): string {
  return `${hours.toFixed(1)} hrs`;
}

interface MetricCardProps {
  label: string;
  value: string;
  icon: React.ReactNode;
  subtext?: string;
  variant?: 'default' | 'success' | 'warning' | 'danger';
}

function MetricCard({ label, value, icon, subtext, variant = 'default' }: MetricCardProps) {
  const variantStyles = {
    default: 'text-foreground',
    success: 'text-green-600',
    warning: 'text-yellow-600',
    danger: 'text-red-600',
  };

  return (
    <div className="flex items-start gap-2 p-2 rounded-md bg-muted/30">
      <div className="text-muted-foreground mt-0.5">{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground truncate">{label}</p>
        <p className={`text-sm font-semibold ${variantStyles[variant]}`}>{value}</p>
        {subtext && <p className="text-xs text-muted-foreground">{subtext}</p>}
      </div>
    </div>
  );
}

export function AccountingMetrics({ summary }: AccountingMetricsProps) {
  const profitVariant = summary.gross_profit >= 0 ? 'success' : 'danger';
  const gpPercentVariant = summary.gross_profit_percentage >= 30 ? 'success' :
                           summary.gross_profit_percentage >= 15 ? 'warning' : 'danger';

  return (
    <div className="space-y-3">
      {/* Primary Metrics */}
      <div className="grid grid-cols-2 gap-2">
        <MetricCard
          label="Approved Estimates"
          value={formatCurrency(summary.approved_estimates)}
          icon={<FileText className="h-4 w-4" />}
          subtext={`${summary.estimate_count} total`}
        />
        <MetricCard
          label="Total Paid"
          value={formatCurrency(summary.total_paid)}
          icon={<DollarSign className="h-4 w-4" />}
          variant="success"
          subtext={`${summary.payment_count} payments`}
        />
      </div>

      {/* Balance Due - Full Width */}
      <div className="p-3 rounded-md bg-muted/50 border">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Balance Due</span>
          <span className={`text-lg font-bold ${summary.balance_due > 0 ? 'text-yellow-600' : 'text-green-600'}`}>
            {formatCurrency(summary.balance_due)}
          </span>
        </div>
      </div>

      {/* Cost Metrics */}
      <div className="grid grid-cols-2 gap-2">
        <MetricCard
          label="Labor Cost"
          value={formatCurrency(summary.total_labor_cost)}
          icon={<Clock className="h-4 w-4" />}
          subtext={formatHours(summary.total_labor_hours)}
        />
        <MetricCard
          label="Materials"
          value={formatCurrency(summary.total_materials_cost)}
          icon={<Receipt className="h-4 w-4" />}
          subtext={`${summary.receipt_count} receipts`}
        />
      </div>

      {/* Work Order Budget */}
      {summary.work_order_budget > 0 && (
        <MetricCard
          label="Work Order Budget"
          value={formatCurrency(summary.work_order_budget)}
          icon={<Briefcase className="h-4 w-4" />}
          subtext={`${summary.work_order_count} work orders`}
        />
      )}

      {/* Profitability - Full Width */}
      <div className="p-3 rounded-md bg-muted/50 border">
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm text-muted-foreground flex items-center gap-1">
            <TrendingUp className="h-4 w-4" />
            Gross Profit
          </span>
          <span className={`text-lg font-bold ${profitVariant === 'success' ? 'text-green-600' : 'text-red-600'}`}>
            {formatCurrency(summary.gross_profit)}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">GP Margin</span>
          <span className={`text-sm font-semibold ${gpPercentVariant === 'success' ? 'text-green-600' : gpPercentVariant === 'warning' ? 'text-yellow-600' : 'text-red-600'}`}>
            {formatPercent(summary.gross_profit_percentage)}
          </span>
        </div>
      </div>
    </div>
  );
}
