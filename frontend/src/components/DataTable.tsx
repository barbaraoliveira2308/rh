import * as React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import Box from '@mui/material/Box';
import Checkbox from '@mui/material/Checkbox';
import Paper from '@mui/material/Paper';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TableSortLabel from '@mui/material/TableSortLabel';
import Typography from '@mui/material/Typography';
import { Button } from '@/components/ui/button';

export interface Column<T> {
  key: string;
  header: string;
  cell: (row: T) => React.ReactNode;
  sortable?: boolean;
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  keyExtractor: (row: T) => string;
  pageSize?: number;
  selectable?: boolean;
  selectedRows?: string[];
  onSelectionChange?: (selectedIds: string[]) => void;
  className?: string;
}

export function DataTable<T>({
  data,
  columns,
  keyExtractor,
  pageSize = 10,
  selectable = false,
  selectedRows = [],
  onSelectionChange,
  className,
}: DataTableProps<T>): React.JSX.Element {
  const [currentPage, setCurrentPage] = React.useState(1);
  const [sortColumn, setSortColumn] = React.useState<string | null>(null);
  const [sortDirection, setSortDirection] = React.useState<'asc' | 'desc'>('asc');

  const totalPages = Math.max(1, Math.ceil(data.length / pageSize));
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedData = data.slice(startIndex, startIndex + pageSize);

  const handleSort = (key: string): void => {
    if (sortColumn === key) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortColumn(key);
      setSortDirection('asc');
    }
  };

  const toggleSelectAll = (): void => {
    if (!onSelectionChange) return;
    const pageIds = paginatedData.map(keyExtractor);
    const allSelected = pageIds.every((id) => selectedRows.includes(id));
    if (allSelected) {
      onSelectionChange(selectedRows.filter((id) => !pageIds.includes(id)));
    } else {
      onSelectionChange(Array.from(new Set([...selectedRows, ...pageIds])));
    }
  };

  const toggleSelectRow = (id: string): void => {
    if (!onSelectionChange) return;
    if (selectedRows.includes(id)) {
      onSelectionChange(selectedRows.filter((rowId) => rowId !== id));
    } else {
      onSelectionChange([...selectedRows, id]);
    }
  };

  React.useEffect(() => {
    setCurrentPage(1);
  }, [data.length]);

  return (
    <Paper className={className} sx={{ width: '100%', overflow: 'hidden' }}>
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              {selectable && (
                <TableCell padding="checkbox">
                  <Checkbox
                    checked={
                      paginatedData.length > 0 &&
                      paginatedData.every((row) => selectedRows.includes(keyExtractor(row)))
                    }
                    onChange={toggleSelectAll}
                  />
                </TableCell>
              )}
              {columns.map((column) => (
                <TableCell
                  key={column.key}
                  sortDirection={sortColumn === column.key ? sortDirection : false}
                >
                  {column.sortable ? (
                    <TableSortLabel
                      active={sortColumn === column.key}
                      direction={sortColumn === column.key ? sortDirection : 'asc'}
                      onClick={() => {
                        handleSort(column.key);
                      }}
                    >
                      {column.header}
                    </TableSortLabel>
                  ) : (
                    column.header
                  )}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {paginatedData.map((row) => {
              const id = keyExtractor(row);
              return (
                <TableRow key={id} hover>
                  {selectable && (
                    <TableCell padding="checkbox">
                      <Checkbox
                        checked={selectedRows.includes(id)}
                        onChange={() => {
                          toggleSelectRow(id);
                        }}
                      />
                    </TableCell>
                  )}
                  {columns.map((column) => (
                    <TableCell key={`${id}-${column.key}`}>{column.cell(row)}</TableCell>
                  ))}
                </TableRow>
              );
            })}
            {paginatedData.length === 0 && (
              <TableRow>
                <TableCell colSpan={columns.length + (selectable ? 1 : 0)} align="center">
                  <Typography color="text.secondary" sx={{ py: 3 }}>
                    Nenhum resultado encontrado.
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
      {totalPages > 1 && (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderTop: 1,
            borderColor: 'divider',
            px: 2,
            py: 1.5,
          }}
        >
          <Typography variant="body2" color="text.secondary">
            Página {currentPage} de {totalPages}
          </Typography>
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            <Button
              variant="outline"
              size="icon"
              onClick={() => {
                setCurrentPage(1);
              }}
              disabled={currentPage === 1}
            >
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => {
                setCurrentPage((p) => Math.max(1, p - 1));
              }}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => {
                setCurrentPage((p) => Math.min(totalPages, p + 1));
              }}
              disabled={currentPage === totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => {
                setCurrentPage(totalPages);
              }}
              disabled={currentPage === totalPages}
            >
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </Box>
        </Box>
      )}
    </Paper>
  );
}
