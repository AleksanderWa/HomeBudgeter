"""update transaction

Revision ID: 3c1f1de6b86d
Revises: ffd5871b6104
Create Date: 2025-04-15 15:19:25.435626

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '3c1f1de6b86d'
down_revision: Union[str, None] = 'ffd5871b6104'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ### commands auto generated by Alembic - please adjust! ###
    op.add_column('transactions', sa.Column('category_id', sa.Integer(), nullable=True))
    op.create_foreign_key(None, 'transactions', 'categories', ['category_id'], ['id'])
    # ### end Alembic commands ###


def downgrade() -> None:
    # ### commands auto generated by Alembic - please adjust! ###
    op.drop_constraint(None, 'transactions', type_='foreignkey')
    op.drop_column('transactions', 'category_id')
    # ### end Alembic commands ###
