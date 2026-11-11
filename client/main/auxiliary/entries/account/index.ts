import type { AuxEntry } from '../../types';
import AccountAuxView from './view';
import './style.css';

const entry: AuxEntry = {
    id: 'account',
    // above the settings, at the toolbar's end
    order: 999,
    create: () => new AccountAuxView(),
};

export default entry;
