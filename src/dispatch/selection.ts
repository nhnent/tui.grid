import { clamp } from '../helper/common';
import { getEventBus } from '../instance';
import { isSameInputRange } from '../helper/selection';
import GridEvent from '../event/gridEvent';
import { Store, Range, SelectionRange, Selection } from '../store/types';

export function changeSelectionRange(
  selection: Selection,
  inputRange: SelectionRange | null,
  id: number
) {
  if (!isSameInputRange(selection.inputRange, inputRange)) {
    selection.inputRange = inputRange;
    const eventBus = getEventBus(id);
    const gridEvent = new GridEvent({ range: selection.range });
    eventBus.trigger('selection', gridEvent);
  }
}

export function setSelection(store: Store, range: { start: Range; end: Range }) {
  const {
    selection,
    data: { viewData },
    column: { visibleColumns },
    id
  } = store;
  const rowLength = viewData.length;
  const columnLength = visibleColumns.length;

  const startRowIndex = clamp(range.start[0], 0, rowLength - 1);
  const endRowIndex = clamp(range.end[0], 0, rowLength - 1);
  const startColumnIndex = clamp(range.start[1], 0, columnLength - 1);
  const endColumnIndex = clamp(range.end[1], 0, columnLength - 1);
  const inputRange: SelectionRange = {
    row: [startRowIndex, endRowIndex],
    column: [startColumnIndex, endColumnIndex]
  };

  changeSelectionRange(selection, inputRange, id);
}
