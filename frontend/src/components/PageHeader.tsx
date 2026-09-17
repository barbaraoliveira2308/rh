import Box from '@mui/material/Box';
import Breadcrumbs from '@mui/material/Breadcrumbs';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { Button } from '@/components/ui/button';

interface PageHeaderProps {
  title: string;
  description?: string;
  breadcrumb?: { label: string; href?: string }[];
  action?: {
    label: string;
    onClick: () => void;
    icon?: React.ReactNode;
  };
  className?: string;
}

export function PageHeader({
  title,
  description,
  breadcrumb,
  action,
  className,
}: PageHeaderProps): React.JSX.Element {
  return (
    <Stack
      className={className}
      direction={{ xs: 'column', sm: 'row' }}
      spacing={2}
      sx={{ mb: 3, alignItems: { sm: 'flex-start' }, justifyContent: 'space-between' }}
    >
      <Box>
        {breadcrumb && breadcrumb.length > 0 && (
          <Breadcrumbs sx={{ mb: 1 }}>
            {breadcrumb.map((item) =>
              item.href ? (
                <Link key={`${item.href}-${item.label}`} href={item.href} underline="hover">
                  {item.label}
                </Link>
              ) : (
                <Typography key={item.label} color="text.secondary" variant="body2">
                  {item.label}
                </Typography>
              ),
            )}
          </Breadcrumbs>
        )}
        <Typography component="h1" variant="h4" sx={{ fontWeight: 700 }}>
          {title}
        </Typography>
        {description && (
          <Typography color="text.secondary" sx={{ mt: 0.5 }} variant="body2">
            {description}
          </Typography>
        )}
      </Box>
      {action && (
        <Button onClick={action.onClick} sx={{ flexShrink: 0 }}>
          {action.icon && (
            <Box component="span" sx={{ mr: 1 }}>
              {action.icon}
            </Box>
          )}
          {action.label}
        </Button>
      )}
    </Stack>
  );
}
