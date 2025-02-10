import { useState, useEffect } from 'react'
import api from '../client/api/client.ts'

interface Expense {
  id: string
  date: string
  description: string
  category: string
  amount: number
}

export default function useExpenses() {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const fetchExpenses = async () => {
    setLoading(true)
    try {
      const response = await api.get('/transactions')
      setExpenses(response.data)
    } catch (err) {
      setError('Failed to fetch expenses')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchExpenses()
  }, [])

  return { expenses, loading, error, refresh: fetchExpenses }
}