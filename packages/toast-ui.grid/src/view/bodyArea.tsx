import { h, Component } from 'preact';
import { Side } from '@t/store/focus';
import { createDraggableInfo, DraggableInfo, getMovedPosAndIndex } from '../query/draggable';
import { RowKey } from '@t/store/data';
import { PagePosition, DragStartData } from '@t/store/selection';
import { BodyRows } from './bodyRows';
import { ColGroup } from './colGroup';
import {
  cls,
  getCoordinateWithOffset,
  setCursorStyle,
  hasClass,
  isDatePickerElement,
  findParent,
  getCellAddress,
} from '../helper/dom';
import { DispatchProps } from '../dispatch/create';
import { connect } from './hoc';
import { FocusLayer } from './focusLayer';
import { SelectionLayer } from './selectionLayer';
import { some, debounce } from '../helper/common';
import { EditingLayer } from './editingLayer';
import GridEvent from '../event/gridEvent';
import { getEventBus, EventBus } from '../event/eventBus';

interface OwnProps {
  side: Side;
}

interface StoreProps {
  bodyHeight: number;
  totalRowHeight: number;
  totalColumnWidth: number;
  scrollTop: number;
  scrollLeft: number;
  scrollXHeight: number;
  offsetTop: number;
  offsetLeft: number;
  dummyRowCount: number;
  scrollX: boolean;
  scrollY: boolean;
  cellBorderWidth: number;
  eventBus: EventBus;
  hasTreeColumn: boolean;
}

type Props = OwnProps & StoreProps & DispatchProps;

type Overflow = 'hidden' | 'scroll' | 'auto';

interface AreaStyle {
  height: number;
  overflowX?: Overflow;
  overflowY?: Overflow;
}

interface MovedIndexInfo {
  index: number;
  rowKey: RowKey;
  appended?: boolean;
}

// only updates when these props are changed
// for preventing unnecessary rendering when scroll changes
const PROPS_FOR_UPDATE: (keyof StoreProps)[] = [
  'bodyHeight',
  'totalRowHeight',
  'offsetLeft',
  'offsetTop',
  'totalColumnWidth',
];
// Minimum distance (pixel) to detect if user wants to drag when moving mouse with button pressed.
const MIN_DISTANCE_FOR_DRAG = 10;
const ADDITIONAL_RANGE = 3;
const DRAGGING_CLASS = 'dragging';
const PARENT_CELL_CLASS = 'parent-cell';
const DRAGGABLE_COLUMN_NAME = '_draggable';

class BodyAreaComp extends Component<Props> {
  private el?: HTMLElement;

  private boundingRect?: { top: number; left: number };

  private dragStartData: DragStartData = {
    pageX: null,
    pageY: null,
  };

  private prevScrollLeft = 0;

  // draggable info when start to move the row
  private draggableInfo: DraggableInfo | null = null;

  // the index info to move row through drag
  private movedIndexInfo: MovedIndexInfo | null = null;

  private scrollToNextDebounced = debounce(() => {
    this.props.dispatch('scrollToNext');
  }, 200);

  private handleScroll = (ev: UIEvent) => {
    const { scrollLeft, scrollTop, scrollHeight, clientHeight } = ev.target as HTMLElement;
    const { dispatch, eventBus, side } = this.props;

    dispatch('setScrollTop', scrollTop);
    if (side === 'R') {
      dispatch('setScrollLeft', scrollLeft);
      if (
        scrollTop > 0 &&
        scrollHeight - scrollTop === clientHeight &&
        this.prevScrollLeft === scrollLeft
      ) {
        const gridEvent = new GridEvent();
        /**
         * Occurs when scroll at the bottommost
         * @event Grid#scrollEnd
         * @property {Grid} instance - Current grid instance
         */
        eventBus.trigger('scrollEnd', gridEvent);

        this.scrollToNextDebounced();
      }
      this.prevScrollLeft = scrollLeft;
    }
  };

  private dragRow = (ev: MouseEvent) => {
    const [pageX, pageY] = getCoordinateWithOffset(ev.pageX, ev.pageY);

    if (this.moveEnoughToTriggerDragEvent({ pageX, pageY })) {
      const { el, boundingRect, props } = this;
      const { index, offsetTop, height, targetRow } = getMovedPosAndIndex(this.context.store, {
        scrollTop: el!.scrollTop,
        top: boundingRect!.top,
        pageY,
      });
      const rowKeyToMove = targetRow.rowKey;
      const { row, rowKey, line } = this.draggableInfo!;

      row.style.top = `${offsetTop}px`;

      const gridEvent = new GridEvent({ rowKey, currentRowKey: rowKeyToMove });
      /**
       * Occurs when dragging the row
       * @event Grid#drag
       * @property {Grid} instance - Current grid instance
       * @property {RowKey} rowKey - The rowKey of the dragging row
       * @property {RowKey} currentRowKey - The rowKey of the row at current dragging position
       */
      this.props.eventBus.trigger('drag', gridEvent);

      if (props.hasTreeColumn) {
        if (this.movedIndexInfo) {
          this.props.dispatch('removeRowClassName', this.movedIndexInfo!.rowKey, PARENT_CELL_CLASS);
        }
        if (Math.abs(height - offsetTop) < ADDITIONAL_RANGE) {
          line.style.top = `${height}px`;
          line.style.display = 'block';

          this.movedIndexInfo = { index, rowKey: rowKeyToMove };
        } else {
          line.style.display = 'none';
          this.movedIndexInfo = { index, appended: true, rowKey: rowKeyToMove };
          this.props.dispatch('addRowClassName', rowKeyToMove, PARENT_CELL_CLASS);
        }
      } else {
        this.movedIndexInfo = { index, rowKey: rowKeyToMove };
        this.props.dispatch('moveRow', rowKey, index);
      }
    }
  };

  private startToDragRow = (pageY: number, top: number, scrollTop: number) => {
    const container = this.el!.parentElement!.parentElement!;
    const draggableInfo = createDraggableInfo(this.context.store, {
      pageY,
      top,
      scrollTop,
      container,
    });

    if (draggableInfo) {
      const { row, rowKey, line } = draggableInfo;
      const gridEvent = new GridEvent({ rowKey, floatingRow: row });
      /**
       * Occurs when starting to drag the row
       * @event Grid#dragStart
       * @property {Grid} instance - Current grid instance
       * @property {RowKey} rowKey - The rowKey of the row to drag
       */
      this.props.eventBus.trigger('dragStart', gridEvent);

      if (!gridEvent.isStopped()) {
        this.draggableInfo = draggableInfo;
        container.appendChild(row);
        if (this.props.hasTreeColumn) {
          container!.appendChild(line);
        }

        this.props.dispatch('addRowClassName', rowKey, DRAGGING_CLASS);
        this.props.dispatch('setFocusInfo', null, null, false);

        document.addEventListener('mousemove', this.dragRow);
        document.addEventListener('mouseup', this.dropRow);
        document.addEventListener('selectstart', this.handleSelectStart);
      }
    }
  };

  private handleMouseDown = (ev: MouseEvent) => {
    const targetElement = ev.target as HTMLElement;
    if (!this.el || targetElement === this.el) {
      return;
    }

    const { side, dispatch } = this.props;

    if (hasClass(targetElement, 'cell-dummy')) {
      dispatch('saveAndFinishEditing');
      dispatch('initFocus');
      dispatch('initSelection');
      return;
    }

    const { el } = this;
    const { shiftKey } = ev;
    const [pageX, pageY] = getCoordinateWithOffset(ev.pageX, ev.pageY);
    const { scrollTop, scrollLeft } = el;
    const { top, left } = el.getBoundingClientRect();
    this.boundingRect = { top, left };

    if (getCellAddress(targetElement)?.columnName === DRAGGABLE_COLUMN_NAME) {
      this.startToDragRow(pageY, top, scrollTop);
      return;
    }

    if (!isDatePickerElement(targetElement) && !findParent(targetElement, 'layer-editing')) {
      dispatch(
        'mouseDownBody',
        { scrollTop, scrollLeft, side, ...this.boundingRect },
        { pageX, pageY, shiftKey }
      );
    }

    this.dragStartData = { pageX, pageY };
    setCursorStyle('default');
    document.addEventListener('mousemove', this.handleMouseMove);
    document.addEventListener('mouseup', this.clearDocumentEvents);
    document.addEventListener('selectstart', this.handleSelectStart);
  };

  private moveEnoughToTriggerDragEvent = (current: PagePosition) => {
    const dx = Math.abs(this.dragStartData.pageX! - current.pageX!);
    const dy = Math.abs(this.dragStartData.pageY! - current.pageY!);
    const movedDistance = Math.round(Math.sqrt(Math.pow(dx, 2) + Math.pow(dy, 2)));

    return movedDistance >= MIN_DISTANCE_FOR_DRAG;
  };

  private handleSelectStart = (ev: Event) => {
    ev.preventDefault();
  };

  private handleMouseMove = (ev: MouseEvent) => {
    const [pageX, pageY] = getCoordinateWithOffset(ev.pageX, ev.pageY);
    if (this.moveEnoughToTriggerDragEvent({ pageX, pageY })) {
      const { el, boundingRect, props } = this;
      const { scrollTop, scrollLeft } = el!;
      const { side, dispatch } = props;

      dispatch(
        'dragMoveBody',
        this.dragStartData as PagePosition,
        { pageX, pageY },
        { scrollTop, scrollLeft, side, ...boundingRect! }
      );
    }
  };

  private dropRow = () => {
    const { hasTreeColumn } = this.props;
    const { rowKey } = this.draggableInfo!;

    if (this.movedIndexInfo) {
      const { index, appended } = this.movedIndexInfo;

      const gridEvent = new GridEvent({ rowKey, currentRowKey: this.movedIndexInfo.rowKey });
      /**
       * Occurs when droppring the row
       * @event Grid#drop
       * @property {Grid} instance - Current grid instance
       * @property {RowKey} rowKey - The rowKey of the dragging row
       * @property {RowKey} currentRowKey - The rowKey of the row at current dragging position
       */
      this.props.eventBus.trigger('drop', gridEvent);

      if (!gridEvent.isStopped()) {
        if (hasTreeColumn) {
          this.props.dispatch('moveTreeRow', rowKey, index, { appended: !!appended });
        } else {
          this.props.dispatch('moveRow', rowKey, index);
        }
      }
    }
    this.props.dispatch('removeRowClassName', rowKey, DRAGGING_CLASS);
    if (this.movedIndexInfo) {
      this.props.dispatch('removeRowClassName', this.movedIndexInfo.rowKey, PARENT_CELL_CLASS);
    }
    // clear floating element and draggable info
    this.clearDraggableInfo();
  };

  private clearDraggableInfo() {
    const { row, line } = this.draggableInfo!;

    row.parentElement!.removeChild(row);

    if (this.props.hasTreeColumn) {
      line.parentElement!.removeChild(line);
    }

    this.draggableInfo = null;
    this.movedIndexInfo = null;

    document.removeEventListener('mousemove', this.dragRow);
    document.removeEventListener('mouseup', this.dropRow);
    document.removeEventListener('selectstart', this.handleSelectStart);
  }

  private clearDocumentEvents = () => {
    this.dragStartData = { pageX: null, pageY: null };
    this.props.dispatch('dragEnd');

    setCursorStyle('');
    document.removeEventListener('mousemove', this.handleMouseMove);
    document.removeEventListener('mouseup', this.clearDocumentEvents);
    document.removeEventListener('selectstart', this.handleSelectStart);
  };

  shouldComponentUpdate(nextProps: Props) {
    const currProps = this.props;

    return some((propName) => nextProps[propName] !== currProps[propName], PROPS_FOR_UPDATE);
  }

  componentWillReceiveProps(nextProps: Props) {
    const { scrollTop, scrollLeft } = nextProps;

    this.el!.scrollTop = scrollTop;
    this.el!.scrollLeft = scrollLeft;
  }

  public render({
    side,
    bodyHeight,
    totalRowHeight,
    totalColumnWidth,
    scrollXHeight,
    offsetTop,
    offsetLeft,
    dummyRowCount,
    scrollX,
    scrollY,
    cellBorderWidth,
  }: Props) {
    const areaStyle: AreaStyle = { height: bodyHeight };
    if (!scrollX) {
      areaStyle.overflowX = 'hidden';
    }
    if (!scrollY && side === 'R') {
      areaStyle.overflowY = 'hidden';
    }
    const tableContainerStyle = {
      top: totalRowHeight ? offsetTop : 0,
      left: totalRowHeight ? offsetLeft : 0,
      height: dummyRowCount ? bodyHeight - scrollXHeight : '',
      overflow: dummyRowCount ? 'hidden' : 'visible',
    };
    const containerStyle = {
      width: totalColumnWidth + (side === 'R' ? 0 : cellBorderWidth),
      height: totalRowHeight ? totalRowHeight + cellBorderWidth : '100%',
    };

    return (
      <div
        class={cls('body-area')}
        style={areaStyle}
        onScroll={this.handleScroll}
        onMouseDown={this.handleMouseDown}
        ref={(el) => {
          this.el = el;
        }}
      >
        <div class={cls('body-container')} style={containerStyle}>
          <div class={cls('table-container')} style={tableContainerStyle}>
            <table class={cls('table')}>
              <ColGroup side={side} useViewport={true} />
              <BodyRows side={side} />
            </table>
          </div>
          <FocusLayer side={side} />
          <SelectionLayer side={side} />
          <EditingLayer side={side} />
        </div>
      </div>
    );
  }
}

export const BodyArea = connect<StoreProps, OwnProps>((store, { side }) => {
  const { columnCoords, rowCoords, dimension, viewport, id, column } = store;
  const { totalRowHeight } = rowCoords;
  const { totalColumnWidth } = columnCoords;
  const { bodyHeight, scrollXHeight, scrollX, scrollY, cellBorderWidth } = dimension;
  const { offsetLeft, offsetTop, scrollTop, scrollLeft, dummyRowCount } = viewport;

  return {
    bodyHeight,
    totalRowHeight,
    offsetTop,
    scrollTop,
    totalColumnWidth: totalColumnWidth[side],
    offsetLeft: side === 'L' ? 0 : offsetLeft,
    scrollLeft: side === 'L' ? 0 : scrollLeft,
    scrollXHeight,
    dummyRowCount,
    scrollX,
    scrollY,
    cellBorderWidth,
    eventBus: getEventBus(id),
    hasTreeColumn: !!column.treeColumnName,
  };
})(BodyAreaComp);
