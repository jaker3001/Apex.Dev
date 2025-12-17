import { useState } from 'react';
import { FileText, Plus, ChevronDown, ChevronUp, TrendingDown, RefreshCw, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Estimate } from '@/hooks/useProjects';

interface EstimatesTabProps {
  estimates: Estimate[];
  onAddEstimate?: () => void;
  onAddRevision?: (estimate: Estimate) => void;
  onViewEstimate?: (estimate: Estimate) => void;
  onApproveEstimate?: (estimate: Estimate) => void;
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
  revision: 'bg-purple-100 text-purple-700',
  denied: 'bg-red-100 text-red-700',
};

// Get reduction color based on percentage
// 1-10%: green (good), 11-15%: yellow (moderate), 16-20%: orange (concerning), 21%+: red (high)
function getReductionColor(percent: number): { bg: string; border: string; text: string; icon: string } {
  if (percent <= 10) {
    return { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-600', icon: 'text-green-500' };
  } else if (percent <= 15) {
    return { bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-600', icon: 'text-yellow-500' };
  } else if (percent <= 20) {
    return { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-600', icon: 'text-orange-500' };
  } else {
    return { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-600', icon: 'text-red-500' };
  }
}

interface EstimateGroupProps {
  estimateType: string;
  estimates: Estimate[];
  onAddRevision?: (estimate: Estimate) => void;
  onViewEstimate?: (estimate: Estimate) => void;
  onApproveEstimate?: (estimate: Estimate) => void;
}

function EstimateGroup({ estimateType, estimates, onAddRevision, onViewEstimate, onApproveEstimate }: EstimateGroupProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Sort by version descending - latest first
  const sortedEstimates = [...estimates].sort((a, b) => b.version - a.version);
  const latestEstimate = sortedEstimates[0];
  const hasMultipleVersions = sortedEstimates.length > 1;

  // Calculate reduction metrics
  const currentAmount = latestEstimate?.amount || 0;
  const originalAmount = latestEstimate?.original_amount || currentAmount;
  const reductionAmount = originalAmount - currentAmount;
  const reductionPercent = originalAmount > 0 ? (reductionAmount / originalAmount) * 100 : 0;
  const hasReduction = reductionAmount > 0;

  return (
    <div className="border rounded-lg overflow-hidden">
      {/* Main Summary Row */}
      <div className="p-4 bg-card">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className="font-semibold capitalize">{estimateType || 'Estimate'}</span>
              <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusColors[latestEstimate?.status] || 'bg-gray-100'}`}>
                {latestEstimate?.status?.replace('_', ' ')}
              </span>
              {hasMultipleVersions && (
                <span className="text-xs text-muted-foreground">(v{latestEstimate?.version})</span>
              )}
            </div>

            {/* Current Total - Always the latest amount - Clickable to view */}
            <div className="mb-3">
              <button
                onClick={() => onViewEstimate?.(latestEstimate)}
                className="text-left group"
              >
                <p className="text-2xl font-bold group-hover:text-primary transition-colors">
                  {formatCurrency(currentAmount)}
                </p>
                <p className="text-xs text-muted-foreground group-hover:text-primary/70 transition-colors">
                  Current Total {latestEstimate?.xactimate_file_path ? '(click to view)' : ''}
                </p>
              </button>
            </div>

            {/* Reduction Metrics - Only show if there's a reduction */}
            {hasReduction && (() => {
              const colors = getReductionColor(reductionPercent);
              return (
                <div className={`flex items-center gap-4 p-2 ${colors.bg} rounded-lg border ${colors.border}`}>
                  <TrendingDown className={`h-4 w-4 ${colors.icon}`} />
                  <div className="flex gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Original: </span>
                      <span className="font-medium">{formatCurrency(originalAmount)}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Reduction: </span>
                      <span className={`font-medium ${colors.text}`}>
                        -{formatCurrency(reductionAmount)} ({reductionPercent.toFixed(1)}%)
                      </span>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {/* Only show Add Revision and Approved buttons when NOT already approved */}
            {latestEstimate?.status !== 'approved' && (
              <>
                {onAddRevision && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onAddRevision(latestEstimate)}
                    title="Add a revision to this estimate"
                  >
                    <RefreshCw className="h-4 w-4 mr-1" />
                    Add Revision
                  </Button>
                )}
                {onApproveEstimate && (
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => onApproveEstimate(latestEstimate)}
                    title="Mark this estimate as approved"
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <CheckCircle className="h-4 w-4 mr-1" />
                    Approved
                  </Button>
                )}
              </>
            )}
            {hasMultipleVersions && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsExpanded(!isExpanded)}
              >
                {isExpanded ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
                <span className="ml-1">History ({sortedEstimates.length})</span>
              </Button>
            )}
          </div>
        </div>

        {/* Dates */}
        <div className="flex gap-4 mt-3 text-xs text-muted-foreground">
          {latestEstimate?.submitted_date && (
            <span>Submitted: {formatDate(latestEstimate.submitted_date)}</span>
          )}
          {latestEstimate?.approved_date && (
            <span>Approved: {formatDate(latestEstimate.approved_date)}</span>
          )}
        </div>
      </div>

      {/* Version History (Expandable) */}
      {isExpanded && hasMultipleVersions && (
        <div className="border-t bg-muted/30">
          <div className="p-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Version History
          </div>
          <div className="divide-y">
            {sortedEstimates.map((estimate) => (
              <button
                key={estimate.id}
                onClick={() => onViewEstimate?.(estimate)}
                className={`w-full px-4 py-2 flex items-center justify-between text-sm hover:bg-muted/50 transition-colors ${
                  estimate.id === latestEstimate.id ? 'bg-primary/5' : ''
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs bg-muted px-2 py-0.5 rounded">
                    v{estimate.version}
                  </span>
                  <span className="font-medium hover:text-primary">{formatCurrency(estimate.amount)}</span>
                  <span className={`px-2 py-0.5 rounded text-xs ${statusColors[estimate.status] || 'bg-gray-100'}`}>
                    {estimate.status?.replace('_', ' ')}
                  </span>
                  {estimate.xactimate_file_path && (
                    <FileText className="h-3 w-3 text-muted-foreground" />
                  )}
                </div>
                <span className="text-muted-foreground text-xs">
                  {formatDate(estimate.submitted_date || estimate.created_at)}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function EstimatesTab({ estimates, onAddEstimate, onAddRevision, onViewEstimate, onApproveEstimate }: EstimatesTabProps) {
  // Group estimates by type
  const groupedEstimates = estimates.reduce((acc, estimate) => {
    const type = estimate.estimate_type || 'other';
    if (!acc[type]) acc[type] = [];
    acc[type].push(estimate);
    return acc;
  }, {} as Record<string, Estimate[]>);

  // Calculate grand total (sum of latest version amounts from each type)
  const grandTotal = Object.values(groupedEstimates).reduce((total, group) => {
    const latestInGroup = [...group].sort((a, b) => b.version - a.version)[0];
    return total + (latestInGroup?.amount || 0);
  }, 0);

  // Calculate total original and reduction
  const totalOriginal = Object.values(groupedEstimates).reduce((total, group) => {
    const latestInGroup = [...group].sort((a, b) => b.version - a.version)[0];
    return total + (latestInGroup?.original_amount || latestInGroup?.amount || 0);
  }, 0);

  const totalReduction = totalOriginal - grandTotal;
  const hasAnyReduction = totalReduction > 0;

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-muted-foreground" />
          <h3 className="font-medium">Estimates</h3>
        </div>
        <Button variant="ghost" size="sm" onClick={onAddEstimate}>
          <Plus className="h-4 w-4 mr-1" />
          Add Estimate
        </Button>
      </div>

      {estimates.length > 0 ? (
        <>
          <div className="space-y-4">
            {Object.entries(groupedEstimates).map(([type, groupEstimates]) => (
              <EstimateGroup
                key={type}
                estimateType={type}
                estimates={groupEstimates}
                onAddRevision={onAddRevision}
                onViewEstimate={onViewEstimate}
                onApproveEstimate={onApproveEstimate}
              />
            ))}
          </div>

          {/* Grand Total Section */}
          <div className="mt-6 pt-4 border-t">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-muted-foreground">Grand Total</p>
                <p className="text-2xl font-bold">{formatCurrency(grandTotal)}</p>
              </div>
              {hasAnyReduction && (() => {
                const totalReductionPercent = (totalReduction / totalOriginal) * 100;
                const colors = getReductionColor(totalReductionPercent);
                return (
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Total Reduction</p>
                    <p className={`text-lg font-semibold ${colors.text}`}>
                      -{formatCurrency(totalReduction)} ({totalReductionPercent.toFixed(1)}%)
                    </p>
                  </div>
                );
              })()}
            </div>
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
