import type { AuxEntry } from '../../types';
import SettingsAuxView from './view';
import './style.css';

const entry: AuxEntry = {
    id: 'settings',
    // last: its button is kept at the toolbar's end (see style.css)
    order: 1000,
    create: ({ instance }) => new SettingsAuxView(instance),
};

export default entry;
