import { useState, useMemo } from 'react';

interface UsePaginationProps<T> {
  data: T[];
  pageSize?: number;
  initialPage?: number;
}

interface UsePaginationReturn<T> {
  currentPage: number;
  totalPages: number;
  pageSize: number;
  paginatedData: T[];
  hasNextPage: boolean;
  hasPrevPage: boolean;
  nextPage: () => void;
  prevPage: () => void;
  goToPage: (page: number) => void;
  setPageSize: (size: number) => void;
}

export function usePagination<T>({
  data,
  pageSize: initialPageSize = 10,
  initialPage = 1,
}: UsePaginationProps<T>): UsePaginationReturn<T> {
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [pageSize, setPageSize] = useState(initialPageSize);

  const totalPages = Math.ceil(data.length / pageSize);

  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return data.slice(start, start + pageSize);
  }, [data, currentPage, pageSize]);

  const hasNextPage = currentPage < totalPages;
  const hasPrevPage = currentPage > 1;

  const nextPage = () => {
    if (hasNextPage) {
      setCurrentPage(prev => prev + 1);
    }
  };

  const prevPage = () => {
    if (hasPrevPage) {
      setCurrentPage(prev => prev - 1);
    }
  };

  const goToPage = (page: number) => {
    const validPage = Math.max(1, Math.min(page, totalPages));
    setCurrentPage(validPage);
  };

  const handleSetPageSize = (size: number) => {
    setPageSize(size);
    setCurrentPage(1);
  };

  return {
    currentPage,
    totalPages,
    pageSize,
    paginatedData,
    hasNextPage,
    hasPrevPage,
    nextPage,
    prevPage,
    goToPage,
    setPageSize: handleSetPageSize,
  };
}
