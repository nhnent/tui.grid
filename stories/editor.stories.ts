import { storiesOf } from '@storybook/html';
import { OptGrid } from '../src/types';
import { Omit } from 'utility-types';
import Grid from '../src/grid';
import { data } from '../samples/basic';
import '../src/css/grid.css';

const stories = storiesOf('Cell Editor', module);

function createGrid(options: Omit<OptGrid, 'el'>) {
  const el = document.createElement('div');
  el.style.width = '800px';

  const grid = new Grid({ el, ...options });

  return { el, grid };
}

const columns = [
  { name: 'name', width: 300 },
  { name: 'genre', width: 300 },
  { name: 'artist', width: 300, editor: 'text', viewer: false },
  { name: 'type', width: 300, editor: 'text' }
];

stories.add('Text', () => {
  const { grid, el } = createGrid({
    data,
    columns,
    columnOptions: {
      frozenCount: 1
    },
    bodyHeight: 400
  });

  (window as Window & { grid: Grid }).grid = grid;

  return el;
});
