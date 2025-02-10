
// components/Dashboard/ExpenseList.tsx

import React from 'react';
import { useState } from 'react';
import DatePicker from 'react-datepicker';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';

export default function ExpenseList({ expenses }) {
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredExpenses = expenses.filter(expense => {
    const matchesDate = (!startDate || new Date(expense.date) >= startDate) &&
                       (!endDate || new Date(expense.date) <= endDate);
    const matchesSearch = expense.description.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesDate && matchesSearch;
  });

  return (
    <div className="bg-white p-4 rounded-lg shadow-sm">
      <div className="flex flex-col sm:flex-row gap-4 mb-4">
        <div className="flex items-center gap-2 flex-1">
          <DatePicker
            selected={startDate}
            onChange={date => setStartDate(date)}
            placeholderText="Start Date"
            className="form-input w-full rounded-md text-sm"
          />
          <span className="text-gray-500">to</span>
          <DatePicker
            selected={endDate}
            onChange={date => setEndDate(date)}
            placeholderText="End Date"
            className="form-input w-full rounded-md text-sm"
          />
        </div>
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="Search transactions..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="form-input w-full pl-8 rounded-md text-sm"
          />
          <MagnifyingGlassIcon className="w-4 h-4 absolute left-2 top-3 text-gray-400" />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="text-left text-sm border-b">
              <th className="p-2">Date</th>
              <th className="p-2">Description</th>
              <th className="p-2">Category</th>
              <th className="p-2 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {filteredExpenses.map(expense => (
              <tr key={expense.id} className="border-b hover:bg-gray-50">
                <td className="p-2 text-sm">{new Date(expense.date).toLocaleDateString()}</td>
                <td className="p-2 text-sm max-w-[200px] truncate">{expense.description}</td>
                <td className="p-2">
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                    {expense.category}
                  </span>
                </td>
                <td className={`p-2 text-right text-sm ${expense.amount < 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {expense.amount.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}