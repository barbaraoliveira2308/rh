import * as React from 'react';
import { DataGrid, type DataGridProps, type GridValidRowModel } from '@mui/x-data-grid';

export type ReusableDataGridProps<R extends GridValidRowModel> = Omit<
  DataGridProps<R>,
  'showToolbar'
>;

export function ReusableDataGrid<R extends GridValidRowModel>({
  ...props
}: ReusableDataGridProps<R>): React.JSX.Element {
  return <DataGrid {...props} showToolbar />;
}
