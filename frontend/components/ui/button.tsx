import React from 'react';

export function Button({ children, className = '', ...props }: any) {
  return (
    <button className={`px-4 py-2 rounded font-medium transition-colors ${className}`} {...props}>
      {children}
    </button>
  );
}

export function Input({ label, ...props }: any) {
  return (
    <div className="flex flex-col gap-1">
      {label && <label className="text-sm font-medium">{label}</label>}
      <input className="p-2 border rounded focus:ring-2 focus:ring-brand-gold outline-none" {...props} />
    </div>
  );
}
