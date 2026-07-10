'use client'

import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight } from 'lucide-react'

type PaginationProps = {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
  disabled?: boolean
}

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  disabled = false,
}: PaginationProps) {
  if (totalPages <= 1) return null

  // Generate page numbers to display
  const getPageNumbers = () => {
    const pages: (number | string)[] = []
    const range = 1 // number of pages to show on either side of current page

    for (let i = 1; i <= totalPages; i++) {
      if (
        i === 1 ||
        i === totalPages ||
        (i >= currentPage - range && i <= currentPage + range)
      ) {
        pages.push(i)
      } else if (
        pages[pages.length - 1] !== '...'
      ) {
        pages.push('...')
      }
    }
    return pages
  }

  return (
    <div className="flex items-center justify-center gap-2 py-4">
      <Button
        variant="outline"
        size="icon"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage <= 1 || disabled}
        className="h-9 w-9"
      >
        <ChevronLeft className="h-4 w-4" />
        <span className="sr-only">Previous page</span>
      </Button>

      {getPageNumbers().map((page, index) => {
        if (page === '...') {
          return (
            <span
              key={`dots-${index}`}
              className="flex h-9 w-9 items-center justify-center text-sm text-muted-foreground select-none"
            >
              ...
            </span>
          )
        }

        const pageNum = page as number
        return (
          <Button
            key={pageNum}
            variant={currentPage === pageNum ? 'default' : 'outline'}
            size="icon"
            onClick={() => onPageChange(pageNum)}
            disabled={disabled}
            className="h-9 w-9"
          >
            {pageNum}
          </Button>
        )
      })}

      <Button
        variant="outline"
        size="icon"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage >= totalPages || disabled}
        className="h-9 w-9"
      >
        <ChevronRight className="h-4 w-4" />
        <span className="sr-only">Next page</span>
      </Button>
    </div>
  )
}
