# Main Categories Implementation

## Overview
This document outlines the implementation of main (parent) categories in the Budgeter application. The feature will allow users to organize their existing categories into broader groups (e.g., "Home" can contain "Food", "Home Repair", "Utilities", etc.). A category can be linked to multiple main categories, enabling flexible categorization.

## Database Changes

### New Model: MainCategory
```python
class MainCategory(Base):
    __tablename__ = "main_categories"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    # Relationships
    user = relationship("User")
    categories = relationship("Category", secondary="category_main_category", back_populates="main_categories")

    __table_args__ = (
        UniqueConstraint('name', 'user_id', name='_main_category_name_user_uc'),
    )
```

### Association Table for Many-to-Many Relationship
```python
category_main_category = Table(
    "category_main_category",
    Base.metadata,
    Column("category_id", Integer, ForeignKey("categories.id"), primary_key=True),
    Column("main_category_id", Integer, ForeignKey("main_categories.id"), primary_key=True)
)
```

### Update Existing Category Model
```python
class Category(Base):
    __tablename__ = "categories"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    # Relationships
    user = relationship("User")
    main_categories = relationship("MainCategory", secondary="category_main_category", back_populates="categories")
    category_limits = relationship('CategoryLimit', back_populates='category')
    transactions = relationship("Transaction", back_populates="category")
    categorization_rules = relationship("CategorizationRule", back_populates="category")

    __table_args__ = (
        UniqueConstraint('name', 'user_id', name='_category_name_user_uc'),
    )
```

## API Endpoints

### New Endpoints for Main Categories

#### 1. Create Main Category
- **Endpoint**: `POST /transactions/main-categories`
- **Request Body**:
  ```json
  {
    "name": "Home"
  }
  ```
- **Response**: 
  ```json
  {
    "id": 1,
    "name": "Home",
    "user_id": 123
  }
  ```

#### 2. Get All Main Categories
- **Endpoint**: `GET /transactions/main-categories`
- **Response**:
  ```json
  {
    "main_categories": [
      {
        "id": 1,
        "name": "Home",
        "user_id": 123,
        "categories": [
          {
            "id": 5,
            "name": "Food",
            "user_id": 123
          },
          {
            "id": 8,
            "name": "Home Repair",
            "user_id": 123
          }
        ]
      },
      {
        "id": 2,
        "name": "Transportation",
        "user_id": 123,
        "categories": []
      }
    ]
  }
  ```

#### 3. Update Main Category
- **Endpoint**: `PATCH /transactions/main-categories/{main_category_id}`
- **Request Body**:
  ```json
  {
    "name": "Updated Home"
  }
  ```
- **Response**: Updated main category object

#### 4. Delete Main Category
- **Endpoint**: `DELETE /transactions/main-categories/{main_category_id}`
- **Response**: 204 No Content

#### 5. Add Category to Main Category
- **Endpoint**: `POST /transactions/main-categories/{main_category_id}/categories/{category_id}`
- **Response**: 204 No Content

#### 6. Remove Category from Main Category
- **Endpoint**: `DELETE /transactions/main-categories/{main_category_id}/categories/{category_id}`
- **Response**: 204 No Content

#### 7. Get Categories by Main Category
- **Endpoint**: `GET /transactions/main-categories/{main_category_id}/categories`
- **Response**:
  ```json
  {
    "categories": [
      {
        "id": 5,
        "name": "Food",
        "user_id": 123,
        "main_categories": [1, 3]
      },
      {
        "id": 8,
        "name": "Home Repair",
        "user_id": 123,
        "main_categories": [1]
      }
    ]
  }
  ```

#### 8. Get Main Categories by Category
- **Endpoint**: `GET /transactions/categories/{category_id}/main-categories`
- **Response**:
  ```json
  {
    "main_categories": [
      {
        "id": 1,
        "name": "Home",
        "user_id": 123
      },
      {
        "id": 3,
        "name": "Daily Expenses",
        "user_id": 123
      }
    ]
  }
  ```

### Schema Updates

#### New Schemas
```python
class MainCategoryCreate(BaseModel):
    name: str
    
    @validator("name")
    def validate_main_category_name(cls, v):
        cleaned_name = v.strip()
        if not cleaned_name:
            raise ValueError("Main category name cannot be empty")
        if len(cleaned_name) > 50:
            raise ValueError("Main category name must be 50 characters or less")
        return cleaned_name

class MainCategoryResponse(BaseModel):
    id: int
    name: str
    user_id: int
    
    class Config:
        orm_mode = True

class MainCategoryDetailResponse(MainCategoryResponse):
    categories: List[CategoryResponse]
```

#### Update Existing Schema
```python
class CategoryResponse(BaseModel):
    id: int
    name: str
    user_id: int
    main_categories: List[int] = []
    
    class Config:
        orm_mode = True
```

## Frontend Implementation

### Main Components

#### 1. MainCategoryManagement Component

Create a new component for managing main categories:

```tsx
// src/components/MainCategory/MainCategoryManagement.tsx
import React, { useState, useEffect } from 'react';
import api from '../../client/api/client.ts';
import { TrashIcon, PencilIcon, PlusIcon, CheckIcon, XMarkIcon } from '@heroicons/react/24/solid';

const MainCategoryManagement = () => {
  const [mainCategories, setMainCategories] = useState([]);
  const [newMainCategory, setNewMainCategory] = useState('');
  const [editMainCategory, setEditMainCategory] = useState({ id: '', name: '' });
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    fetchMainCategories();
  }, []);

  const fetchMainCategories = async () => {
    try {
      const response = await api.get('/transactions/main-categories');
      setMainCategories(response.data.main_categories);
    } catch (error) {
      console.error('Failed to fetch main categories', error);
    }
  };

  const handleAddMainCategory = async () => {
    if (newMainCategory.trim() === '') return;
    try {
      await api.post('/transactions/main-categories', { name: newMainCategory });
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

  const handleDeleteMainCategory = async (id) => {
    try {
      await api.delete(`/transactions/main-categories/${id}`);
      fetchMainCategories();
    } catch (error) {
      console.error('Failed to delete main category', error);
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
      <div>
        {mainCategories.map((mainCategory) => (
          <div key={mainCategory.id} className="flex items-center justify-between p-2 border-b border-gray-200">
            {isEditing && editMainCategory.id === mainCategory.id ? (
              <input
                type="text"
                value={editMainCategory.name}
                onChange={(e) => setEditMainCategory({ ...editMainCategory, name: e.target.value })}
                className="form-input w-full rounded-md border border-gray-300 focus:border-blue-500 focus:ring focus:ring-blue-200"
              />
            ) : (
              <span>{mainCategory.name}</span>
            )}
            <div className="flex space-x-2">
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
        ))}
      </div>
    </div>
  );
};

export default MainCategoryManagement;
```

#### 2. Enhanced Category Management

Update the existing Category component to allow assigning multiple main categories:

```tsx
// src/components/Category/Category.tsx
import React, { useState, useEffect } from 'react';
import api from '../../client/api/client.ts';
import { TrashIcon, PencilIcon, PlusIcon, CheckIcon, XMarkIcon } from '@heroicons/react/24/solid';

const Category = () => {
  const [categories, setCategories] = useState([]);
  const [mainCategories, setMainCategories] = useState([]);
  const [newCategory, setNewCategory] = useState('');
  const [editCategory, setEditCategory] = useState({ id: '', name: '', selectedMainCategories: [] });
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    fetchCategories();
    fetchMainCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await api.get('/transactions/categories');
      setCategories(response.data.categories);
    } catch (error) {
      console.error('Failed to fetch categories', error);
    }
  };

  const fetchMainCategories = async () => {
    try {
      const response = await api.get('/transactions/main-categories');
      setMainCategories(response.data.main_categories);
    } catch (error) {
      console.error('Failed to fetch main categories', error);
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
      // Update the category name
      await api.patch(`/transactions/categories/${editCategory.id}`, { name: editCategory.name });
      
      // Get current main categories for this category
      const response = await api.get(`/transactions/categories/${editCategory.id}/main-categories`);
      const currentMainCategoryIds = response.data.main_categories.map(mc => mc.id);
      
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
      
      setIsEditing(false);
      fetchCategories();
    } catch (error) {
      console.error('Failed to edit category', error);
    }
  };

  const handleDeleteCategory = async (id) => {
    try {
      await api.delete(`/transactions/categories/${id}`);
      fetchCategories();
    } catch (error) {
      console.error('Failed to delete category', error);
    }
  };

  const getMainCategoryNames = (mainCategoryIds) => {
    if (!mainCategoryIds || mainCategoryIds.length === 0) return "None";
    return mainCategoryIds
      .map(id => {
        const mainCategory = mainCategories.find(mc => mc.id === id);
        return mainCategory ? mainCategory.name : null;
      })
      .filter(name => name !== null)
      .join(", ");
  };

  const handleMainCategoryToggle = (mainCategoryId) => {
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
          className="mt-3 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md flex items-center justify-center shadow-sm transition-all duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
        >
          <PlusIcon className="w-5 h-5 mr-2" />
          <span className="font-medium">Add Category</span>
        </button>
      </div>
      
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
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
                  {isEditing && editCategory.id === category.id ? (
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
                  {isEditing && editCategory.id === category.id ? (
                    <div className="flex flex-col space-y-2">
                      {mainCategories.map(mainCategory => (
                        <label key={mainCategory.id} className="inline-flex items-center">
                          <input
                            type="checkbox"
                            checked={editCategory.selectedMainCategories.includes(mainCategory.id)}
                            onChange={() => handleMainCategoryToggle(mainCategory.id)}
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
                  {isEditing && editCategory.id === category.id ? (
                    <div className="flex space-x-2">
                      <button onClick={handleEditCategory} className="text-green-500 hover:text-green-700 font-bold">
                        <CheckIcon className="w-6 h-6" />
                      </button>
                      <button onClick={() => setIsEditing(false)} className="text-red-500 hover:text-red-700 font-bold">
                        <XMarkIcon className="w-6 h-6" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex space-x-2">
                      <button
                        onClick={() => {
                          setEditCategory({ 
                            id: category.id, 
                            name: category.name, 
                            selectedMainCategories: category.main_categories || [] 
                          });
                          setIsEditing(true);
                        }}
                        className="text-blue-500 hover:text-blue-700"
                      >
                        <PencilIcon className="w-5 h-5" />
                      </button>
                      <button onClick={() => handleDeleteCategory(category.id)} className="text-red-500 hover:text-red-700">
                        <TrashIcon className="w-5 h-5" />
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Category;
```

## Implementation Phases

### Phase 1: Database & Backend Changes
1. Create the `MainCategory` model
2. Create the association table for the many-to-many relationship
3. Update the `Category` model relationships
4. Create database migration
5. Implement the API endpoints for main categories and category-main category associations

### Phase 2: Frontend Implementation
1. Create the `MainCategoryManagement` component
2. Update the `Category` component to support multiple main category assignments
3. Add routing and navigation for the new component

### Phase 3: Testing & Documentation
1. Test the functionality end-to-end
2. Update documentation
3. Deploy the changes

## Deployment Considerations
1. Run database migrations before deploying the new code
2. Consider providing a UI for bulk assigning categories to main categories
3. Monitor performance after deployment, especially for users with many categories

## Future Enhancements
1. Add color-coding for main categories
2. Implement drag-and-drop functionality for organizing categories
3. Add budget planning at the main category level
4. Provide visualization reports that show spending across main categories

## Conclusion
This implementation will allow users to flexibly organize their categories into multiple main categories, making it easier to classify expenses that might belong to multiple logical groups. The design follows existing application patterns and should integrate seamlessly with the current functionality. 