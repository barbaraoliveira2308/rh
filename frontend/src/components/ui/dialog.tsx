import * as React from 'react';
import MuiDialog from '@mui/material/Dialog';
import MuiDialogActions from '@mui/material/DialogActions';
import MuiDialogContent, {
  type DialogContentProps as MuiDialogContentProps,
} from '@mui/material/DialogContent';
import MuiDialogTitle from '@mui/material/DialogTitle';
import Backdrop from '@mui/material/Backdrop';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import CloseIcon from '@mui/icons-material/Close';

interface DialogContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
}

const DialogContext = React.createContext<DialogContextValue | null>(null);

function useDialogContext(): DialogContextValue {
  const context = React.useContext(DialogContext);
  if (!context) {
    throw new Error('Os componentes Dialog devem estar dentro de Dialog.');
  }
  return context;
}

interface DialogProps {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
}

function Dialog({
  open: controlledOpen,
  defaultOpen = false,
  onOpenChange,
  children,
}: DialogProps): React.JSX.Element {
  const [internalOpen, setInternalOpen] = React.useState(defaultOpen);
  const open = controlledOpen ?? internalOpen;

  const setOpen = (nextOpen: boolean): void => {
    if (controlledOpen === undefined) {
      setInternalOpen(nextOpen);
    }
    onOpenChange?.(nextOpen);
  };

  return <DialogContext.Provider value={{ open, setOpen }}>{children}</DialogContext.Provider>;
}

interface DialogTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
}

function DialogTrigger({
  asChild = false,
  children,
  onClick,
  ...props
}: DialogTriggerProps): React.JSX.Element {
  const { setOpen } = useDialogContext();
  const handleClick = (event: React.MouseEvent<HTMLElement>): void => {
    onClick?.(event as React.MouseEvent<HTMLButtonElement>);
    setOpen(true);
  };

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children, { ...props, onClick: handleClick } as Partial<
      React.HTMLAttributes<HTMLElement>
    >);
  }

  return (
    <button type="button" {...props} onClick={handleClick}>
      {children}
    </button>
  );
}

function DialogPortal({ children }: { children: React.ReactNode }): React.JSX.Element {
  return <>{children}</>;
}

function DialogClose({
  asChild = false,
  children,
  onClick,
  ...props
}: DialogTriggerProps): React.JSX.Element {
  const { setOpen } = useDialogContext();
  const handleClick = (event: React.MouseEvent<HTMLElement>): void => {
    onClick?.(event as React.MouseEvent<HTMLButtonElement>);
    setOpen(false);
  };

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children, { ...props, onClick: handleClick } as Partial<
      React.HTMLAttributes<HTMLElement>
    >);
  }

  return (
    <button type="button" {...props} onClick={handleClick}>
      {children}
    </button>
  );
}

const DialogOverlay = React.forwardRef<HTMLDivElement, React.ComponentProps<typeof Backdrop>>(
  (props, ref) => {
    const { open } = useDialogContext();
    const backdropProps = { ...props };
    return <Backdrop ref={ref} {...backdropProps} open={open} />;
  },
);
DialogOverlay.displayName = 'DialogOverlay';

const DialogContent = React.forwardRef<HTMLDivElement, MuiDialogContentProps>(
  ({ children, ...props }, ref) => {
    const { open, setOpen } = useDialogContext();
    return (
      <MuiDialog
        open={open}
        onClose={() => {
          setOpen(false);
        }}
        fullWidth
        maxWidth="sm"
      >
        <MuiDialogContent ref={ref} {...props}>
          {children}
          <IconButton
            aria-label="Fechar"
            onClick={() => {
              setOpen(false);
            }}
            sx={{ position: 'absolute', right: 8, top: 8 }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </MuiDialogContent>
      </MuiDialog>
    );
  },
);
DialogContent.displayName = 'DialogContent';

const DialogHeader = ({
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>): React.JSX.Element => (
  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75, mb: 2 }} {...props}>
    {children}
  </Box>
);
DialogHeader.displayName = 'DialogHeader';

const DialogFooter = ({
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>): React.JSX.Element => (
  <MuiDialogActions sx={{ px: 0, pb: 0 }} {...props}>
    {children}
  </MuiDialogActions>
);
DialogFooter.displayName = 'DialogFooter';

const DialogTitle = React.forwardRef<HTMLDivElement, React.ComponentProps<typeof MuiDialogTitle>>(
  (props, ref) => <MuiDialogTitle ref={ref} sx={{ px: 0, pt: 0 }} {...props} />,
);
DialogTitle.displayName = 'DialogTitle';

const DialogDescription = React.forwardRef<
  HTMLParagraphElement,
  React.ComponentProps<typeof Typography>
>((props, ref) => (
  <Typography ref={ref} component="p" variant="body2" color="text.secondary" {...props} />
));
DialogDescription.displayName = 'DialogDescription';

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogClose,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
};
