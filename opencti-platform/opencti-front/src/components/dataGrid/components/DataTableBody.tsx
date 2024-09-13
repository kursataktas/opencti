import React, { CSSProperties, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import * as R from 'ramda';
import DataTableHeaders from './DataTableHeaders';
import { useDataTableContext } from '../dataTableUtils';
import { DataTableBodyProps, DataTableLineProps, DataTableVariant, LocalStorageColumns } from '../dataTableTypes';
import DataTableLine, { DataTableLinesDummy } from './DataTableLine';
import { SELECT_COLUMN_SIZE } from './DataTableHeader';
import { useDataTableToggle } from '../dataTableHooks';

const DataTableBody = ({
  columns,
  redirectionMode,
  storageHelpers,
  settingsMessagesBannerHeight = 0,
  hasFilterComponent,
  sortBy,
  orderAsc,
  dataTableToolBarComponent,
  dataQueryArgs,
  pageStart,
  pageSize,
  hideHeaders = false,
}: DataTableBodyProps) => {
  const {
    rootRef,
    storageKey,
    useDataTableLocalStorage,
    variant,
    useDataTable,
    resolvePath,
    actions,
  } = useDataTableContext();

  const { data: queryData, isLoading, loadMore, hasMore } = useDataTable(dataQueryArgs);

  const resolvedData = useMemo(() => {
    if (!queryData) {
      return [];
    }
    return resolvePath(queryData).slice(pageStart, pageStart + pageSize);
  }, [queryData, pageStart, pageSize]);

  useEffect(() => {
    if (resolvePath(queryData).length < pageStart + pageSize && hasMore?.()) {
      loadMore?.(pageSize);
    }
  }, [resolvedData]);

  // TABLE HANDLING
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [localStorageColumns] = useDataTableLocalStorage<LocalStorageColumns>(`${storageKey}_columns`, {}, true);

  const startsWithSelect = columns.at(0)?.id === 'select';
  const endsWithNavigate = columns.at(-1)?.id === 'navigate';

  const {
    selectedElements,
    onToggleEntity,
  } = useDataTableToggle(storageKey);
  const onToggleShiftEntity: DataTableLineProps['onToggleShiftEntity'] = (currentIndex, currentEntity, event) => {
    if (selectedElements && !R.isEmpty(selectedElements)) {
      // Find the indexes of the first and last selected entities
      let firstIndex = R.findIndex(
        (n: { id: string }) => n.id === R.head(R.values(selectedElements))?.id,
        resolvedData,
      );
      if (currentIndex > firstIndex) {
        let entities: { id: string }[] = [];
        while (firstIndex <= currentIndex) {
          entities = [...entities, resolvedData[firstIndex]];
          firstIndex += 1;
        }
        const forcedRemove = R.values(selectedElements).filter(
          (n) => !entities.map((o) => o.id).includes(n.id),
        );
        return onToggleEntity(entities, event, forcedRemove);
      }
      let entities: { id: string }[] = [];
      while (firstIndex >= currentIndex) {
        entities = [...entities, resolvedData[firstIndex]];
        firstIndex -= 1;
      }
      const forcedRemove = R.values(selectedElements).filter(
        (n) => !entities.map((o) => o.id).includes(n.id),
      );
      return onToggleEntity(entities, event, forcedRemove);
    }
    return onToggleEntity(currentEntity, event);
  };

  const effectiveColumns = useMemo(
    () => {
      console.log(localStorageColumns);
      return columns.map((col) => {
        const localWidth = localStorageColumns[col.id]?.percentWidth;
        return {
          ...col,
          percentWidth: localWidth ?? col.percentWidth,
        };
      });
    },
    [columns, localStorageColumns],
  );

  // This offset is used to be able to determine column in percentage but
  // taking in account we don't want to take checkbox and actions columns in account.
  let offset = 0;
  if (startsWithSelect) offset += SELECT_COLUMN_SIZE;
  if (endsWithNavigate || actions) offset += SELECT_COLUMN_SIZE;
  const containerStyle: CSSProperties = {
    paddingLeft: `${offset}px`,
    transform: `translateX(-${offset}px)`,
  };

  const [tableHeight, setTableHeight] = useState(0);
  useLayoutEffect(() => {
    if (variant === DataTableVariant.widget) {
      if (!rootRef) {
        throw Error('Invalid configuration for widget list');
      }
      setTableHeight(rootRef.offsetHeight + 50);
    } else if (rootRef) {
      setTableHeight(rootRef.offsetHeight - 42); // SIZE OF CONTAINER - Nb Elements - Line Size
    } else {
      const rootHeight = (document.getElementById('root')?.offsetHeight ?? 0) - settingsMessagesBannerHeight;
      const filtersHeight = (hasFilterComponent && document.getElementById('filter-container')?.children.length) ? 230 : 200;
      const tabsHeight = document.getElementById('tabs-container')?.children.length ? 50 : 0;
      setTableHeight(rootHeight - filtersHeight - tabsHeight);
    }
  }, [setTableHeight, settingsMessagesBannerHeight]);

  return (
    <div
      style={{
        overflowX: 'auto',
        maxHeight: `${tableHeight}px`,
      }}
    >
      <div ref={containerRef} style={containerStyle}>
        {(variant !== DataTableVariant.widget && !hideHeaders) && (
          <DataTableHeaders
            effectiveColumns={effectiveColumns}
            sortBy={sortBy}
            orderAsc={orderAsc}
            dataTableToolBarComponent={dataTableToolBarComponent}
            containerRef={containerRef}
          />
        )}

        {/* If we have perf issues we should find a way to memoize this */}
        {resolvedData.map((row: { id: string }, index: number) => {
          return (
            <DataTableLine
              key={row.id}
              row={row}
              redirectionMode={redirectionMode}
              storageHelpers={storageHelpers}
              effectiveColumns={effectiveColumns}
              index={index}
              onToggleShiftEntity={onToggleShiftEntity}
            />
          );
        })}
        {isLoading && <DataTableLinesDummy number={Math.max(pageSize, 25)} />}
      </div>
    </div>
  );
};

export default DataTableBody;
