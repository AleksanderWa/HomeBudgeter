import React, { useState, useEffect } from 'react';
import api from '../../client/api/client.ts';
import { TrashIcon, PencilIcon, PlusIcon, CheckIcon, XMarkIcon } from '@heroicons/react/24/solid';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import { useSortable, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';

function arrayMove(array, from, to) {
  const newArray = array.slice();
  const [removed] = newArray.splice(from, 1);
  newArray.splice(to, 0, removed);
  return newArray;
}

interface MainCategory {
  id: string;
  name: string;
  user_id: string;
  position?: number;
}

function SortableItem({ mainCategory, isEditing, editMainCategory, setEditMainCategory, setIsEditing, handleEditMainCategory, handleDeleteMainCategory }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: mainCategory.id });
  
  const style = {
    transform: CSS.Transform?.toString(transform) || '',
    transition,
  };
  
  return (
    <div ref={setNodeRef} style={style} className="flex items-center justify-between p-3 border-b border-gray-200 bg-white rounded-md mb-2 shadow-sm cursor-move">
      <div className="flex items-center w-full" {...attributes} {...listeners}>
        <div className="mr-2">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" className="text-gray-400">
            <path d="M4 8a1 1 0 1 1-2 0 1 1 0 0 1 2 0zm0-4a1 1 0 1 1-2 0 1 1 0 0 1 2 0zm0 8a1 1 0 1 1-2 0 1 1 0 0 1 2 0zm6-4a1 1 0 1 1-2 0 1 1 0 0 1 2 0zm0-4a1 1 0 1 1-2 0 1 1 0 0 1 2 0zm0 8a1 1 0 1 1-2 0 1 1 0 0 1 2 0z" />
          </svg>
        </div>
        {isEditing && editMainCategory.id === mainCategory.id ? (
          <input
            type="text"
            value={editMainCategory.name}
            onChange={(e) => setEditMainCategory({ ...editMainCategory, name: e.target.value })}
            className="form-input w-full rounded-md border border-gray-300 focus:border-blue-500 focus:ring focus:ring-blue-200"
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span className="flex-1">{mainCategory.name}</span>
        )}
      </div>
      <div className="flex space-x-2" onClick={(e) => e.stopPropagation()}>
        {isEditing && editMainCategory.id === mainCategory.id ? (
          <>
            <button onClick={handleEditMainCategory} className="text-green-500 hover:text-green-700 font-bold">
              <CheckIcon className="w-6 h-6" />
            </button>
            <button onClick={() => setIsEditing(false)} className="text-red-500 hover:text-red-700 font-bold">
              <XMarkIcon className="w-6 h-6" />
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => {
                setEditMainCategory({ id: mainCategory.id, name: mainCategory.name });
                setIsEditing(true);
              }}
              className="text-blue-500 hover:text-blue-700"
            >
              <PencilIcon className="w-5 h-5" />
            </button>
            <button onClick={() => handleDeleteMainCategory(mainCategory.id)} className="text-red-500 hover:text-red-700">
              <TrashIcon className="w-5 h-5" />
            </button>
          </>
        )}
      </div>
    </div>
  );
}

const MainCategoryManagement = () => {
  const [mainCategories, setMainCategories] = useState<MainCategory[]>([]);
  const [newMainCategory, setNewMainCategory] = useState('');
  const [editMainCategory, setEditMainCategory] = useState<{ id: string; name: string }>({ id: '', name: '' });
  const [isEditing, setIsEditing] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    fetchMainCategories();
  }, []);

  const fetchMainCategories = async () => {
    try {
      const response = await api.get('/transactions/main-categories');
      const categoriesWithPosition = response.data.main_categories.map((cat, index) => ({
        ...cat,
        position: index
      }));
      setMainCategories(categoriesWithPosition);
    } catch (error) {
      console.error('Failed to fetch main categories', error);
    }
  };

  const handleAddMainCategory = async () => {
    if (newMainCategory.trim() === '') return;
    try {
      await api.post('/transactions/main-categories', { 
        name: newMainCategory,
        position: mainCategories.length
      });
      setNewMainCategory('');
      fetchMainCategories();
    } catch (error) {
      console.error('Failed to add main category', error);
    }
  };

  const handleEditMainCategory = async () => {
    if (editMainCategory.name.trim() === '') return;
    try {
      await api.patch(`/transactions/main-categories/${editMainCategory.id}`, { name: editMainCategory.name });
      setIsEditing(false);
      fetchMainCategories();
    } catch (error) {
      console.error('Failed to edit main category', error);
    }
  };

  const handleDeleteMainCategory = async (id: string) => {
    try {
      await api.delete(`/transactions/main-categories/${id}`);
      fetchMainCategories();
    } catch (error) {
      console.error('Failed to delete main category', error);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (active.id !== over?.id && over) {
      setMainCategories((items) => {
        const oldIndex = items.findIndex(item => item.id === active.id);
        const newIndex = items.findIndex(item => item.id === over.id);
        
        const newOrder = arrayMove(items, oldIndex, newIndex);
        
        // Update positions based on new order
        const updatedOrder = newOrder.map((item, index) => ({
          ...item,
          position: index
        }));
        
        // Send the updated order to the backend
        updateCategoryPositions(updatedOrder);
        
        return updatedOrder;
      });
    }
  };
  
  const updateCategoryPositions = async (categories: MainCategory[]) => {
    try {
      const positionUpdates = categories.map((category, index) => ({
        id: category.id,
        position: index
      }));
      
      await api.put('/api/transactions/main-categories/positions', { positions: positionUpdates });
    } catch (error) {
      console.error('Failed to update category positions', error);
    }
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-6">Main Category Settings</h1>
      <div className="mb-6">
        <input
          type="text"
          value={newMainCategory}
          onChange={(e) => setNewMainCategory(e.target.value)}
          placeholder="New Main Category"
          className="form-input w-full rounded-md border border-gray-300 focus:border-blue-500 focus:ring focus:ring-blue-200"
        />
        <button
          onClick={handleAddMainCategory}
          className="mt-3 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md flex items-center justify-center shadow-sm transition-all duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
        >
          <PlusIcon className="w-5 h-5 mr-2" />
          <span className="font-medium">Add Main Category</span>
        </button>
      </div>
      
      <p className="text-sm text-gray-500 mb-3">Drag and drop to reorder categories</p>
      
      <DndContext 
        sensors={sensors} 
        collisionDetection={closestCenter} 
        onDragEnd={handleDragEnd}
        modifiers={[restrictToVerticalAxis]}
      >
        <SortableContext items={mainCategories.map(cat => cat.id)} strategy={verticalListSortingStrategy}>
          {mainCategories.map((mainCategory) => (
            <SortableItem 
              key={mainCategory.id}
              mainCategory={mainCategory}
              isEditing={isEditing}
              editMainCategory={editMainCategory}
              setEditMainCategory={setEditMainCategory}
              setIsEditing={setIsEditing}
              handleEditMainCategory={handleEditMainCategory}
              handleDeleteMainCategory={handleDeleteMainCategory}
            />
          ))}
        </SortableContext>
      </DndContext>
    </div>
  );
};

export default MainCategoryManagement; 