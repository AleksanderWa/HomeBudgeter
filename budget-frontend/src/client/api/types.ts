// TypeScript interfaces for API responses

export interface RareExpenseItem {
  category_name: string;
  amount: number; // Decimals are typically numbers in TypeScript/JSON
  due_month: number;
  due_year: number;
}

export interface SavingsSuggestionItem {
  month: number;
  year: number;
  suggested_amount: number; // Decimals are typically numbers in TypeScript/JSON
}

export interface RareExpensesResponse {
  rare_expenses: RareExpenseItem[];
  savings_suggestions: SavingsSuggestionItem[];
}

// You can add other shared API response types here as needed 