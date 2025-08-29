from decimal import Decimal
from typing import List
from sqlalchemy.orm import Session
from sqlalchemy import func, extract
from datetime import datetime, timedelta

from backend.app.models.transaction import MainCategory, Category, CategoryLimit, Plan

# from backend.app.models.user import User # User model not currently used in this service
from backend.app.schemas.schemas import (
    RareExpenseItem,
    SavingsSuggestionItem,
    RareExpensesResponse,
)


class RareExpensesService:
    def get_rare_expenses_summary(
        self, user_id: int, db: Session
    ) -> RareExpensesResponse:
        now = datetime.utcnow()
        current_year = now.year
        current_month = now.month

        rare_main_category = (
            db.query(MainCategory)
            .filter(
                MainCategory.user_id == user_id, func.lower(MainCategory.name) == "rare"
            )
            .first()
        )

        if not rare_main_category:
            return RareExpensesResponse(rare_expenses=[], savings_suggestions=[])

        # Determine the 12-month period
        # This list will store (year, month) tuples for the next 12 months
        months_in_period = []
        for i in range(12):
            month_offset = current_month + i
            year_offset = current_year + (month_offset - 1) // 12
            actual_month = (month_offset - 1) % 12 + 1
            months_in_period.append((year_offset, actual_month))

        # Fetch CategoryLimits linked to 'rare' MainCategory and within the 12-month window
        rare_categories_subquery = (
            db.query(Category.id)
            .join(MainCategory, Category.main_categories)
            .filter(MainCategory.id == rare_main_category.id)
            .subquery()
        )

        query_results = (
            db.query(
                CategoryLimit.limit,
                Plan.year,
                Plan.month,
                Category.name.label("category_name"),
            )
            .join(Plan, CategoryLimit.plan_id == Plan.id)
            .join(Category, CategoryLimit.category_id == Category.id)
            .filter(
                CategoryLimit.user_id == user_id,
                CategoryLimit.category_id.in_(rare_categories_subquery),
                # Add plan date filtering here directly in the query for efficiency
            )
            .all()
        )

        rare_expenses_list: List[RareExpenseItem] = []
        temp_expense_objects_for_suggestion_calc = (
            []
        )  # To hold (due_date_as_datetime, amount)

        for limit_amount, plan_year, plan_month, cat_name in query_results:
            # Check if the plan_year and plan_month fall within our 12-month window
            is_in_period = False
            for period_idx, (p_year, p_month) in enumerate(months_in_period):
                if plan_year == p_year and plan_month == p_month:
                    is_in_period = True
                    rare_expenses_list.append(
                        RareExpenseItem(
                            category_name=cat_name,
                            amount=limit_amount,
                            due_year=plan_year,
                            due_month=plan_month,
                        )
                    )
                    # Store for suggestion calculation, ensuring it's within the 12-month window
                    # The index in months_in_period (period_idx) tells us how many months from the start of the window it is
                    temp_expense_objects_for_suggestion_calc.append(
                        {
                            "amount": limit_amount,
                            "due_period_index": period_idx,  # 0 for 1st month of window, 1 for 2nd, etc.
                        }
                    )
                    break  # Found in period, no need to check further months for this expense

        rare_expenses_list.sort(key=lambda x: (x.due_year, x.due_month))

        # Initialize savings suggestions for the next 12 months
        savings_suggestions: List[SavingsSuggestionItem] = []
        for i, (year_s, month_s) in enumerate(months_in_period):
            savings_suggestions.append(
                SavingsSuggestionItem(
                    year=year_s, month=month_s, suggested_amount=Decimal("0.00")
                )
            )

        # Calculate savings suggestions
        # Sort temp_expense_objects by their due_period_index to process them chronologically
        temp_expense_objects_for_suggestion_calc.sort(
            key=lambda x: x["due_period_index"]
        )

        for expense_data in temp_expense_objects_for_suggestion_calc:
            amount_to_save = expense_data["amount"]
            # due_period_index is 0 for the first month of the window, 1 for the second, etc.
            # So, there are (due_period_index + 1) periods to save over, up to and including the due month.
            num_periods_to_save_over = expense_data["due_period_index"] + 1

            if amount_to_save > 0 and num_periods_to_save_over > 0:
                contribution = amount_to_save / Decimal(num_periods_to_save_over)
                for i in range(num_periods_to_save_over):
                    # i is an index from 0 up to due_period_index
                    # This directly corresponds to the index in savings_suggestions for the current 12-month window
                    savings_suggestions[i].suggested_amount += contribution

        # Round suggestions
        for suggestion in savings_suggestions:
            suggestion.suggested_amount = round(suggestion.suggested_amount, 2)

        return RareExpensesResponse(
            rare_expenses=rare_expenses_list, savings_suggestions=savings_suggestions
        )
