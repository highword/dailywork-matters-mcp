import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

const badgeVariants = cva(
  'inline-flex items-center px-2 py-0.5 text-xs font-medium transition-colors',
  {
    variants: {
      variant: {
        default: 'bg-accent/10 text-accent',
        feature: 'bg-[hsl(220_70%_50%)]/10 text-[hsl(220_70%_50%)] dark:bg-[hsl(220_70%_60%)]/10 dark:text-[hsl(220_70%_60%)]',
        bugfix: 'bg-[hsl(0_72%_51%)]/10 text-[hsl(0_72%_51%)] dark:bg-[hsl(0_62%_55%)]/10 dark:text-[hsl(0_62%_55%)]',
        refactor: 'bg-[hsl(270_60%_55%)]/10 text-[hsl(270_60%_55%)] dark:bg-[hsl(270_60%_65%)]/10 dark:text-[hsl(270_60%_65%)]',
        research: 'bg-[hsl(45_90%_48%)]/10 text-[hsl(45_90%_48%)] dark:bg-[hsl(45_85%_55%)]/10 dark:text-[hsl(45_85%_55%)]',
        config: 'bg-[hsl(160_60%_40%)]/10 text-[hsl(160_60%_40%)] dark:bg-[hsl(160_55%_50%)]/10 dark:text-[hsl(160_55%_50%)]',
        docs: 'bg-[hsl(190_70%_45%)]/10 text-[hsl(190_70%_45%)] dark:bg-[hsl(190_65%_55%)]/10 dark:text-[hsl(190_65%_55%)]',
        other: 'bg-[hsl(0_0%_50%)]/10 text-[hsl(0_0%_50%)] dark:bg-[hsl(0_0%_60%)]/10 dark:text-[hsl(0_0%_60%)]',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
