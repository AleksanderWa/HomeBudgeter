// components/Dashboard/ExpenseList.tsx

import React, { useMemo, useState, useCallback, useEffect } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { MagnifyingGlassIcon, TrashIcon, ExclamationTriangleIcon, CheckIcon, PencilIcon } from '@heroicons/react/24/outline';
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

const categories = []; // Initialize categories as an empty array

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
  const expenses = propExpenses || hookExpenses;

  // Sync local expenses with hook expenses
  React.useEffect(() => {
    setLocalExpenses(expenses);
  }, [expenses]);

  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTransactionId, setSelectedTransactionId] = useState(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deletedTransactionIds, setDeletedTransactionIds] = useState<string[]>([]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editedTransaction, setEditedTransaction] = useState<any>({
    amount: 0,
  });

  // Fetch categories from the API
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await api.get('/transactions/categories?only_names=true');
        categories.push(...response.data.categories);
      } catch (error) {
        console.error('Failed to fetch categories', error);
      }
    };
    fetchCategories();
  }, []);

  const filteredExpenses = useMemo(() => {
    if (loading || error) return [];

    return localExpenses.filter(expense => {
      const matchesDate = (!startDate || new Date(expense.operation_date) >= startDate) &&
                         (!endDate || new Date(expense.operation_date) <= endDate);
      const matchesSearch = expense.description.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesDate && matchesSearch;
    });
  }, [localExpenses, startDate, endDate, searchTerm, loading, error]);

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
      // Send category name if category exists, otherwise handle appropriately (e.g., send null or specific value)
      // The backend endpoint expects category_name based on TransactionEdit schema
      category_name: editedTransaction.category?.name || null, // Sending null if category is null
      user_id: editedTransaction.user_id // Assuming user_id is part of the transaction object
    };

    // Remove fields not expected by the backend if necessary (like category object itself)
    // delete payload.category; 
    // delete payload.id;

    try {
      const transactionToUpdate = filteredExpenses[index];
      // Make sure to send the correct transaction ID
      await api.put(`/transactions/${transactionToUpdate.id}`, payload);
      
      // Update local state with the modified transaction
      // Ensure the updated transaction reflects the potential null category
      const updatedExpense = { ...transactionToUpdate, ...payload };
      if (payload.category_name === null) {
        updatedExpense.category = null;
      } else {
        updatedExpense.category = { 
            ...(updatedExpense.category || {}), 
            name: payload.category_name 
        };
      }
      delete updatedExpense.category_name; // Clean up temporary field

      setLocalExpenses(localExpenses.map((expense) => 
        expense.id === transactionToUpdate.id ? updatedExpense : expense
      ));
      setEditingIndex(null); // Exit editing mode
    } catch (error) {
      console.error('Failed to save transaction', error);
      // Potentially show an error message to the user
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
    // If 'Uncategorized' is selected, set category to null
    if (categoryName === 'Uncategorized') {
      updatedTransactions[index].category = null;
    } else {
      // Otherwise, create/update the category object
      updatedTransactions[index].category = { 
        ...(updatedTransactions[index].category || {}), // Preserve existing id/user_id if editing existing
        name: categoryName 
      };
    }
    setLocalExpenses(updatedTransactions);
    setEditedTransaction(updatedTransactions[index]);
  };

  const handleAmountChange = (value: string) => {
    setEditedTransaction({ ...editedTransaction, amount: parseFloat(value) });
  };

  if (loading) {
    return <div>Loading expenses...</div>;
  }

  if (error) {
    return <div>Error loading expenses: {error}</div>;
  }

  return (
    <div className="bg-white p-4 rounded-lg shadow-sm">
      {!hideFilters && (
        <div className="flex flex-col sm:flex-row gap-4 mb-4">
          <div className="flex items-center gap-2 flex-1">
            <div className="w-full">
              <DatePicker
                selected={startDate}
                onChange={date => setStartDate(date)}
                placeholderText="Start Date"
                selectsStart
                startDate={startDate}
                endDate={endDate}
                className="form-input w-full rounded-md text-sm"
                dateFormat="yyyy-MM-dd"
              />
            </div>
            <span className="text-gray-500">to</span>
            <div className="w-full">
              <DatePicker
                selected={endDate}
                onChange={date => setEndDate(date)}
                placeholderText="End Date"
                selectsEnd
                startDate={startDate}
                endDate={endDate}
                minDate={startDate}
                className="form-input w-full rounded-md text-sm"
                dateFormat="yyyy-MM-dd"
              />
            </div>
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
      )}

      {filteredExpenses.length === 0 ? (
        <div className="text-center text-gray-500">No expenses found</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-sm border-b">
                <th className="p-2">Date</th>
                <th className="p-2">Description</th>
                <th className="p-2">Category</th>
                <th className="p-2 text-right">Amount</th>
                <th className="p-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredExpenses.map((expense, index) => (
                <tr 
                  key={expense.id}
                  className={`border-b hover:bg-gray-50 transition-all duration-700 ease-in-out 
                    ${deletedTransactionIds.includes(expense.id) 
                      ? 'opacity-0 transform -translate-x-full' 
                      : 'opacity-100 transform translate-x-0'}`}
                  style={{
                    backgroundColor: deletedTransactionIds.includes(expense.id) 
                      ? '#e73a2b' // A more intense red that's more visible
                      : 'transparent'
                  }}
                >
                  <td className="p-2 text-sm">{new Date(expense.operation_date).toLocaleDateString()}</td>
                  <td className="p-2 text-sm break-words whitespace-normal max-w-xs">
                    {editingIndex === index ? (
                      <input
                        type="text"
                        value={expense.description}
                        onChange={(e) => handleChange(index, e.target.value)}
                        className="border p-2 w-full"
                      />
                    ) : (
                      expense.description
                    )}
                  </td>
                  <td className="p-2">
                    {editingIndex === index ? (
                      <select
                        value={expense.category?.name || ''}
                        onChange={(e) => handleCategoryChange(index, e.target.value)}
                        className="border p-2 w-full"
                      >
                        <option value="">Select Category</option>
                        <option value="Uncategorized">Uncategorized</option>
                        {categories.map((category) => (
                          <option key={category} value={category}>{category}</option>
                        ))}
                      </select>
                    ) : (
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                        {expense.category?.name || 'Uncategorized'}
                      </span>
                    )}
                  </td>
                  <td className={`p-2 text-right text-sm ${expense.amount < 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {editingIndex === index ? (
                      <input
                        type="number"
                        value={editedTransaction.amount}
                        onChange={(e) => handleAmountChange(e.target.value)}
                        className="border p-2 w-full"
                      />
                    ) : (
                      expense.amount.toLocaleString('en-US', { style: 'currency', currency: 'USD' })
                    )}
                  </td>
                  <td className="p-2 text-right">
                    {editingIndex === index ? (
                      <button onClick={() => handleSave(index)}>
                        <CheckIcon className="w-5 h-5 text-green-500" />
                      </button>
                    ) : (
                      <button onClick={() => handleEdit(index)}>
                        <PencilIcon className="w-5 h-5 text-blue-500 mr-2" />
                      </button>
                    )}
                    {editingIndex !== index && (
                      <button onClick={() => {
                        setSelectedTransactionId(expense.id);
                        setDeleteModalOpen(true);
                      }}>
                        <TrashIcon className="w-5 h-5 text-red-500" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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