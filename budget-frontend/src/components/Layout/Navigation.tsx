import React, { useState, useEffect, Fragment } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext.tsx';
import api from '../../client/api/client.ts';
import { PlusIcon, CheckIcon as SolidCheckIcon, ChevronUpDownIcon } from '@heroicons/react/24/solid';
import { 
  DocumentPlusIcon, 
  CalendarDaysIcon, 
  ChatBubbleLeftRightIcon, 
  TagIcon, 
  CurrencyDollarIcon, 
  XMarkIcon, 
  CheckIcon as OutlineCheckIcon
} from '@heroicons/react/24/outline';
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

  // Effect to listen for global modal open event
  useEffect(() => {
    const handleOpenModalEvent = () => {
        console.log("Received openAddTransactionModal event"); // Debug log
        setIsModalOpen(true);
    };

    window.addEventListener('openAddTransactionModal', handleOpenModalEvent);

    // Cleanup listener on component unmount
    return () => {
      window.removeEventListener('openAddTransactionModal', handleOpenModalEvent);
    };
  }, []); // Empty dependency array ensures this runs only once on mount

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
              <Link to="/banking" className="text-gray-700 hover:text-gray-900 px-3 py-2">
                Banking
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
          <div className="bg-white p-6 sm:p-8 rounded-lg w-full max-w-md shadow-xl relative">
            {/* Close Button */}
            <button
              className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 transition-colors" 
              onClick={() => setIsModalOpen(false)}
              aria-label="Close modal"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
            
            <h2 className="text-xl font-bold mb-6 text-center flex items-center justify-center">
              <DocumentPlusIcon className="w-6 h-6 mr-2 text-indigo-600" />
              Add New Transaction
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Date Field */}
              <div>
                <label className="flex items-center text-sm font-medium text-gray-700 mb-1">
                  <CalendarDaysIcon className="w-4 h-4 mr-1.5 text-gray-500" />
                  Date
                </label>
                <DatePicker
                  selected={newTransaction.operation_date}
                  onChange={(date: Date | null) => setNewTransaction(prev => ({ ...prev, operation_date: date || new Date() }))}
                  className="form-input w-full rounded-md border border-gray-300 focus:border-indigo-500 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 text-sm"
                  dateFormat="yyyy-MM-dd"
                />
              </div>

              {/* Description Field */}
              <div>
                <label className="flex items-center text-sm font-medium text-gray-700 mb-1">
                  <ChatBubbleLeftRightIcon className="w-4 h-4 mr-1.5 text-gray-500" />
                  Description
                </label>
                <input
                  type="text"
                  name="description"
                  value={newTransaction.description}
                  onChange={handleInputChange}
                  className={`form-input w-full rounded-md border text-sm border-gray-300 focus:border-indigo-500 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 ${formErrors.description ? 'border-red-500' : ''}`}
                  placeholder="E.g., Groceries, Dinner"
                />
                {formErrors.description && (
                  <p className="text-red-500 text-xs mt-1">{formErrors.description}</p>
                )}
              </div>

              {/* Category Field */}
              <div>
                <label className="flex items-center text-sm font-medium text-gray-700 mb-1">
                   <TagIcon className="w-4 h-4 mr-1.5 text-gray-500" />
                   Category
                </label>
                <Combobox 
                  value={newTransaction.category} 
                  onChange={(value) => {
                    setNewTransaction(prev => ({ ...prev, category: value }));
                    setCategoryQuery('');
                  }}
                >
                  <div className="relative">
                    <div className="relative w-full cursor-default overflow-hidden rounded-lg bg-white text-left border border-gray-300 focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-200 sm:text-sm">
                      <Combobox.Input
                        className={`w-full border-none py-2 pl-3 pr-10 text-sm leading-5 text-gray-900 focus:ring-0 ${formErrors.category ? 'border-red-500' : ''}`}
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
                    <Combobox.Options className="absolute mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm z-10">
                    {filteredCategories.length === 0 && categoryQuery !== '' ? (
                        <div className="relative cursor-default select-none px-4 py-2 text-gray-700">
                          No categories found. Put value and it will be created as new category.
                        </div>
                      ) : (
                        filteredCategories.map((category) => (
                          <Combobox.Option
                            key={category}
                            className={({ active }) =>
                              `relative cursor-default select-none py-2 pl-10 pr-4 ${ active ? 'bg-indigo-100 text-indigo-900' : 'text-gray-900' }`
                            }
                            value={category}
                          >
                            {({ selected }) => (
                              <>
                                <span className={`block truncate ${ selected ? 'font-medium' : 'font-normal' }`}>
                                  {category}
                                </span>
                                {selected ? (
                                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-indigo-600">
                                    <SolidCheckIcon className="h-5 w-5" aria-hidden="true" />
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

              {/* Amount Field */}
              <div>
                <label className="flex items-center text-sm font-medium text-gray-700 mb-1">
                  <CurrencyDollarIcon className="w-4 h-4 mr-1.5 text-gray-500" />
                  Amount (as Expense)
                </label>
                <input
                  type="number"
                  name="amount"
                  value={newTransaction.amount}
                  onChange={handleInputChange}
                  step="0.01"
                  className={`form-input w-full rounded-md border text-sm border-gray-300 focus:border-indigo-500 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 ${formErrors.amount ? 'border-red-500' : ''}`}
                  placeholder="0.00"
                />
                {formErrors.amount && (
                  <p className="text-red-500 text-xs mt-1">{formErrors.amount}</p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-red-100 text-red-700 rounded-md hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 text-sm font-medium"
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