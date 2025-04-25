import React, { useEffect, useState } from 'react';
import { 
  TransactionFilterRule, 
  getFilterRules, 
  createFilterRule, 
  updateFilterRule, 
  deleteFilterRule
} from '../../client/api/bankingService.ts';

const FilterRules: React.FC = () => {
  const [rules, setRules] = useState<TransactionFilterRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAddingRule, setIsAddingRule] = useState(false);
  const [editingRuleId, setEditingRuleId] = useState<number | null>(null);
  
  // Form state
  const [formState, setFormState] = useState({
    description_pattern: '',
    merchant_name: '',
    min_amount: '',
    max_amount: '',
    is_active: true
  });

  useEffect(() => {
    fetchRules();
  }, []);

  const fetchRules = async () => {
    try {
      setLoading(true);
      const fetchedRules = await getFilterRules();
      setRules(fetchedRules);
      setError(null);
    } catch (err) {
      setError('Failed to fetch filter rules');
      console.error('Error fetching filter rules:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormState(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const resetForm = () => {
    setFormState({
      description_pattern: '',
      merchant_name: '',
      min_amount: '',
      max_amount: '',
      is_active: true
    });
    setIsAddingRule(false);
    setEditingRuleId(null);
  };

  const handleAddRule = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Validate form
      if (!formState.description_pattern && !formState.merchant_name && 
          !formState.min_amount && !formState.max_amount) {
        setError('Please fill in at least one filter criteria');
        return;
      }

      const ruleData = {
        description_pattern: formState.description_pattern || null,
        merchant_name: formState.merchant_name || null,
        min_amount: formState.min_amount ? parseFloat(formState.min_amount) : null,
        max_amount: formState.max_amount ? parseFloat(formState.max_amount) : null,
        is_active: formState.is_active
      };

      const newRule = await createFilterRule(ruleData);
      setRules(prev => [...prev, newRule]);
      resetForm();
    } catch (err) {
      setError('Failed to add filter rule');
      console.error('Error adding filter rule:', err);
    }
  };

  const handleUpdateRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRuleId) return;

    try {
      // Validate form
      if (!formState.description_pattern && !formState.merchant_name && 
          !formState.min_amount && !formState.max_amount) {
        setError('Please fill in at least one filter criteria');
        return;
      }

      const ruleData = {
        description_pattern: formState.description_pattern || null,
        merchant_name: formState.merchant_name || null,
        min_amount: formState.min_amount ? parseFloat(formState.min_amount) : null,
        max_amount: formState.max_amount ? parseFloat(formState.max_amount) : null,
        is_active: formState.is_active
      };

      const updatedRule = await updateFilterRule(editingRuleId, ruleData);
      setRules(prev => prev.map(rule => rule.id === editingRuleId ? updatedRule : rule));
      resetForm();
    } catch (err) {
      setError('Failed to update filter rule');
      console.error('Error updating filter rule:', err);
    }
  };

  const handleEditRule = (rule: TransactionFilterRule) => {
    setFormState({
      description_pattern: rule.description_pattern || '',
      merchant_name: rule.merchant_name || '',
      min_amount: rule.min_amount ? rule.min_amount.toString() : '',
      max_amount: rule.max_amount ? rule.max_amount.toString() : '',
      is_active: rule.is_active
    });
    setEditingRuleId(rule.id);
    setIsAddingRule(true);
  };

  const handleDeleteRule = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this filter rule?')) return;
    
    try {
      await deleteFilterRule(id);
      setRules(prev => prev.filter(rule => rule.id !== id));
    } catch (err) {
      setError('Failed to delete filter rule');
      console.error('Error deleting filter rule:', err);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  return (
    <div className="bg-indigo-50 shadow rounded-lg p-6 mb-6 border-2 border-indigo-200">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="text-xl font-semibold text-indigo-800">Transaction Filter Rules</h2>
          <div className="h-1 w-32 bg-indigo-500 mt-2 rounded-full"></div>
        </div>
        <button
          onClick={() => setIsAddingRule(!isAddingRule)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md shadow-md transition-colors duration-200"
        >
          {isAddingRule ? 'Cancel' : 'Add Rule'}
        </button>
      </div>

      <p className="text-indigo-700 mb-4">
        Create rules to automatically skip transactions when importing from your bank.
      </p>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {isAddingRule && (
        <form onSubmit={editingRuleId ? handleUpdateRule : handleAddRule} className="mb-6 p-5 border-2 border-indigo-200 rounded-lg bg-white shadow-md">
          <h3 className="text-lg font-semibold mb-4 text-indigo-800">
            {editingRuleId ? 'Edit Rule' : 'Create New Filter Rule'}
          </h3>
          <div className="mb-4">
            <label className="block text-indigo-700 text-sm font-bold mb-2">
              Rule Type:
            </label>
            <p className="text-sm text-indigo-600 mb-2">
              Fill in at least one of the following fields to define your filter:
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-indigo-700 text-sm font-bold mb-2" htmlFor="description_pattern">
                Description Contains:
              </label>
              <input
                type="text"
                id="description_pattern"
                name="description_pattern"
                value={formState.description_pattern}
                onChange={handleInputChange}
                className="shadow appearance-none border border-indigo-200 rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline focus:border-indigo-400"
                placeholder="e.g. NETFLIX"
              />
              <p className="text-xs text-indigo-600 mt-1">
                Skip transactions with this text in the description
              </p>
            </div>

            <div>
              <label className="block text-indigo-700 text-sm font-bold mb-2" htmlFor="merchant_name">
                Merchant Name Contains:
              </label>
              <input
                type="text"
                id="merchant_name"
                name="merchant_name"
                value={formState.merchant_name}
                onChange={handleInputChange}
                className="shadow appearance-none border border-indigo-200 rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline focus:border-indigo-400"
                placeholder="e.g. McDonald's"
              />
              <p className="text-xs text-indigo-600 mt-1">
                Skip transactions from merchants containing this text
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-indigo-700 text-sm font-bold mb-2" htmlFor="min_amount">
                Minimum Amount:
              </label>
              <input
                type="number"
                id="min_amount"
                name="min_amount"
                value={formState.min_amount}
                onChange={handleInputChange}
                className="shadow appearance-none border border-indigo-200 rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline focus:border-indigo-400"
                placeholder="e.g. 10.00"
                step="0.01"
              />
              <p className="text-xs text-indigo-600 mt-1">
                Skip transactions above this amount
              </p>
            </div>

            <div>
              <label className="block text-indigo-700 text-sm font-bold mb-2" htmlFor="max_amount">
                Maximum Amount:
              </label>
              <input
                type="number"
                id="max_amount"
                name="max_amount"
                value={formState.max_amount}
                onChange={handleInputChange}
                className="shadow appearance-none border border-indigo-200 rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline focus:border-indigo-400"
                placeholder="e.g. 50.00"
                step="0.01"
              />
              <p className="text-xs text-indigo-600 mt-1">
                Skip transactions below this amount
              </p>
            </div>
          </div>

          <div className="mb-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                name="is_active"
                checked={formState.is_active}
                onChange={handleInputChange}
                className="mr-2 h-5 w-5 text-indigo-600 focus:ring-indigo-500 border-indigo-300 rounded"
              />
              <span className="text-indigo-700 text-sm font-bold">Active</span>
            </label>
            <p className="text-xs text-indigo-600 mt-1">
              Inactive rules won't be applied when importing transactions
            </p>
          </div>

          <div className="flex items-center justify-end">
            <button
              type="button"
              onClick={resetForm}
              className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-2 rounded-md mr-2 shadow-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md shadow-md transition-colors duration-200"
            >
              {editingRuleId ? 'Update Rule' : 'Create Rule'}
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <p className="text-indigo-600">Loading filter rules...</p>
      ) : rules.length === 0 ? (
        <div className="text-center py-6 bg-white rounded-lg border-2 border-dashed border-indigo-300">
          <svg 
            className="mx-auto h-16 w-16 text-indigo-400" 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={1.5} 
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" 
            />
          </svg>
          <p className="text-lg text-indigo-800 font-medium mt-2">No filter rules created yet</p>
          <p className="text-indigo-600 mb-4">
            Create rules to automatically skip unwanted transactions during import
          </p>
          <button
            onClick={() => setIsAddingRule(true)}
            className="mt-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-md shadow-md transition-colors duration-200"
          >
            Create First Rule
          </button>
        </div>
      ) : (
        <div className="overflow-x-auto bg-white rounded-lg border-2 border-indigo-200 shadow-md">
          <table className="min-w-full divide-y divide-indigo-200">
            <thead className="bg-indigo-100">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-indigo-800 uppercase tracking-wider">
                  Rule Type
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-indigo-800 uppercase tracking-wider">
                  Details
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-indigo-800 uppercase tracking-wider">
                  Status
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-indigo-800 uppercase tracking-wider">
                  Created
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-indigo-800 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-indigo-100">
              {rules.map((rule) => (
                <tr key={rule.id} className="hover:bg-indigo-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    {rule.description_pattern ? (
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                        Description
                      </span>
                    ) : rule.merchant_name ? (
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-purple-100 text-purple-800">
                        Merchant
                      </span>
                    ) : rule.min_amount || rule.max_amount ? (
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                        Amount
                      </span>
                    ) : (
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                        Unknown
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900">
                      {rule.description_pattern && (
                        <div>Description contains: <span className="font-medium">{rule.description_pattern}</span></div>
                      )}
                      {rule.merchant_name && (
                        <div>Merchant contains: <span className="font-medium">{rule.merchant_name}</span></div>
                      )}
                      {(rule.min_amount || rule.max_amount) && (
                        <div>
                          Amount: 
                          {rule.min_amount && <span className="font-medium"> Min: ${rule.min_amount}</span>}
                          {rule.min_amount && rule.max_amount && " - "}
                          {rule.max_amount && <span className="font-medium">Max: ${rule.max_amount}</span>}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {rule.is_active ? (
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                        Active
                      </span>
                    ) : (
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                        Inactive
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(rule.created_at)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => handleEditRule(rule)}
                      className="text-indigo-600 hover:text-indigo-900 mr-3 transition-colors duration-200"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteRule(rule.id)}
                      className="text-red-600 hover:text-red-900 transition-colors duration-200"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default FilterRules; 