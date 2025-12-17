import { FileText, Receipt, Clock, Briefcase, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface AccountingActionsProps {
  readyToInvoice?: boolean;
  onAddEstimate: () => void;
  onAddReceipt: () => void;
  onAddLabor: () => void;
  onAddWorkOrder: () => void;
  onToggleReadyToInvoice: () => void;
  isToggling?: boolean;
}

export function AccountingActions({
  readyToInvoice = false,
  onAddEstimate,
  onAddReceipt,
  onAddLabor,
  onAddWorkOrder,
  onToggleReadyToInvoice,
  isToggling = false,
}: AccountingActionsProps) {
  return (
    <div className="space-y-2">
      {/* Primary Actions Row */}
      <div className="grid grid-cols-2 gap-2">
        <Button
          variant="outline"
          size="sm"
          className="w-full justify-start gap-2"
          onClick={onAddEstimate}
        >
          <FileText className="h-4 w-4" />
          <span className="truncate">Estimate</span>
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="w-full justify-start gap-2"
          onClick={onAddReceipt}
        >
          <Receipt className="h-4 w-4" />
          <span className="truncate">Receipt</span>
        </Button>
      </div>

      {/* Secondary Actions Row */}
      <div className="grid grid-cols-2 gap-2">
        <Button
          variant="outline"
          size="sm"
          className="w-full justify-start gap-2"
          onClick={onAddLabor}
        >
          <Clock className="h-4 w-4" />
          <span className="truncate">Labor</span>
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="w-full justify-start gap-2"
          onClick={onAddWorkOrder}
        >
          <Briefcase className="h-4 w-4" />
          <span className="truncate">Work Order</span>
        </Button>
      </div>

      {/* Ready to Invoice Toggle */}
      <Button
        variant={readyToInvoice ? "default" : "outline"}
        size="sm"
        className={cn(
          "w-full justify-center gap-2",
          readyToInvoice && "bg-green-600 hover:bg-green-700"
        )}
        onClick={onToggleReadyToInvoice}
        disabled={isToggling}
      >
        <CheckCircle2 className={cn("h-4 w-4", readyToInvoice && "fill-current")} />
        {readyToInvoice ? "Ready to Invoice" : "Mark Ready to Invoice"}
      </Button>
    </div>
  );
}
