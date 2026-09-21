import { createTheme } from '@mui/material/styles';

export const muiTheme = createTheme({
  palette: {
    primary: {
      main: '#1d3b5a',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#2f7f7a',
      contrastText: '#ffffff',
    },
    error: {
      main: '#b42318',
    },
    background: {
      default: '#f8fafc',
      paper: '#ffffff',
    },
  },
  shape: {
    borderRadius: 8,
  },
  typography: {
    fontFamily: '"DM Sans", "Segoe UI", sans-serif',
    button: {
      textTransform: 'none',
      fontWeight: 600,
    },
  },
  components: {
    MuiButton: {
      defaultProps: {
        disableElevation: true,
      },
    },
  },
});
