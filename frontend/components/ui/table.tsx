import * as React from "react"

interface TableProps<T> {
  columns: {
    header: string;
    accessor: keyof T | ((item: T) => React.ReactNode);
  }[];
  data: T[];
  className?: string;
}

export function Table<T>({ columns, data, className = "" }: TableProps<T>) {
  return (
    <div className={`overflow-x-auto rounded-lg border border-slate-700 ${className}`}>
      <table className="w-full text-sm text-left text-slate-300">
        <thead className="text-xs uppercase bg-slate-800 text-slate-400">
          <tr>
            {columns.map((col, i) => (
              <th key={i} className="px-4 py-3 font-medium">{col.header}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-700">
          {data.map((item, rowIdx) => (
            <tr key={rowIdx} className="hover:bg-slate-800/50 transition-colors">
              {columns.map((col, colIdx) => (
                <td key={colIdx} className="px-4 py-3">
                  {typeof col.accessor === 'function' 
                    ? col.accessor(item) 
                    : (item[col.accessor] as any)}
                </td>
              ))}
            </tr>
          ))}
          {data.length === 0 && (
            <tr>
              <td colSpan={columns.length} className="px-4 py-8 text-center text-slate-500 italic">
                No data available
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
