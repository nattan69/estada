import React from 'react';

export function FolioTable({ items }: { items: any[] }) {
  return (
    <table className="w-full border-collapse bg-white">
      <thead>
        <tr className="bg-gray-100 text-left">
          <th className="p-3 border">Date</th>
          <th className="p-3 border">Description</th>
          <th className="p-3 border">Amount</th>
        </tr>
      </thead>
      <tbody>
        {items.map((item, i) => (
          <tr key={i}>
            <td className="p-3 border">{item.date}</td>
            <td className="p-3 border">{item.description}</td>
            <td className="p-3 border text-right">{item.amount}€</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
