import React from 'react';
import { AlertCircle, CheckCircle2, Clock, Eye, XCircle } from 'lucide-react';
import { ComplaintStatus } from '../types';

interface Props {
  status: ComplaintStatus;
  size?: 'sm' | 'md' | 'lg';
}

export const StatusBadge: React.FC<Props> = ({ status, size = 'md' }) => {
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5 gap-1',
    md: 'text-xs px-2.5 py-1 gap-1.5 font-medium',
    lg: 'text-sm px-3.5 py-1.5 gap-2 font-medium',
  };

  switch (status) {
    case 'Submitted':
      return (
        <span
          className={`inline-flex items-center rounded-full bg-slate-100 text-slate-700 border border-slate-300 ${sizeClasses[size]}`}
        >
          <Clock className="w-3.5 h-3.5 text-slate-500" />
          <span>Submitted</span>
        </span>
      );
    case 'Acknowledged':
      return (
        <span
          className={`inline-flex items-center rounded-full bg-blue-50 text-blue-700 border border-blue-200 ${sizeClasses[size]}`}
        >
          <Eye className="w-3.5 h-3.5 text-blue-600" />
          <span>Acknowledged</span>
        </span>
      );
    case 'In Progress':
      return (
        <span
          className={`inline-flex items-center rounded-full bg-amber-50 text-amber-800 border border-amber-200 ${sizeClasses[size]}`}
        >
          <Clock className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
          <span>In Progress</span>
        </span>
      );
    case 'Resolved':
      return (
        <span
          className={`inline-flex items-center rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 ${sizeClasses[size]}`}
        >
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          <span>Resolved</span>
        </span>
      );
    case 'Rejected':
      return (
        <span
          className={`inline-flex items-center rounded-full bg-rose-50 text-rose-700 border border-rose-200 ${sizeClasses[size]}`}
        >
          <XCircle className="w-3.5 h-3.5 text-rose-500" />
          <span>Rejected</span>
        </span>
      );
    default:
      return (
        <span
          className={`inline-flex items-center rounded-full bg-slate-100 text-slate-700 ${sizeClasses[size]}`}
        >
          <AlertCircle className="w-3.5 h-3.5 text-slate-500" />
          <span>{status}</span>
        </span>
      );
  }
};
