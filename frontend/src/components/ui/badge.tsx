import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default:
          'bg-primary/10 text-primary border border-primary/20',
        secondary:
          'bg-secondary/10 text-secondary border border-secondary/20',
        destructive:
          'bg-red-100 text-red-700 border border-red-200',
        outline:
          'text-gray-700 border border-gray-300 bg-transparent',
        success:
          'bg-green-100 text-green-700 border border-green-200',
        warning:
          'bg-amber-100 text-amber-700 border border-amber-200',
        accent:
          'bg-accent/10 text-accent border border-accent/20',
        gray:
          'bg-gray-100 text-gray-600 border border-gray-200',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {
  dot?: boolean;
}

function Badge({ className, variant, dot = false, children, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props}>
      {dot && (
        <span
          className={cn(
            'h-1.5 w-1.5 rounded-full shrink-0',
            variant === 'destructive' && 'bg-red-600',
            variant === 'success' && 'bg-green-600',
            variant === 'warning' && 'bg-amber-600',
            variant === 'secondary' && 'bg-secondary',
            variant === 'default' && 'bg-primary',
            variant === 'accent' && 'bg-accent',
            variant === 'gray' && 'bg-gray-500',
            variant === 'outline' && 'bg-gray-600',
          )}
        />
      )}
      {children}
    </div>
  );
}

export { Badge, badgeVariants };
