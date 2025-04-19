from alembic import op
import sqlalchemy as sa
from sqlalchemy.sql import table, column
from datetime import datetime

# Revision identifier
revision = 'add_plan_incomes'
down_revision = None
branch_labels = None
depends_on = None

def upgrade():
    # Create plan_incomes table
    op.create_table(
        'plan_incomes',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('plan_id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('amount', sa.DECIMAL(precision=10, scale=2), nullable=False, server_default='0'),
        sa.Column('description', sa.String(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), nullable=True, server_default=sa.func.now(), onupdate=sa.func.now()),
        sa.ForeignKeyConstraint(['plan_id'], ['plans.id'], ),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('plan_id', 'user_id', name='_plan_user_income_uc')
    )
    
    # Create index for faster lookups
    op.create_index('idx_plan_incomes_plan_id', 'plan_incomes', ['plan_id'])
    op.create_index('idx_plan_incomes_user_id', 'plan_incomes', ['user_id'])

def downgrade():
    # Drop tables
    op.drop_index('idx_plan_incomes_user_id')
    op.drop_index('idx_plan_incomes_plan_id')
    op.drop_table('plan_incomes') 