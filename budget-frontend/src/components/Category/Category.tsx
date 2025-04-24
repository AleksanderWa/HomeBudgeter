import React, { useState, useEffect } from 'react';
import api from '../../client/api/client.ts';
import { TrashIcon, PencilIcon, PlusIcon, CheckIcon, XMarkIcon } from '@heroicons/react/24/solid';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent, DragOverlay } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { restrictToVerticalAxis, restrictToWindowEdges } from '@dnd-kit/modifiers';
import { useSortable, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import { Tab } from '@headlessui/react';
import { MagnifyingGlassIcon } from '@heroicons/react/24/solid';

// Helper function for conditional class names
const classNames = (...classes: string[]) => {
  return classes.filter(Boolean).join(' ');
};

function arrayMove(array, from, to) {
  const newArray = array.slice();
  const [removed] = newArray.splice(from, 1);
  newArray.splice(to, 0, removed);
  return newArray;
}

interface Category {
  id: string;
  name: string;
  user_id: string;
  main_categories: number[];
}

interface MainCategory {
  id: string;
  name: string;
  user_id: string;
  position?: number;
  categories: Category[];
}

// Add global style for the pulse animation
const GlobalStyle = () => {
  useEffect(() => {
    // Add style element to head if it doesn't exist
    if (!document.getElementById('category-assignment-styles')) {
      const styleEl = document.createElement('style');
      styleEl.id = 'category-assignment-styles';
      styleEl.textContent = `
        @keyframes pulse {
          0% { box-shadow: 0 0 0 0 rgba(79, 70, 229, 0.7); }
          70% { box-shadow: 0 0 0 6px rgba(79, 70, 229, 0); }
          100% { box-shadow: 0 0 0 0 rgba(79, 70, 229, 0); }
        }
        
        .pulse-animation {
          animation: pulse 1.5s infinite;
        }
      `;
      document.head.appendChild(styleEl);
    }
    
    // Clean up on unmount
    return () => {
      const styleEl = document.getElementById('category-assignment-styles');
      if (styleEl) {
        document.head.removeChild(styleEl);
      }
    };
  }, []);
  
  return null;
};

// SortableItem component for main categories
function SortableItem({ mainCategory, isEditing, editMainCategory, setEditMainCategory, setIsEditing, handleEditMainCategory, handleDeleteMainCategory }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: mainCategory.id });
  
  const style = {
    transform: CSS.Transform?.toString(transform) || '',
    transition,
  };
  
  return (
    <div ref={setNodeRef} style={style} className="flex items-center justify-between p-4 border-b border-gray-200 bg-white rounded-md mb-3 shadow-sm cursor-move">
      <div className="flex items-center w-full" {...attributes} {...listeners}>
        <div className="mr-3">
          <svg width="20" height="20" viewBox="0 0 16 16" fill="currentColor" className="text-gray-400">
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
          <span className="flex-1 text-base">{mainCategory.name}</span>
        )}
      </div>
      <div onClick={(e) => e.stopPropagation()}>
        {isEditing && editMainCategory.id === mainCategory.id ? (
          <div className="flex flex-col space-y-2">
            <button 
              onClick={handleEditMainCategory} 
              className="flex items-center justify-center px-2 py-1 rounded-md text-sm font-medium text-green-600 bg-green-100 hover:bg-green-200 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-1"
            >
              <CheckIcon className="w-4 h-4 mr-1" />
              <span>Save</span>
            </button>
            <button 
              onClick={() => setIsEditing(false)} 
              className="flex items-center justify-center px-2 py-1 rounded-md text-sm font-medium text-red-600 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1"
            >
              <XMarkIcon className="w-4 h-4 mr-1" />
              <span>Cancel</span>
            </button>
          </div>
        ) : (
          <div className="flex flex-col space-y-2">
            <button
              onClick={() => {
                setEditMainCategory({ id: mainCategory.id, name: mainCategory.name });
                setIsEditing(true);
              }}
              className="flex items-center justify-center px-2 py-1 rounded-md text-sm font-medium text-blue-600 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
            >
              <PencilIcon className="w-4 h-4 mr-1" />
              <span>Edit</span>
            </button>
            <button 
              onClick={() => handleDeleteMainCategory(mainCategory.id)} 
              className="flex items-center justify-center px-2 py-1 rounded-md text-sm font-medium text-red-600 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1"
            >
              <TrashIcon className="w-4 h-4 mr-1" />
              <span>Delete</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

const Category = () => {
  // State for tab selection
  const [activeTab, setActiveTab] = useState('categories'); // 'categories', 'main-categories', or 'assignment'

  // === Categories State ===
  const [categories, setCategories] = useState<Category[]>([]);
  const [newCategory, setNewCategory] = useState('');
  const [editCategory, setEditCategory] = useState<{ id: string; name: string; selectedMainCategories: number[] }>({ 
    id: '', 
    name: '', 
    selectedMainCategories: [] 
  });
  const [isEditingCategory, setIsEditingCategory] = useState(false);

  // === Main Categories State ===
  const [mainCategories, setMainCategories] = useState<MainCategory[]>([]);
  const [newMainCategory, setNewMainCategory] = useState('');
  const [editMainCategory, setEditMainCategory] = useState<{ id: string; name: string }>({ id: '', name: '' });
  const [isEditingMainCategory, setIsEditingMainCategory] = useState(false);

  // === Category Assignment State ===
  const [searchQuery, setSearchQuery] = useState('');
  const [activeId, setActiveId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Set up DnD sensors for main categories
  const mainCategoriesSensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Set up DnD sensors for assignment
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Small threshold to prevent accidental drags
      },
    }),
    useSensor(KeyboardSensor)
  );

  useEffect(() => {
    fetchData();
  }, []);

  // === Categories Methods ===
  const fetchCategories = async () => {
    try {
      const response = await api.get('/transactions/categories');
      setCategories(response.data.categories);
    } catch (error) {
      console.error('Failed to fetch categories', error);
    }
  };

  // Add a fetchData function to ensure we get main category associations
  const fetchData = async () => {
    setLoading(true);
    try {
      // Get categories and main categories
      const [categoriesResponse, mainCategoriesResponse] = await Promise.all([
        api.get('/transactions/categories'),
        api.get('/transactions/main-categories')
      ]);
      
      // Process categories to ensure they have main_categories array
      const processedCategories = categoriesResponse.data.categories.map(category => ({
        ...category,
        main_categories: category.main_categories || []
      }));
      
      setCategories(processedCategories);
      setMainCategories(mainCategoriesResponse.data.main_categories);
      
      // For each main category, fetch its associated categories to ensure complete data
      if (mainCategoriesResponse.data.main_categories && mainCategoriesResponse.data.main_categories.length > 0) {
        const mainCategoryDetails = await Promise.all(
          mainCategoriesResponse.data.main_categories.map(mc => 
            api.get(`/transactions/main-categories/${mc.id}`)
          )
        );
        
        // Update categories with correct main_categories associations
        const categoriesWithAssociations = [...processedCategories];
        
        mainCategoryDetails.forEach(response => {
          const mainCategory = response.data;
          if (mainCategory.categories) {
            mainCategory.categories.forEach(categoryInMainCat => {
              const existingCategoryIndex = categoriesWithAssociations.findIndex(c => c.id === categoryInMainCat.id);
              if (existingCategoryIndex !== -1) {
                // Update the category's main_categories array
                const mainCategoryId = parseInt(mainCategory.id);
                if (!categoriesWithAssociations[existingCategoryIndex].main_categories.includes(mainCategoryId)) {
                  categoriesWithAssociations[existingCategoryIndex].main_categories.push(mainCategoryId);
                }
              }
            });
          }
        });
        
        setCategories(categoriesWithAssociations);
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
      setError('Failed to load data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddCategory = async () => {
    if (newCategory.trim() === '') return;
    try {
      await api.post('/transactions/categories', { name: newCategory });
      setNewCategory('');
      fetchData();
    } catch (error) {
      console.error('Failed to add category', error);
    }
  };

  const handleUpdateCategory = async () => {
    if (editCategory.name.trim() === '') return;
    try {
      // Update the category name
      await api.patch(`/transactions/categories/${editCategory.id}`, { name: editCategory.name });
      
      // Get current main categories for this category
      const response = await api.get(`/transactions/categories/${editCategory.id}/main-categories`);
      const currentMainCategoryIds = response.data.main_categories.map(mc => parseInt(mc.id));
      
      // Find which main categories to add and which to remove
      const mainCategoriesToAdd = editCategory.selectedMainCategories.filter(
        mcId => !currentMainCategoryIds.includes(mcId)
      );
      const mainCategoriesToRemove = currentMainCategoryIds.filter(
        mcId => !editCategory.selectedMainCategories.includes(mcId)
      );
      
      // Add new main category associations
      for (const mcId of mainCategoriesToAdd) {
        await api.post(`/transactions/main-categories/${mcId}/categories/${editCategory.id}`);
      }
      
      // Remove old main category associations
      for (const mcId of mainCategoriesToRemove) {
        await api.delete(`/transactions/main-categories/${mcId}/categories/${editCategory.id}`);
      }
      
      setIsEditingCategory(false);
      fetchData();
    } catch (error) {
      console.error('Failed to edit category', error);
    }
  };

  const handleDeleteCategory = async (id: string) => {
    try {
      await api.delete(`/transactions/categories/${id}`);
      fetchData();
    } catch (error) {
      console.error('Failed to delete category', error);
    }
  };

  const getMainCategoryNames = (mainCategoryIds?: number[]) => {
    if (!mainCategoryIds || mainCategoryIds.length === 0) return "None";
    return mainCategoryIds
      .map(id => {
        const mainCategory = mainCategories.find(mc => parseInt(mc.id) === id);
        return mainCategory ? mainCategory.name : null;
      })
      .filter(name => name !== null)
      .join(", ");
  };

  const handleMainCategoryToggle = (mainCategoryId: number) => {
    setEditCategory(prev => {
      const currentSelected = [...prev.selectedMainCategories];
      const index = currentSelected.indexOf(mainCategoryId);
      
      if (index === -1) {
        // Add the main category
        currentSelected.push(mainCategoryId);
      } else {
        // Remove the main category
        currentSelected.splice(index, 1);
      }
      
      return {
        ...prev,
        selectedMainCategories: currentSelected
      };
    });
  };

  // === Main Categories Methods ===
  const handleAddMainCategory = async () => {
    if (newMainCategory.trim() === '') return;
    try {
      await api.post('/transactions/main-categories', { 
        name: newMainCategory,
        position: mainCategories.length
      });
      setNewMainCategory('');
      fetchData();
    } catch (error) {
      console.error('Failed to add main category', error);
    }
  };

  const handleEditMainCategory = async () => {
    if (editMainCategory.name.trim() === '') return;
    try {
      await api.patch(`/transactions/main-categories/${editMainCategory.id}`, { name: editMainCategory.name });
      setIsEditingMainCategory(false);
      fetchData();
    } catch (error) {
      console.error('Failed to edit main category', error);
    }
  };

  const handleDeleteMainCategory = async (id: string) => {
    try {
      await api.delete(`/transactions/main-categories/${id}`);
      fetchData();
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
    const updates = categories.map((category, index) => ({
      id: category.id,
      position: index
    }));
    
    try {
      await api.patch('/transactions/main-categories/positions', { positions: updates });
      fetchData();
    } catch (error) {
      console.error('Failed to update category positions', error);
    }
  };

  // Category assignment methods
  const filterCategoriesBySearch = (categoriesToFilter: Category[]) => {
    if (!searchQuery.trim()) return categoriesToFilter;
    
    return categoriesToFilter.filter(category => 
      category.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  };

  const getTotalUnassignedCategories = () => {
    return categories.filter(category => 
      !category.main_categories || category.main_categories.length === 0
    ).length;
  };

  const unassignedCategories = filterCategoriesBySearch(
    categories.filter(category => 
      !category.main_categories || category.main_categories.length === 0
    )
  );

  const getCategoriesForMainCategory = (mainCategoryId: string) => {
    const mainCategoryIdNum = parseInt(mainCategoryId);
    return filterCategoriesBySearch(
      categories.filter(category => 
        category.main_categories && 
        category.main_categories.includes(mainCategoryIdNum)
      )
    );
  };

  const findCategory = (id: string) => {
    return categories.find(category => category.id === id);
  };

  const handleDragStart = (event) => {
    const { active } = event;
    setActiveId(active.id);
  };

  const handleAssignmentDragEnd = async (event) => {
    const { active, over } = event;
    
    if (!over) {
      setActiveId(null);
      return;
    }
    
    const categoryId = active.id;
    
    if (over.data && over.data.current && over.data.current.type === 'mainCategory') {
      const mainCategoryId = over.data.current.mainCategoryId;
      
      // Get the category
      const category = findCategory(categoryId);
      
      if (category) {
        const mainCategoryIdNum = parseInt(mainCategoryId);
        
        // Check if already in this main category
        const alreadyInMainCategory = category.main_categories && 
                                      category.main_categories.includes(mainCategoryIdNum);
        
        if (!alreadyInMainCategory) {
          // Don't await here to keep the UI responsive
          addCategoryToMainCategory(categoryId, mainCategoryId);
        }
      }
    } else if (over.data && over.data.current && over.data.current.type === 'unassigned') {
      // If dropped on unassigned area and is currently assigned
      const category = findCategory(categoryId);
      
      if (category && category.main_categories && category.main_categories.length > 0) {
        // Get the category's main categories
        const mainCategoryIds = category.main_categories;
        
        // For each main category, remove the association
        for (const mainCatId of mainCategoryIds) {
          const mainCategoryId = mainCatId.toString();
          removeCategoryFromMainCategory(categoryId, mainCategoryId);
        }
      }
    }
    
    setActiveId(null);
  };

  // Draggable Category Card component
  const CategoryCard = ({ category, isDragging = false }) => {
    return (
      <div 
        className={`p-3 rounded ${isDragging ? 'bg-blue-100 shadow-md' : 'bg-gray-100'} transition-colors`}
      >
        <div className="font-medium text-base">{category.name}</div>
      </div>
    );
  };

  // Draggable wrapper component for category assignment
  const Draggable = ({ children, id, data }) => {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
      id,
      data
    });
    
    const style = transform ? {
      transform: CSS.Translate.toString(transform),
      zIndex: isDragging ? 10 : 0,
      opacity: isDragging ? 0.5 : 1,
      cursor: 'grab'
    } : {
      cursor: 'grab'
    };

    return (
      <div 
        ref={setNodeRef} 
        style={style} 
        {...listeners} 
        {...attributes}
      >
        {children}
      </div>
    );
  };

  // Droppable wrapper component for category assignment
  const Droppable = ({ children, id, data }) => {
    const { isOver, setNodeRef } = useDroppable({
      id,
      data
    });
    
    // Enhanced highlight style that's more noticeable
    const style: React.CSSProperties = {
      backgroundColor: isOver ? (data.type === 'unassigned' ? '#ffebeb' : '#e6f7ff') : undefined,
      boxShadow: isOver ? '0 0 0 2px #4f46e5' : undefined,
      transition: 'all 0.2s ease-in-out'
    };

    // Additional pulsing effect for unassigned area when dragging over
    if (isOver && data.type === 'unassigned') {
      style.animation = 'pulse 1.5s infinite';
    }

    return (
      <div 
        ref={setNodeRef} 
        style={style}
        className={isOver && data.type === 'unassigned' ? 'pulse-animation' : ''}
      >
        {children}
      </div>
    );
  };

  // Function to add a category to a main category
  const addCategoryToMainCategory = async (categoryId: string, mainCategoryId: string) => {
    try {
      console.log(`Attempting to add category ${categoryId} to main category ${mainCategoryId}`);
      setLoading(true);
      
      // Optimistically update the UI
      const mainCategoryIdNum = parseInt(mainCategoryId);
      setCategories(prevCategories => 
        prevCategories.map(cat => 
          cat.id === categoryId 
            ? { 
                ...cat, 
                main_categories: cat.main_categories 
                  ? [...cat.main_categories, mainCategoryIdNum]
                  : [mainCategoryIdNum] 
              } 
            : cat
        )
      );
      
      // Make the API call
      const response = await api.post(`/transactions/main-categories/${mainCategoryId}/categories/${categoryId}`);
      console.log('Add category response:', response);
      
      // Fetch the specific main category to ensure we have the latest data
      const mainCategoryResponse = await api.get(`/transactions/main-categories/${mainCategoryId}`);
      console.log('Main category details after adding category:', mainCategoryResponse.data);
      
      // Refresh data to ensure consistency with server
      await fetchData();
    } catch (err) {
      console.error('Failed to add category to main category:', err);
      setError(`Failed to add category. Error: ${err.message || 'Unknown error'}`);
      setTimeout(() => setError(''), 3000);
      // Revert the optimistic update by fetching fresh data
      await fetchData();
    } finally {
      setLoading(false);
    }
  };

  // Function to remove a category from a main category
  const removeCategoryFromMainCategory = async (categoryId: string, mainCategoryId: string) => {
    try {
      console.log(`Attempting to remove category ${categoryId} from main category ${mainCategoryId}`);
      setLoading(true);
      
      // Optimistically update the UI
      const mainCategoryIdNum = parseInt(mainCategoryId);
      setCategories(prevCategories => 
        prevCategories.map(cat => 
          cat.id === categoryId 
            ? { 
                ...cat, 
                main_categories: cat.main_categories 
                  ? cat.main_categories.filter(id => id !== mainCategoryIdNum)
                  : [] 
              } 
            : cat
        )
      );
      
      // Make the API call
      try {
        console.log(`Sending DELETE request to: /transactions/main-categories/${mainCategoryId}/categories/${categoryId}`);
        const response = await api.delete(`/transactions/main-categories/${mainCategoryId}/categories/${categoryId}`);
        console.log('Remove category response:', response);
      } catch (apiErr) {
        console.error('API Error Details:', apiErr.response?.status, apiErr.response?.data);
        throw apiErr;
      }
      
      // Refresh data to ensure consistency with server
      await fetchData();
    } catch (err) {
      console.error('Failed to remove category from main category:', err);
      const errorMessage = err.response?.data?.detail || err.message || 'Unknown error';
      setError(`Failed to remove category. Error: ${errorMessage}`);
      setTimeout(() => setError(''), 5000);
      // Revert the optimistic update by fetching fresh data
      await fetchData();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-full sm:max-w-6xl px-2 sm:px-4 py-4 sm:py-8">
      <GlobalStyle />
      {error && (
        <div className="mb-4 p-2 bg-red-100 text-red-700 rounded">{error}</div>
      )}
      <Tab.Group>
        <Tab.List className="flex border-b border-gray-200 mb-6">
          <Tab className={({ selected }) => classNames(
            'py-3 sm:py-2 px-4 text-sm font-medium border-b-2 focus:outline-none',
            selected 
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          )}>
            Categories
          </Tab>
          <Tab className={({ selected }) => classNames(
            'py-3 sm:py-2 px-4 text-sm font-medium border-b-2 focus:outline-none',
            selected 
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          )}>
            Main Categories
          </Tab>
          <Tab className={({ selected }) => classNames(
            'py-3 sm:py-2 px-4 text-sm font-medium border-b-2 focus:outline-none',
            selected 
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          )}>
            Category Assignment
          </Tab>
        </Tab.List>

        <Tab.Panels>
          {/* Categories Tab */}
          <Tab.Panel>
            {/* Add Category Form */}
            <div className="mb-6">
              <input
                type="text"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                placeholder="New Category"
                className="form-input w-full rounded-md border border-gray-300 focus:border-blue-500 focus:ring focus:ring-blue-200 py-3 sm:py-2 text-base"
              />
              <button
                onClick={handleAddCategory}
                className="mt-3 w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-3 sm:py-2 rounded-md flex items-center justify-center shadow-sm transition-all duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
              >
                <PlusIcon className="w-5 h-5 mr-2" />
                <span className="font-medium">Add Category</span>
              </button>
            </div>
            
            {/* Categories List */}
            <div className="overflow-x-auto">
              {/* Desktop table view */}
              <table className="hidden sm:table min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Main Categories</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {categories.map((category) => (
                    <tr key={category.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {isEditingCategory && editCategory.id === category.id ? (
                          <input
                            type="text"
                            value={editCategory.name}
                            onChange={(e) => setEditCategory({ ...editCategory, name: e.target.value })}
                            className="form-input w-full rounded-md border border-gray-300 focus:border-blue-500 focus:ring focus:ring-blue-200"
                          />
                        ) : (
                          <span className="text-sm text-gray-900">{category.name}</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {isEditingCategory && editCategory.id === category.id ? (
                          <div className="flex flex-col space-y-2">
                            {mainCategories.map(mainCategory => (
                              <label key={mainCategory.id} className="flex items-center">
                                <input
                                  type="checkbox"
                                  checked={editCategory.selectedMainCategories.includes(parseInt(mainCategory.id))}
                                  onChange={() => handleMainCategoryToggle(parseInt(mainCategory.id))}
                                  className="form-checkbox h-5 w-5 text-indigo-600 rounded"
                                />
                                <span className="ml-2 text-sm text-gray-700">{mainCategory.name}</span>
                              </label>
                            ))}
                          </div>
                        ) : (
                          <span className="text-sm text-gray-900">{getMainCategoryNames(category.main_categories)}</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        {isEditingCategory && editCategory.id === category.id ? (
                          <div className="flex flex-col space-y-2">
                            <button 
                              onClick={handleUpdateCategory} 
                              className="flex items-center justify-center px-2 py-1 rounded-md text-sm font-medium text-green-600 bg-green-100 hover:bg-green-200 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-1"
                            >
                              <CheckIcon className="w-4 h-4 mr-1" />
                              <span>Save</span>
                            </button>
                            <button 
                              onClick={() => setIsEditingCategory(false)} 
                              className="flex items-center justify-center px-2 py-1 rounded-md text-sm font-medium text-red-600 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1"
                            >
                              <XMarkIcon className="w-4 h-4 mr-1" />
                              <span>Cancel</span>
                            </button>
                          </div>
                        ) : (
                          <div className="flex flex-col space-y-2">
                            <button
                              onClick={() => {
                                setEditCategory({
                                  id: category.id,
                                  name: category.name,
                                  selectedMainCategories: category.main_categories || []
                                });
                                setIsEditingCategory(true);
                              }}
                              className="flex items-center justify-center px-2 py-1 rounded-md text-sm font-medium text-blue-600 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
                            >
                              <PencilIcon className="w-4 h-4 mr-1" />
                              <span>Edit</span>
                            </button>
                            <button 
                              onClick={() => handleDeleteCategory(category.id)} 
                              className="flex items-center justify-center px-2 py-1 rounded-md text-sm font-medium text-red-600 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1"
                            >
                              <TrashIcon className="w-4 h-4 mr-1" />
                              <span>Delete</span>
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              
              {/* Mobile card view */}
              <div className="sm:hidden space-y-4">
                {categories.map((category) => (
                  <div key={category.id} className="bg-white p-4 rounded-md shadow">
                    <div className="flex justify-between items-start mb-3">
                      {isEditingCategory && editCategory.id === category.id ? (
                        <input
                          type="text"
                          value={editCategory.name}
                          onChange={(e) => setEditCategory({ ...editCategory, name: e.target.value })}
                          className="form-input w-full rounded-md border border-gray-300 focus:border-blue-500 focus:ring focus:ring-blue-200"
                        />
                      ) : (
                        <div className="flex-1 pr-4">
                          <h3 className="font-medium text-gray-900 text-base pt-2">{category.name}</h3>
                        </div>
                      )}
                      
                      {isEditingCategory && editCategory.id === category.id ? (
                        <div className="flex flex-col space-y-2">
                          <button 
                            onClick={handleUpdateCategory} 
                            className="flex items-center justify-center px-2 py-1 rounded-md text-sm font-medium text-green-600 bg-green-100 hover:bg-green-200 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-1"
                          >
                            <CheckIcon className="w-4 h-4 mr-1" />
                            <span>Save</span>
                          </button>
                          <button 
                            onClick={() => setIsEditingCategory(false)} 
                            className="flex items-center justify-center px-2 py-1 rounded-md text-sm font-medium text-red-600 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1"
                          >
                            <XMarkIcon className="w-4 h-4 mr-1" />
                            <span>Cancel</span>
                          </button>
                        </div>
                      ) : (
                        <div className="flex flex-col space-y-2">
                          <button
                            onClick={() => {
                              setEditCategory({
                                id: category.id,
                                name: category.name,
                                selectedMainCategories: category.main_categories || []
                              });
                              setIsEditingCategory(true);
                            }}
                            className="flex items-center justify-center px-2 py-1 rounded-md text-sm font-medium text-blue-600 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
                          >
                            <PencilIcon className="w-4 h-4 mr-1" />
                            <span>Edit</span>
                          </button>
                          <button 
                            onClick={() => handleDeleteCategory(category.id)} 
                            className="flex items-center justify-center px-2 py-1 rounded-md text-sm font-medium text-red-600 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1"
                          >
                            <TrashIcon className="w-4 h-4 mr-1" />
                            <span>Delete</span>
                          </button>
                        </div>
                      )}
                    </div>
                    
                    <div className="text-sm text-gray-500 mt-2">
                      <span className="font-medium">Main Categories:</span>
                      {isEditingCategory && editCategory.id === category.id ? (
                        <div className="mt-2 space-y-2">
                          {mainCategories.map(mainCategory => (
                            <label key={mainCategory.id} className="flex items-center">
                              <input
                                type="checkbox"
                                checked={editCategory.selectedMainCategories.includes(parseInt(mainCategory.id))}
                                onChange={() => handleMainCategoryToggle(parseInt(mainCategory.id))}
                                className="form-checkbox h-5 w-5 text-indigo-600 rounded"
                              />
                              <span className="ml-2 text-sm text-gray-700">{mainCategory.name}</span>
                            </label>
                          ))}
                        </div>
                      ) : (
                        <div className="mt-1">{getMainCategoryNames(category.main_categories)}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Tab.Panel>

          {/* Main Categories Tab */}
          <Tab.Panel>
            {/* Add Main Category Form */}
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
                className="mt-3 w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-3 sm:py-2 rounded-md flex items-center justify-center shadow-sm transition-all duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
              >
                <PlusIcon className="w-5 h-5 mr-2" />
                <span className="font-medium">Add Main Category</span>
              </button>
            </div>
            
            <p className="text-sm text-gray-500 mb-3">Drag and drop to reorder main categories</p>
            
            {/* Main Categories Drag & Drop List */}
            <DndContext 
              sensors={mainCategoriesSensors} 
              collisionDetection={closestCenter} 
              onDragEnd={handleDragEnd}
              modifiers={[restrictToVerticalAxis]}
            >
              <SortableContext items={mainCategories.map(cat => cat.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-3">
                  {mainCategories.map((mainCategory) => (
                    <SortableItem 
                      key={mainCategory.id}
                      mainCategory={mainCategory}
                      isEditing={isEditingMainCategory}
                      editMainCategory={editMainCategory}
                      setEditMainCategory={setEditMainCategory}
                      setIsEditing={setIsEditingMainCategory}
                      handleEditMainCategory={handleEditMainCategory}
                      handleDeleteMainCategory={handleDeleteMainCategory}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          </Tab.Panel>

          {/* Category Assignment Tab */}
          <Tab.Panel>
            <h1 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6">Assign Categories to Main Categories</h1>
            <p className="mb-4 text-gray-600 text-sm sm:text-base">
              Drag categories to main categories to assign them. Drag assigned categories to the "Unassigned Categories" area to remove them from a main category.
            </p>
            
            {loading && (
              <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
                <div className="bg-white p-4 rounded-lg shadow-lg flex items-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Processing...</span>
                </div>
              </div>
            )}
            
            {/* Search Box */}
            <div className="mb-6">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                  <MagnifyingGlassIcon className="w-5 h-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search categories..."
                  className="w-full py-3 sm:py-2 pl-10 pr-3 rounded-md border border-gray-300 focus:border-indigo-500 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 text-base"
                />
              </div>
              {searchQuery && filterCategoriesBySearch(categories).length === 0 && (
                <div className="mt-2 text-sm text-gray-600 bg-gray-100 p-2 rounded">
                  No categories found matching "{searchQuery}". Try a different search term.
                </div>
              )}
            </div>
            
            <DndContext 
              sensors={sensors} 
              collisionDetection={closestCenter}
              onDragStart={handleDragStart}
              onDragEnd={handleAssignmentDragEnd}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                {/* Left column - unassigned categories */}
                <div 
                  className="bg-gray-50 p-4 rounded-lg shadow h-full" 
                >
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-semibold">Unassigned Categories</h2>
                    <div className="bg-gray-100 text-gray-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                      {unassignedCategories.length} {unassignedCategories.length === 1 ? 'category' : 'categories'}
                    </div>
                  </div>
                  
                  {searchQuery && unassignedCategories.length !== getTotalUnassignedCategories() && (
                    <p className="text-xs text-gray-500 mb-2">
                      Showing {unassignedCategories.length} of {getTotalUnassignedCategories()} categories (filtered by search)
                    </p>
                  )}
                  
                  <Droppable
                    id="unassigned-droppable"
                    data={{ type: 'unassigned' }}
                  >
                    <div 
                      className="min-h-[200px] bg-white p-3 rounded border border-gray-200 space-y-3 transition-all"
                    >
                      {unassignedCategories.length === 0 ? (
                        <p className="text-gray-500 text-center p-4">
                          {searchQuery 
                            ? 'No matching unassigned categories' 
                            : <span>All categories are assigned. <br />Drag categories here to remove them from main categories.</span>}
                        </p>
                      ) : (
                        unassignedCategories.map((category) => (
                          <Draggable key={category.id} id={category.id} data={{ type: 'category', categoryId: category.id }}>
                            <CategoryCard category={category} />
                          </Draggable>
                        ))
                      )}
                    </div>
                  </Droppable>
                </div>

                {/* Right column - main categories */}
                <div className="space-y-5">
                  {mainCategories.map(mainCategory => {
                    const categoriesInMainCategory = getCategoriesForMainCategory(mainCategory.id);
                    const mainCategoryIdNum = parseInt(mainCategory.id);
                    const totalCategoriesInMainCategory = categories.filter(category => 
                      category.main_categories && 
                      category.main_categories.includes(mainCategoryIdNum)
                    ).length;
                    
                    return (
                      <Droppable 
                        key={mainCategory.id} 
                        id={`main-${mainCategory.id}`}
                        data={{ type: 'mainCategory', mainCategoryId: mainCategory.id }}
                      >
                        <div className="bg-gray-50 p-4 rounded-lg shadow">
                          <div className="flex justify-between items-center mb-4">
                            <h2 className="text-lg font-semibold">{mainCategory.name}</h2>
                            <div className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                              {totalCategoriesInMainCategory} {totalCategoriesInMainCategory === 1 ? 'category' : 'categories'}
                            </div>
                          </div>
                          
                          {searchQuery && categoriesInMainCategory.length !== totalCategoriesInMainCategory && (
                            <p className="text-xs text-gray-500 mb-2">
                              Showing {categoriesInMainCategory.length} of {totalCategoriesInMainCategory} categories (filtered by search)
                            </p>
                          )}
                          
                          <div className="min-h-[100px] bg-white p-3 rounded border border-gray-200 space-y-3 transition-colors">
                            {categoriesInMainCategory.length === 0 ? (
                              <p className="text-gray-500 text-center p-4">
                                {searchQuery ? 'No matching categories' : 'No categories assigned'}
                              </p>
                            ) : (
                              categoriesInMainCategory.map((category) => (
                                <Draggable key={category.id} id={category.id} data={{ type: 'category', categoryId: category.id }}>
                                  <CategoryCard category={category} />
                                </Draggable>
                              ))
                            )}
                          </div>
                        </div>
                      </Droppable>
                    );
                  })}
                </div>
              </div>
              
              {/* Drag overlay */}
              <DragOverlay modifiers={[restrictToWindowEdges]}>
                {activeId ? (
                  <CategoryCard category={findCategory(activeId)} isDragging={true} />
                ) : null}
              </DragOverlay>
            </DndContext>
          </Tab.Panel>
        </Tab.Panels>
      </Tab.Group>
    </div>
  );
};

export default Category;