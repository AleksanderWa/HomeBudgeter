import React from 'react'

interface TableProps {
    columns: string[]
    data: Array<Record<string, any>>
    renderRow: (item: any) => React.ReactNode
  }
  
  export default function ResponsiveTable({ columns, data, renderRow }: TableProps) {
    return (
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="text-left text-sm border-b">
              {columns.map((col) => (
                <th key={col} className="p-2">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((item, index) => (
              <tr key={index} className="border-b hover:bg-gray-50">
                {renderRow(item)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }