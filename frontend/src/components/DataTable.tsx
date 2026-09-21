import * as React from 'react';
import type { GridColDef, GridRowSelectionModel, GridValidRowModel } from '@mui/x-data-grid';
import { ReusableDataGrid } from '@/components/ReusableDataGrid';

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
  toolbarTitle?: string;
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
  toolbarTitle,
}: DataTableProps<T>): React.JSX.Element {
  const gridColumns = React.useMemo<GridColDef<GridValidRowModel>[]>(
    () =>
      columns.map((column) => ({
        field: column.key,
        headerName: column.header,
        flex: 1,
        sortable: column.sortable ?? false,
        renderCell: (params) => column.cell(params.row as T),
      })),
    [columns],
  );

  const rowSelectionModel = React.useMemo<GridRowSelectionModel>(
    () => ({ type: 'include', ids: new Set(selectedRows) }),
    [selectedRows],
  );

  return (
    <ReusableDataGrid
      className={className}
      rows={data as GridValidRowModel[]}
      columns={gridColumns}
      getRowId={keyExtractor}
      checkboxSelection={selectable}
      disableRowSelectionOnClick
      rowSelectionModel={selectable ? rowSelectionModel : undefined}
      onRowSelectionModelChange={(selection) => {
        if (selectable) onSelectionChange?.([...selection.ids].map(String));
      }}
      autoHeight
      pageSizeOptions={[pageSize, pageSize * 2, 50]}
      initialState={{ pagination: { paginationModel: { pageSize, page: 0 } } }}
      localeText={{ noRowsLabel: 'Nenhum resultado encontrado.' }}
      aria-label={toolbarTitle ?? 'Tabela'}
    />
  );
}
