import React from 'react'

import { useState } from 'react'
import DatePicker from 'react-datepicker'
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline'

interface FiltersProps {
  onDateChange: (start: Date | null, end: Date | null) => void
  onSearch: (term: string) => void
}

export default function Filters({ onDateChange, onSearch }: FiltersProps) {
  const [startDate, setStartDate] = useState<Date | null>(null)
  const [endDate, setEndDate] = useState<Date | null>(null)
  const [searchTerm, setSearchTerm] = useState('')

  const handleDateChange = (dates: [Date | null, Date | null]) => {
    const [start, end] = dates
    setStartDate(start)
    setEndDate(end)
    onDateChange(start, end)
  }

  return (
    <div className="flex flex-col sm:flex-row gap-4 mb-4">
      <div className="flex items-center gap-2 flex-1">
        <DatePicker
          selected={startDate}
          onChange={(dates: [Date | null, Date | null], event?: any) => {
            handleDateChange(dates);
          }}
          startDate={startDate}
          endDate={endDate}
          selectsRange
          placeholderText="Select date range"
          className="form-input w-full rounded-md text-sm"
          isClearable
          dateFormat="MM/dd/yyyy"
          icon={null}
        />
      </div>
      <div className="relative flex-1">
        <input
          type="text"
          placeholder="Search transactions..."
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value)
            onSearch(e.target.value)
          }}
          className="form-input w-full pl-8 rounded-md text-sm"
        />
        <MagnifyingGlassIcon className="w-4 h-4 absolute left-2 top-3 text-gray-400" />
      </div>
    </div>
  )
}