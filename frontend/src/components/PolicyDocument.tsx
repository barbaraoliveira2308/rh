import React from 'react';
import { Box, Chip, Stack, Typography } from '@mui/material';
import type { Policy } from '@/types/policies';

export function PolicyDocument({ policy }: { policy: Policy }): React.JSX.Element {
  return (
    <Stack spacing={1.5}>
      <Box>
        <Typography variant="h5">{policy.title}</Typography>
        <Typography color="text.secondary" variant="body2">
          {policy.category} · versão {policy.version}
        </Typography>
      </Box>
      {policy.tags && policy.tags.length > 0 && (
        <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 1 }}>
          {policy.tags.map((tag) => (
            <Chip key={tag} label={tag} size="small" />
          ))}
        </Stack>
      )}
      <Typography component="div" sx={{ whiteSpace: 'pre-wrap' }}>
        {policy.content}
      </Typography>
    </Stack>
  );
}
