import React, { useState, useEffect } from "react";
import api from "../../client/api/client.ts";

const Planning = () => {
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [budgetLimits, setBudgetLimits] = useState({});
  const [spentAmounts, setSpentAmounts] = useState({});
  const [categories, setCategories] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [limit, setLimit] = useState("");
  const [plans, setPlans] = useState([]);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await api.get("/transactions/categories");
        setCategories(response.data.categories);
      } catch (error) {
        console.error("Failed to fetch categories", error);
      }
    };

    const fetchPlans = async () => {
      const currentYear = new Date().getFullYear();
      const response = await api.get(`/plans/?year=${currentYear}`);
      setPlans(response.data);
    };

    fetchCategories();
    fetchPlans();
  }, []);

  const handleMonthChange = async (e) => {
    setSelectedMonth(e.target.value);
    const selectedPlan = plans.find(plan => plan.month === parseInt(e.target.value));
    if (selectedPlan) {
      const response = await api.get(`/api/category_limits?plan_id=${selectedPlan.id}`);
      setBudgetLimits(response.data.reduce((acc, limit) => ({ ...acc, [limit.category_id]: limit.limit }), {}));
    }
  };

  const calculateProgress = (category) => {
    const spent = spentAmounts[category] || 0;
    const limit = budgetLimits[category] || 1; // Prevent division by zero
    return Math.min((spent / limit) * 100, 100);
  };

  const openModal = (category) => {
    setSelectedCategory(category);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setLimit("");
  };

  const handleLimitSubmit = () => {
    setBudgetLimits({
      ...budgetLimits,
      [selectedCategory]: limit,
    });
    closeModal();
  };

  const createPlan = async () => {
    const newPlan = { month: selectedMonth, year: new Date().getFullYear() };
    await api.post('/plans/', newPlan);
    // Fetch plans again to update the state
    const response = await api.get(`/plans/?year=${newPlan.year}`);
    setPlans(response.data);
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
              const progress = calculateProgress(category);
              const limit = budgetLimits[category] || 0;
              const spent = spentAmounts[category] || 0;

              return (
                <div
                  key={category}
                  className="relative group p-6 bg-white rounded-xl shadow-md hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => openModal(category)}
                >
                  <h3 className="text-lg font-medium mb-4 text-center">
                    {category}
                  </h3>

                  {/* Circular Progress Bar */}
                  <div className="relative w-32 h-32 mx-auto mb-4">
                    <svg className="w-full h-full" viewBox="0 0 100 100">
                      <circle
                        className="text-gray-200"
                        strokeWidth="8"
                        stroke="currentColor"
                        fill="transparent"
                        r="40"
                        cx="50"
                        cy="50"
                      />
                      <circle
                        className="text-blue-500"
                        strokeWidth="8"
                        strokeDasharray="251.2"
                        strokeDashoffset={251.2 - (251.2 * progress) / 100}
                        strokeLinecap="round"
                        stroke="currentColor"
                        fill="transparent"
                        r="40"
                        cx="50"
                        cy="50"
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-2xl font-bold text-gray-700">
                        {Math.round(progress)}%
                      </span>
                    </div>
                  </div>

                  <div className="text-center">
                    <p className="text-sm text-gray-600">
                      {spent.toLocaleString()} / {limit.toLocaleString()}
                    </p>
                    <span className="text-xs text-gray-500">of limit</span>
                  </div>
                </div>
              );
            })}
          </div>
          {/* Budget Limit Modal */}
          {isModalOpen && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
              <div className="bg-white p-8 rounded-lg w-[500px] shadow-xl">
                <h2 className="text-xl font-bold mb-6 text-center">
                  Set Budget Limit for {selectedCategory}
                </h2>
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Limit Amount
                  </label>
                  <input
                    type="number"
                    value={limit}
                    onChange={(e) => setLimit(e.target.value)}
                    className="form-input w-full rounded-md border border-gray-300 focus:border-blue-500 focus:ring focus:ring-blue-200"
                    placeholder="Enter limit"
                  />
                </div>
                <div className="flex justify-end space-x-4">
                  <button
                    onClick={closeModal}
                    className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleLimitSubmit}
                    className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                  >
                    Save
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
