export type CellValueType = number | string | object | boolean | null;

export interface IGridOptions {
  el: HTMLElement;
  data?: IRow[];
  columns: IColumn[];
}

export interface IRow {
  [propName: string]: CellValueType;
}

export interface IColumn {
  name: string;
  title?: string;
}
