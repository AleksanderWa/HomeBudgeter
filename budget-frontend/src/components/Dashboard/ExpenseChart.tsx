import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { ChevronUpDownIcon } from '@heroicons/react/24/outline'

interface ChartProps {
  data: Array<{
    category: string
    amount: number
  }>
  excludeIncome: boolean
  onExcludeIncome: () => void
  topLimit: number
  onLimitChange: (limit: number) => void
}

export default function ExpenseChart({
  data,
  excludeIncome,
  onExcludeIncome,
  topLimit,
  onLimitChange
}: ChartProps) {
  const processedData = data
    .filter(d => excludeIncome ? d.amount < 0 : true)
    .slice(0, topLimit)

  return (
    <div className="bg-white p-4 rounded-lg shadow-sm mb-4">
      <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-4">
        <h3 className="text-lg font-semibold">Expense Analysis</h3>
        <div className="flex flex-col sm:flex-row gap-4 items-center w-full sm:w-auto">
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={excludeIncome}
              onChange={onExcludeIncome}
              className="form-checkbox h-4 w-4"
            />
            <span className="text-sm">Exclude Income</span>
          </label>
          <div className="relative w-full sm:w-48">
            <select
              value={topLimit}
              onChange={(e) => onLimitChange(Number(e.target.value))}
              className="block appearance-none w-full bg-white border border-gray-300 rounded-md py-2 pl-3 pr-8 text-sm focus:outline-none focus:border-primary"
            >
              <option value={5}>Top 5 Categories</option>
              <option value={10}>Top 10 Categories</option>
              <option value={0}>All Categories</option>
            </select>
            <ChevronUpDownIcon className="w-4 h-4 absolute right-3 top-3 text-gray-400" />
          </div>
        </div>
      </div>

      <div className="h-64 sm:h-96">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={processedData}>
            <XAxis dataKey="category" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="amount" fill="#3B82F6" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}