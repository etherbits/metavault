export function paginateItems<T>(
  items: T[],
  currentPage: number,
  pageSize: number
) {
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const clampedPage = Math.min(Math.max(1, currentPage), totalPages);
  const startIndex = (clampedPage - 1) * pageSize;

  return {
    totalPages,
    currentPage: clampedPage,
    items: items.slice(startIndex, startIndex + pageSize),
  };
}
