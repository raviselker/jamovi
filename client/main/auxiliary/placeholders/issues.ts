import { h } from '../../../common/htmlelementcreator';
import { AuxView } from '../types';

export default class IssuesAuxView extends AuxView {
    constructor() {
        super('issues');
    }
    getTitle() { return _('Issues and Diagnostics'); }
    getIconSvg() { return `
            <svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 4 21 20H3Z" />
                <path d="M12 9v5" />
                <circle cx="12" cy="17" r="1" data-fill="currentColor" />
            </svg>
        `; }
    getBody() { return this.createBodyElement(
        h('h2', {}, _('Issues and Diagnostics')),
        h('p', {}, _('Central place for warnings, invalid states, and failed output checks.')),
        h('div', { class: 'aux-panel-list' },
            h('div', { class: 'aux-panel-list-item' }, _('2 variables contain high missingness')),
            h('div', { class: 'aux-panel-list-item' }, _('One analysis has hidden output warnings')),
            h('div', { class: 'aux-panel-list-item' }, _('A filter is reducing the visible sample')),
        ),
        h('div', { class: 'aux-panel-placeholder' }, _('This could become the main place to surface actionable problems.')),
    ); }
}
