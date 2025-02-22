import React, { useEffect, useState } from 'react';
import api from '../../client/api/client.ts';

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

    const today = new Date();
    const formattedDate = `${today.getDate()} / ${today.getMonth() + 1} / ${today.getFullYear()}`;

    useEffect(() => {
        const fetchCategories = async () => {
            try {
                const response = await api.get('/transactions/categories');
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
            } catch (error) {
                console.error('Failed to fetch expenses summary', error);
            }
        };

        fetchCategories();
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

        await api.put('/plans/category_limits/', updatedLimit);

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

    const handleMonthChange = async (e) => {
        const month = e.target.value;
        setSelectedMonth(month);
        const selectedPlan = plans.find(plan => plan.month === parseInt(month));
        if (selectedPlan) {
            setSelectedPlanId(selectedPlan.id);
            const limitsResponse = await api.get(`/plans/${selectedPlan.id}/category_limits`);
            const limits = limitsResponse.data.reduce((acc, limit) => {
                acc[limit.category_id] = limit.limit;
                return acc;
            }, {});
            setBudgetLimits(limits);
        } else {
            setSelectedPlanId(null);
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
                    <label className="block mb-4">
                        Select Month:
                        <select
                            value={selectedMonth}
                            onChange={handleMonthChange}
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
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-6 mb-6">
                        {categories.map((category) => {
                            const limit = budgetLimits[category.id] || 0;
                            const spentAmount = spentAmounts[category.id] || 0;
                            const progress = (spentAmount / limit) * 100;
                            let progressColor = 'text-blue-500';

                            // Determine color based on progress
                            if (progress <= 50) {
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
                                            <circle className={`${progressColor}`} strokeWidth="8" strokeDasharray="251.2" strokeDashoffset={251.2 - (251.2 * (progress / 100))} strokeLinecap="round" stroke="currentColor" fill="transparent" r="40" cx="50" cy="50" />
                                        </svg>
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <span className="text-2xl font-bold text-gray-700">{Math.round(progress)}%</span>
                                        </div>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-sm text-gray-600">{spentAmount} / {limit.toLocaleString()}</p>
                                        <span className="text-xs text-gray-500">of limit</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
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
                </>
            )}
        </div>
    );
};

export default Planning;