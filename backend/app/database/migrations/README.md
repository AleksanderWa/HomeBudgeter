# Database Migrations

This directory contains database migration scripts for the Budgeter app.

## Running the Migration for Plan Incomes

To add the `plan_incomes` table to your database, follow these steps:

1. Make sure Alembic is installed:
```
pip install alembic
```

2. Navigate to the project root directory and run:
```
alembic revision --autogenerate -m "add plan incomes"
alembic upgrade head
```

Alternatively, if you're not using Alembic, you can manually create the table using the SQL commands below:

```sql
CREATE TABLE plan_incomes (
    id SERIAL PRIMARY KEY,
    plan_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    description VARCHAR,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (plan_id) REFERENCES plans (id),
    FOREIGN KEY (user_id) REFERENCES users (id),
    CONSTRAINT _plan_user_income_uc UNIQUE (plan_id, user_id)
);

CREATE INDEX idx_plan_incomes_plan_id ON plan_incomes (plan_id);
CREATE INDEX idx_plan_incomes_user_id ON plan_incomes (user_id);
```

## Reverting the Migration

To revert the migration, run:

```
alembic downgrade -1
```

Or manually drop the table using:

```sql
DROP TABLE plan_incomes;
``` 