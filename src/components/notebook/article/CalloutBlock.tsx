import React from 'react';
import { Lightbulb, AlertTriangle, AlertOctagon, Pencil } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CalloutBlockProps {
  type: 'pearl' | 'trap' | 'caution';
  children: React.ReactNode;
  onClick?: () => void;
}

export function CalloutBlock({ type, children, onClick }: CalloutBlockProps) {
  const config = {
    pearl: {
      icon: <Lightbulb className="h-4 w-4 text-notebook-pearl" />,
      label: "CLINICAL PEARL",
      bgClass: "bg-notebook-pearl/10 border-notebook-pearl",
      hoverRing: "hover:ring-success"
    },
    trap: {
      icon: <AlertTriangle className="h-4 w-4 text-notebook-trap" />,
      label: "EXAM TRAP",
      bgClass: "bg-notebook-trap/10 border-notebook-trap",
      hoverRing: "hover:ring-warning"
    },
    caution: {
      icon: <AlertOctagon className="h-4 w-4 text-notebook-caution" />,
      label: "CAUTION",
      bgClass: "bg-notebook-caution/10 border-notebook-caution",
      hoverRing: "hover:ring-destructive"
    }
  };

  const { icon, label, bgClass, hoverRing } = config[type];

  return (
    <div
      className={cn(
        "group relative rounded-md p-4 my-4 border-l-4 transition-all",
        bgClass,
        onClick && ["cursor-pointer hover:ring-2 hover:ring-offset-2", hoverRing]
      )}
      onClick={onClick}
    >
      <div className="flex items-center gap-2 mb-2 font-semibold text-sm uppercase tracking-wide">
        {icon}
        <span>{label}</span>
      </div>
      <div className="text-sm leading-relaxed">
        {children}
      </div>
      {onClick && (
        <Pencil className="absolute right-3 top-3 h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
      )}
    </div>
  );
}
