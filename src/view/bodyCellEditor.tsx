import { h, Component } from 'preact';
import { cls } from '../helper/dom';
import { CellValue } from '../store/types';
import { connect } from './hoc';
import { DispatchProps } from '../dispatch/create';
import { CellEditor } from '../editor/types';

interface OwnProps {
  rowKey: number;
  columnName: string;
  editorName: string;
  value: CellValue;
}

interface StoreProps {
  editing: boolean;
}

type Props = OwnProps & StoreProps & DispatchProps;

export class BodyCellEditorComp extends Component<Props> {
  private editor?: CellEditor;

  private contentEl?: HTMLElement;

  public componentDidMount() {
    const { rowKey, columnName, value, editorName, dispatch } = this.props;
    const Editor = this.context.editorMap[editorName];
    const editor: CellEditor = new Editor(value, (type: string) => {
      switch (type) {
        case 'start':
          dispatch('startEditing', rowKey, columnName);
          break;
        case 'finish':
          dispatch('setValue', rowKey, columnName, editor.getValue());
          dispatch('finishEditing', rowKey, columnName);
          break;
        default:
      }
    });
    const editorEl = editor.getElement();

    if (editorEl && this.contentEl) {
      this.contentEl.appendChild(editorEl);
      this.editor = editor;
    }
  }

  public componentShouldUpdate() {
    return false;
  }

  public componentWillReceiveProps(nextProps: Props) {
    if (!nextProps.editing && this.editor) {
      this.editor.onFinish();
    }
  }

  private finishEditing() {
    if (this.editor) {
      const { dispatch, rowKey, columnName } = this.props;

      dispatch('setValue', rowKey, columnName, this.editor.getValue());
      this.editor.onFinish();
    }
  }

  private handleKeyDown = (ev: KeyboardEvent) => {
    if (ev.keyCode === 13) {
      this.finishEditing();
    }
  };

  public render() {
    const styles = { 'white-space': 'nowrap' };

    return (
      <div
        onKeyDown={this.handleKeyDown}
        class={cls('cell-content')}
        style={styles}
        ref={(el) => {
          this.contentEl = el;
        }}
      />
    );
  }
}

export const BodyCellEditor = connect<StoreProps, OwnProps>(({ focus }, { rowKey, columnName }) => {
  const { editing } = focus;

  return {
    editing: !!editing && editing.rowKey === rowKey && editing.columnName === columnName
  };
})(BodyCellEditorComp);
