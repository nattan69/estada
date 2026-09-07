import * as React from "react"

interface CalendarProps {
  selectedDate: Date;
  onDateChange: (date: Date) => void;
}

export const Calendar = ({ selectedDate, onDateChange }: CalendarProps) => {
  const daysInMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1).getDay();
  
  const dates = [];
  for (let i = 0; i < firstDayOfMonth; i++) dates.push(null);
  for (let i = 1; i <= daysInMonth; i++) dates.push(i);

  return (
    <div className="p-4 bg-slate-900 border border-slate-700 rounded-lg text-white">
      <div className="flex justify-between items-center mb-4">
        <span className="font-bold text-gold-500">
          {selectedDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
        </span>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-slate-500 mb-2">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => <div key={d}>{d}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {dates.map((date, i) => (
          <button
            key={i}
            disabled={!date}
            onClick={() => date && onDateChange(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), date))}
            className={`p-2 text-sm rounded-md transition-colors ${
              date === selectedDate.getDate() 
                ? 'bg-gold-500 text-slate-900 font-bold' 
                : !date ? 'invisible' : 'hover:bg-slate-800 text-slate-300'
            }`}
          >
            {date}
          </button>
        ))}
      </div>
    </div>
  );
}
