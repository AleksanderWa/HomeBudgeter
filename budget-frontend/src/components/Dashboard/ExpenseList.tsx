// components/Dashboard/ExpenseList.tsx

import React, { useMemo, useState, useCallback, useEffect } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { MagnifyingGlassIcon, TrashIcon, ExclamationTriangleIcon, CheckIcon, PencilIcon, PlusIcon } from '@heroicons/react/24/outline';
import useExpenses from '../../hooks/useExpenses.ts';
import api from '../../client/api/client.ts';

interface ExpenseListProps {
  expenses?: any[];
  hideFilters?: boolean;
}

const duration = 300;

const defaultStyle = {
  transition: `opacity ${duration}ms ease-in-out, transform ${duration}ms ease-in-out`,
  opacity: 1,
  transform: 'translateX(0)',
};

const transitionStyles = {
  exiting: { 
    opacity: 0, 
    transform: 'translateX(-100%)',
  },
};

// Helper function to format date as YYYY-MM-DD
const formatDateForAPI = (date: Date | null): string | undefined => {
  if (!date) return undefined;
  return date.toISOString().split('T')[0];
};

export default function ExpenseList({ 
  expenses: propExpenses, 
  hideFilters = false 
}: ExpenseListProps) {
  const { 
    expenses: hookExpenses, 
    loading, 
    error, 
    refresh 
  } = useExpenses();
  const [localExpenses, setLocalExpenses] = useState<any[]>([]);
  const expenses = propExpenses === undefined ? hookExpenses : propExpenses;

  React.useEffect(() => {
    setLocalExpenses(expenses);
  }, [expenses]);

  const today = new Date();
  const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  
  const [startDate, setStartDate] = useState<Date | null>(firstDayOfMonth);
  const [endDate, setEndDate] = useState<Date | null>(lastDayOfMonth);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTransactionId, setSelectedTransactionId] = useState(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deletedTransactionIds, setDeletedTransactionIds] = useState<string[]>([]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editedTransaction, setEditedTransaction] = useState<any>({ amount: 0 });
  const [categories, setCategories] = useState<string[]>([]);

  // Handler for Add Transaction button
  const handleAddTransaction = () => {
    // Dispatch a global event that Navigation.tsx can listen for
    window.dispatchEvent(new CustomEvent('openAddTransactionModal'));
  };

  // Fetch categories from the API
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await api.get('/transactions/categories?only_names=true');
        setCategories(response.data.categories);
      } catch (error) {
        console.error('Failed to fetch categories', error);
      }
    };
    fetchCategories();
  }, []);

  // Fetch expenses when dates change or on initial load
  useEffect(() => {
    // Only fetch if not hiding filters (meaning this component controls fetching)
    if (!hideFilters) {
       refresh(1, 100, undefined, undefined, formatDateForAPI(startDate), formatDateForAPI(endDate));
    }
  }, [startDate, endDate, refresh, hideFilters]);

  // Remove client-side date filtering, rely on API filtering
  const filteredExpenses = useMemo(() => {
    if (loading || error || !localExpenses) return []; // Add check for localExpenses

    // Only apply search term filtering client-side
    return localExpenses.filter(expense => {
      const matchesSearch = !searchTerm || expense.description.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesSearch;
    });
  }, [localExpenses, searchTerm, loading, error]);

  const handleDeleteTransaction = async () => {
    if (!selectedTransactionId) return;

    try {
      // Immediately add to deleted transactions to apply red color
      setDeletedTransactionIds(prev => [...prev, selectedTransactionId]);

      await api.delete(`/transactions/${selectedTransactionId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });

      // Remove from local expenses after animation
      setTimeout(() => {
        const updatedExpenses = localExpenses.filter(expense => expense.id !== selectedTransactionId);
        setLocalExpenses(updatedExpenses);
        setDeletedTransactionIds(prev => prev.filter(id => id !== selectedTransactionId));
      }, 700);

      // Close modal and reset selected transaction
      setDeleteModalOpen(false);
      setSelectedTransactionId(null);
    } catch (error) {
      console.error('Failed to delete transaction', error);
      // Remove from deleted transactions if API call fails
      setDeletedTransactionIds(prev => prev.filter(id => id !== selectedTransactionId));
    }
  };

  const handleEdit = (index: number) => {
    setEditingIndex(index);
    setEditedTransaction({
      ...filteredExpenses[index],
      amount: filteredExpenses[index].amount,
    });
  };

  const handleSave = async (index: number) => {
    // Prepare payload, handling potential null category
    const payload = {
      amount: editedTransaction.amount,
      description: editedTransaction.description,
      operation_date: editedTransaction.operation_date,
      category_name: editedTransaction.category?.name || null, 
      user_id: editedTransaction.user_id 
    };

    try {
      const transactionToUpdate = filteredExpenses[index];
      await api.put(`/transactions/${transactionToUpdate.id}`, payload);
      
      const updatedExpense = { ...transactionToUpdate, ...payload };
      if (payload.category_name === null) {
        updatedExpense.category = null;
      } else {
        updatedExpense.category = { 
            ...(updatedExpense.category || {}), 
            name: payload.category_name 
        };
      }
      delete updatedExpense.category_name; 

      setLocalExpenses(localExpenses.map((expense) => 
        expense.id === transactionToUpdate.id ? updatedExpense : expense
      ));
      setEditingIndex(null); 
    } catch (error) {
      console.error('Failed to save transaction', error);
    }
  };

  const handleChange = (index: number, value: string) => {
    const updatedTransactions = [...localExpenses];
    updatedTransactions[index].description = value; 
    setLocalExpenses(updatedTransactions);
    setEditedTransaction(updatedTransactions[index]);
  };

  const handleCategoryChange = (index: number, categoryName: string) => {
    const updatedTransactions = [...localExpenses];
    if (categoryName === 'Uncategorized') {
      updatedTransactions[index].category = null;
    } else {
      updatedTransactions[index].category = { 
        ...(updatedTransactions[index].category || {}),
        name: categoryName 
      };
    }
    setLocalExpenses(updatedTransactions);
    setEditedTransaction(updatedTransactions[index]);
  };

  const handleAmountChange = (value: string) => {
    setEditedTransaction({ ...editedTransaction, amount: parseFloat(value) });
  };

  if (loading && !hideFilters) { // Only show top-level loading if this component is fetching
    return <div>Loading expenses...</div>;
  }

  if (error && !hideFilters) { // Only show top-level error if this component is fetching
    return <div>Error loading expenses: {error}</div>;
  }

  return (
    <div className="bg-white p-2 sm:p-4 rounded-lg shadow-sm">
      {/* Add Transaction Button */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Transactions</h2>
        <button
          onClick={handleAddTransaction}
          className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
        >
          <PlusIcon className="w-5 h-5 mr-1" />
          Add Transaction
        </button>
      </div>
      
      {!hideFilters && (
        <div className="mb-6 p-3 sm:p-4 bg-gray-50 rounded-lg border border-gray-200">
          <h3 className="text-lg font-semibold mb-3 text-gray-700">Filter Transactions</h3>
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Date Range Picker Section */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 flex-1">
              <div className="w-full sm:w-1/2">
                <label htmlFor="startDate" className="block text-sm font-medium text-gray-600 mb-1">Start Date</label>
                <DatePicker
                  id="startDate"
                  icon={null}
                  selected={startDate}
                  onChange={date => setStartDate(date)}
                  placeholderText="Start Date"
                  selectsStart
                  startDate={startDate}
                  endDate={endDate}
                  className="form-input w-full rounded-md text-sm border-gray-300 focus:border-indigo-500 focus:ring-indigo-500"
                  dateFormat="yyyy-MM-dd"
                />
              </div>
              <span className="text-gray-500 self-center hidden sm:block">to</span>
              <div className="w-full sm:w-1/2">
                <label htmlFor="endDate" className="block text-sm font-medium text-gray-600 mb-1">End Date</label>
                <DatePicker
                  id="endDate"
                  icon={null}
                  selected={endDate}
                  onChange={date => setEndDate(date)}
                  placeholderText="End Date"
                  selectsEnd
                  startDate={startDate}
                  endDate={endDate}
                  minDate={startDate}
                  className="form-input w-full rounded-md text-sm border-gray-300 focus:border-indigo-500 focus:ring-indigo-500"
                  dateFormat="yyyy-MM-dd"
                />
              </div>
            </div>
            {/* Search Input Section */}
            <div className="relative flex-1 w-full">
              <label htmlFor="search" className="block text-sm font-medium text-gray-600 mb-1">Search</label>
              <div className="relative">
                <input
                  id="search"
                  type="text"
                  placeholder="Search descriptions..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="form-input w-full pl-10 rounded-md text-sm border-gray-300 focus:border-indigo-500 focus:ring-indigo-500"
                />
                <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              </div>
            </div>
          </div>
        </div>
      )}

      {(loading && !hideFilters) ? (
        <div className="text-center text-gray-500 py-4">Loading...</div>
      ) : filteredExpenses.length === 0 ? (
        <div className="text-center text-gray-500 py-4">No expenses found for the selected period</div>
      ) : (
        <div>
          {/* Table View for Medium Screens and Up */}
          <div className="overflow-x-auto hidden sm:block">
            <table className="w-full">
              <thead>
                <tr className="text-left text-sm border-b">
                  <th className="p-2 font-semibold">Date</th>
                  <th className="p-2 font-semibold">Description</th>
                  <th className="p-2 font-semibold">Category</th>
                  <th className="p-2 text-right font-semibold">Amount</th>
                  <th className="p-2 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredExpenses.map((expense, index) => (
                  <tr 
                    key={`table-${expense.id}`}
                    className={`border-b hover:bg-gray-50 transition-all duration-700 ease-in-out 
                      ${deletedTransactionIds.includes(expense.id) 
                        ? 'opacity-0 transform -translate-x-full' 
                        : 'opacity-100 transform translate-x-0'}`}
                    style={{
                      backgroundColor: deletedTransactionIds.includes(expense.id) 
                        ? '#fee2e2' // Lighter red for table row hover effect
                        : 'transparent'
                    }}
                  >
                    {/* Table Cells - Standard layout */}
                    <td className="p-2 text-sm">{new Date(expense.operation_date).toLocaleDateString()}</td>
                    <td className="p-2 text-sm break-words whitespace-normal max-w-xs">
                      {editingIndex === index ? (
                        <input type="text" value={expense.description} onChange={(e) => handleChange(index, e.target.value)} className="border p-1 w-full text-sm" />
                      ) : (
                        expense.description
                      )}
                    </td>
                    <td className="p-2">
                      {editingIndex === index ? (
                        <select value={expense.category?.name || ''} onChange={(e) => handleCategoryChange(index, e.target.value)} className="border p-1 w-full text-sm">
                          <option value="">Select</option>
                          <option value="Uncategorized">Uncategorized</option>
                          {categories.map((category) => (<option key={category} value={category}>{category}</option>))}
                        </select>
                      ) : (
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full whitespace-nowrap">
                          {expense.category?.name || 'Uncategorized'}
                        </span>
                      )}
                    </td>
                    <td className={`p-2 text-right text-sm ${expense.amount < 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {editingIndex === index ? (
                        <input type="number" value={editedTransaction.amount} onChange={(e) => handleAmountChange(e.target.value)} className="border p-1 w-full text-sm rounded text-right" />
                      ) : (
                        expense.amount.toLocaleString('en-US', { style: 'currency', currency: 'USD' })
                      )}
                    </td>
                    <td className="p-2 text-right">
                       {/* Actions - Condensed for table */}
                       <div className="flex justify-end items-center space-x-2">
                        {editingIndex === index ? (
                          <button onClick={() => handleSave(index)} title="Save">
                            <CheckIcon className="w-5 h-5 text-green-500 hover:text-green-700" />
                          </button>
                        ) : (
                          <button onClick={() => handleEdit(index)} title="Edit">
                            <PencilIcon className="w-5 h-5 text-blue-500 hover:text-blue-700" />
                          </button>
                        )}
                        {editingIndex !== index && (
                          <button onClick={() => { setSelectedTransactionId(expense.id); setDeleteModalOpen(true); }} title="Delete">
                            <TrashIcon className="w-5 h-5 text-red-500 hover:text-red-700" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Card View for Small Screens */}
          <div className="block sm:hidden space-y-3">
            {filteredExpenses.map((expense, index) => (
              <div 
                key={`card-${expense.id}`}
                className={`p-3 border rounded-lg shadow-sm transition-all duration-700 ease-in-out 
                  ${deletedTransactionIds.includes(expense.id) 
                    ? 'opacity-0 transform -translate-x-full bg-red-100 border-red-300' 
                    : 'opacity-100 transform translate-x-0 bg-white border-gray-200'}`}
              >
                {editingIndex === index ? (
                   // Editing Card View
                   <div className="space-y-2">
                      <div>
                         <label className="text-xs text-gray-500 block">Date</label>
                         {/* Date editing might be complex, showing static for now */} 
                         <p className="text-sm">{new Date(expense.operation_date).toLocaleDateString()}</p>
                      </div>
                      <div>
                         <label className="text-xs text-gray-500 block">Description</label>
                         <input type="text" value={editedTransaction.description} onChange={(e) => handleChange(index, e.target.value)} className="border p-1 w-full text-sm rounded" />
                      </div>
                      <div>
                         <label className="text-xs text-gray-500 block">Category</label>
                         <select value={editedTransaction.category?.name || ''} onChange={(e) => handleCategoryChange(index, e.target.value)} className="border p-1 w-full text-sm rounded">
                            <option value="">Select Category</option>
                            <option value="Uncategorized">Uncategorized</option>
                            {categories.map((category) => (<option key={category} value={category}>{category}</option>))}
                         </select>
                      </div>
                      <div>
                         <label className="text-xs text-gray-500 block">Amount</label>
                         <input type="number" value={editedTransaction.amount} onChange={(e) => handleAmountChange(e.target.value)} className="border p-1 w-full text-sm rounded text-right" />
                      </div>
                      <div className="flex justify-end items-center pt-3 space-x-3">
                        {/* Save Button */}
                        <button
                          onClick={() => handleSave(index)}
                          className="flex items-center justify-center px-3 py-1.5 rounded-md bg-green-500 text-white hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
                          title="Save"
                        >
                           <CheckIcon className="w-6 h-6" />
                           <span className="ml-1 text-sm font-medium">Save</span>
                        </button>
                        {/* Cancel Button */}
                         <button
                            onClick={() => setEditingIndex(null)}
                            className="flex items-center justify-center px-3 py-1.5 rounded-md bg-gray-200 text-gray-700 hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2"
                            title="Cancel"
                          >
                            <span className="text-sm font-medium">Cancel</span>
                        </button>
                      </div>
                   </div>
                ) : (
                  // Standard Card View - Actions moved to bottom
                  <> { /* Use Fragment to group elements */}
                    <div className="flex justify-between items-start">
                      {/* Left side content (Description and Date) */}
                      <div className="flex-1 space-y-1 pr-2">
                        <p className="text-sm font-medium text-gray-800 break-words">{expense.description}</p>
                        <p className="text-sm text-gray-600">{new Date(expense.operation_date).toLocaleDateString()}</p>
                      </div>
                      {/* Right side content (Amount only) */}
                      <div className="text-right flex flex-col items-end">
                        <p className={`text-sm font-semibold ${expense.amount < 0 ? 'text-red-600' : 'text-green-600'}`}>
                          {expense.amount.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
                        </p>
                      </div>
                    </div>
                    {/* Category and Actions on the same line */}
                    <div className="flex justify-between items-center mt-2">
                      {/* Category with bubble-like appearance */}
                      <span className={`inline-block px-3 py-1.5 text-xs rounded-full shadow-sm ${
                        expense.category 
                          ? 'bg-indigo-100 text-indigo-800 ring-1 ring-indigo-200' 
                          : 'bg-gray-100 text-gray-700 ring-1 ring-gray-200'
                      }`}>
                        {expense.category?.name || 'Uncategorized'}
                      </span>
                      {/* Actions aligned right */}
                      <div className="flex space-x-2">
                        {/* Edit Button with Text */}
                        <button 
                          onClick={() => handleEdit(index)} 
                          title="Edit" 
                          className="flex items-center justify-center px-2 py-1 rounded-md text-sm font-medium text-blue-600 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
                        >
                          <PencilIcon className="w-4 h-4 mr-1" /> 
                          Edit
                        </button>
                        {/* Delete Button with Text */}
                        <button 
                          onClick={() => { setSelectedTransactionId(expense.id); setDeleteModalOpen(true); }} 
                          title="Delete" 
                          className="flex items-center justify-center px-2 py-1 rounded-md text-sm font-medium text-red-600 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1"
                        >
                          <TrashIcon className="w-4 h-4 mr-1" /> 
                          Delete
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
      {deleteModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
          <div className="flex min-h-screen items-end justify-center px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div 
              className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" 
              aria-hidden="true"
            ></div>

            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

            <div className="inline-block transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg">
              <div className="bg-white px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                    <ExclamationTriangleIcon className="h-6 w-6 text-red-600" aria-hidden="true" />
                  </div>
                  <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left">
                    <h3 
                      className="text-base font-semibold leading-6 text-gray-900" 
                      id="modal-title"
                    >
                      Delete Transaction
                    </h3>
                    <div className="mt-2">
                      <p className="text-sm text-gray-500">
                        Are you sure you want to delete this transaction? 
                        This action cannot be undone.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
                <button 
                  type="button" 
                  onClick={handleDeleteTransaction}
                  className="inline-flex w-full justify-center rounded-md bg-red-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-500 sm:ml-3 sm:w-auto"
                >
                  <TrashIcon className="-ml-0.5 mr-2 h-5 w-5" />
                  Delete
                </button>
                <button 
                  type="button" 
                  onClick={() => setDeleteModalOpen(false)}
                  className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:mt-0 sm:w-auto"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}