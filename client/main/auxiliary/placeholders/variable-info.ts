import { h } from '../../../common/htmlelementcreator';
import { AuxView } from '../types';

export default class VariableInfoAuxView extends AuxView {
    constructor() {
        super('variable-info');
    }

    getTitle() {
        return _('Variable Details');
    }

    getIconSvg() {
        return `
            <svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <rect x="4" y="6" width="16" height="12" rx="3" />
                <path d="M8 10h8" />
                <path d="M8 14h5" />
            </svg>
        `;
    }

    getBody() {
        return this.createBodyElement(
            h('h2', {}, _('Selection and Variable Info')),
            h('p', {}, _('Details for the current variable, selection, or focused cell range.')),
            h('div', { class: 'aux-panel-list' },
                h('div', { class: 'aux-panel-list-item' }, _('Variable: mood_score')),
                h('div', { class: 'aux-panel-list-item' }, _('Measure type: Continuous')),
                h('div', { class: 'aux-panel-list-item' }, _('Missing values: 12')),
                h('div', { class: 'aux-panel-list-item' }, _('Active role: Dependent / selected')),
            ),
            h('div', { class: 'aux-panel-placeholder' }, _('Useful for teaching, quick inspection, and understanding what is currently selected.')),
        );
    }
}
