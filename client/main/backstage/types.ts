
import type { FSEntryListModel, BackstagePanelView } from './fsentry';

export interface IPlace {
    name: string;
    title: string;
    keyTipKey: string,
    model?: FSEntryListModel;
    view?: BackstagePanelView;
    action?: () => any;
    separator?: boolean;
}

// an item of the File menu: an action, or places to choose from
export interface IOp {
    name: string,
    title: string,
    keyTipKey: string,
    places?: IPlace[],
    action?: () => any
}

export interface IBackstageExtras {
    init(backstage: any): void;
    getOpenPlaces(): IPlace[];
    getSaveAsPlaces(): IPlace[];
    // the File menu as a deployment has it: given the menu, the one to show.
    // asked whenever the menu's made (the backstage's createOps())
    adjustOps?(ops: IOp[]): IOp[];
}
