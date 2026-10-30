from alembic import op
import sqlalchemy as sa
revision='001_create_simulations';down_revision=None;branch_labels=None;depends_on=None
def upgrade():
    op.create_table('simulations',sa.Column('id',sa.Integer(),primary_key=True),sa.Column('initial_capital',sa.Numeric(15,2),nullable=False),sa.Column('monthly_contribution',sa.Numeric(15,2),nullable=False),sa.Column('monthly_rate',sa.Numeric(8,4),nullable=False),sa.Column('months',sa.Integer(),nullable=False),sa.Column('final_amount',sa.Numeric(15,2),nullable=False),sa.Column('created_at',sa.DateTime(),nullable=False))
def downgrade():op.drop_table('simulations')
