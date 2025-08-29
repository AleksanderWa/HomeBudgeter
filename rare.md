# Rare Expenses Feature

This document outlines the functionality for managing and planning for "Rare Expenses". These are significant, infrequent expenses that require advance planning.

## Feature Overview

The Rare Expenses feature aims to help users anticipate and prepare for large, upcoming costs that do not occur on a regular monthly basis. It does this by:

1.  **Forecasting Rare Expenses:** Calculating all planned expenses (based on `CategoryLimit`) associated with categories under the main category named '''rare''' for the next 12 months from the current date.
2.  **Proposing a Savings Plan:** Based on the forecasted rare expenses, the system suggests a savings strategy. This plan helps users incrementally set aside funds to meet these future obligations.
    *   **Example:** If a user has a $1000 expense due next month and another $1000 expense due in four months, the system might suggest putting aside $1000 this month (for the immediate expense) and then $250 each month for the next four months to accumulate the second $1000.
3.  **Displaying Information:** Users can view both the list of upcoming rare expenses and the system'''s suggested savings plan within the `Planning` component/section of the application.

## Detailed Functionality

### 1. Calculation of Rare Expenses
*   The system identifies `CategoryLimit` entries associated with `Category` records that belong to the `MainCategory` designated as '''rare'''.
*   It sums up the `limit` amounts from these `CategoryLimit` entries, projecting them for a period of one year starting from the current date. (Note: This assumes `CategoryLimit` represents planned spending for a period, and the timing/due date association will need to be clear, potentially via the `Plan` it'''s linked to or if `CategoryLimit` itself has a date/periodicity aspect not shown in the provided snippet).
*   Expenses are grouped by their due dates/planned periods.

### 2. Savings Suggestion Algorithm
*   The algorithm analyzes the timeline and amounts of upcoming rare expenses (derived from `CategoryLimit`s).
*   It prioritizes meeting earlier expenses first.
*   For expenses further out, it aims to distribute the saving contributions over the available time leading up to the due date, making it manageable for the user.
*   The suggestion will clearly state how much to set aside each month (or other appropriate period) and for which expense that portion is intended.

### 3. User Interface (UI) and Frontend Implementation
The user interface for displaying rare expenses and savings suggestions is integrated into the `Planning.tsx` component (`budget-frontend/src/components/Planning/Planning.tsx`).

*   **Data Display (within `Planning` component):**
    *   **Rare Expenses View:** A dedicated section within the `Planning` component displays:
        *   A list of all identified rare expenses (from '''rare''' `CategoryLimit`s) for the next year, showing the category name, amount, and due month/year.
    *   **Savings Plan Suggestion:** Clearly presented alongside or within the rare expenses view in the `Planning` component:
        *   The suggested amount to save each month for the upcoming 12-month period.
        *   A breakdown of how these savings contribute to covering specific upcoming rare expenses (this is implicitly handled by the "spread evenly" algorithm; the UI shows the total to save per month).
        *   The total amount accumulated over time according to the plan (UI shows per-month savings).
    *   Users can view this information to inform their budgeting decisions.

*   **Frontend Implementation Details:**
    *   **TypeScript Interfaces:** To ensure type safety for the API communication, the following interfaces are defined in `budget-frontend/src/client/api/types.ts`:
        *   `RareExpenseItem`: Represents a single upcoming rare expense.
            '''typescript
            export interface RareExpenseItem {
              category_name: string;
              amount: number;
              due_month: number;
              due_year: number;
            }
            '''
        *   `SavingsSuggestionItem`: Represents a single monthly savings suggestion.
            '''typescript
            export interface SavingsSuggestionItem {
              month: number;
              year: number;
              suggested_amount: number;
            }
            '''
        *   `RareExpensesResponse`: The overall structure of the response from the backend.
            '''typescript
            export interface RareExpensesResponse {
              rare_expenses: RareExpenseItem[];
              savings_suggestions: SavingsSuggestionItem[];
            }
            '''
    *   **API Client Function:** An asynchronous function `getRareExpensesSummary` is added to `budget-frontend/src/client/api/client.ts`. This function makes a GET request to the `/api/v1/plans/rare-expenses-summary` (or the corrected path, e.g. `/api/plans/rare-expenses-summary`) endpoint and returns a `Promise<RareExpensesResponse>`.
        '''typescript
        // In budget-frontend/src/client/api/client.ts
        export const getRareExpensesSummary = async (): Promise<RareExpensesResponse> => {
          const response = await api.get<RareExpensesResponse>('/api/plans/rare-expenses-summary'); // Path adjusted based on final backend routing
          return response.data;
        };
        '''
    *   **Component Logic (`Planning.tsx`):**
        *   **State Management:** A new state variable `rareExpensesData` of type `RareExpensesResponse | null` is introduced using the `useState` hook to store the fetched data.
        *   **Data Fetching:** A `useEffect` hook calls an asynchronous function `fetchRareData` when the component mounts. `fetchRareData` utilizes the `getRareExpensesSummary` API client function to retrieve the data and updates the `rareExpensesData` state. Loading and error states are also managed.
        *   **Rendering:** The component conditionally renders two new sections if `rareExpensesData` is available:
            *   "Upcoming Rare Expenses (Next 12 Months)": Lists each `RareExpenseItem` with its category name, amount, and due date (month/year).
            *   "Suggested Monthly Savings for Rare Expenses": Lists each `SavingsSuggestionItem` showing the month, year, and suggested amount to save.
        *   A helper function `getMonthName(monthNumber: number): string` is used to format month numbers into full month names for display.

## Use Case Example

1.  **User Setup:**
    *   `MainCategory` '''rare''' exists.
    *   `Category` "Annual Vacation" is linked to `MainCategory` '''rare'''.
    *   `Category` "New Laptop" is linked to `MainCategory` '''rare'''.
    *   A `Plan` for "Next Month" has a `CategoryLimit` for "Annual Vacation" of $1200.
    *   A `Plan` for "4 Months Out" has a `CategoryLimit` for "New Laptop" of $1500.
    (Adjusting example to better fit `CategoryLimit` model: Let'''s assume `CategoryLimit`s are set for specific future periods/plans that imply due dates.)
    * User has `CategoryLimit` for "Annual Vacation" with `limit` = $1200, associated with a `Plan` that implies it'''s due in 6 months.
    * User has `CategoryLimit` for "New Laptop" with `limit` = $1500, associated with a `Plan` that implies it'''s due in 10 months.
2.  **System Calculation:**
    *   Total rare expenses (from '''rare''' `CategoryLimit`s) for the next year: $2700.
3.  **System Suggestion (displayed in `Planning` component):**
    *   To cover "Annual Vacation": Set aside $200/month for the next 6 months.
    *   To cover "New Laptop": After the vacation is funded, or concurrently if manageable, set aside $150/month for the next 10 months. The system might suggest a combined approach or a sequential one.
    *   For simplicity, let'''s assume it suggests:
        *   Months 1-6: Save $200/month (for Vacation) + $150/month (for Laptop) = $350/month. Total saved by month 6: $2100. ($1200 for vacation covered, $900 towards laptop).
        *   Months 7-10: Save $150/month (for Laptop). Remaining needed for laptop: $1500 - $900 = $600. This will be covered in 4 months.
4.  **User Action (within `Planning` component):**
    *   The user reviews the suggestion and the list of expenses.
    *   They can then adjust their budget categories or savings goals accordingly.
