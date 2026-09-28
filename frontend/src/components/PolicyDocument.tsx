import React from 'react';
import { Box, Chip, Stack, Typography } from '@mui/material';
import type { Policy } from '@/types/policies';

export function PolicyDocument({
  policy,
  showHeader = true,
  variant = 'default',
}: {
  policy: Policy;
  showHeader?: boolean;
  variant?: 'default' | 'sheet';
}): React.JSX.Element {
  const isSheet = variant === 'sheet';

  return (
    <Stack
      spacing={2.5}
      sx={
        isSheet
          ? {
              mx: 'auto',
              minHeight: { xs: 360, md: 480 },
              backgroundColor: 'transparent',
              color: '#303638',
              fontFamily: 'Georgia, "Times New Roman", serif',
            }
          : undefined
      }
    >
      {showHeader && (
        <Box>
          <Typography
            className="py-2"
            variant="h5"
            sx={isSheet ? { fontFamily: 'inherit', fontWeight: 700 } : undefined}
          >
            {policy.title}
          </Typography>
          <Typography color="text.secondary" variant="body2">
            {policy.category} · versão {policy.version}
          </Typography>
        </Box>
      )}
      {policy.tags && policy.tags.length > 0 && (
        <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 1 }}>
          {policy.tags.map((tag) => (
            <Chip key={tag} label={tag} size="small" />
          ))}
        </Stack>
      )}
      <Typography
        component="div"
        sx={{
          whiteSpace: 'pre-wrap',
          lineHeight: isSheet ? 1.95 : 1.8,
          fontSize: isSheet ? '1rem' : undefined,
        }}
      >
        {policy.content}
      </Typography>
    </Stack>
  );
}
