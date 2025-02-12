import { useState, useEffect } from 'react'
import api from '../client/api/client.ts'

interface Expense {
  id: string
  operation_date: string
  description: string
  category: string
  amount: number
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

  const fetchExpenses = async (page = 1, pageSize = 100) => {
    setLoading(true)
    try {
      const response = await api.get<PaginatedExpenses>('/transactions', { 
        params: { page, page_size: pageSize } 
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

  useEffect(() => {
    fetchExpenses()
  }, [])

  return { 
    expenses, 
    loading, 
    error, 
    pagination,
    refresh: fetchExpenses 
  }
}