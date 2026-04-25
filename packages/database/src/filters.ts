import { isNull } from 'drizzle-orm';
import type { PgColumn } from 'drizzle-orm/pg-core';

interface SoftDeletable {
    deletedAt: PgColumn;
}

export function notDeleted(table: SoftDeletable) {
    return isNull(table.deletedAt);
}
