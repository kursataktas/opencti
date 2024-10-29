import React, { CSSProperties, FunctionComponent, useMemo, useRef, useState } from 'react';
import Checkbox from '@mui/material/Checkbox';
import { DragIndicatorOutlined } from '@mui/icons-material';
import Menu from '@mui/material/Menu';
import { DragDropContext, Draggable, DraggableLocation, Droppable } from '@hello-pangea/dnd';
import MenuItem from '@mui/material/MenuItem';
import { PopoverProps } from '@mui/material/Popover/Popover';
import { useTheme } from '@mui/styles';
import { DataTableColumn, DataTableColumns, DataTableHeadersProps, LocalStorageColumns } from '../dataTableTypes';
import DataTableHeader, { SELECT_COLUMN_SIZE } from './DataTableHeader';
import { useDataTableContext } from '../dataTableUtils';
import type { Theme } from '../../Theme';

const DataTableHeaders: FunctionComponent<DataTableHeadersProps> = ({
  effectiveColumns,
  dataTableToolBarComponent,
  sortBy,
  orderAsc,
}) => {
  const theme = useTheme<Theme>();
  const {
    storageKey,
    columns,
    setColumns,
    useDataTableToggle,
    useDataTableLocalStorage,
    formatter,
    availableFilterKeys,
    onAddFilter,
    onSort,
    disableToolBar,
    disableSelectAll,
    actions,
  } = useDataTableContext();
  const { t_i18n } = formatter;
  const containerRef = useRef<HTMLDivElement | null>(null);

  const {
    selectAll,
    numberOfSelectedElements,
    handleToggleSelectAll,
  } = useDataTableToggle(storageKey);

  const [, setLocalStorageColumns] = useDataTableLocalStorage<LocalStorageColumns>(`${storageKey}_columns`, {}, true, true);

  const [activeColumn, setActiveColumn] = useState<DataTableColumn | undefined>();
  const [anchorEl, setAnchorEl] = useState<PopoverProps['anchorEl']>(null);
  const handleClose = () => {
    setAnchorEl(null);
    setActiveColumn(undefined);
  };

  const handleToggleVisibility = (columnId: string) => {
    const newColumns = [...effectiveColumns];
    const currentColumn = newColumns.find(({ id }) => id === columnId);
    if (!currentColumn) {
      return;
    }
    currentColumn.visible = currentColumn.visible ?? true;
    setLocalStorageColumns((curr: LocalStorageColumns) => ({ ...curr, [columnId]: { ...curr[columnId], visible: currentColumn.visible } }));
    setColumns(newColumns);
  };

  const draggableColumns = useMemo(() => effectiveColumns.filter(({ id }) => !['select', 'navigate'].includes(id)), [columns]);

  const hasSelectCheckboxes = effectiveColumns.some(({ id }) => id === 'select');
  const hasSelectedElements = numberOfSelectedElements > 0 || selectAll;
  const endsWithNavigate = columns.at(-1)?.id === 'navigate';

  let offset = 0;
  if (hasSelectCheckboxes) offset += SELECT_COLUMN_SIZE;
  if (endsWithNavigate || actions) offset += SELECT_COLUMN_SIZE;

  const checkboxStyle: CSSProperties = {
    background: hasSelectedElements ? theme.palette.background.accent : 'unset',
    width: SELECT_COLUMN_SIZE,
  };

  return (
    <div ref={containerRef} style={{ paddingRight: offset }}>
      <div style={{ display: 'flex' }}>
        {hasSelectCheckboxes && (
          <div data-testid="dataTableCheckAll" style={checkboxStyle}>
            <Checkbox
              checked={selectAll}
              onChange={handleToggleSelectAll}
              disabled={!handleToggleSelectAll || disableSelectAll}
            />
          </div>
        )}
        {numberOfSelectedElements > 0 && !disableToolBar ? dataTableToolBarComponent : (
          <>
            {anchorEl && (
              <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleClose}>
                {effectiveColumns.some(({ id }) => id === 'todo-navigate') && (
                  <DragDropContext
                    key={(new Date()).toString()}
                    onDragEnd={({ draggableId, source, destination }) => {
                      const result = Array.from(draggableColumns);
                      const [removed] = result.splice(source.index, 1);
                      result.splice((destination as DraggableLocation).index, 0, removed);

                      const newColumns: DataTableColumns = [
                        effectiveColumns.at(0),
                        ...(result.map((c, index) => {
                          const currentColumn = effectiveColumns.find(({ id }) => id === c.id);
                          return ({ ...currentColumn, order: index });
                        })),
                        effectiveColumns.at(-1),
                      ] as DataTableColumns;

                      setColumns(newColumns);
                      setLocalStorageColumns((curr: LocalStorageColumns) => ({ ...curr, [draggableId]: { ...curr[draggableId], order: destination?.index } }));
                    }}
                  >
                    <Droppable droppableId="droppable-list">
                      {(provided) => (
                        <div ref={provided.innerRef} {...provided.droppableProps}>
                          {draggableColumns.map((c, index) => (
                            <Draggable
                              key={index}
                              draggableId={c.id}
                              index={index}
                            >
                              {(item) => (
                                <MenuItem
                                  ref={item.innerRef}
                                  {...item.draggableProps}
                                  {...item.dragHandleProps}
                                >
                                  <DragIndicatorOutlined fontSize="small" />
                                  <Checkbox
                                    onClick={() => handleToggleVisibility(c.id)}
                                    checked={c.visible}
                                  />
                                  {c.label}
                                </MenuItem>
                              )}
                            </Draggable>
                          ))}
                          {provided.placeholder}
                        </div>
                      )}
                    </Droppable>
                  </DragDropContext>
                )}
                {/* <MenuItem onClick={() => handleToggleVisibility(column.id)}>{t_i18n('Hide column')}</MenuItem> */}
                {activeColumn?.isSortable && (<MenuItem onClick={() => onSort(activeColumn.id, true)}>{t_i18n('Sort Asc')}</MenuItem>)}
                {activeColumn?.isSortable && (<MenuItem onClick={() => onSort(activeColumn.id, false)}>{t_i18n('Sort Desc')}</MenuItem>)}
                {(activeColumn && availableFilterKeys?.includes(activeColumn.id)) && (
                  <MenuItem
                    onClick={() => {
                      onAddFilter(activeColumn.id);
                      handleClose();
                    }}
                  >
                    {t_i18n('Add filtering')}
                  </MenuItem>
                )}
              </Menu>
            )}
            {effectiveColumns
              .filter(({ id }) => !['select', 'navigate'].includes(id))
              .map((column) => (
                <DataTableHeader
                  key={column.id}
                  column={column}
                  setAnchorEl={setAnchorEl}
                  isActive={activeColumn?.id === column.id}
                  setActiveColumn={setActiveColumn}
                  setLocalStorageColumns={setLocalStorageColumns}
                  containerRef={containerRef}
                  sortBy={sortBy === column.id}
                  orderAsc={!!orderAsc}
                />
              ))}
            <div style={{ width: '42px', flex: '0 0 auto' }} />
          </>
        )}
      </div>
    </div>
  );
};

export default DataTableHeaders;
