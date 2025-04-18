import { useState, useEffect, useCallback } from 'react'
import api from '../client/api/client.ts'

interface Category {
  id: number
  name: string
  user_id: number
}

interface Expense {
  id: string
  operation_date: string
  description: string
  category: Category
  amount: number
  account: string
}

interface PaginatedExpenses {
  transactions: Expense[]
  page: number
  page_size: number
  total_transactions: number
  total_pages: number
}

export default function useExpenses() {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 100,
    totalTransactions: 0,
    totalPages: 0
  })

  // Wrap fetchExpenses in useCallback to ensure stable function reference
  const fetchExpenses = useCallback(async (page = 1, pageSize = 100, month?: number, year?: number, startDate?: string, endDate?: string) => {
    setLoading(true)
    setError(''); // Clear previous errors
    const params: Record<string, any> = {
      page,
      page_size: pageSize,
    };
    
    // Prioritize start/end date over month/year
    if (startDate) {
      params.start_date = startDate;
    }
    if (endDate) {
      params.end_date = endDate;
    }
    // Only add month/year if start/end date are not provided
    if (!startDate && !endDate) {
      if (month !== undefined) params.month = month;
      if (year !== undefined) params.year = year;
    }
    
    try {
      const response = await api.get<PaginatedExpenses>('/transactions', { params })
      
      setExpenses(response.data.transactions)
      setPagination({
        page: response.data.page,
        pageSize: response.data.page_size,
        totalTransactions: response.data.total_transactions,
        totalPages: response.data.total_pages
      })
    } catch (err) {
      console.error('Failed to fetch expenses:', err); // Log the actual error
      setError('Failed to fetch expenses')
      setExpenses([]) // Clear expenses on error
    } finally {
      setLoading(false)
    }
  }, []); // Empty dependency array ensures the function reference is stable

  const handleTransactionsUpdated = useCallback((event: CustomEvent) => {
    const { transactions } = event.detail;
    setExpenses(transactions);
  }, []);

  useEffect(() => {
    // Initial fetch logic is removed - components using the hook will trigger the initial fetch.
    // Add event listener for transaction updates
    window.addEventListener('transactionsUpdated', handleTransactionsUpdated as EventListener);

    // Cleanup listener
    return () => {
      window.removeEventListener('transactionsUpdated', handleTransactionsUpdated as EventListener);
    }
  }, [handleTransactionsUpdated]) // Removed fetchExpenses from dependencies

  return { 
    expenses, 
    loading, 
    error, 
    pagination,
    refresh: fetchExpenses // Return the memoized function
  }
}