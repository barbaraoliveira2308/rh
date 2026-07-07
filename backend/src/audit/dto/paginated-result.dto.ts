export class PaginatedResult<T> {
  data: T[];
  nextCursor: string | null;
  hasMore: boolean;
}
