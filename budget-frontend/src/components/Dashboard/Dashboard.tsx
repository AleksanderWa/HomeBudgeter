import React, { useState, useMemo } from 'react'
import ExpenseChart from './ExpenseChart.tsx'
import ExpenseList from './ExpenseList.tsx'
import useExpenses from '../../hooks/useExpenses.ts'
import Loader from '../UI/Loader.tsx'
import { useAuth } from '../../contexts/AuthContext.tsx'

export default function Dashboard() {
  const { expenses, loading } = useExpenses()
  const { isAuthenticated } = useAuth()
  console.log('Dashboard Auth state:', isAuthenticated)
  
  const [excludeIncome, setExcludeIncome] = useState(false)
  const [topLimit, setTopLimit] = useState(5)
  
  // New state for year and month filtering
  const [selectedYear, setSelectedYear] = useState<number | null>(null)
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null)

  // Get unique years from expenses
  const availableYears = useMemo(() => {
    return Array.from(new Set(
      expenses.map(expense => new Date(expense.operation_date).getFullYear())
    )).sort((a, b) => b - a)
  }, [expenses])

  // Filter expenses by year and month
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
      const categoryName = expense.category.name || 'Uncategorized'
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
      .sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount))
      .slice(0, topLimit)
  , [chartData, topLimit])

  // Filtered transactions based on top categories
  const topCategoryTransactions = useMemo(() => {
    const topCategories = new Set(chartDataArray.map(item => item.category))
    return filteredExpenses.filter(expense => 
      topCategories.has(expense.category.name)
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
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>

      {loading ? (
        <Loader />
      ) : (
        <div className="space-y-6">
          {/* Filtering controls */}
          <div className="flex space-x-4 mb-4">
            <select 
              value={selectedYear || ''} 
              onChange={handleYearChange}
              className="p-2 border rounded"
            >
              <option value="">All Years</option>
              {availableYears.map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>

            <select 
              value={selectedMonth || ''} 
              onChange={(e) => {
                const month = parseInt(e.target.value, 10)
                setSelectedMonth(!isNaN(month) && month >= 1 && month <= 12 ? month : null)
              }}
              disabled={selectedYear === null}
              className={`p-2 border rounded ${selectedYear === null ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <option value="">All Months</option>
              {[...Array(12)].map((_, index) => (
                <option key={index + 1} value={index + 1}>
                  {new Date(0, index).toLocaleString('default', { month: 'long' })}
                </option>
              ))}
            </select>
          </div>

          <div className="w-full max-w-4xl mx-auto">
            <ExpenseChart
              data={chartDataArray}
              excludeIncome={excludeIncome}
              onExcludeIncome={() => setExcludeIncome(!excludeIncome)}
              topLimit={topLimit}
              onLimitChange={setTopLimit}
              className="h-[500px] w-full"
            />
          </div>

          <div className="w-full max-w-4xl mx-auto">
            <h2 className="text-xl font-semibold mb-4">
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