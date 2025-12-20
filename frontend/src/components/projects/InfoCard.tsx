import { cn } from '@/lib/utils';

interface InfoCardProps {
  title: string;
  children: React.ReactNode;
  className?: string;
}

export function InfoCard({ title, children, className }: InfoCardProps) {
  return (
    <div className={cn("glass-card p-5", className)}>
      <h3 className="text-xs font-bold text-muted-foreground/50 mb-3 uppercase tracking-widest">
        {title}
      </h3>
      <div className="space-y-1.5">
        {children}
      </div>
    </div>
  );
}

interface InfoRowProps {
  label?: string;
  children: React.ReactNode;
  className?: string;
}

export function InfoRow({ label, children, className }: InfoRowProps) {
  if (label) {
    return (
      <div className={cn("text-sm", className)}>
        <span className="text-muted-foreground">{label}: </span>
        <span className="font-medium">{children}</span>
      </div>
    );
  }
  return <div className={cn("text-sm", className)}>{children}</div>;
}

interface InfoLinkProps {
  href: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function InfoLink({ href, icon, children, className }: InfoLinkProps) {
  return (
    <a
      href={href}
      className={cn(
        "flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors",
        className
      )}
    >
      {icon}
      {children}
    </a>
  );
}
