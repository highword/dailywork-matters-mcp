import * as React from 'react';
import { cn } from '../../lib/utils';

interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}

function Dialog({ open, onOpenChange, children }: DialogProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <DialogOverlay onClick={() => onOpenChange(false)} />
      {children}
    </div>
  );
}

function DialogOverlay({
  className,
  onClick,
}: { className?: string; onClick?: () => void }) {
  return (
    <div
      className={cn(
        'fixed inset-0 z-50 bg-black/80 animate-in fade-in-0',
        className,
      )}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Escape') onClick?.();
      }}
      aria-hidden="true"
    />
  );
}

function DialogContent({
  className,
  children,
}: { className?: string; children: React.ReactNode }) {
  return (
    <div
      className={cn(
        'fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg animate-in fade-in-0 zoom-in-95',
        className,
      )}
      role="dialog"
      aria-modal="true"
    >
      {children}
    </div>
  );
}

function DialogHeader({
  className,
  children,
}: { className?: string; children: React.ReactNode }) {
  return (
    <div className={cn('flex flex-col space-y-1.5 text-center sm:text-left', className)}>
      {children}
    </div>
  );
}

function DialogTitle({
  className,
  children,
}: { className?: string; children: React.ReactNode }) {
  return (
    <h2 className={cn('text-lg font-semibold leading-none tracking-tight', className)}>
      {children}
    </h2>
  );
}

function DialogDescription({
  className,
  children,
}: { className?: string; children: React.ReactNode }) {
  return (
    <p className={cn('text-sm text-muted-foreground', className)}>
      {children}
    </p>
  );
}

function DialogFooter({
  className,
  children,
}: { className?: string; children: React.ReactNode }) {
  return (
    <div className={cn('flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2', className)}>
      {children}
    </div>
  );
}

export {
  Dialog,
  DialogOverlay,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
};
