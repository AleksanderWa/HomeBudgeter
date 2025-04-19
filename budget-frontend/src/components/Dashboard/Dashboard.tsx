import React, { useState, useMemo, useEffect } from 'react'
import ExpenseChart from './ExpenseChart.tsx'
import ExpenseList from './ExpenseList.tsx'
import useExpenses from '../../hooks/useExpenses.ts'
import Loader from '../UI/Loader.tsx'
import { useAuth } from '../../contexts/AuthContext.tsx'
import api from '../../client/api/client.ts';
import { useNavigate } from 'react-router-dom';
import { 
  HomeIcon, 
  InformationCircleIcon, 
  ChartPieIcon, 
  ListBulletIcon, 
  AdjustmentsHorizontalIcon,
  CurrencyDollarIcon 
} from '@heroicons/react/24/outline';

const DashboardSummary = () => {
  const [plannedAmount, setPlannedAmount] = useState(0);
  const [spentAmount, setSpentAmount] = useState(0);
  const [totalSavings, setTotalSavings] = useState(0);
  const [spentToday, setSpentToday] = useState(0);
  const [spentThisMonth, setSpentThisMonth] = useState(0);
  const [spentThisYear, setSpentThisYear] = useState(0);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const navigate = useNavigate();

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const currentMonthSavings = plannedAmount - spentAmount;

  useEffect(() => {
    api.onUnauthorized = () => navigate('/login');

    const fetchData = async () => {
      try {
        const response = await api.get(`/transactions/dashboard_summary/?month=${month}`);
        setPlannedAmount(response.data.planned_amount);
        setSpentAmount(response.data.spent_amount);
        setTotalSavings(response.data.total_savings);
        setSpentToday(response.data.spent_today);
        setSpentThisMonth(response.data.spent_this_month);
        setSpentThisYear(response.data.spent_this_year);
      } catch (error) {
        console.error('Failed to fetch data', error);
      }
    };

    fetchData();
  }, [month, navigate]);

  return (
    <div className="p-4 bg-white rounded-lg shadow-md">
      <h2 className="text-xl font-bold mb-4 flex items-center text-indigo-700">
        <InformationCircleIcon className="w-6 h-6 mr-2 text-indigo-500" />
        Dashboard Summary
      </h2>

      {/* Spending Overview - Label removed */}
      <div className="mb-4 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-indigo-100">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="p-2 bg-white rounded shadow-sm">
            <p className="text-xs text-gray-500 mb-1">TODAY</p>
            <p className="text-lg font-bold text-gray-800">
              {spentToday.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
            </p>
          </div>
          <div className="p-2 bg-white rounded shadow-sm">
            <p className="text-xs text-gray-500 mb-1">THIS MONTH</p>
            <p className="text-lg font-bold text-gray-800">
              {spentThisMonth.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
            </p>
          </div>
          <div className="p-2 bg-white rounded shadow-sm">
            <p className="text-xs text-gray-500 mb-1">THIS YEAR</p>
            <p className="text-lg font-bold text-gray-800">
              {spentThisYear.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
            </p>
          </div>
        </div>
      </div>
      
      {/* Original summary information */}
      <div className="mt-2 pt-2 border-t border-gray-200">
        <div className="mt-3 p-4 bg-white rounded-lg border border-gray-200 shadow-sm">
          <p className="text-base">
            This {monthNames[month - 1]} you planned <span className="text-xl font-bold text-blue-700">{plannedAmount.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</span> and already spent <span className="text-xl font-bold text-red-600">{spentAmount.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</span>
          </p>
          <p className="mt-2 text-base">
            Savings this month: <span className={`text-xl font-bold ${currentMonthSavings >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {currentMonthSavings.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
            </span>
          </p>
          {/* <p>Total savings this year: <span className="font-semibold">{totalSavings.toLocaleString()}</span></p> */}
        </div>
      </div>
    </div>
  );
};

export default function Dashboard() {
  const { expenses, loading, refresh } = useExpenses()
  const { isAuthenticated } = useAuth()
  
  const [excludeIncome, setExcludeIncome] = useState(false)
  const [topLimit, setTopLimit] = useState(5)
  
  // Set current year and month as default values instead of null
  const currentDate = new Date()
  const [selectedYear, setSelectedYear] = useState<number>(currentDate.getFullYear())
  const [selectedMonth, setSelectedMonth] = useState<number>(currentDate.getMonth() + 1)
  // Track if we need to manually refresh
  const [shouldRefresh, setShouldRefresh] = useState(false)

  const navigate = useNavigate();

  useEffect(() => {
    api.onUnauthorized = () => navigate('/login');
  }, [navigate]);

  // Get unique years from expenses
  const availableYears = useMemo(() => {
    return Array.from(new Set(
      expenses.map(expense => new Date(expense.operation_date).getFullYear())
    )).sort((a, b) => Number(b) - Number(a))
  }, [expenses])

  // Only refresh when shouldRefresh is true
  useEffect(() => {
    if (shouldRefresh) {
      refresh(1, 100, selectedMonth, selectedYear);
      setShouldRefresh(false);
    }
  }, [shouldRefresh, selectedMonth, selectedYear, refresh]);
  
  // Initial data load
  useEffect(() => {
    // Fetch data on initial mount
    refresh(1, 100, selectedMonth, selectedYear);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  // Filter expenses by year and month - this client-side filtering is still useful
  // in case the API returns more data than just the current selection
  const filteredExpenses = useMemo(() => {
    return expenses.filter(expense => {
      const expenseDate = new Date(expense.operation_date)
      const yearMatch = !selectedYear || expenseDate.getFullYear() === selectedYear
      const monthMatch = !selectedMonth || expenseDate.getMonth() + 1 === selectedMonth
      return yearMatch && monthMatch
    })
  }, [expenses, selectedYear, selectedMonth])

  // Process data for chart and top categories
  const chartData = useMemo(() => {
    return filteredExpenses.reduce((acc, expense) => {
      const categoryName = expense.category?.name || 'Uncategorized'
      if (!acc[categoryName]) {
        acc[categoryName] = 0
      }
      acc[categoryName] += expense.amount
      return acc
    }, {} as Record<string, number>)
  }, [filteredExpenses])

  const chartDataArray = useMemo(() => 
    Object.entries(chartData)
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => Math.abs(Number(b.amount)) - Math.abs(Number(a.amount)))
      .slice(0, topLimit)
  , [chartData, topLimit])

  // Filtered transactions based on top categories
  const topCategoryTransactions = useMemo(() => {
    const topCategories = new Set(chartDataArray.map(item => item.category))
    return filteredExpenses.filter(expense => 
      topCategories.has(expense.category?.name || 'Uncategorized')
    )
  }, [filteredExpenses, chartDataArray])

  // Update year selection to reset month when all years are selected
  const handleYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const year = parseInt(e.target.value, 10)
    setSelectedYear(!isNaN(year) ? year : null)
    
    // Reset month when switching to all years
    if (isNaN(year)) {
      setSelectedMonth(null)
    }
    // Mark that we need to refresh data
    setShouldRefresh(true);
  }
  
  // Update month selection and trigger refresh
  const handleMonthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const month = parseInt(e.target.value, 10)
    setSelectedMonth(!isNaN(month) && month >= 1 && month <= 12 ? month : null)
    // Mark that we need to refresh data
    setShouldRefresh(true);
  }

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  return (
    <div className="container mx-auto p-4">
      {/* Remove icon temporarily to test layout */}
      <h1 className="text-2xl font-bold mb-6 flex items-center">
        <HomeIcon className="w-6 h-6 mr-2 text-indigo-600" />
        Dashboard
      </h1>

      {/* Main content area */}
      {loading ? (
        <Loader />
      ) : (
        <div className="space-y-6">
          {/* Dashboard Summary - Moved to the top */}
          <DashboardSummary />

          {/* Filtering controls - Moved below summary */}
          <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
             <h3 className="text-lg font-semibold mb-3 text-gray-700 flex items-center">
               <AdjustmentsHorizontalIcon className="w-6 h-6 mr-2 text-gray-500"/>
               Filter Period
             </h3>
             <div className="flex space-x-4">
              <select 
                value={selectedYear || ''} 
                onChange={handleYearChange}
                className="p-2 border rounded text-sm flex-1 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="">All Years</option>
                {availableYears.map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>

              <select 
                value={selectedMonth || ''} 
                onChange={handleMonthChange}
                disabled={selectedYear === null}
                className={`p-2 border rounded text-sm flex-1 focus:ring-indigo-500 focus:border-indigo-500 ${selectedYear === null ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <option value="">All Months</option>
                {[...Array(12)].map((_, index) => (
                  <option key={index + 1} value={index + 1}>
                    {monthNames[index]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="w-full max-w-4xl mx-auto bg-white p-4 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-4 flex items-center">
               <ChartPieIcon className="w-6 h-6 mr-2 text-purple-500" />
               Expense Distribution
            </h2>
            <ExpenseChart
              data={chartDataArray}
              excludeIncome={excludeIncome}
              onExcludeIncome={() => setExcludeIncome(!excludeIncome)}
              topLimit={topLimit}
              onLimitChange={setTopLimit}
              className="h-[500px] w-full"
            />
          </div>

          <div className="w-full max-w-4xl mx-auto bg-white p-4 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-4 flex items-center">
              <ListBulletIcon className="w-6 h-6 mr-2 text-teal-500" />
              Top {topLimit} Categories Transactions
            </h2>
            <ExpenseList 
              expenses={topCategoryTransactions} 
              hideFilters={true}
            />
          </div>
        </div>
      )}
    </div>
  )
}