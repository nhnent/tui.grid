import { h, Component } from 'preact';
import { connect } from './hoc';
import { DispatchProps } from '../dispatch/create';
import { cls } from '../helper/dom';
import {
  ActiveColumnAddress,
  ColumnInfo,
  Filter,
  FilterLayerState,
  NumberFilterCode,
  TextFilterCode
} from '../store/types';
import { FILTER_DEBOUNCE_TIME, filterSelectOption } from '../helper/filter';
import { debounce } from '../helper/common';

type SelectOption = { [key in NumberFilterCode | TextFilterCode]: string };

interface StoreProps {
  columnInfo: ColumnInfo;
  filters: Filter[] | null;
  filterLayerState: FilterLayerState;
}

interface OwnProps {
  columnAddress: ActiveColumnAddress;
  filterIndex: number;
}

type Props = StoreProps & OwnProps & DispatchProps;

class TextFilterComp extends Component<Props> {
  private inputEl?: HTMLInputElement;

  private selectEl?: HTMLSelectElement;

  public componentDidMount() {
    const { code, value } = this.getPreviousValue();
    this.selectEl!.value = code;
    this.inputEl!.value = value;
  }

  private handleChange = debounce(() => {
    const { filterIndex, dispatch } = this.props;
    const value = this.inputEl!.value;
    const code = this.selectEl!.value as NumberFilterCode | TextFilterCode;

    dispatch('setActiveFilterState', { value, code }, filterIndex);
  }, FILTER_DEBOUNCE_TIME);

  private getPreviousValue = () => {
    const { filterIndex, filterLayerState } = this.props;
    const filterState = filterLayerState.activeFilterState!.state;

    let code = 'eq';
    let value = '';

    if (filterState.length > 0 && filterState[filterIndex]) {
      const { code: prevCode, value: prevValue } = filterState[filterIndex];
      code = prevCode!;
      value = String(prevValue);
    }

    return { value, code };
  };

  public render() {
    const { columnInfo } = this.props;
    const selectOption = filterSelectOption[
      columnInfo.filter!.type as 'number' | 'text'
    ] as SelectOption;

    return (
      <div>
        <div className={cls('filter-dropdown')}>
          <select
            ref={ref => {
              this.selectEl = ref;
            }}
            onChange={this.handleChange}
          >
            {Object.keys(selectOption).map(key => {
              return (
                <option value={key} key={key}>
                  {selectOption[key as NumberFilterCode | TextFilterCode]}
                </option>
              );
            })}
          </select>
        </div>
        <input
          ref={ref => {
            this.inputEl = ref;
          }}
          type="text"
          className={cls('filter-input')}
          onKeyUp={this.handleChange}
        />
      </div>
    );
  }
}

export const TextFilter = connect<StoreProps, OwnProps>((store, { filterIndex, columnAddress }) => {
  const { column, data, filterLayerState } = store;
  const { allColumnMap } = column;
  const { filters } = data;

  return {
    columnInfo: allColumnMap[columnAddress.name],
    columnAddress,
    filterIndex,
    filters,
    filterLayerState
  };
})(TextFilterComp);
