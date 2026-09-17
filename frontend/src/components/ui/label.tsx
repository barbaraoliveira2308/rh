import * as React from 'react';
import FormLabel, { type FormLabelProps } from '@mui/material/FormLabel';

const Label = React.forwardRef<HTMLLabelElement, FormLabelProps>(({ className, ...props }, ref) => (
  <FormLabel ref={ref} className={className} component="label" {...props} />
));
Label.displayName = 'Label';

export { Label };
