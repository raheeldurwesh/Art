import { useState, useMemo, type ReactNode } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { EmptyState } from '@/components/shared/EmptyState'
import { TableSkeleton } from '@/components/shared/LoadingSkeleton'
import { Search, ChevronLeft, ChevronRight, Database } from 'lucide-react'

export interface Column<T> {
  key: string
  header: string
  cell: (row: T) => ReactNode
  sortable?: boolean
  className?: string
}

export interface Filter {
  key: string
  label: string
  options: { value: string; label: string }[]
}

interface DataTableProps<T> {
  data: T[]
  columns: Column<T>[]
  filters?: Filter[]
  searchPlaceholder?: string
  searchKey?: (row: T) => string
  loading?: boolean
  emptyTitle?: string
  emptyDescription?: string
  onRowClick?: (row: T) => void
  pageSize?: number
}

export function DataTable<T extends { id?: string }>({
  data,
  columns,
  filters,
  searchPlaceholder = 'Search...',
  searchKey,
  loading = false,
  emptyTitle = 'No data found',
  emptyDescription = 'There are no records to display.',
  onRowClick,
  pageSize = 10,
}: DataTableProps<T>) {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [activeFilters, setActiveFilters] = useState<Record<string, string>>({})
  const [sortKey, setSortKey] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

  const filteredData = useMemo(() => {
    let result = data

    // Search
    if (search && searchKey) {
      const q = search.toLowerCase()
      result = result.filter((row) => searchKey(row).toLowerCase().includes(q))
    }

    // Filters
    Object.entries(activeFilters).forEach(([key, value]) => {
      if (value && value !== 'all') {
        result = result.filter((row) => String((row as Record<string, unknown>)[key]) === value)
      }
    })

    // Sort
    if (sortKey) {
      result = [...result].sort((a, b) => {
        const aVal = (a as Record<string, unknown>)[sortKey]
        const bVal = (b as Record<string, unknown>)[sortKey]
        if (typeof aVal === 'string' && typeof bVal === 'string') {
          return sortDir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal)
        }
        return sortDir === 'asc'
          ? Number(aVal) - Number(bVal)
          : Number(bVal) - Number(aVal)
      })
    }

    return result
  }, [data, search, searchKey, activeFilters, sortKey, sortDir])

  const totalPages = Math.ceil(filteredData.length / pageSize)
  const paginatedData = filteredData.slice((page - 1) * pageSize, page * pageSize)

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  if (loading) {
    return <TableSkeleton rows={pageSize} columns={columns.length} />
  }

  return (
    <div className="space-y-4">
      {/* Search + Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        {searchKey && (
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={searchPlaceholder}
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(1)
              }}
              className="pl-9"
            />
          </div>
        )}
        {filters?.map((filter) => (
          <Select
            key={filter.key}
            value={activeFilters[filter.key] || 'all'}
            onValueChange={(value) => {
              setActiveFilters((prev) => ({ ...prev, [filter.key]: value }))
              setPage(1)
            }}
          >
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder={filter.label} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All {filter.label}</SelectItem>
              {filter.options.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ))}
      </div>

      {/* Table */}
      {filteredData.length === 0 ? (
        <EmptyState
          icon={Database}
          title={emptyTitle}
          description={emptyDescription}
        />
      ) : (
        <>
          <div className="rounded-xl border bg-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/30">
                    {columns.map((col) => (
                      <th
                        key={col.key}
                        className={`px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider ${
                          col.sortable ? 'cursor-pointer hover:text-foreground select-none' : ''
                        } ${col.className || ''}`}
                        onClick={() => col.sortable && handleSort(col.key)}
                      >
                        <div className="flex items-center gap-1">
                          {col.header}
                          {col.sortable && sortKey === col.key && (
                            <span className="text-xs">{sortDir === 'asc' ? '↑' : '↓'}</span>
                          )}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {paginatedData.map((row, i) => (
                    <tr
                      key={(row as { id?: string }).id || i}
                      className={`transition-colors hover:bg-muted/30 ${
                        onRowClick ? 'cursor-pointer' : ''
                      }`}
                      onClick={() => onRowClick?.(row)}
                    >
                      {columns.map((col) => (
                        <td key={col.key} className={`px-4 py-3 text-sm ${col.className || ''}`}>
                          {col.cell(row)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-2">
              <p className="text-sm text-muted-foreground">
                Showing {(page - 1) * pageSize + 1} to{' '}
                {Math.min(page * pageSize, filteredData.length)} of {filteredData.length} results
              </p>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  disabled={page === 1}
                  onClick={() => setPage(page - 1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                  let pageNum: number
                  if (totalPages <= 5) {
                    pageNum = i + 1
                  } else if (page <= 3) {
                    pageNum = i + 1
                  } else if (page >= totalPages - 2) {
                    pageNum = totalPages - 4 + i
                  } else {
                    pageNum = page - 2 + i
                  }
                  return (
                    <Button
                      key={pageNum}
                      variant={page === pageNum ? 'default' : 'outline'}
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setPage(pageNum)}
                    >
                      {pageNum}
                    </Button>
                  )
                })}
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  disabled={page === totalPages}
                  onClick={() => setPage(page + 1)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
