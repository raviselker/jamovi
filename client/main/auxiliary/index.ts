import './style.css';

export type {
    AuxEntry,
    AuxEntryContext,
    AuxPresentation,
    AuxSide,
    AuxViewSelection,
    AuxViewId,
} from './types';

export { AuxView } from './types';
export { default as AuxPanel } from './panel';
export { default as AuxShell } from './shell';
export { default as AuxToolbar } from './toolbar';
export { auxEntries, createAuxViews } from './registry';
