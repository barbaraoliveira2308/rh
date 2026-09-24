import * as React from 'react';
import MuiCard, { type CardProps as MuiCardProps } from '@mui/material/Card';
import MuiCardContent from '@mui/material/CardContent';
import MuiCardHeader from '@mui/material/CardHeader';
import MuiCardActions from '@mui/material/CardActions';
import MuiTypography, { type TypographyProps } from '@mui/material/Typography';

const Card = React.forwardRef<HTMLDivElement, MuiCardProps>(({ sx, ...props }, ref) => (
  <MuiCard ref={ref} sx={sx} {...props} />
));
Card.displayName = 'Card';

const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ children, ...props }, ref) => <MuiCardHeader ref={ref} title={children} {...props} />,
);
CardHeader.displayName = 'CardHeader';

const CardTitle = React.forwardRef<HTMLHeadingElement, TypographyProps>(
  ({ children, ...props }, ref) => (
    <MuiTypography ref={ref} component="h3" variant="h6" {...props}>
      {children}
    </MuiTypography>
  ),
);
CardTitle.displayName = 'CardTitle';

const CardDescription = React.forwardRef<HTMLParagraphElement, TypographyProps>(
  ({ children, ...props }, ref) => (
    <MuiTypography ref={ref} component="p" variant="body2" color="text.secondary" {...props}>
      {children}
    </MuiTypography>
  ),
);
CardDescription.displayName = 'CardDescription';

const CardContent = React.forwardRef<HTMLDivElement, React.ComponentProps<typeof MuiCardContent>>(
  (props, ref) => <MuiCardContent ref={ref} {...props} />,
);
CardContent.displayName = 'CardContent';

const CardFooter = React.forwardRef<HTMLDivElement, React.ComponentProps<typeof MuiCardActions>>(
  (props, ref) => <MuiCardActions ref={ref} {...props} />,
);
CardFooter.displayName = 'CardFooter';

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent };
