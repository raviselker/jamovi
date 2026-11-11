import { h } from '../../../common/htmlelementcreator';
import { AuxView } from '../types';

export default class NotesAuxView extends AuxView {
    constructor() {
        super('notes');
    }

    getTitle() { return _('Comments and Notes'); }

    getIconSvg() { return `
            <svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <path d="M7 4h8l4 4v12H7z" />
                <path d="M15 4v4h4" />
                <path d="M10 13h6" />
                <path d="M10 17h4" />
            </svg>
        `; }

    getBody() { return this.createBodyElement(
        h('h2', {}, _('Comments and Notes')),
        h('p', {}, _('A lightweight scratchpad tied to the current analysis or output section.')),
        h('div', { class: 'aux-panel-placeholder' }, _('Add interpretation notes, reminders, or teaching commentary alongside the workflow.')),
    ); }
}
