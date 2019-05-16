import {
  Column,
  ColumnCoords,
  Dimension,
  Range,
  RowCoords,
  Selection,
  SelectionType,
  SelectionUnit,
  Side
} from './types';
import { Reactive, reactive } from '../helper/reactive';

type ColumnWidths = { [key in Side]: number[] };

interface SelectionOptions {
  selectionUnit: SelectionUnit;
  columnCoords: ColumnCoords;
  column: Column;
  dimension: Dimension;
  rowCoords: RowCoords;
}

function getSortedRange(range: Range): Range {
  return range[0] > range[1] ? [range[1], range[0]] : range;
}

function getOwnSideColumnRange(columnRange: Range, side: Side, visibleFrozenCount: number) {
  let ownColumnRange: Range | null = null;

  if (side === 'L') {
    if (columnRange[0] < visibleFrozenCount) {
      ownColumnRange = [columnRange[0], Math.min(columnRange[1], visibleFrozenCount - 1)];
    }
  } else if (columnRange[1] >= visibleFrozenCount) {
    ownColumnRange = [
      Math.max(columnRange[0], visibleFrozenCount) - visibleFrozenCount,
      columnRange[1] - visibleFrozenCount
    ];
  }

  return ownColumnRange;
}

function getVerticalStyles(rowRange: Range, rowOffsets: number[], rowHeights: number[]) {
  const top = rowOffsets[rowRange[0]];
  const bottom = rowOffsets[rowRange[1]] + rowHeights[rowRange[1]];

  return { top, height: bottom - top };
}

function getHorizontalStyles(
  columnRange: Range | null,
  columnWidths: ColumnWidths,
  side: Side,
  cellBorderWidth: number
) {
  let left = 0;
  let width = 0;
  if (!columnRange) {
    return { left, width };
  }

  const widths = columnWidths[side];
  const startIndex = columnRange[0];
  let endIndex = columnRange[1];
  let i = 0;

  endIndex = Math.min(endIndex, widths.length - 1);

  for (; i <= endIndex; i += 1) {
    if (i < startIndex) {
      left += widths[i] + cellBorderWidth;
    } else {
      width += widths[i] + cellBorderWidth;
    }
  }
  width -= cellBorderWidth;

  return { left, width };
}

export function create({
  selectionUnit,
  rowCoords: { offsets: rowOffsets, heights: rowHeights },
  columnCoords: { widths: columnWidths },
  column: { visibleFrozenCount },
  dimension: { cellBorderWidth }
}: SelectionOptions): Reactive<Selection> {
  return reactive({
    inputRange: null,
    unit: selectionUnit,
    type: 'cell' as SelectionType,
    intervalIdForAutoScroll: null,
    get range(this: Selection) {
      if (!this.inputRange || !this.inputRange.row || !this.inputRange.column) {
        return null;
      }

      // @TODO: span 처리 필요
      return {
        row: getSortedRange(this.inputRange.row),
        column: getSortedRange(this.inputRange.column)
      };
    },
    get rangeBySide(this: Selection) {
      if (!this.range) {
        return null;
      }
      const { column, row } = this.range;

      return {
        L: { row, column: getOwnSideColumnRange(column!, 'L', visibleFrozenCount) },
        R: { row, column: getOwnSideColumnRange(column!, 'R', visibleFrozenCount) }
      };
    },
    get rangeAreaInfo(this: Selection) {
      if (!this.rangeBySide) {
        return null;
      }

      const { L: leftRange, R: rightRange } = this.rangeBySide;
      let leftSideStyles = null;
      let rightSideStyles = null;

      if (leftRange.row) {
        leftSideStyles = {
          ...getVerticalStyles(leftRange.row, rowOffsets, rowHeights),
          ...getHorizontalStyles(leftRange.column, columnWidths, 'L', cellBorderWidth)
        };
      }

      if (rightRange.row) {
        rightSideStyles = {
          ...getVerticalStyles(rightRange.row, rowOffsets, rowHeights),
          ...getHorizontalStyles(rightRange.column, columnWidths, 'R', cellBorderWidth)
        };
      }

      return {
        L: leftSideStyles,
        R: rightSideStyles
      };
    }
  });
}
