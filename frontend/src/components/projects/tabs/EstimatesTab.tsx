import { FileText, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Estimate } from '@/hooks/useProjects';

interface EstimatesTabProps {
  estimates: Estimate[];
  onAddEstimate?: () => void;
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

const statusColors: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700',
  submitted: 'bg-blue-100 text-blue-700',
  approved: 'bg-green-100 text-green-700',
  revision_requested: 'bg-yellow-100 text-yellow-700',
  denied: 'bg-red-100 text-red-700',
};

function EstimateRow({ estimate }: { estimate: Estimate }) {
  return (
    <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/30 transition-colors">
      <div className="flex items-center gap-4">
        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-muted">
          <span className="text-sm font-bold">v{estimate.version}</span>
        </div>
        <div>
          <p className="font-semibold text-lg">{formatCurrency(estimate.amount)}</p>
          {estimate.estimate_type && (
            <p className="text-xs text-muted-foreground">{estimate.estimate_type}</p>
          )}
        </div>
        <span className={`px-2 py-1 rounded text-xs font-medium ${statusColors[estimate.status] || 'bg-gray-100'}`}>
          {estimate.status.replace('_', ' ')}
        </span>
      </div>
      <div className="text-right text-sm text-muted-foreground">
        {estimate.submitted_date && (
          <p>Submitted: {formatDate(estimate.submitted_date)}</p>
        )}
        {estimate.approved_date && (
          <p>Approved: {formatDate(estimate.approved_date)}</p>
        )}
      </div>
    </div>
  );
}

export function EstimatesTab({ estimates, onAddEstimate }: EstimatesTabProps) {
  const total = estimates.reduce((sum, e) => sum + (e.amount || 0), 0);

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-muted-foreground" />
          <h3 className="font-medium">Estimates</h3>
          <span className="text-sm text-muted-foreground">({estimates.length})</span>
        </div>
        <Button variant="ghost" size="sm" onClick={onAddEstimate}>
          <Plus className="h-4 w-4 mr-1" />
          Add Estimate
        </Button>
      </div>

      {estimates.length > 0 ? (
        <>
          <div className="space-y-2">
            {estimates.map((estimate) => (
              <EstimateRow key={estimate.id} estimate={estimate} />
            ))}
          </div>
          <div className="mt-4 pt-4 border-t text-right">
            <span className="text-muted-foreground">Total: </span>
            <span className="font-bold text-lg">{formatCurrency(total)}</span>
          </div>
        </>
      ) : (
        <div className="text-center py-8 text-muted-foreground">
          <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>No estimates yet</p>
          <p className="text-sm">Click "Add Estimate" to create one</p>
        </div>
      )}
    </div>
  );
}
