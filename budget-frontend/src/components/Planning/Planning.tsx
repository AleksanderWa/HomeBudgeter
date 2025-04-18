import React, { useEffect, useState } from 'react';
import api from '../../client/api/client.ts';
import { ArrowLeftIcon, ArrowRightIcon, Squares2X2Icon, Bars3Icon, CalendarDaysIcon, CalendarIcon, PencilSquareIcon, PlusCircleIcon, CheckIcon, XMarkIcon, ExclamationTriangleIcon, BanknotesIcon } from '@heroicons/react/24/outline';
import { PlusIcon, TrashIcon as SolidTrashIcon, ChevronUpDownIcon } from '@heroicons/react/24/solid';
import { Combobox } from '@headlessui/react';

const Planning = () => {
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
    const [budgetLimits, setBudgetLimits] = useState({});
    const [spentAmounts, setSpentAmounts] = useState({}); 
    const [categories, setCategories] = useState([]);
    const [expensesData, setExpensesData] = useState([]); 
    const [selectedCategoryId, setSelectedCategoryId] = useState(null);
    const [selectedCategoryName, setSelectedCategoryName] = useState(null);
    const [limit, setLimit] = useState('');
    const [plans, setPlans] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedPlanId, setSelectedPlanId] = useState(null);
    const [isListView, setIsListView] = useState(false);
    const [isAddLimitModalOpen, setIsAddLimitModalOpen] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [isDeleteConfirmationModalOpen, setIsDeleteConfirmationModalOpen] = useState(false);
    const [categoryToDelete, setCategoryToDelete] = useState<string | null>(null);
    const [query, setQuery] = useState('');
    const [limitValue, setLimitValue] = useState('');
    
    // Income states
    const [monthlyIncome, setMonthlyIncome] = useState(0);
    const [incomeDescription, setIncomeDescription] = useState("");
    const [isIncomeModalOpen, setIsIncomeModalOpen] = useState(false);
    const [editingIncome, setEditingIncome] = useState(false);

    const today = new Date();
    const formattedDate = `${today.getDate()} / ${today.getMonth() + 1} / ${today.getFullYear()}`;

    const fetchCategories = async (month?: number) => {
        try {
            const response = await api.get('/transactions/categories', {
                params: { month: month || selectedMonth },
            });
            setCategories(response.data.categories);
        } catch (error) {
            console.error('Failed to fetch categories', error);
        }
    };

    const fetchPlans = async (monthToFetch = selectedMonth) => {
        const currentYear = new Date().getFullYear();
        const response = await api.get(`/plans/?year=${currentYear}`);
        setPlans(response.data);

        if (response.data.length > 0) {
            const selectedPlan = response.data.find(plan => plan.month === monthToFetch);
            if (selectedPlan) {
                setSelectedPlanId(selectedPlan.id);
                // Fetch category limits for the selected plan
                const limitsResponse = await api.get(`/plans/${selectedPlan.id}/category_limits`);
                const limits = limitsResponse.data.reduce((acc, limit) => {
                    acc[limit.category_id] = limit.limit;
                    return acc;
                }, {});
                setBudgetLimits(limits);
                console.log('Budget limits for month', monthToFetch, 'using plan ID', selectedPlan.id);
                
                // Fetch income for this plan
                try {
                    const incomeResponse = await api.get(`/plans/${selectedPlan.id}/income`);
                    setMonthlyIncome(incomeResponse.data.amount || 0);
                    setIncomeDescription(incomeResponse.data.description || "");
                } catch (error) {
                    console.error('Failed to fetch income', error);
                    setMonthlyIncome(0);
                    setIncomeDescription("");
                }
                
                return selectedPlan.id;
            } else {
                console.log('No plan found for month', monthToFetch);
                setBudgetLimits({});
                setSelectedPlanId(null);
                setMonthlyIncome(0);
                setIncomeDescription("");
                return null;
            }
        }
        return null;
    };

    useEffect(() => {
        const fetchExpenses = async () => {
            try {
                const response = await api.get(`/transactions/expenses_summary/?month=${selectedMonth}`);
                setExpensesData(response.data); 

                const updatedSpentAmounts = response.data.reduce((acc, item) => {
                    acc[item.category_id] = item.expenses; 
                    return acc;
                }, {});
                setSpentAmounts(updatedSpentAmounts);

                const updatedBudgetLimits = response.data.reduce((acc, item) => {
                    acc[item.category_id] = item.limit;
                    return acc;
                }, {});
                setBudgetLimits(updatedBudgetLimits);
            } catch (error) {
                console.error('Failed to fetch expenses summary', error);
            }
        };

        const initData = async () => {
            await fetchCategories(selectedMonth);
            await fetchPlans(selectedMonth);
            await fetchExpenses();
        }

        initData();
    }, [selectedMonth]); // Fetch data when selectedMonth changes

    const openModal = (category) => {
        setSelectedCategoryId(category.id);
        setSelectedCategoryName(category.name);
        setLimit(budgetLimits[category.id] || '');
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setLimit('');
    };
    
    const handleIncomeSubmit = async () => {
        try {
            if (!selectedPlanId) {
                // Create a plan if one doesn't exist
                const currentYear = new Date().getFullYear();
                const newPlanResponse = await api.post('/plans/', { 
                    month: selectedMonth, 
                    year: currentYear 
                });
                const newPlanId = newPlanResponse.data.id;
                setSelectedPlanId(newPlanId);
                
                // Create income for this plan
                await api.post(`/plans/${newPlanId}/income`, {
                    amount: parseFloat(monthlyIncome.toString()),
                    description: incomeDescription || null
                });
            } else {
                // Update existing income
                await api.post(`/plans/${selectedPlanId}/income`, {
                    amount: parseFloat(monthlyIncome.toString()),
                    description: incomeDescription || null
                });
            }
            
            setIsIncomeModalOpen(false);
            setEditingIncome(false);
        } catch (error) {
            console.error('Failed to save income', error);
            alert('Failed to save income. Please try again.');
        }
    };

    const handleLimitSubmit = async () => {
        try {
            // Get the most up-to-date plan ID for the current month
            const currentYear = new Date().getFullYear();
            const plansResponse = await api.get(`/plans/?year=${currentYear}`);
            const currentPlans = plansResponse.data;
            const currentPlan = currentPlans.find(plan => plan.month === selectedMonth);
            
            let planIdToUse;
            
            if (!currentPlan) {
                // Create a new plan if it doesn't exist
                const newPlanResponse = await api.post('/plans/', { 
                    month: selectedMonth, 
                    year: currentYear 
                });
                planIdToUse = newPlanResponse.data.id;
                console.log(`Created new plan with ID ${planIdToUse} for month ${selectedMonth}`);
            } else {
                planIdToUse = currentPlan.id;
                console.log(`Using existing plan ID ${planIdToUse} for month ${selectedMonth}`);
            }

            const updatedLimit = {
                category_id: selectedCategoryId,
                limit: parseFloat(limit)
            };

            await api.put(`/plans/${planIdToUse}/category_limits/`, updatedLimit);

            setBudgetLimits((prevLimits) => ({
                ...prevLimits,
                [selectedCategoryId]: parseFloat(limit),
            }));
            
            setSelectedPlanId(planIdToUse); // Update the selected plan ID

            closeModal();
            
            // Refresh plans to get the updated data
            await fetchPlans(selectedMonth);
            
        } catch (error) {
            console.error('Error updating category limit:', error);
            alert('Failed to update category limit. Please try again.');
        }
    };

    const createPlan = async () => {
        const newPlan = { month: selectedMonth, year: new Date().getFullYear() };
        await api.post('/plans/', newPlan);
        const response = await api.get(`/plans/?year=${newPlan.year}`);
        setPlans(response.data);
    };

    const handleMonthChange = async (month: number) => {
        setSelectedMonth(month);
        // Note: We don't need to call fetchCategories and fetchPlans here anymore
        // They will be triggered by the useEffect when selectedMonth changes
    };

    const toggleView = () => {
        setIsListView(prev => !prev);
    };

    const handleAddLimit = async () => {
        if (!selectedCategory || !limitValue) {
            alert('Please select a category and enter a limit value.');
            return;
        }

        try {
            // Get the most up-to-date plan ID for the current month
            const currentYear = new Date().getFullYear();
            const plansResponse = await api.get(`/plans/?year=${currentYear}`);
            const currentPlans = plansResponse.data;
            const currentPlan = currentPlans.find(plan => plan.month === selectedMonth);
            
            let planIdToUse;
            
            if (!currentPlan) {
                // Create a new plan if it doesn't exist
                const newPlanResponse = await api.post('/plans/', { 
                    month: selectedMonth, 
                    year: currentYear 
                });
                planIdToUse = newPlanResponse.data.id;
                console.log(`Created new plan with ID ${planIdToUse} for month ${selectedMonth}`);
            } else {
                planIdToUse = currentPlan.id;
                console.log(`Using existing plan ID ${planIdToUse} for month ${selectedMonth}`);
            }
            
            // Use the correct plan ID for the API call
            const response = await api.post(
                `/plans/${planIdToUse}/category_limits`, 
                {
                    category_id: selectedCategory.id,
                    limit: parseFloat(limitValue),
                }
            );

            // Update UI with new limit
            setBudgetLimits((prevLimits) => ({
                ...prevLimits,
                [selectedCategory.id]: parseFloat(limitValue),
            }));

            // Reset modal state
            setSelectedCategory(null);
            setLimitValue('');
            setIsAddLimitModalOpen(false);
            
            // Refresh plans to get the newly created plan
            await fetchPlans(selectedMonth);
            
        } catch (error) {
            console.error('Error adding category limit:', error);
            alert('Failed to add category limit. Please try again.');
        }
    };

    const handleDeleteLimit = async (categoryId: string) => {
        try {
            // Get the most up-to-date plan ID for the current month
            const currentYear = new Date().getFullYear();
            const plansResponse = await api.get(`/plans/?year=${currentYear}`);
            const currentPlans = plansResponse.data;
            const currentPlan = currentPlans.find(plan => plan.month === selectedMonth);
            
            if (!currentPlan) {
                alert('No plan exists for the selected month. Cannot delete limit.');
                return;
            }
            
            // Use the plan ID from the current month
            const planIdToUse = currentPlan.id;
            
            console.log(`Deleting limit from plan ID ${planIdToUse} for month ${selectedMonth}`);
            
            await api.delete(`/plans/${planIdToUse}/categories/${categoryId}`);
            
            // Refresh the category limits
            const updatedBudgetLimits = { ...budgetLimits };
            delete updatedBudgetLimits[categoryId];
            setBudgetLimits(updatedBudgetLimits);
            
            setSelectedPlanId(planIdToUse); // Update the selected plan ID
            
            // Refresh plans
            await fetchPlans(selectedMonth);
        } catch (error) {
            console.error('Failed to delete category limit', error);
            alert('Failed to delete category limit. Please try again.');
        }
    };
    
    // Calculate total planned expenses
    const totalPlannedExpenses = Object.values(budgetLimits).reduce((sum: number, amount: any) => sum + (parseFloat(amount) || 0), 0);
    
    // Calculate balance (income - expenses)
    const balance = monthlyIncome - totalPlannedExpenses;

    return (
        <div className="container mx-auto p-4">
            {plans.length === 0 ? (
                <button 
                    onClick={createPlan} 
                    className="bg-green-500 text-white p-4 rounded-lg shadow-lg w-full md:w-1/2 mx-auto flex items-center justify-center text-xl"
                >
                    + Create Plan
                </button>
            ) : (
                <>
                    <h1 className="text-2xl font-bold mb-2">
                        Budget Planning
                    </h1>
                    <p className="text-lg text-gray-600 mb-6 flex items-center">
                        <div className="w-5 h-5 mr-2 flex-shrink-0">
                             <CalendarIcon className="w-full h-full text-gray-500" />
                        </div>
                        {formattedDate}
                    </p>
                    
                    {/* Month selection and income section */}
                    <div className="mb-8">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
                            <div>
                                <label className="block">
                                    Select Month:
                                    <select
                                        value={selectedMonth}
                                        onChange={(e) => handleMonthChange(parseInt(e.target.value))}
                                        className="mt-2 p-2 border rounded w-full md:w-64"
                                    >
                                        <option value="">--Select Month--</option>
                                        {Array.from({ length: 12 }, (_, i) => {
                                            const month = new Date(0, i).toLocaleString("default", {
                                                month: "long",
                                            });
                                            return (
                                                <option key={month} value={i + 1}>
                                                    {month}
                                                </option>
                                            );
                                        })}
                                    </select>
                                </label>
                            </div>
                            <div className="flex gap-2">
                                <button className='bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-md flex items-center' onClick={() => setIsAddLimitModalOpen(true)}>
                                    <PlusIcon className='w-5 h-5 mr-2' />
                                    Add Limit
                                </button>
                            </div>
                        </div>
                        
                        {/* Income Card */}
                        <div className="mb-6 p-4 border rounded-lg bg-white shadow-sm">
                            <div className="flex justify-between items-center mb-3">
                                <h2 className="text-lg font-semibold flex items-center">
                                    <BanknotesIcon className="w-5 h-5 mr-2 text-green-600" />
                                    Monthly Income
                                </h2>
                                <button 
                                    onClick={() => { setIsIncomeModalOpen(true); setEditingIncome(true); }}
                                    className="text-blue-600 hover:text-blue-800 flex items-center"
                                >
                                    <PencilSquareIcon className="w-5 h-5 mr-1" />
                                    {monthlyIncome > 0 ? 'Edit' : 'Set Income'}
                                </button>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="p-3 bg-green-50 rounded-lg border border-green-100">
                                    <p className="text-sm text-gray-600 mb-1">Monthly Income</p>
                                    <p className="text-xl font-bold text-green-600">${monthlyIncome.toLocaleString()}</p>
                                </div>
                                
                                <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
                                    <p className="text-sm text-gray-600 mb-1">Planned Expenses</p>
                                    <p className="text-xl font-bold text-blue-600">${totalPlannedExpenses.toLocaleString()}</p>
                                </div>
                                
                                <div className={`p-3 rounded-lg border ${balance >= 0 ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100'}`}>
                                    <p className="text-sm text-gray-600 mb-1">Expected Balance</p>
                                    <p className={`text-xl font-bold ${balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                        ${balance.toLocaleString()}
                                    </p>
                                </div>
                            </div>
                            
                            {incomeDescription && (
                                <div className="mt-3 text-sm text-gray-600">
                                    <span className="font-medium">Note:</span> {incomeDescription}
                                </div>
                            )}
                        </div>
                    </div>
                    
                    <button onClick={toggleView} className="mb-4 p-2 rounded border border-gray-300 flex items-center bg-transparent">
                        {isListView ? <Squares2X2Icon className="h-5 w-5" /> : <Bars3Icon className="h-5 w-5" />}
                    </button>
                    
                    {/* Category budget section */}
                    <h2 className="text-xl font-semibold mb-4">Category Budgets</h2>
                    {isListView ? (
                        <div className="list-view space-y-2">
                            {categories.filter(category => budgetLimits[category.id]).map((category) => {
                                const spentAmount = spentAmounts[category.id] || 0;
                                const limit = budgetLimits[category.id] || 0;
                                const progress = limit > 0 ? (spentAmount / limit) * 100 : spentAmount;
                                return (
                                    <div key={category.id} className="flex items-center justify-between mb-2 p-2 border rounded bg-gray-100 shadow-sm">
                                        <span className="flex-1 text-left text-gray-700 font-medium">{category.name}</span>
                                        <div className="relative w-full mx-2">
                                            <div className="bg-gray-300 h-2 rounded">
                                                <div className="bg-blue-500 h-2 rounded" style={{ width: `${Math.min(progress, 100)}%` }}></div>
                                            </div>
                                        </div>
                                        <p className='text-sm text-gray-600'>{spentAmount.toLocaleString()} / {limit.toLocaleString()}</p>
                                        <button
                                            onClick={(event) => {
                                                event.stopPropagation();
                                                setCategoryToDelete(category.id);
                                                setIsDeleteConfirmationModalOpen(true);
                                            }}
                                            className='bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded-md flex items-center'
                                        >
                                            <SolidTrashIcon className='w-4 h-4 mr-1' />
                                            Delete
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-6 mb-6">
                            {categories.filter(category => budgetLimits[category.id]).map((category) => {
                                const spentAmount = spentAmounts[category.id] || 0;
                                const limit = budgetLimits[category.id] || 0;
                                const progress = limit > 0 ? (spentAmount / limit) * 100 : spentAmount;
                                let progressColor = 'text-blue-500';

                                // Determine color based on progress
                                if (progress > 100) {
                                    progressColor = 'text-black';
                                } else if (progress <= 50) {
                                    progressColor = 'text-green-500';
                                } else if (progress <= 75) {
                                    progressColor = 'text-yellow-500';
                                } else {
                                    progressColor = 'text-red-500';
                                }

                                return (
                                    <div key={category.id} className={`relative group p-6 bg-white rounded-xl shadow-md hover:shadow-md transition-shadow cursor-pointer ${progressColor}`} onClick={() => openModal(category)}>
                                        <h3 className="text-lg font-medium mb-4 text-center">{category.name}</h3>
                                        <div className="relative w-32 h-32 mx-auto mb-4">
                                            <svg className="w-full h-full" viewBox="0 0 100 100">
                                                <circle className="text-gray-200" strokeWidth="8" stroke="currentColor" fill="transparent" r="40" cx="50" cy="50" />
                                                <circle className={`${progressColor}`} strokeWidth="8" strokeDasharray="251.2" strokeDashoffset={251.2 - (251.2 * (Math.min(progress, 100) / 100))} strokeLinecap="round" stroke="currentColor" fill="transparent" r="40" cx="50" cy="50" />
                                            </svg>
                                            <div className="absolute inset-0 flex items-center justify-center">
                                                <span className="text-2xl font-bold text-gray-700">{Math.round(progress)}%</span>
                                            </div>
                                        </div>
                                        <div className="text-center">
                                            <p className='text-sm text-gray-600'>{spentAmount.toLocaleString()} / {limit.toLocaleString()}</p>
                                            <span className="text-xs text-gray-500">of limit</span>
                                        </div>
                                        <button
                                            onClick={(event) => {
                                                event.stopPropagation();
                                                setCategoryToDelete(category.id);
                                                setIsDeleteConfirmationModalOpen(true);
                                            }}
                                            className='bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded-md flex items-center absolute top-4 right-4'
                                        >
                                            <SolidTrashIcon className='w-4 h-4 mr-1' />
                                            Delete
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                    
                    {/* Income Modal */}
                    {isIncomeModalOpen && (
                        <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50'>
                            <div className='bg-white p-6 rounded-lg w-96'>
                                <h2 className='text-xl font-bold mb-4 flex items-center'>
                                    <BanknotesIcon className="w-6 h-6 mr-2 text-green-600" />
                                    {editingIncome ? 'Update Monthly Income' : 'Add Monthly Income'}
                                </h2>
                                <div className='mb-4'>
                                    <label className='block text-sm font-medium mb-1'>Amount</label>
                                    <div className="relative">
                                        <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-500">$</span>
                                        <input
                                            type='number'
                                            value={monthlyIncome}
                                            onChange={(e) => setMonthlyIncome(parseFloat(e.target.value) || 0)}
                                            placeholder='Enter monthly income'
                                            className='w-full p-2 pl-8 border rounded-md'
                                        />
                                    </div>
                                </div>
                                <div className='mb-4'>
                                    <label className='block text-sm font-medium mb-1'>Description (optional)</label>
                                    <textarea
                                        value={incomeDescription}
                                        onChange={(e) => setIncomeDescription(e.target.value)}
                                        placeholder='Add notes about your income'
                                        className='w-full p-2 border rounded-md h-24'
                                    />
                                </div>
                                <div className='flex justify-end space-x-2'>
                                    <button
                                        onClick={() => setIsIncomeModalOpen(false)}
                                        className='px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-md flex items-center'
                                    >
                                        <XMarkIcon className="w-5 h-5 mr-1 text-gray-500" />
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleIncomeSubmit}
                                        className='px-4 py-2 bg-green-600 text-white hover:bg-green-700 rounded-md flex items-center'
                                    >
                                        <CheckIcon className="w-5 h-5 mr-1" />
                                        Save
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                    
                    {isAddLimitModalOpen && (
                        <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center'>
                            <div className='bg-white p-6 rounded-lg w-96'>
                                <h2 className='text-xl font-bold mb-4 flex items-center'>
                                    <PlusCircleIcon className="w-6 h-6 mr-2 text-green-500" />
                                    Add Category Limit
                                </h2>
                                <div className='mb-4'>
                                    <label className='block text-sm font-medium mb-1'>Category</label>
                                    <Combobox value={selectedCategory} onChange={setSelectedCategory}>
                                        <div className='relative'>
                                            <Combobox.Input
                                                className='w-full p-2 border rounded-md'
                                                placeholder='Select a category'
                                                displayValue={(category: { name: string }) => category?.name}
                                                onChange={(event) => setQuery(event.target.value)}
                                            />
                                            <Combobox.Button className='absolute inset-y-0 right-0 flex items-center pr-2'>
                                                <ChevronUpDownIcon className='w-5 h-5 text-gray-400' />
                                            </Combobox.Button>
                                            <Combobox.Options className='absolute mt-1 w-full bg-white border rounded-md shadow-lg max-h-60 overflow-y-auto'>
                                                {categories
                                                    .filter(category => 
                                                        !budgetLimits[category.id] &&
                                                        category.name.toLowerCase().includes(query.toLowerCase())
                                                    )
                                                    .map(category => (
                                                        <Combobox.Option key={category.id} value={category}>
                                                            {({ active }) => (
                                                                <div className={`p-2 ${active ? 'bg-blue-500 text-white' : 'text-gray-900'}`}>
                                                                    {category.name}
                                                                </div>
                                                            )}
                                                        </Combobox.Option>
                                                    ))}
                                            </Combobox.Options>
                                        </div>
                                    </Combobox>
                                </div>
                                <div className='mb-4'>
                                    <label className='block text-sm font-medium mb-1'>Limit Value</label>
                                    <input
                                        type='number'
                                        value={limitValue}
                                        onChange={(e) => setLimitValue(e.target.value)}
                                        placeholder='Enter limit value'
                                        className='w-full p-2 border rounded-md'
                                    />
                                </div>
                                <div className='flex justify-end space-x-2'>
                                    <button
                                        onClick={() => setIsAddLimitModalOpen(false)}
                                        className='px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-md flex items-center'
                                    >
                                        <XMarkIcon className="w-5 h-5 mr-1 text-gray-500" />
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleAddLimit}
                                        className='px-4 py-2 bg-blue-500 text-white hover:bg-blue-600 rounded-md flex items-center'
                                    >
                                        <CheckIcon className="w-5 h-5 mr-1" />
                                        Add
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                    {isModalOpen && (
                        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
                            <div className="bg-white p-8 rounded-lg w-[500px] shadow-xl">
                                <h2 className="text-xl font-bold mb-6 text-center flex items-center justify-center">
                                    <PencilSquareIcon className="w-6 h-6 mr-2 text-blue-500" />
                                    Set Budget Limit for {selectedCategoryName} in <span className="text-blue-500">{['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][selectedMonth - 1]}</span>
                                </h2>
                                <div className="mb-6">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Limit Amount</label>
                                    <input
                                        type="number"
                                        value={limit}
                                        onChange={(e) => setLimit(e.target.value)}
                                        className="form-input w-full rounded-md border border-gray-300 focus:border-blue-500 focus:ring focus:ring-blue-200"
                                        placeholder="Enter limit"
                                    />
                                </div>
                                <div className="flex justify-end space-x-4">
                                    <button onClick={closeModal} className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 flex items-center">
                                        <XMarkIcon className="w-5 h-5 mr-1 text-gray-500" />
                                        Cancel
                                    </button>
                                    <button onClick={handleLimitSubmit} className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 flex items-center">
                                        <CheckIcon className="w-5 h-5 mr-1" />
                                        Save
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                    {isDeleteConfirmationModalOpen && (
                        <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center'>
                            <div className='bg-white p-6 rounded-lg w-96'>
                                <h2 className='text-xl font-bold mb-4 flex items-center'>
                                    <ExclamationTriangleIcon className="w-6 h-6 mr-2 text-red-500" />
                                    Delete Category Limit
                                </h2>
                                <p className='mb-4'>Are you sure you want to delete this category limit?</p>
                                <div className='flex justify-end space-x-2'>
                                    <button
                                        onClick={() => setIsDeleteConfirmationModalOpen(false)}
                                        className='px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-md flex items-center'
                                    >
                                        <XMarkIcon className="w-5 h-5 mr-1 text-gray-500" />
                                        Cancel
                                    </button>
                                    <button
                                        onClick={async () => {
                                            if (categoryToDelete) {
                                                await handleDeleteLimit(categoryToDelete);
                                                setIsDeleteConfirmationModalOpen(false);
                                            }
                                        }}
                                        className='px-4 py-2 bg-red-500 text-white hover:bg-red-600 rounded-md flex items-center'
                                    >
                                        <SolidTrashIcon className="w-5 h-5 mr-1" />
                                        Delete
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default Planning;