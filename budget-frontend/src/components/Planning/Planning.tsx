import React, { useEffect, useState } from 'react';
import api from '../../client/api/client.ts';
import { ArrowLeftIcon, ArrowRightIcon, Squares2X2Icon, Bars3Icon } from '@heroicons/react/24/outline';
import { PlusIcon } from '@heroicons/react/24/solid';
import { ChevronUpDownIcon } from '@heroicons/react/24/solid';
import { Combobox } from '@headlessui/react';
import { TrashIcon } from '@heroicons/react/24/solid';

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

    const today = new Date();
    const formattedDate = `${today.getDate()} / ${today.getMonth() + 1} / ${today.getFullYear()}`;

    useEffect(() => {
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

        const fetchPlans = async () => {
            const currentYear = new Date().getFullYear();
            const response = await api.get(`/plans/?year=${currentYear}`);
            setPlans(response.data);

            if (response.data.length > 0) {
                const selectedPlan = response.data.find(plan => plan.month === selectedMonth);
                if (selectedPlan) {
                    setSelectedPlanId(selectedPlan.id);
                    // Fetch category limits for the selected plan
                    const limitsResponse = await api.get(`/plans/${selectedPlan.id}/category_limits`);
                    const limits = limitsResponse.data.reduce((acc, limit) => {
                        acc[limit.category_id] = limit.limit;
                        return acc;
                    }, {});
                    setBudgetLimits(limits);
                    console.log('Budget limits:', limits)
                }
            }
        };

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

        fetchCategories(selectedMonth);
        fetchPlans();
        fetchExpenses();
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

    const handleLimitSubmit = async () => {
        if (!selectedPlanId) {
            alert("Please select a plan before submitting the limit.");
            return;
        }

        const updatedLimit = {
            category_id: selectedCategoryId,
            plan_id: selectedPlanId,
            limit: parseFloat(limit)
        };

        await api.put(`/plans/${selectedPlanId}/category_limits/`, updatedLimit);

        setBudgetLimits((prevLimits) => ({
            ...prevLimits,
            [selectedCategoryId]: limit,
        }));

        closeModal();
    };

    const createPlan = async () => {
        const newPlan = { month: selectedMonth, year: new Date().getFullYear() };
        await api.post('/plans/', newPlan);
        const response = await api.get(`/plans/?year=${newPlan.year}`);
        setPlans(response.data);
    };

    const handleMonthChange = async (month: number) => {
        setSelectedMonth(month);
        await fetchCategories(month);
    };

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

    const toggleView = () => {
        setIsListView(prev => !prev);
    };

    const handleAddLimit = async () => {
        if (!selectedCategory || !limitValue) {
            alert('Please select a category and enter a limit value.');
            return;
        }

        try {
            const response = await api.post(`/plans/${selectedPlanId}/category_limits`, {
                category_id: selectedCategory.id,
                limit: parseFloat(limitValue),
            });

            // Fetch updated category limits
            const updatedLimits = await api.get(`/plans/${selectedPlanId}/category_limits`);
            const formattedLimits = updatedLimits.data.reduce((acc: any, limit: any) => {
                acc[limit.category_id] = limit.limit; 
                return acc;
            }, {});

            setBudgetLimits(formattedLimits);

            // Reset modal state
            setSelectedCategory(null);
            setLimitValue('');
            setIsAddLimitModalOpen(false);
        } catch (error) {
            console.error('Error adding category limit:', error);
            alert('Failed to add category limit. Please try again.');
        }
    };

    const handleDeleteLimit = async (categoryId: string) => {
        try {
            await api.delete(`/plans/${selectedPlanId}/categories/${categoryId}`);
            // Refresh the category limits
            const updatedBudgetLimits = { ...budgetLimits };
            delete updatedBudgetLimits[categoryId];
            setBudgetLimits(updatedBudgetLimits);
        } catch (error) {
            console.error('Failed to delete category limit', error);
        }
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
                    <h1 className="text-2xl font-bold mb-6">Budget Planning</h1>
                    <p className="text-lg text-gray-600 mb-6">{formattedDate}</p>
                    <div className='flex items-center justify-between mb-4'>
                        <div>
                            <label className="block mb-4">
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
                        <button className='bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-md flex items-center' onClick={() => setIsAddLimitModalOpen(true)}>
                            <PlusIcon className='w-5 h-5 mr-2' />
                            Add Limit
                        </button>
                    </div>
                    <button onClick={toggleView} className="mb-4 p-2 rounded border border-gray-300 flex items-center bg-transparent">
                        {isListView ? <Squares2X2Icon className="h-5 w-5" /> : <Bars3Icon className="h-5 w-5" />}
                    </button>
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
                                            <TrashIcon className='w-4 h-4 mr-1' />
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
                                            <TrashIcon className='w-4 h-4 mr-1' />
                                            Delete
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                    {isAddLimitModalOpen && (
                        <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center'>
                            <div className='bg-white p-6 rounded-lg w-96'>
                                <h2 className='text-xl font-bold mb-4'>Add Category Limit</h2>
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
                                        className='px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-md'
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleAddLimit}
                                        className='px-4 py-2 bg-blue-500 text-white hover:bg-blue-600 rounded-md'
                                    >
                                        Add
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                    {isModalOpen && (
                        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
                            <div className="bg-white p-8 rounded-lg w-[500px] shadow-xl">
                                <h2 className="text-xl font-bold mb-6 text-center">Set Budget Limit for {selectedCategoryName} in <span className="text-blue-500">{['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][selectedMonth - 1]}</span></h2>
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
                                    <button onClick={closeModal} className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300">Cancel</button>
                                    <button onClick={handleLimitSubmit} className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">Save</button>
                                </div>
                            </div>
                        </div>
                    )}
                    {isDeleteConfirmationModalOpen && (
                        <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center'>
                            <div className='bg-white p-6 rounded-lg w-96'>
                                <h2 className='text-xl font-bold mb-4'>Delete Category Limit</h2>
                                <p className='mb-4'>Are you sure you want to delete this category limit?</p>
                                <div className='flex justify-end space-x-2'>
                                    <button
                                        onClick={() => setIsDeleteConfirmationModalOpen(false)}
                                        className='px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-md'
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={async () => {
                                            if (categoryToDelete) {
                                                await handleDeleteLimit(categoryToDelete);
                                                setIsDeleteConfirmationModalOpen(false);
                                            }
                                        }}
                                        className='px-4 py-2 bg-red-500 text-white hover:bg-red-600 rounded-md'
                                    >
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