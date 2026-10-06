// types/filters.ts
export interface FilterTool {
  id: string;
  label: string;
  type: 'select' | 'search' | 'date' | 'multiselect';
  value: string | string[] | undefined;
  options?: { value: string; label: string }[];
  onChange: (value: string | string[] | undefined) => void;
}
