import type { AuxEntry } from '../../types';
import AnalysesAuxView from './view';
import './style.css';

const entry: AuxEntry = {
    id: 'analyses',
    order: 4,
    create: ({ instance }) => new AnalysesAuxView(instance),
};

export default entry;
