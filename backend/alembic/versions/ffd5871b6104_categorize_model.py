"""update transactions model

Revision ID: ffd5871b6104
Revises: c4cf929f049e
Create Date: 2025-04-15 14:43:09.702714

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'ffd5871b6104'
down_revision: Union[str, None] = 'c4cf929f049e'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ### commands auto generated by Alembic - please adjust! ###
    op.create_table('categorization_rules',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('user_id', sa.Integer(), nullable=False),
    sa.Column('merchant_name', sa.String(), nullable=False),
    sa.Column('category_id', sa.Integer(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
    sa.ForeignKeyConstraint(['category_id'], ['categories.id'], ),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('user_id', 'merchant_name', name='_user_merchant_uc')
    )
    op.create_index(op.f('ix_categorization_rules_id'), 'categorization_rules', ['id'], unique=False)
    op.create_index('ix_categorization_rules_user_merchant', 'categorization_rules', ['user_id', 'merchant_name'], unique=False)
    op.alter_column('categories', 'name',
               existing_type=sa.VARCHAR(),
               nullable=False)
    op.alter_column('categories', 'user_id',
               existing_type=sa.INTEGER(),
               nullable=False)
    op.create_index(op.f('ix_transactions_merchant_name'), 'transactions', ['merchant_name'], unique=False)
    op.drop_constraint('transactions_category_fkey', 'transactions', type_='foreignkey')
    op.drop_column('transactions', 'category')
    # ### end Alembic commands ###


def downgrade() -> None:
    # ### commands auto generated by Alembic - please adjust! ###
    op.add_column('transactions', sa.Column('category', sa.INTEGER(), autoincrement=False, nullable=True))
    op.create_foreign_key('transactions_category_fkey', 'transactions', 'categories', ['category'], ['id'])
    op.drop_index(op.f('ix_transactions_merchant_name'), table_name='transactions')
    op.alter_column('categories', 'user_id',
               existing_type=sa.INTEGER(),
               nullable=True)
    op.alter_column('categories', 'name',
               existing_type=sa.VARCHAR(),
               nullable=True)
    op.drop_index('ix_categorization_rules_user_merchant', table_name='categorization_rules')
    op.drop_index(op.f('ix_categorization_rules_id'), table_name='categorization_rules')
    op.drop_table('categorization_rules')
    # ### end Alembic commands ###
