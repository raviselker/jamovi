import type { AuxEntry } from '../../types';
import ModulesAuxView from './view';
import './style.css';

const entry: AuxEntry = {
    id: 'modules',
    order: 5,
    // wider than the default, for the module cards and the filters
    width: 380,
    create: ({ instance }) => new ModulesAuxView(instance),
};

export default entry;
