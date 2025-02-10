import React, { useState } from 'react'
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

  // Process data for chart
  const chartData = expenses.reduce((acc, expense) => {
    const category = expense.category || 'Uncategorized'
    if (!acc[category]) {
      acc[category] = 0
    }
    acc[category] += expense.amount
    return acc
  }, {} as Record<string, number>)

  const chartDataArray = Object.entries(chartData).map(([category, amount]) => ({
    category,
    amount: amount as number
  }))

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>

      {loading ? (
        <Loader />
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <ExpenseChart
                data={chartDataArray}
                excludeIncome={excludeIncome}
                onExcludeIncome={() => setExcludeIncome(!excludeIncome)}
                topLimit={topLimit}
                onLimitChange={setTopLimit}
              />
            </div>
            <div>
              <ExpenseList expenses={expenses} />
            </div>
          </div>
        </>
      )}
    </div>
  )
}