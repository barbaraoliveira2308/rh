import * as React from 'react';
import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import MuiTabs from '@mui/material/Tabs';

interface TabsContextValue {
  value: string;
  setValue: (value: string) => void;
}

const TabsContext = React.createContext<TabsContextValue | null>(null);

function useTabsContext(): TabsContextValue {
  const context = React.useContext(TabsContext);
  if (!context) {
    throw new Error('Os componentes Tabs devem estar dentro de Tabs.');
  }
  return context;
}

interface TabsProps {
  defaultValue?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  children: React.ReactNode;
}

function Tabs({
  defaultValue = '',
  value: controlledValue,
  onValueChange,
  children,
}: TabsProps): React.JSX.Element {
  const [internalValue, setInternalValue] = React.useState(defaultValue);
  const value = controlledValue ?? internalValue;

  const setValue = (nextValue: string): void => {
    if (controlledValue === undefined) {
      setInternalValue(nextValue);
    }
    onValueChange?.(nextValue);
  };

  return <TabsContext.Provider value={{ value, setValue }}>{children}</TabsContext.Provider>;
}

interface TabsListProps extends Omit<React.ComponentProps<typeof MuiTabs>, 'value' | 'onChange'> {
  children: React.ReactNode;
}

const TabsList = React.forwardRef<HTMLDivElement, TabsListProps>(
  ({ children, ...props }, ref): React.JSX.Element => {
    const { value, setValue } = useTabsContext();

    return (
      <MuiTabs
        {...props}
        ref={ref}
        value={value}
        onChange={(_, nextValue: string) => {
          setValue(nextValue);
        }}
        variant="scrollable"
        scrollButtons="auto"
      >
        {children}
      </MuiTabs>
    );
  },
);
TabsList.displayName = 'TabsList';

interface TabsTriggerProps extends Omit<React.ComponentProps<typeof Tab>, 'children' | 'value'> {
  value: string;
  children: React.ReactNode;
}

const TabsTrigger = React.forwardRef<HTMLDivElement, TabsTriggerProps>(
  ({ value, children, ...props }, ref): React.JSX.Element => (
    <Tab {...props} ref={ref} label={children} value={value} />
  ),
);
TabsTrigger.displayName = 'TabsTrigger';

interface TabsContentProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string;
  children: React.ReactNode;
}

const TabsContent = React.forwardRef<HTMLDivElement, TabsContentProps>(
  ({ value, children, ...props }, ref): React.JSX.Element => {
    const { value: activeValue } = useTabsContext();
    const active = activeValue === value;

    return (
      <Box
        {...props}
        ref={ref}
        aria-hidden={!active}
        aria-labelledby={`tab-${value}`}
        hidden={!active}
        role="tabpanel"
        sx={{ mt: 1 }}
      >
        {children}
      </Box>
    );
  },
);
TabsContent.displayName = 'TabsContent';

export { Tabs, TabsList, TabsTrigger, TabsContent };
