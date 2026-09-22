import * as React from 'react';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import ListSubheader from '@mui/material/ListSubheader';
import Divider from '@mui/material/Divider';
import SelectIcon from '@mui/icons-material/KeyboardArrowDown';
import CheckIcon from '@mui/icons-material/Check';

interface SelectContextValue {
  value: string | undefined;
  disabled: boolean;
  setValue: (value: string) => void;
  anchorEl: HTMLElement | null;
  setAnchorEl: (element: HTMLElement | null) => void;
  labels: Record<string, React.ReactNode>;
  registerLabel: (value: string, label: React.ReactNode) => void;
}

const SelectContext = React.createContext<SelectContextValue | null>(null);

function useSelectContext(): SelectContextValue {
  const context = React.useContext(SelectContext);
  if (!context) {
    throw new Error('Os componentes Select devem estar dentro de Select.');
  }
  return context;
}

interface SelectProps {
  value?: string;
  defaultValue?: string;
  disabled?: boolean;
  onValueChange?: (value: string) => void;
  children: React.ReactNode;
}

function Select({
  value: controlledValue,
  defaultValue,
  disabled = false,
  onValueChange,
  children,
}: SelectProps): React.JSX.Element {
  const [internalValue, setInternalValue] = React.useState(defaultValue);
  const [anchorEl, setAnchorEl] = React.useState<HTMLElement | null>(null);
  const [labels, setLabels] = React.useState<Record<string, React.ReactNode>>({});
  const value = controlledValue ?? internalValue;

  const setValue = (nextValue: string): void => {
    if (controlledValue === undefined) {
      setInternalValue(nextValue);
    }
    onValueChange?.(nextValue);
    setAnchorEl(null);
  };

  const registerLabel = (itemValue: string, label: React.ReactNode): void => {
    setLabels((current) => {
      if (current[itemValue] === label) return current;
      return { ...current, [itemValue]: label };
    });
  };

  return (
    <SelectContext.Provider
      value={{ value, disabled, setValue, anchorEl, setAnchorEl, labels, registerLabel }}
    >
      {children}
    </SelectContext.Provider>
  );
}

const SelectGroup = ({ children }: { children: React.ReactNode }): React.JSX.Element => (
  <>{children}</>
);

interface SelectValueProps {
  placeholder?: React.ReactNode;
  children?: React.ReactNode;
}

function SelectValue({ placeholder, children }: SelectValueProps): React.JSX.Element {
  const { value, labels } = useSelectContext();
  return <>{value ? (labels[value] ?? children ?? value) : (children ?? placeholder)}</>;
}

const SelectTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ className, children, onClick, ...props }, ref) => {
  const { anchorEl, disabled, setAnchorEl } = useSelectContext();
  return (
    <button
      ref={ref}
      type="button"
      className={className}
      aria-haspopup="listbox"
      aria-expanded={Boolean(anchorEl)}
      disabled={disabled || props.disabled}
      onClick={(event) => {
        onClick?.(event);
        setAnchorEl(event.currentTarget);
      }}
      {...props}
    >
      {children}
      <SelectIcon fontSize="small" />
    </button>
  );
});
SelectTrigger.displayName = 'SelectTrigger';

interface SelectContentProps extends React.HTMLAttributes<HTMLDivElement> {
  position?: 'item-aligned' | 'popper';
}

const SelectContent = React.forwardRef<HTMLDivElement, SelectContentProps>(
  ({ children, ...props }, ref) => {
    const { anchorEl, setAnchorEl } = useSelectContext();
    return (
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => {
          setAnchorEl(null);
        }}
        slotProps={{ paper: { ref } }}
        {...props}
      >
        {children}
      </Menu>
    );
  },
);
SelectContent.displayName = 'SelectContent';

interface SelectItemProps extends Omit<React.ComponentProps<typeof MenuItem>, 'value'> {
  value: string;
}

const SelectItem = React.forwardRef<HTMLLIElement, SelectItemProps>(
  ({ value, children, onClick, ...props }, ref) => {
    const context = useSelectContext();
    const selected = context.value === value;
    const disabled = context.disabled || Boolean(props.disabled);

    React.useEffect(() => {
      context.registerLabel(value, children);
    }, [children, context, value]);

    return (
      <MenuItem
        ref={ref}
        selected={selected}
        onClick={(event) => {
          onClick?.(event);
          if (!disabled) {
            context.setValue(value);
          }
        }}
        {...props}
        disabled={disabled}
      >
        <CheckIcon fontSize="small" sx={{ mr: 1, visibility: selected ? 'visible' : 'hidden' }} />
        {children}
      </MenuItem>
    );
  },
);
SelectItem.displayName = 'SelectItem';

const SelectLabel = React.forwardRef<HTMLLIElement, React.ComponentProps<typeof ListSubheader>>(
  (props, ref) => <ListSubheader ref={ref} {...props} />,
);
SelectLabel.displayName = 'SelectLabel';

const SelectSeparator = React.forwardRef<HTMLHRElement, React.ComponentProps<typeof Divider>>(
  (props, ref) => <Divider ref={ref} {...props} />,
);
SelectSeparator.displayName = 'SelectSeparator';

export {
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectLabel,
  SelectSeparator,
};
