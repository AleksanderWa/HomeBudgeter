import React, { useState, useEffect } from 'react';
import api from '../../client/api/client.ts';
import { TrashIcon, PencilIcon, PlusIcon, CheckIcon, XMarkIcon } from '@heroicons/react/24/solid';

const Category = () => {
  const [categories, setCategories] = useState<Array<{ id: string; name: string; user_id: string }>>([]);
  const [newCategory, setNewCategory] = useState('');
  const [editCategory, setEditCategory] = useState({ id: '', name: '' });
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await api.get('/transactions/categories');
      setCategories(response.data.categories);
    } catch (error) {
      console.error('Failed to fetch categories', error);
    }
  };

  const handleAddCategory = async () => {
    if (newCategory.trim() === '') return;
    try {
      await api.post('/transactions/categories', { name: newCategory });
      setNewCategory('');
      fetchCategories();
    } catch (error) {
      console.error('Failed to add category', error);
    }
  };

  const handleEditCategory = async () => {
    if (editCategory.name.trim() === '') return;
    try {
      await api.patch(`/transactions/categories/${editCategory.id}`, { name: editCategory.name });
      setIsEditing(false);
      fetchCategories();
    } catch (error) {
      console.error('Failed to edit category', error);
    }
  };

  const handleDeleteCategory = async (id: string) => {
    try {
      await api.delete(`/transactions/categories/${id}`);
      fetchCategories();
    } catch (error) {
      console.error('Failed to delete category', error);
    }
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-6">Category Settings</h1>
      <div className="mb-6">
        <input
          type="text"
          value={newCategory}
          onChange={(e) => setNewCategory(e.target.value)}
          placeholder="New Category"
          className="form-input w-full rounded-md border border-gray-300 focus:border-blue-500 focus:ring focus:ring-blue-200"
        />
        <button
          onClick={handleAddCategory}
          className="mt-2 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md flex items-center"
        >
          <PlusIcon className="w-6 h-6 mr-1" />
          Add Category
        </button>
      </div>
      <div>
      {categories.map((category) => (
  <div key={category.id} className="flex items-center justify-between p-2 border-b border-gray-200">
    {isEditing && editCategory.id === category.id ? (
      <input
        type="text"
        value={editCategory.name}
        onChange={(e) => setEditCategory({ ...editCategory, name: e.target.value })}
        className="form-input w-full rounded-md border border-gray-300 focus:border-blue-500 focus:ring focus:ring-blue-200"
      />
    ) : (
      <span>{category.name}</span>
    )}
    <div className="flex space-x-2">
      {isEditing && editCategory.id === category.id ? (
        <>
          <button onClick={handleEditCategory} className="text-green-500 hover:text-green-700 font-bold">
            <CheckIcon className="w-6 h-6" />
          </button>
          <button onClick={() => setIsEditing(false)} className="text-red-500 hover:text-red-700 font-bold">
            <XMarkIcon className="w-6 h-6" />
          </button>
        </>
      ) : (
        <button
          onClick={() => {
            setEditCategory({ id: category.id, name: category.name });
            setIsEditing(true);
          }}
          className="text-blue-500 hover:text-blue-700"
        >
          <PencilIcon className="w-5 h-5" />
        </button>
      )}
      {!isEditing && (
        <button onClick={() => handleDeleteCategory(category.id)} className="text-red-500 hover:text-red-700">
          <TrashIcon className="w-5 h-5" />
        </button>
      )}
    </div>
  </div>
        ))}
      </div>
    </div>
  );
};

export default Category;