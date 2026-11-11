import helpEntry from './entries/help';
import modulesEntry from './entries/modules';
import type Instance from '../instance';
import type Selection from '../selection';
import type { AuxEntry, AuxView } from './types';

export const auxEntries: AuxEntry[] = [
    modulesEntry,
    helpEntry,
];

export function createAuxViews(instance: Instance, selection: Selection): AuxView[] {
    const context = { instance, selection };
    const ids = new Set<string>();
    return auxEntries
        .slice()
        .sort((left, right) => left.order - right.order)
        .filter(entry => {
            // ids key the toolbar, panel and their state, so they must be unique
            if (ids.has(entry.id)) {
                console.error(`Aux entry '${ entry.id }' is registered more than once; only the first is used.`);
                return false;
            }
            ids.add(entry.id);
            return true;
        })
        .map(entry => {
            const view = entry.create(context);
            if (entry.width !== undefined)
                view.defaultWidth = entry.width;
            return view;
        });
}
