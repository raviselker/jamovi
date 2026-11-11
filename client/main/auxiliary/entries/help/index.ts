import type { AuxEntry } from '../../types';
import HelpAuxView from './view';
import 'katex/dist/katex.min.css';
import './style.css';

const entry: AuxEntry = {
    id: 'help',
    order: 7,
    create: ({ instance }) => new HelpAuxView(instance),
};

export default entry;
