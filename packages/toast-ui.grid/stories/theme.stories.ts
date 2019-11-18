import Grid from '../src/grid';
import '../src/css/grid.css';
import { OptColumn } from '../src/types';

export default {
  title: 'theme'
};

function createGridWithTheme(options) {
  const { preset, extOptions } = options;
  const data = [
    {
      c1: '100013',
      c2: 'Mustafa Cosme',
      c3: 291232
    },
    {
      c1: '201212',
      c2: 'Gunnar Fausto',
      c3: 32123
    },
    {
      c1: '241221',
      c2: 'Junior Morgan',
      c3: 88823
    },
    {
      c1: '991232',
      c2: 'Tódor Ingo',
      c3: 9981
    },
    {
      c1: '828723',
      c2: 'Njord Thoko',
      c3: 89123
    }
  ];
  const columns: OptColumn[] = [
    {
      header: 'ID',
      name: 'c1'
    },
    {
      header: 'Name',
      defaultValue: 2,
      name: 'c2'
    },
    {
      header: 'Score',
      name: 'c3'
    }
  ];

  const el = document.createElement('div');
  el.style.width = '80%';

  const grid = new Grid({
    el,
    data,
    columns,
    rowHeight: 35
  });

  Grid.applyTheme(preset, extOptions);

  return { el, grid };
}

export const defaultTheme = () => {
  const { el } = createGridWithTheme({ preset: 'default' });

  return el;
};

export const stripedTheme = () => {
  const { el } = createGridWithTheme({ preset: 'striped' });

  return el;
};

export const cleanTheme = () => {
  const { el } = createGridWithTheme({ preset: 'clean' });

  return el;
};

export const rowHover = () => {
  const { el } = createGridWithTheme({
    preset: 'clean',
    extOptions: {
      row: { hover: { background: '#0ed4ff' }, even: { background: '#feffab' } },
      cell: { oddRow: { background: '#fefff3' } }
    }
  });

  return el;
};
