'use client';

import * as React from 'react';
import {
  Badge,
  Box,
  Divider,
  IconButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import FilterListIcon from '@mui/icons-material/FilterList';
import PrintIcon from '@mui/icons-material/Print';
import RefreshIcon from '@mui/icons-material/Refresh';
import TuneIcon from '@mui/icons-material/Tune';
import ViewColumnIcon from '@mui/icons-material/ViewColumn';

import { SearchField } from '@/components/SearchField';

export interface TableToolbarProps {
  /**
   * Título exibido no lado esquerdo da toolbar.
   */
  title?: string;

  /**
   * Texto atual da pesquisa.
   */
  searchValue: string;

  /**
   * Executada sempre que o texto da busca for alterado.
   */
  onSearchChange: (value: string) => void;

  /**
   * Placeholder do campo de pesquisa.
   */
  searchPlaceholder?: string;

  /**
   * Quantidade de filtros ativos.
   * Quando maior que zero, exibe um indicador no botão de filtros.
   */
  activeFiltersCount?: number;

  /**
   * Abre o painel/modal/menu de filtros.
   */
  onFilterClick?: () => void;

  /**
   * Abre o painel/modal/menu de seleção de colunas.
   */
  onColumnsClick?: () => void;

  /**
   * Abre configurações de visualização, como densidade ou ordenação.
   */
  onViewOptionsClick?: () => void;

  /**
   * Atualiza os dados da tabela.
   */
  onRefresh?: () => void;

  /**
   * Exporta os dados no formato CSV.
   */
  onExportCsv?: () => void;

  /**
   * Imprime os dados da tabela.
   */
  onPrint?: () => void;

  /**
   * Mantido por compatibilidade com sua implementação atual.
   * Caso `onExportCsv` não seja informado, este callback será usado para CSV.
   */
  onExport?: () => void;

  /**
   * Desabilita toda a toolbar.
   */
  disabled?: boolean;

  /**
   * Exibe ou esconde a busca.
   */
  showSearch?: boolean;

  /**
   * Permite inserir ações extras antes da área de exportação.
   */
  actions?: React.ReactNode;
}

interface ToolbarIconButtonProps {
  title: string;
  children: React.ReactNode;
  disabled?: boolean;
  onClick?: () => void;
  'aria-label': string;
}

function ToolbarIconButton({
  title,
  children,
  disabled,
  onClick,
  'aria-label': ariaLabel,
}: ToolbarIconButtonProps): React.JSX.Element {
  return (
    <Tooltip title={title}>
      <span>
        <IconButton aria-label={ariaLabel} size="small" disabled={disabled} onClick={onClick}>
          {children}
        </IconButton>
      </span>
    </Tooltip>
  );
}

export function TableToolbar({
  title,
  searchValue,
  onSearchChange,
  searchPlaceholder = 'Pesquisar...',
  activeFiltersCount = 0,
  onFilterClick,
  onColumnsClick,
  onViewOptionsClick,
  onRefresh,
  onExportCsv,
  onPrint,
  onExport,
  disabled = false,
  showSearch = true,
  actions,
}: TableToolbarProps): React.JSX.Element {
  const [exportAnchorEl, setExportAnchorEl] = React.useState<HTMLElement | null>(null);

  const exportMenuOpen = Boolean(exportAnchorEl);
  const exportCsvHandler = onExportCsv ?? onExport;

  const handleOpenExportMenu = (event: React.MouseEvent<HTMLButtonElement>): void => {
    setExportAnchorEl(event.currentTarget);
  };

  const handleCloseExportMenu = (): void => {
    setExportAnchorEl(null);
  };

  const handleExportCsv = (): void => {
    exportCsvHandler?.();
    handleCloseExportMenu();
  };

  const handlePrint = (): void => {
    onPrint?.();
    handleCloseExportMenu();
  };

  const hasTableActions = Boolean(
    onColumnsClick ??
    onFilterClick ??
    onViewOptionsClick ??
    onRefresh ??
    actions ??
    exportCsvHandler ??
    onPrint,
  );

  return (
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      spacing={1}
      sx={{
        alignItems: { xs: 'stretch', sm: 'center' },
        px: 1.5,
        py: 1,
        borderBottom: 1,
        borderColor: 'divider',
        minHeight: 56,
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          flex: 1,
          minWidth: 0,
        }}
      >
        {title ? (
          <Typography
            component="h2"
            variant="subtitle1"
            sx={{
              fontWeight: 600,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {title}
          </Typography>
        ) : null}
      </Box>

      {showSearch ? (
        <Box
          sx={{
            width: {
              xs: '100%',
              sm: 260,
            },
          }}
        >
          <SearchField
            value={searchValue}
            onChange={onSearchChange}
            placeholder={searchPlaceholder}
            disabled={disabled}
          />
        </Box>
      ) : null}

      {hasTableActions ? (
        <Stack
          direction="row"
          spacing={0.25}
          sx={{
            alignItems: 'center',
            justifyContent: { xs: 'flex-end', sm: 'initial' },
          }}
        >
          {onColumnsClick ? (
            <ToolbarIconButton
              title="Gerenciar colunas"
              aria-label="Gerenciar colunas"
              disabled={disabled}
              onClick={onColumnsClick}
            >
              <ViewColumnIcon fontSize="small" />
            </ToolbarIconButton>
          ) : null}

          {onFilterClick ? (
            <Tooltip title="Filtros">
              <span>
                <IconButton
                  aria-label="Abrir filtros"
                  size="small"
                  disabled={disabled}
                  onClick={onFilterClick}
                >
                  <Badge color="primary" variant="dot" invisible={activeFiltersCount <= 0}>
                    <FilterListIcon fontSize="small" />
                  </Badge>
                </IconButton>
              </span>
            </Tooltip>
          ) : null}

          {onViewOptionsClick ? (
            <ToolbarIconButton
              title="Opções de visualização"
              aria-label="Abrir opções de visualização"
              disabled={disabled}
              onClick={onViewOptionsClick}
            >
              <TuneIcon fontSize="small" />
            </ToolbarIconButton>
          ) : null}

          {onRefresh ? (
            <ToolbarIconButton
              title="Atualizar dados"
              aria-label="Atualizar dados"
              disabled={disabled}
              onClick={onRefresh}
            >
              <RefreshIcon fontSize="small" />
            </ToolbarIconButton>
          ) : null}

          {actions}

          {(exportCsvHandler ?? onPrint) && (
            <>
              <Divider orientation="vertical" flexItem sx={{ mx: 0.5, my: 0.5 }} />

              <Tooltip title="Exportar">
                <span>
                  <IconButton
                    id="table-export-menu-trigger"
                    aria-label="Abrir opções de exportação"
                    aria-controls={exportMenuOpen ? 'table-export-menu' : undefined}
                    aria-haspopup="true"
                    aria-expanded={exportMenuOpen ? 'true' : undefined}
                    size="small"
                    disabled={disabled}
                    onClick={handleOpenExportMenu}
                  >
                    <FileDownloadIcon fontSize="small" />
                  </IconButton>
                </span>
              </Tooltip>

              <Menu
                id="table-export-menu"
                anchorEl={exportAnchorEl}
                open={exportMenuOpen}
                onClose={handleCloseExportMenu}
                anchorOrigin={{
                  vertical: 'bottom',
                  horizontal: 'right',
                }}
                transformOrigin={{
                  vertical: 'top',
                  horizontal: 'right',
                }}
                slotProps={{
                  list: {
                    'aria-labelledby': 'table-export-menu-trigger',
                  },
                }}
              >
                {exportCsvHandler ? (
                  <MenuItem onClick={handleExportCsv}>
                    <ListItemIcon>
                      <DownloadIcon fontSize="small" />
                    </ListItemIcon>

                    <ListItemText>Exportar CSV</ListItemText>
                  </MenuItem>
                ) : null}

                {onPrint ? (
                  <MenuItem onClick={handlePrint}>
                    <ListItemIcon>
                      <PrintIcon fontSize="small" />
                    </ListItemIcon>

                    <ListItemText>Imprimir</ListItemText>
                  </MenuItem>
                ) : null}
              </Menu>
            </>
          )}
        </Stack>
      ) : null}
    </Stack>
  );
}
