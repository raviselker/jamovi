import { h } from '../../../common/htmlelementcreator';
import { AuxView } from '../types';

export default class TransformsAuxView extends AuxView {
    constructor() {
        super('transforms');
    }

    getTitle() {
        return _('Transforms and Filters');
    }

    getIconSvg() {
        return `
            <svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <path d="M7 7h10l-3-3" />
                <path d="m17 7-3 3" />
                <path d="M17 17H7l3 3" />
                <path d="m7 17 3-3" />
            </svg>
        `;
    }

    getBody() {
        return this.createBodyElement(
            h('h2', {}, _('Transforms and Filters')),
            h('p', {}, _('Overview of active filters, computed variables, recodes, and weights.')),
            h('div', { class: 'aux-panel-list' },
                h('div', { class: 'aux-panel-list-item' }, _('Filter: complete_cases')),
                h('div', { class: 'aux-panel-list-item' }, _('Computed: bmi_group')),
                h('div', { class: 'aux-panel-list-item' }, _('Weight: survey_weight')),
            ),
            h('div', { class: 'aux-panel-placeholder' }, _('A good operational view when users need to understand how the data is being shaped.')),
        );
    }
}
