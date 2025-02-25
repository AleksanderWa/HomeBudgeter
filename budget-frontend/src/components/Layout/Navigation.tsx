import React, { useState, useEffect, Fragment } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext.tsx';
import api from '../../client/api/client.ts';
import { PlusIcon, CheckIcon, ChevronUpDownIcon } from '@heroicons/react/24/solid';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { Combobox } from '@headlessui/react';

export default function Navigation() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [categories, setCategories] = useState<string[]>([]);
  const [categoryQuery, setCategoryQuery] = useState('');
  const [newTransaction, setNewTransaction] = useState({
    operation_date: new Date(),
    description: '',
    category: '',
    amount: '',
    newCategory: ''
  });
  const [formErrors, setFormErrors] = useState({
    description: '',
    category: '',
    amount: ''
  });

  // Fetch existing categories
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

  // Filter categories based on query
  const filteredCategories = 
    categoryQuery === ''
      ? categories
      : categories.filter((category) =>
          category
            .toLowerCase()
            .replace(/\s+/g, '')
            .includes(categoryQuery.toLowerCase().replace(/\s+/g, ''))
        );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setNewTransaction(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear any existing error for this field
    setFormErrors(prev => ({ ...prev, [name]: '' }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Reset previous form errors
    setFormErrors({
      description: '',
      category: '',
      amount: ''
    });

    // Validation
    const errors: { description?: string; category?: string; amount?: string } = {};

    if (!newTransaction.description.trim()) {
      errors.description = 'Description is required';
    }

    if (!newTransaction.category.trim()) {
      errors.category = 'Category is required';
    }

    const amount = parseFloat(newTransaction.amount);
    if (isNaN(amount) || amount === 0) {
      errors.amount = 'Valid amount is required';
    }

    // If there are validation errors, set them and prevent submission
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    try {
      // Prepare transaction data for backend
      const transactionData = {
        operation_date: newTransaction.operation_date.toISOString().split('T')[0],
        description: newTransaction.description,
        category: newTransaction.category,
        amount: -Math.abs(parseFloat(newTransaction.amount)), // Negative for expenses
      };

      // Create the transaction
      await api.post('/transactions', transactionData);

      // Fetch updated transactions 
      const transactionsResponse = await api.get('/transactions?page=1&page_size=100');
      
      // Dispatch a custom event to update transactions in parent components
      const event = new CustomEvent('transactionsUpdated', { 
        detail: { transactions: transactionsResponse.data.transactions } 
      });
      window.dispatchEvent(event);

      // Reset form and close modal
      setNewTransaction({
        operation_date: new Date(),
        description: '',
        category: '',
        amount: '',
        newCategory: ''
      });
      setIsModalOpen(false);
    } catch (error) {
      console.error('Failed to create transaction', error);
      // Optionally, show an error message to the user
    }
  };

  return (
    <>
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <Link to="/" className="flex items-center">
                <span className="text-xl font-bold">Budget Tracker</span>
              </Link>
            </div>
            <div className="hidden sm:flex sm:items-center sm:space-x-4">
              <Link to="/" className="text-gray-700 hover:text-gray-900 px-3 py-2">
                Dashboard
              </Link>
              <Link to="/list" className="text-gray-700 hover:text-gray-900 px-3 py-2">
                Transactions
              </Link>
              <Link to="/upload" className="text-gray-700 hover:text-gray-900 px-3 py-2">
                Upload
              </Link>
              <Link to="/planning" className="text-gray-700 hover:text-gray-900 px-3 py-2">
                Planning
              </Link>
              <Link to="/category" className="text-gray-700 hover:text-gray-900 px-3 py-2">
                Categories
              </Link>
              <button
                onClick={logout}
                className="text-gray-700 hover:text-gray-900 px-3 py-2"
              >
                Logout
              </button>
              <button
                onClick={() => setIsModalOpen(true)}
                className="bg-green-500 hover:bg-green-600 text-white px-3 py-2 rounded-md flex items-center"
              >
                <PlusIcon className="w-5 h-5 mr-1" />
                Add Transaction
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Transaction Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-white p-8 rounded-lg w-[500px] shadow-xl relative">
            <button
    className="absolute top-0 right-0 text-gray-500 hover:text-gray-800 text-xl p-3"
    onClick={() => setIsModalOpen(false)}
            >
              &times;
            </button>
            <h2 className="text-xl font-bold mb-6 text-center">Add New Transaction</h2>
            <form onSubmit={handleSubmit}>
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
                <DatePicker
                  selected={newTransaction.operation_date}
                  onChange={(date: Date) => setNewTransaction(prev => ({ ...prev, operation_date: date }))}
                  className="form-input w-full rounded-md border border-gray-300 focus:border-blue-500 focus:ring focus:ring-blue-200"
                  dateFormat="yyyy-MM-dd"
                />
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <input
                  type="text"
                  name="description"
                  value={newTransaction.description}
                  onChange={handleInputChange}
                  className={`form-input w-full rounded-md border border-gray-300 focus:border-blue-500 focus:ring focus:ring-blue-200 ${formErrors.description ? 'border-red-500' : ''}`}
                />
                {formErrors.description && (
                  <p className="text-red-500 text-xs mt-1">{formErrors.description}</p>
                )}
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                <Combobox 
                  value={newTransaction.category} 
                  onChange={(value) => {
                    setNewTransaction(prev => ({ ...prev, category: value }));
                    setCategoryQuery('');
                  }}
                >
                  <div className="relative">
                    <div className="relative w-full cursor-default overflow-hidden rounded-lg bg-white text-left shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-white/75 focus-visible:ring-offset-2 focus-visible:ring-offset-teal-300 sm:text-sm">
                      <Combobox.Input
                        className={`form-input w-full rounded-md border border-gray-300 focus:border-blue-500 focus:ring focus:ring-blue-200 ${formErrors.category ? 'border-red-500' : ''}`}
                        displayValue={(category: string) => category}
                        onChange={(event) => {
                          setCategoryQuery(event.target.value);
                          setNewTransaction(prev => ({ ...prev, category: event.target.value }));
                        }}
                        placeholder="Select or type category"
                      />
                      <Combobox.Button className="absolute inset-y-0 right-0 flex items-center pr-2">
                        <ChevronUpDownIcon
                          className="h-5 w-5 text-gray-400"
                          aria-hidden="true"
                        />
                      </Combobox.Button>
                    </div>
                    <Combobox.Options className="absolute mt-1 max-h-96 overflow-y-auto w-full rounded-lg bg-white py-1 text-base shadow-lg ring-1 ring-black/5 focus:outline-none sm:text-sm border border-blue-200">
                    {filteredCategories.length === 0 && categoryQuery !== '' ? (
                        <div className="relative cursor-default select-none px-4 py-2 text-gray-700">
                          No categories found. Put value and it will be created as new category.
                        </div>
                      ) : (
                        filteredCategories.map((category) => (
                          <Combobox.Option
                            key={category}
                            className={({ active }) =>
                              `relative cursor-default select-none py-2 pl-10 pr-4 ${
                                active ? 'bg-blue-100 text-blue-900' : 'text-gray-900'
                              }`
                            }
                            value={category}
                          >
                            {({ selected, active }) => (
                              <>
                                <span
                                  className={`block truncate ${
                                    selected ? 'font-medium' : 'font-normal'
                                  }`}
                                >
                                  {category}
                                </span>
                                {selected ? (
                                  <span
                                    className={`absolute inset-y-0 left-0 flex items-center pl-3 ${
                                      active ? 'text-blue-600' : 'text-blue-500'
                                    }`}
                                  >
                                    <CheckIcon className="h-5 w-5" aria-hidden="true" />
                                  </span>
                                ) : null}
                              </>
                            )}
                          </Combobox.Option>
                        ))
                      )}
                    </Combobox.Options>
                  </div>
                </Combobox>
                {formErrors.category && (
                  <p className="text-red-500 text-xs mt-1">{formErrors.category}</p>
                )}
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Amount</label>
                <input
                  type="number"
                  name="amount"
                  value={newTransaction.amount}
                  onChange={handleInputChange}
                  step="0.01"
                  className={`form-input w-full rounded-md border border-gray-300 focus:border-blue-500 focus:ring focus:ring-blue-200 ${formErrors.amount ? 'border-red-500' : ''}`}
                />
                {formErrors.amount && (
                  <p className="text-red-500 text-xs mt-1">{formErrors.amount}</p>
                )}
              </div>

              <div className="flex justify-end space-x-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600"
                >
                  Add Transaction
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}