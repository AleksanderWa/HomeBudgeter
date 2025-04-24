import React, { useState, useEffect } from 'react';
import api from '../../client/api/client.ts';
import { MagnifyingGlassIcon } from '@heroicons/react/24/solid';
import { 
  DndContext, 
  DragOverlay, 
  useSensors, 
  useSensor, 
  PointerSensor,
  KeyboardSensor,
  closestCenter,
  useDraggable,
  useDroppable
} from '@dnd-kit/core';
import { 
  restrictToWindowEdges,
} from '@dnd-kit/modifiers';
import { CSS } from '@dnd-kit/utilities';

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
}

const CategoryAssignment = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [mainCategories, setMainCategories] = useState<MainCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeId, setActiveId] = useState<string | null>(null);

  // Set up DnD sensors
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

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      console.log('Fetching categories and main categories...');
      const [categoriesResponse, mainCategoriesResponse] = await Promise.all([
        api.get('/transactions/categories'),
        api.get('/transactions/main-categories')
      ]);
      
      console.log('Categories received:', categoriesResponse.data.categories);
      console.log('Main categories received:', mainCategoriesResponse.data.main_categories);
      
      // Make sure all category objects have proper main_categories array
      const processedCategories = categoriesResponse.data.categories.map(category => ({
        ...category,
        main_categories: category.main_categories || []
      }));
      
      setCategories(processedCategories);
      setMainCategories(mainCategoriesResponse.data.main_categories);
      
      // For each main category, fetch its associated categories to ensure we have the full data
      if (mainCategoriesResponse.data.main_categories && mainCategoriesResponse.data.main_categories.length > 0) {
        const mainCategoryDetails = await Promise.all(
          mainCategoriesResponse.data.main_categories.map(mc => 
            api.get(`/transactions/main-categories/${mc.id}`)
          )
        );
        
        // Update the categories with the correct main_categories associations from the detailed responses
        const categoriesWithAssociations = [...processedCategories];
        
        mainCategoryDetails.forEach(response => {
          const mainCategory = response.data;
          if (mainCategory.categories) {
            mainCategory.categories.forEach(categoryInMainCat => {
              const existingCategoryIndex = categoriesWithAssociations.findIndex(c => c.id === categoryInMainCat.id);
              if (existingCategoryIndex !== -1) {
                // If the category already exists, update its main_categories array
                const mainCategoryId = parseInt(mainCategory.id);
                if (!categoriesWithAssociations[existingCategoryIndex].main_categories.includes(mainCategoryId)) {
                  categoriesWithAssociations[existingCategoryIndex].main_categories.push(mainCategoryId);
                }
              }
            });
          }
        });
        
        setCategories(categoriesWithAssociations);
        console.log('Updated categories with associations:', categoriesWithAssociations);
      }
    } catch (err) {
      console.error('Failed to fetch data:', err);
      setError('Failed to load data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

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
      const response = await api.delete(`/transactions/main-categories/${mainCategoryId}/categories/${categoryId}`);
      console.log('Remove category response:', response);
      
      // Refresh data to ensure consistency with server
      await fetchData();
    } catch (err) {
      console.error('Failed to remove category from main category:', err);
      setError(`Failed to remove category. Error: ${err.message || 'Unknown error'}`);
      setTimeout(() => setError(''), 3000);
      // Revert the optimistic update by fetching fresh data
      await fetchData();
    } finally {
      setLoading(false);
    }
  };

  // Filter categories by search query
  const filterCategoriesBySearch = (categoriesToFilter: Category[]) => {
    if (!searchQuery.trim()) return categoriesToFilter;
    
    return categoriesToFilter.filter(category => 
      category.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  };

  // Get total unassigned categories (without search filter)
  const getTotalUnassignedCategories = () => {
    return categories.filter(category => 
      !category.main_categories || category.main_categories.length === 0
    ).length;
  };

  // Filter categories that don't belong to any main category
  const unassignedCategories = filterCategoriesBySearch(
    categories.filter(category => 
      !category.main_categories || category.main_categories.length === 0
    )
  );

  // Get categories for a specific main category
  const getCategoriesForMainCategory = (mainCategoryId: string) => {
    const mainCategoryIdNum = parseInt(mainCategoryId);
    return filterCategoriesBySearch(
      categories.filter(category => 
        category.main_categories && 
        category.main_categories.includes(mainCategoryIdNum)
      )
    );
  };

  // Find the active category (being dragged)
  const findCategory = (id: string) => {
    return categories.find(category => category.id === id);
  };

  // Handle drag start event
  const handleDragStart = (event) => {
    const { active } = event;
    setActiveId(active.id);
  };

  // Handle drag end event
  const handleDragEnd = async (event) => {
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
        className={`p-2 rounded ${isDragging ? 'bg-blue-100 shadow-md' : 'bg-gray-100'} transition-colors`}
      >
        <div className="font-medium">{category.name}</div>
      </div>
    );
  };

  if (error && !loading) {
    return (
      <div className="p-4 text-center text-red-500">
        {error}
        <button 
          onClick={fetchData} 
          className="ml-2 underline text-blue-500"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="p-4">
      <GlobalStyle />
      <h1 className="text-2xl font-bold mb-6">Assign Categories to Main Categories</h1>
      <p className="mb-4 text-gray-600">
        Drag categories to main categories to assign them. Drag assigned categories to the "Unassigned Categories" area to remove them from a main category.
      </p>
      
      {error && <div className="mb-4 p-2 bg-red-100 text-red-700 rounded">{error}</div>}
      
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
            className="w-full py-2 pl-10 pr-3 rounded-md border border-gray-300 focus:border-indigo-500 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
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
        onDragEnd={handleDragEnd}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                className="min-h-[200px] bg-white p-3 rounded border border-gray-200 space-y-2 transition-all"
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
          <div className="space-y-6">
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
                    
                    <div className="min-h-[100px] bg-white p-3 rounded border border-gray-200 space-y-2 transition-colors">
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
    </div>
  );
};

// Draggable wrapper component
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

// Droppable wrapper component
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

export default CategoryAssignment; 