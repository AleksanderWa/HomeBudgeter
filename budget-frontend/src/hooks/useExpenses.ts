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

  const fetchExpenses = async (page = 1, pageSize = 100, month?: number, year?: number) => {
    setLoading(true)
    try {
      const response = await api.get<PaginatedExpenses>('/transactions', { 
        params: { 
          page, 
          page_size: pageSize,
          month,
          year
        } 
      })
      
      setExpenses(response.data.transactions)
      setPagination({
        page: response.data.page,
        pageSize: response.data.page_size,
        totalTransactions: response.data.total_transactions,
        totalPages: response.data.total_pages
      })
    } catch (err) {
      setError('Failed to fetch expenses')
      setExpenses([])
    } finally {
      setLoading(false)
    }
  }

  const handleTransactionsUpdated = useCallback((event: CustomEvent) => {
    const { transactions } = event.detail;
    setExpenses(transactions);
  }, []);

  useEffect(() => {
    // Get current month and year for default filtering
    const now = new Date();
    const currentMonth = now.getMonth() + 1; // 1-12
    const currentYear = now.getFullYear();
    
    // Default to showing current month's transactions
    fetchExpenses(1, 100, currentMonth, currentYear);

    // Add event listener for transaction updates
    window.addEventListener('transactionsUpdated', handleTransactionsUpdated as EventListener);

    // Cleanup listener
    return () => {
      window.removeEventListener('transactionsUpdated', handleTransactionsUpdated as EventListener);
    }
  }, [handleTransactionsUpdated])

  return { 
    expenses, 
    loading, 
    error, 
    pagination,
    refresh: fetchExpenses 
  }
}