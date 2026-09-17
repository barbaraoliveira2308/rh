import { createTheme } from '@mui/material/styles';
import { brandTokens } from './brandTokens';

export const muiTheme = createTheme({
  palette: {
    primary: {
      main: brandTokens.colors.navy900,
      dark: brandTokens.colors.navy950,
      light: brandTokens.colors.navy700,
      contrastText: brandTokens.colors.white,
    },
    secondary: {
      main: brandTokens.colors.emerald600,
      dark: brandTokens.colors.emerald800,
      light: brandTokens.colors.mint400,
      contrastText: brandTokens.colors.white,
    },
    success: { main: brandTokens.colors.emerald600 },
    info: { main: brandTokens.colors.cyan500 },
    error: { main: brandTokens.colors.danger },
    warning: { main: brandTokens.colors.warning },
    background: {
      default: brandTokens.colors.slate50,
      paper: brandTokens.colors.white,
    },
    text: {
      primary: brandTokens.colors.ink,
      secondary: brandTokens.colors.slate700,
    },
  },
  shape: { borderRadius: 12 },
  typography: {
    fontFamily: 'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    h1: { fontFamily: 'Manrope, Inter, sans-serif', fontWeight: 700, letterSpacing: 0 },
    h2: { fontFamily: 'Manrope, Inter, sans-serif', fontWeight: 700, letterSpacing: 0 },
    h3: { fontFamily: 'Manrope, Inter, sans-serif', fontWeight: 700, letterSpacing: 0 },
    h4: {
      fontFamily: 'Manrope, Inter, sans-serif',
      fontSize: '1.5rem',
      fontWeight: 700,
      letterSpacing: 0,
    },
    h5: {
      fontFamily: 'Manrope, Inter, sans-serif',
      fontSize: '1.25rem',
      fontWeight: 700,
      letterSpacing: 0,
    },
    h6: {
      fontFamily: 'Manrope, Inter, sans-serif',
      fontSize: '1.125rem',
      fontWeight: 700,
      letterSpacing: 0,
    },
    button: {
      fontFamily: 'Manrope, Inter, sans-serif',
      textTransform: 'none',
      fontWeight: 700,
    },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        ':focus-visible': {
          outline: `3px solid ${brandTokens.colors.mint400}`,
          outlineOffset: 3,
        },
        body: {
          background: brandTokens.gradients.pageLight,
          color: brandTokens.colors.ink,
        },
      },
    },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: {
          minHeight: 40,
          borderRadius: 10,
          paddingInline: 16,
          fontSize: '0.875rem',
          '&.MuiButton-sizeSmall': { minHeight: 36, paddingInline: 12 },
          '&.MuiButton-sizeLarge': { minHeight: 44, paddingInline: 18 },
          '&.MuiButton-containedSecondary': {
            background: brandTokens.gradients.cta,
            '&:hover': { background: brandTokens.gradients.ctaHover },
          },
        },
      },
    },
    MuiTextField: {
      defaultProps: { variant: 'outlined', size: 'small' },
    },
    MuiOutlinedInput: {
      styleOverrides: { root: { minHeight: 48, borderRadius: 12 } },
    },
    MuiFormLabel: {
      styleOverrides: {
        root: { fontWeight: 700, color: brandTokens.colors.slate700 },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          border: `1px solid ${brandTokens.colors.slate200}`,
          boxShadow: brandTokens.shadows.md,
        },
      },
    },
    MuiChip: {
      styleOverrides: { root: { fontWeight: 700 } },
    },
    MuiDialog: {
      styleOverrides: { paper: { borderRadius: 16 } },
    },
    MuiTabs: {
      styleOverrides: {
        indicator: { height: 3, borderRadius: 3 },
      },
    },
  },
});
