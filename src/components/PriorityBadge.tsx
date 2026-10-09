import React from 'react';
import { AlertOctagon, AlertTriangle, ArrowDown, ArrowUp } from 'lucide-react';
import { PriorityLevel } from '../types';

interface Props {
  priority: PriorityLevel;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
}

export const PriorityBadge: React.FC<Props> = ({ priority, size = 'md', showIcon = true }) => {
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5 gap-1 font-medium',
    md: 'text-xs px-2.5 py-1 gap-1.5 font-semibold',
    lg: 'text-sm px-3.5 py-1.5 gap-2 font-semibold',
  };

  switch (priority) {
    case 'Critical':
      return (
        <span
          className={`inline-flex items-center rounded-md bg-rose-600 text-white ${sizeClasses[size]}`}
          title="Critical Priority - Immediate Intervention Required (24h SLA)"
        >
          {showIcon && <AlertOctagon className="w-3.5 h-3.5 text-rose-100" />}
          <span>Critical</span>
        </span>
      );
    case 'High':
      return (
        <span
          className={`inline-flex items-center rounded-md bg-orange-100 text-orange-900 border border-orange-300 ${sizeClasses[size]}`}
          title="High Priority - Serious Urban Impairment (48h SLA)"
        >
          {showIcon && <AlertTriangle className="w-3.5 h-3.5 text-orange-600" />}
          <span>High</span>
        </span>
      );
    case 'Medium':
      return (
        <span
          className={`inline-flex items-center rounded-md bg-amber-100 text-amber-900 border border-amber-300 ${sizeClasses[size]}`}
          title="Medium Priority - Standard Municipal Turnaround (72h SLA)"
        >
          {showIcon && <ArrowUp className="w-3.5 h-3.5 text-amber-600" />}
          <span>Medium</span>
        </span>
      );
    case 'Low':
    default:
      return (
        <span
          className={`inline-flex items-center rounded-md bg-slate-100 text-slate-700 border border-slate-300 ${sizeClasses[size]}`}
          title="Low Priority - Scheduled Maintenance (120h SLA)"
        >
          {showIcon && <ArrowDown className="w-3.5 h-3.5 text-slate-500" />}
          <span>Low</span>
        </span>
      );
  }
};
