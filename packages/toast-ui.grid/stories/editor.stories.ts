import { OptColumn } from '../src/types';
import Grid from '../src/grid';
import '../src/css/grid.css';
import 'tui-date-picker/dist/tui-date-picker.css';
import 'tui-time-picker/dist/tui-time-picker.css';

export default {
  title: 'Editor'
};

const data = [
  {
    artist: 'Birdy',
    typeCode: '1',
    genreCode: '1',
    grade: '4',
    release: '2016.03.26'
  },
  {
    artist: 'Ed Sheeran',
    typeCode: '1',
    genreCode: '1',
    grade: '5',
    release: '2014.06.24'
  },
  {
    artist: 'Maroon5',
    typeCode: '3',
    genreCode: '1,2',
    grade: '2',
    release: '2011.08.08'
  }
];

const columns: OptColumn[] = [
  {
    name: 'artist',
    editor: {
      type: 'text',
      options: {
        dataType: 'number'
      }
    }
  },
  {
    header: 'Genre',
    name: 'genreCode',
    formatter: 'listItemText',
    editor: {
      type: 'checkbox',
      options: {
        listItems: [
          { text: 'Pop', value: '1' },
          { text: 'Rock', value: '2' },
          { text: 'R&B', value: '3' }
        ]
      }
    }
  },
  {
    header: 'Type',
    name: 'typeCode',
    formatter: 'listItemText',
    editor: {
      type: 'radio',
      options: {
        listItems: [{ text: 'Delux', value: '1' }, { text: 'Single', value: '2' }]
      }
    }
  },
  {
    header: 'Grade',
    name: 'grade',
    formatter: 'listItemText',
    editor: {
      type: 'select',
      options: {
        listItems: [
          { text: '*', value: '1' },
          { text: '**', value: '2' },
          { text: '***', value: '3' },
          { text: '****', value: '4' },
          { text: '*****', value: '5' }
        ]
      }
    }
  },
  {
    header: 'Release',
    name: 'release',
    editor: 'datePicker'
  }
];

function createGrid() {
  const el = document.createElement('div');

  const grid = new Grid({ el, data, columns });

  return { el, grid };
}

export const text = () => {
  const { el, grid } = createGrid();

  grid.startEditingAt(1, 0);

  return el;
};

export const checkbox = () => {
  const { el, grid } = createGrid();

  grid.startEditingAt(1, 1);

  return el;
};

export const radio = () => {
  const { el, grid } = createGrid();

  grid.startEditingAt(1, 2);

  return el;
};

export const select = () => {
  const { el, grid } = createGrid();

  grid.startEditingAt(1, 3);

  return el;
};

export const datepicker = () => {
  const { el, grid } = createGrid();

  grid.startEditingAt(1, 4);

  return el;
};
