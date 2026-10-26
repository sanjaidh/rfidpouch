import React from 'react';

interface StatusBadgeProps {
  status: string;
  className?: string;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className = '', size = 'md' }) => {
  let colorStyles = 'bg-slate-100 text-slate-700 border-slate-200';

  switch (status) {
    case 'Registered':
      colorStyles = 'bg-blue-50 text-blue-700 border-blue-200';
      break;
    case 'Awaiting Processing':
      colorStyles = 'bg-cyan-50 text-cyan-700 border-cyan-200';
      break;
    case 'In Production':
      colorStyles = 'bg-indigo-50 text-indigo-700 border-indigo-200';
      break;
    case 'Quality Inspection':
      colorStyles = 'bg-purple-50 text-purple-700 border-purple-200';
      break;
    case 'Packaging':
      colorStyles = 'bg-amber-50 text-amber-700 border-amber-200';
      break;
    case 'Completed':
      colorStyles = 'bg-emerald-50 text-emerald-700 border-emerald-200';
      break;
    case 'Dispatched':
      colorStyles = 'bg-teal-50 text-teal-700 border-teal-200';
      break;
    case 'On Hold':
      colorStyles = 'bg-orange-50 text-orange-700 border-orange-200';
      break;
    case 'Delayed':
      colorStyles = 'bg-rose-50 text-rose-700 border-rose-200';
      break;
    default:
      colorStyles = 'bg-slate-100 text-slate-700 border-slate-200';
  }

  const sizeStyles = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs';

  return (
    <span
      className={`inline-flex items-center font-medium rounded-full border ${sizeStyles} ${colorStyles} ${className}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current mr-1.5 opacity-70" />
      {status}
    </span>
  );
};
