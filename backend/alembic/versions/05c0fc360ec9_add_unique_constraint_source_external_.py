"""add_unique_constraint_source_external_id_to_job_listings

Revision ID: 05c0fc360ec9
Revises: fb6029598050
Create Date: 2026-06-19 12:55:23.756263

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '05c0fc360ec9'
down_revision: Union[str, Sequence[str], None] = 'fb6029598050'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """
    Upgrade schema.

    1. Remove duplicate job_listings rows keeping only the newest row per
       (source, external_id) pair. This is necessary before adding the
       unique constraint, as existing data may contain duplicates from
       the pre-dedup era (when Gemini was unavailable during scrapes).
    2. Add the unique constraint.
    3. Drop stale columns (salary_range, posted_date) that are no longer
       in the ORM model.
    """
    # Step 1 — deduplicate existing rows, keeping the row with the highest ctid
    # (i.e. the most recently inserted physical row for each duplicate pair).
    op.execute(
        """
        DELETE FROM job_listings
        WHERE id IN (
            SELECT id FROM (
                SELECT id,
                       ROW_NUMBER() OVER (
                           PARTITION BY source, external_id
                           ORDER BY created_at DESC
                       ) AS rn
                FROM job_listings
                WHERE external_id IS NOT NULL
            ) sub
            WHERE rn > 1
        )
        """
    )

    # Step 2 — safe to add unique constraint now
    op.create_unique_constraint('uq_job_source_external_id', 'job_listings', ['source', 'external_id'])

    # Step 3 — drop columns removed from the ORM model
    op.drop_column('job_listings', 'salary_range')
    op.drop_column('job_listings', 'posted_date')


def downgrade() -> None:
    """Downgrade schema."""
    op.add_column('job_listings', sa.Column('posted_date', postgresql.TIMESTAMP(timezone=True), autoincrement=False, nullable=True))
    op.add_column('job_listings', sa.Column('salary_range', sa.VARCHAR(length=255), autoincrement=False, nullable=True))
    op.drop_constraint('uq_job_source_external_id', 'job_listings', type_='unique')
