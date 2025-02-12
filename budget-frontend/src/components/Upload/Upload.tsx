import React, { useState, useRef, useEffect } from 'react'
import api from '../../client/api/client.ts'
import { useAuth } from '../../contexts/AuthContext.tsx'

export default function Upload() {
  const [file, setFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { isAuthenticated, user } = useAuth()

  useEffect(() => {
    console.log('Upload Component - Authentication State:', {
      isAuthenticated,
      user: user ? user.username : 'No user'
    })
  }, [isAuthenticated, user])

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    console.log('File input change event triggered')
    console.log('Event target:', event.target)
    console.log('Files in input:', event.target.files)

    const selectedFile = event.target.files?.[0]
    
    console.log('Selected file details:', {
      name: selectedFile?.name,
      type: selectedFile?.type,
      size: selectedFile?.size
    })

    setError(null)
    setSuccess(false)

    if (!selectedFile) {
      console.warn('No file selected')
      return
    }

    // Check if file is CSV
    if (!selectedFile.name.endsWith('.csv')) {
      console.warn('Invalid file type')
      setError('Please upload a CSV file')
      return
    }

    setFile(selectedFile)
    console.log('File state updated successfully')
  }

  const triggerFileInput = () => {
    console.log('Triggering file input manually')
    fileInputRef.current?.click()
  }

  const handleUpload = async (event: React.FormEvent) => {
    event.preventDefault()
    
    console.log('Upload button clicked')
    console.log('Current file:', file)
    console.log('Is uploading:', isUploading)
    
    if (!file) {
      setError('Please select a file')
      console.warn('No file to upload')
      return
    }

    setIsUploading(true)
    setError(null)
    
    const formData = new FormData()
    formData.append('file', file)

    try {
      console.log('Attempting to upload file')
      await api.put('/transactions/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })
      setSuccess(true)
      setFile(null)
      
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
      
      console.log('File uploaded successfully')
    } catch (err: any) {
      console.error('Upload error:', err)
      setError(err.response?.data?.detail || 'Error uploading file')
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Upload Expenses</h1>
      
      <div className="max-w-md mx-auto bg-white rounded-lg shadow-sm p-6">
        <form onSubmit={handleUpload} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Upload CSV File
            </label>
            <div 
              className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md"
              onClick={triggerFileInput}
            >
              <div className="space-y-1 text-center">
                <svg
                  className="mx-auto h-12 w-12 text-gray-400"
                  stroke="currentColor"
                  fill="none"
                  viewBox="0 0 48 48"
                  aria-hidden="true"
                >
                  <path
                    d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <div className="flex text-sm text-gray-600">
                  <label
                    htmlFor="file-upload"
                    className="relative cursor-pointer bg-white rounded-md font-medium text-primary hover:text-primary-dark focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-primary"
                  >
                    <span>Upload a file</span>
                    <input
                      ref={fileInputRef}
                      id="file-upload"
                      name="file-upload"
                      type="file"
                      accept=".csv"
                      className="sr-only"
                      onChange={handleFileChange}
                    />
                  </label>
                  <p className="pl-1">or drag and drop</p>
                </div>
                <p className="text-xs text-gray-500">CSV files only</p>
              </div>
            </div>
          </div>

          {file && (
            <div className="text-sm text-gray-600 mb-4 p-2 bg-gray-100 rounded">
              <strong>Selected file:</strong> {file.name}
            </div>
          )}

          {error && (
            <div className="text-sm text-red-600 bg-red-50 p-2 rounded mb-4">
              {error}
            </div>
          )}

          {success && (
            <div className="text-sm text-green-600 bg-green-50 p-2 rounded mb-4">
              File uploaded successfully!
            </div>
          )}

          <button
            type="submit"
            disabled={!file || isUploading}
            className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white 
              ${isUploading 
                ? 'bg-gray-400 cursor-not-allowed' 
                : (file 
                  ? 'bg-blue-400'
                  : 'bg-gray-400 cursor-not-allowed')
              }`}
          >
            {isUploading ? 'Uploading...' : 'Upload'}
          </button>
        </form>
      </div>
    </div>
  )
}