# Transaction Categorization System

## 1. Overview

This document outlines the design for an automated transaction categorization system within the Budgeter application. The primary goal is to intelligently assign categories to incoming bank transactions, minimizing manual user effort. The system learns from user behavior, automatically applying previously assigned categories to similar future transactions based primarily on the merchant name.

## 2. Workflow

1.  **Transaction Fetching:** New transactions are retrieved from connected bank accounts (e.g., via TrueLayer) and stored, initially without a category.
2.  **Automatic Categorization Attempt:** For each new transaction, the system checks if a categorization rule exists for the specific user and the transaction's `merchant_name`.
    *   If a rule exists, the corresponding category is automatically assigned to the transaction.
    *   If no rule exists, the transaction remains uncategorized.
3.  **User Review & Manual Categorization:** Users review their transactions in the application interface. They can manually assign or change the category for any transaction, whether it was automatically categorized or left uncategorized.
4.  **Learning and Rule Creation/Update:** When a user manually assigns or changes a category for a transaction that has a `merchant_name`:
    *   The system checks if a rule already exists for that `user_id` and `merchant_name`.
    *   If a rule exists, it is updated with the new `category_id`.
    *   If no rule exists, a new rule is created linking the `user_id`, `merchant_name`, and the chosen `category_id`.
5.  **Future Automation:** Subsequent transactions from the same merchant for that user will now be automatically categorized according to the newly created or updated rule.

## 3. Core Components

### 3.1. Transaction Ingestion

-   Leverages existing bank connection services (e.g., `TrueLayerService`) to fetch raw transaction data.
-   Raw transactions are processed and stored in the `Transaction` table. A trigger or background process initiates the categorization check.

### 3.2. Categorization Engine

-   **Input:** A `Transaction` record (specifically `user_id` and `merchant_name`).
-   **Output:** A `category_id` (or `null`).
-   **Logic:**
    1.  Query the `CategorizationRule` table for a match based on `user_id` and `merchant_name`.
    2.  If a single, active rule is found, return its `category_id`.
    3.  Otherwise, return `null`.

### 3.3. User Input & Learning

-   **Interface:** Users assign/change categories via API calls triggered from the frontend (e.g., selecting a category from a dropdown on the transaction list).
-   **Learning Trigger:** A successful API call to update a transaction's `category_id`.
-   **Action:** The backend service handling the category update is responsible for creating or updating the corresponding entry in the `CategorizationRule` table based on the transaction's `user_id` and `merchant_name`.

### 3.4. Rule Storage

-   **Database Table:** `CategorizationRule`
    -   `id` (Primary Key, e.g., UUID or Serial)
    -   `user_id` (Foreign Key to `User`, Indexed)
    -   `merchant_name` (String, Indexed) - The primary identifier for matching. Must handle case-insensitivity and potential variations.
    -   `category_id` (Foreign Key to `Category`)
    -   `created_at` (Timestamp)
    -   `updated_at` (Timestamp) - Indicates the last time the rule was created or modified by user action.
    -   **Constraint:** Unique constraint on (`user_id`, `merchant_name`) to ensure only one rule per user/merchant pair.

### 3.5. Applying Categories

-   **Process:** Can be implemented either:
    *   **Real-time:** As transactions are saved, query for a rule and update the transaction's `category_id` immediately.
    *   **Background Job:** Periodically scan for new, uncategorized transactions and apply rules.
-   The transaction record itself (`Transaction` table) will store the final assigned `category_id` (nullable).

## 4. Data Models (Conceptual)

-   **Transaction:** (Existing model) - Requires a nullable `category_id` field (Foreign Key to `Category`).
-   **Category:** (Existing or new model) - `id`, `name`, `user_id` (identifies user-specific categories). Consider adding default/global categories (where `user_id` could be `null`).
-   **CategorizationRule:** (New model as described in 3.4).

## 5. API Endpoints

-   `PUT /api/transactions/{transaction_id}/category`:
    -   **Request Body:** `{ "category_id": "uuid-or-int-of-category" }`
    -   **Action:** Updates the `category_id` on the specified `Transaction`. Triggers the learning mechanism (creates/updates `CategorizationRule` based on the transaction's `user_id` and `merchant_name` if present).
    -   **Response:** Updated transaction details or success status.

-   **(Optional Management Endpoints)**
    -   `GET /api/categorization-rules`: List all rules for the authenticated user.
    -   `PUT /api/categorization-rules/{rule_id}`: Manually update a specific rule (e.g., change the assigned category).
    -   `DELETE /api/categorization-rules/{rule_id}`: Delete a specific rule, stopping automatic categorization for that merchant.

## 6. Future Enhancements

-   Rule matching based on patterns in the `description` field (more complex, requires careful implementation).
-   Allowing users to disable automatic categorization for specific merchants without deleting the rule.
-   Handling transactions where `merchant_name` might be missing or inconsistent.
-   Suggesting categories based on keywords even if no rule exists.
-   Support for split categories within a single transaction. 