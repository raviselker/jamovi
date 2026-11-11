import { h } from '../../../common/htmlelementcreator';
import { AuxView } from '../types';

export default class HistoryAuxView extends AuxView {
    constructor() {
        super('history');
    }
    getTitle() { return _('Activity History'); }
    getIconSvg() { return `
            <svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <path d="M4 12a8 8 0 1 0 2.3-5.7" />
                <path d="M4 5v4h4" />
                <path d="M12 8v5l3 2" />
            </svg>
        `; }
    getBody() { return this.createBodyElement(
        h('h2', {}, _('History and Activity')),
        h('p', {}, _('Recent actions across analyses, options, and data work.')),
        h('div', { class: 'aux-panel-list' },
            h('div', { class: 'aux-panel-list-item' }, _('Opened Descriptives')),
            h('div', { class: 'aux-panel-list-item' }, _('Enabled skewness and kurtosis')),
            h('div', { class: 'aux-panel-list-item' }, _('Applied filter: complete_cases')),
        ),
        h('div', { class: 'aux-panel-placeholder' }, _('Could help users retrace steps or review what changed recently.')),
    ); }
}
