import React, { useEffect, useState } from 'react';
import api, { getRareExpensesSummary } from '../../client/api/client.ts';
import { RareExpensesResponse, RareExpenseItem, SavingsSuggestionItem } from '../../client/api/types.ts';
import { ArrowLeftIcon, ArrowRightIcon, Squares2X2Icon, Bars3Icon, CalendarDaysIcon, CalendarIcon, PencilSquareIcon, PlusCircleIcon, CheckIcon, XMarkIcon, ExclamationTriangleIcon, BanknotesIcon } from '@heroicons/react/24/outline';
import { PlusIcon, TrashIcon as SolidTrashIcon, ChevronUpDownIcon, TagIcon } from '@heroicons/react/24/solid';
import { Combobox } from '@headlessui/react';

// Define TypeScript interfaces
interface Category {
    id: string;
    name: string;
    user_id: string;
    main_categories?: number[];
}

interface MainCategory {
    id: number;
    name: string;
    user_id: string;
}

const Planning = () => {
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
    const [budgetLimits, setBudgetLimits] = useState({});
    const [spentAmounts, setSpentAmounts] = useState({}); 
    const [categories, setCategories] = useState<Category[]>([]);
    const [expensesData, setExpensesData] = useState([]); 
    const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
    const [selectedCategoryName, setSelectedCategoryName] = useState(null);
    const [limit, setLimit] = useState('');
    const [plans, setPlans] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedPlanId, setSelectedPlanId] = useState(null);
    const [isListView, setIsListView] = useState(false);
    const [isAddLimitModalOpen, setIsAddLimitModalOpen] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
    const [isDeleteConfirmationModalOpen, setIsDeleteConfirmationModalOpen] = useState(false);
    const [categoryToDelete, setCategoryToDelete] = useState<string | null>(null);
    const [query, setQuery] = useState('');
    const [limitValue, setLimitValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    
    // Income states
    const [monthlyIncome, setMonthlyIncome] = useState(0);
    const [incomeDescription, setIncomeDescription] = useState("");
    const [isIncomeModalOpen, setIsIncomeModalOpen] = useState(false);
    const [editingIncome, setEditingIncome] = useState(false);

    const [mainCategories, setMainCategories] = useState<MainCategory[]>([]);

    // State for Rare Expenses
    const [rareExpensesData, setRareExpensesData] = useState<RareExpensesResponse | null>(null);
    const [isRareExpensesModalOpen, setIsRareExpensesModalOpen] = useState(false);

    const today = new Date();
    const formattedDate = `${today.getDate()} / ${today.getMonth() + 1} / ${today.getFullYear()}`;
    const currentDisplayMonth = today.getMonth() + 1; // For highlighting current month in modal
    const currentDisplayYear = today.getFullYear(); // For highlighting current month in modal

    const fetchCategories = async (month?: number) => {
        try {
            const response = await api.get('/transactions/categories');
            setCategories(response.data.categories);
            
            // Also fetch main categories
            const mainCategoriesResponse = await api.get('/transactions/main-categories');
            setMainCategories(mainCategoriesResponse.data.main_categories);
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
                console.log('Budget limits for month', monthToFetch, 'using plan ID', selectedPlan.id, 'limits:', limits);
                
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

                // const updatedBudgetLimits = response.data.reduce((acc, item) => {
                //     acc[item.category_id] = item.limit;
                //     return acc;
                // }, {});
                // setBudgetLimits(updatedBudgetLimits);
            } catch (error) {
                console.error('Failed to fetch expenses summary', error);
            }
        };

        const fetchRareData = async () => {
            try {
                setIsLoading(true);
                const data = await getRareExpensesSummary();
                setRareExpensesData(data);
            } catch (error) {
                console.error('Failed to fetch rare expenses summary', error);
                // Optionally, set an error state here to display to the user
            } finally {
                setIsLoading(false);
            }
        };

        const initData = async () => {
            setIsLoading(true);
            await fetchCategories(selectedMonth);
            await fetchPlans(selectedMonth);
            await fetchExpenses();
            await fetchRareData(); // Call the new fetch function
            setIsLoading(false);
        }

        initData();
    }, []); // Only run on component mount - selectedMonth dependency removed for rare expenses as it's a 12-month forecast

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
        if (!selectedCategoryId) {
            console.error("selectedCategoryId is null, cannot submit limit update.");
            alert("Error: No category selected for updating limit.");
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
        setIsLoading(true);
        setSelectedMonth(month);
        await fetchPlans(month);
        // Fetch expenses for the new month
        try {
            const response = await api.get(`/transactions/expenses_summary/?month=${month}`);
            setExpensesData(response.data); 

            const updatedSpentAmounts = response.data.reduce((acc, item) => {
                acc[item.category_id] = item.expenses; 
                return acc;
            }, {});
            setSpentAmounts(updatedSpentAmounts);
        } catch (error) {
            console.error('Failed to fetch expenses summary', error);
        }
        
        // Fetch categories for the new month
        await fetchCategories(month);
        setIsLoading(false);
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

    // Helper function to get main category names for a category
    const getMainCategoryName = (category: Category): string | null => {
        if (!category.main_categories || category.main_categories.length === 0) {
            return null;
        }

        // Just get the first main category for display in the card
        const mainCategoryId = category.main_categories[0];
        const mainCategory = mainCategories.find(mc => mc.id === mainCategoryId);
        return mainCategory ? mainCategory.name : null;
    };

    // Helper to format month number to month name
    const getMonthName = (monthNumber: number) => {
        const date = new Date();
        date.setMonth(monthNumber - 1);
        return date.toLocaleString('en-US', { month: 'long' });
    };

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
                                        disabled={isLoading}
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
                                {isLoading && <p className="text-sm text-blue-500 mt-1">Loading data...</p>}
                            </div>
                            <div className="flex gap-2">
                                <button className='bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-md flex items-center' onClick={() => setIsAddLimitModalOpen(true)}>
                                    <PlusIcon className='w-5 h-5 mr-2' />
                                    Category Plan
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
                    
                    {/* Button to open Rare Expenses Modal - MOVED HERE */}
                    <div className="my-6">
                        <button
                            onClick={() => setIsRareExpensesModalOpen(true)}
                            className={`w-full md:w-auto flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-all duration-150 ease-in-out
                                ${rareExpensesData && rareExpensesData.rare_expenses.length > 0 ? 'animate-pulse ring-2 ring-purple-400 ring-offset-2 ring-offset-gray-100' : ''}
                            `}
                        >
                            <CalendarDaysIcon className="w-5 h-5 mr-2" />
                            View Upcoming Rare Expenses & Savings Plan
                        </button>
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
                                const mainCategoryName = getMainCategoryName(category);
                                
                                return (
                                    <div key={category.id} className="flex items-center justify-between mb-2 p-2 border rounded bg-gray-100 shadow-sm">
                                        <div className="flex flex-col flex-1 mr-2">
                                            {mainCategoryName && (
                                                <span className="text-base text-white font-medium flex items-center bg-indigo-600 px-4 py-2 rounded-full mb-2 w-fit">
                                                    <TagIcon className="w-4 h-4 mr-2" />
                                                    {mainCategoryName}
                                                </span>
                                            )}
                                            <span className="text-left text-gray-700 font-medium truncate">{category.name}</span>
                                        </div>
                                        <div className="relative w-full mx-2">
                                            <div className="bg-gray-300 h-2 rounded">
                                                <div className="bg-blue-500 h-2 rounded" style={{ width: `${Math.min(progress, 100)}%` }}></div>
                                            </div>
                                        </div>
                                        <p className='text-sm text-gray-600 whitespace-nowrap ml-1'>{spentAmount.toLocaleString()} / {limit.toLocaleString()}</p>
                                        <button
                                            onClick={(event) => {
                                                event.stopPropagation();
                                                setCategoryToDelete(category.id);
                                                setIsDeleteConfirmationModalOpen(true);
                                            }}
                                            className='bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded-md flex items-center ml-2'
                                        >
                                            <SolidTrashIcon className='w-4 h-4 mr-1' />
                                            Delete
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 gap-3 md:gap-6 mb-6">
                            {categories.filter(category => budgetLimits[category.id]).map((category) => {
                                const spentAmount = spentAmounts[category.id] || 0;
                                const limit = budgetLimits[category.id] || 0;
                                const progress = limit > 0 ? (spentAmount / limit) * 100 : spentAmount;
                                const mainCategoryName = getMainCategoryName(category);
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
                                    <div key={category.id} className={`relative group p-3 sm:p-5 md:p-6 bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow cursor-pointer ${progressColor}`} onClick={() => openModal(category)}>
                                        {mainCategoryName && (
                                            <div className="absolute top-2 left-2 sm:top-3 md:top-4 sm:left-3 md:left-4">
                                                <span className="text-xs sm:text-base md:text-lg text-white font-medium flex items-center bg-indigo-600 px-2 py-1 sm:px-4 sm:py-2 md:px-5 md:py-2.5 rounded-full shadow-md">
                                                    <TagIcon className="w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5 mr-1 sm:mr-2 md:mr-2.5" />
                                                    {mainCategoryName}
                                                </span>
                                            </div>
                                        )}
                                        <h3 className={`text-sm sm:text-lg md:text-xl font-medium text-center break-words hyphens-auto ${mainCategoryName ? 'mt-8 sm:mt-14 md:mt-16 mb-2 sm:mb-4 md:mb-5' : 'mb-2 sm:mb-4 md:mb-5'}`}>{category.name}</h3>
                                        <div className="relative w-20 h-20 sm:w-32 sm:h-32 md:w-40 md:h-40 mx-auto mb-2 sm:mb-4 md:mb-5">
                                            <svg className="w-full h-full" viewBox="0 0 100 100">
                                                <circle className="text-gray-200" strokeWidth="8" stroke="currentColor" fill="transparent" r="40" cx="50" cy="50" />
                                                <circle 
                                                    className={progressColor} 
                                                    strokeWidth="8" 
                                                    strokeDasharray="251.2" 
                                                    strokeDashoffset={251.2 - (251.2 * (Math.min(progress, 100) / 100))} 
                                                    strokeLinecap="round" 
                                                    stroke="currentColor" 
                                                    fill="transparent" 
                                                    r="40" 
                                                    cx="50" 
                                                    cy="50" 
                                                />
                                            </svg>
                                            <div className="absolute inset-0 flex items-center justify-center">
                                                <span className="text-lg sm:text-2xl md:text-3xl font-bold text-gray-700">{Math.round(progress)}%</span>
                                            </div>
                                        </div>
                                        <div className="text-center mb-1 sm:mb-2 md:mb-3">
                                            <p className='text-xs sm:text-sm md:text-base font-medium text-gray-700'>{spentAmount.toLocaleString()} / {limit.toLocaleString()}</p>
                                            <span className="text-xs sm:text-sm text-gray-500">of limit</span>
                                        </div>
                                        <button
                                            onClick={(event) => {
                                                event.stopPropagation();
                                                setCategoryToDelete(category.id);
                                                setIsDeleteConfirmationModalOpen(true);
                                            }}
                                            className='bg-red-500 hover:bg-red-600 text-white px-1 py-0.5 sm:px-2.5 sm:py-1 md:px-3 md:py-1.5 rounded-md flex items-center absolute top-2 right-2 sm:top-3 sm:right-3 md:top-4 md:right-4'
                                        >
                                            <SolidTrashIcon className='w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4 mr-0.5 sm:mr-1 md:mr-1.5' />
                                            <span className="text-xs sm:text-sm md:text-base">Delete</span>
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
                                                displayValue={(category: Category | null) => category?.name || ''}
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

                    {/* Rare Expenses Modal */}
                    {isRareExpensesModalOpen && rareExpensesData && (
                        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
                            <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                                <div className="flex justify-between items-center mb-4">
                                    <h2 className="text-2xl font-bold text-gray-800">Rare Expenses & Savings</h2>
                                    <button
                                        onClick={() => setIsRareExpensesModalOpen(false)}
                                        className="text-gray-400 hover:text-gray-600"
                                    >
                                        <XMarkIcon className="h-6 w-6" />
                                    </button>
                                </div>

                                {/* Upcoming Rare Expenses Section */}
                                <div className="mt-2 p-4 bg-gray-50 shadow rounded-lg">
                                    <h3 className="text-xl font-semibold mb-4 text-gray-700">Upcoming Rare Expenses (Next 12 Months)</h3>
                                    {rareExpensesData.rare_expenses.length > 0 ? (
                                        <ul className="divide-y divide-gray-200">
                                            {rareExpensesData.rare_expenses.map((expense, index) => (
                                                <li key={index} className="py-3 flex justify-between items-center">
                                                    <div>
                                                        <p className="text-sm font-medium text-indigo-600">{expense.category_name}</p>
                                                        <p className="text-xs text-gray-500">Due: {getMonthName(expense.due_month)} {expense.due_year}</p>
                                                    </div>
                                                    <p className="text-sm font-semibold text-gray-800">${parseFloat(expense.amount as any).toFixed(2)}</p>
                                                </li>
                                            ))}
                                        </ul>
                                    ) : (
                                        <p className="text-sm text-gray-500">No rare expenses planned for the next 12 months.</p>
                                    )}
                                </div>

                                {/* Suggested Monthly Savings for Rare Expenses Section */}
                                <div className="mt-6 p-4 bg-gray-50 shadow rounded-lg">
                                    <h3 className="text-xl font-semibold mb-4 text-gray-700">Suggested Monthly Savings for Rare Expenses</h3>
                                    {rareExpensesData.savings_suggestions.length > 0 ? (
                                        <ul className="divide-y divide-gray-200">
                                            {rareExpensesData.savings_suggestions.map((suggestion, index) => {
                                                const isCurrentMonthSuggestion = suggestion.month === currentDisplayMonth && suggestion.year === currentDisplayYear;
                                                return (
                                                    <li 
                                                        key={index} 
                                                        className={`py-3 flex justify-between items-center transition-colors duration-200 px-3 ${isCurrentMonthSuggestion ? 'bg-purple-200 ring-2 ring-purple-500 shadow-lg rounded-md' : ''}`}
                                                    >
                                                        <p className={`text-sm ${isCurrentMonthSuggestion ? 'font-semibold text-purple-800' : 'font-medium text-gray-700'}`}>{getMonthName(suggestion.month)} {suggestion.year}</p>
                                                        <p className={`text-sm ${isCurrentMonthSuggestion ? 'font-bold text-green-700' : 'font-semibold text-green-600'}`}>+ ${parseFloat(suggestion.suggested_amount as any).toFixed(2)}</p>
                                                    </li>
                                                );
                                            })}
                                        </ul>
                                    ) : (
                                        <p className="text-sm text-gray-500">No savings suggestions available at the moment.</p>
                                    )}
                                </div>
                                <div className="mt-6 flex justify-end">
                                    <button
                                        onClick={() => setIsRareExpensesModalOpen(false)}
                                        className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 flex items-center"
                                    >
                                        <XMarkIcon className="w-5 h-5 mr-1 text-gray-500" />
                                        Close
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