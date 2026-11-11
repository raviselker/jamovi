import { h } from '../../../common/htmlelementcreator';
import { AuxView } from '../types';

export default class DataQualityAuxView extends AuxView {
    constructor() {
        super('data-quality');
    }
    getTitle() { return _('Data Quality Checks'); }
    getIconSvg() { return `
            <svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 3 19 6v5c0 4.5-2.7 7.5-7 10-4.3-2.5-7-5.5-7-10V6z" />
                <path d="m9.5 12 1.8 1.8 3.7-4.1" />
            </svg>
        `; }
    getBody() { return this.createBodyElement(
        h('h2', {}, _('Data Quality')),
        h('p', {}, _('Quick checks for missingness, outliers, constants, and suspicious structure.')),
        h('div', { class: 'aux-panel-grid' },
            h('div', { class: 'aux-panel-stat' },
                h('span', {}, _('Outliers')),
                h('strong', {}, '3'),
            ),
            h('div', { class: 'aux-panel-stat' },
                h('span', {}, _('Constants')),
                h('strong', {}, '1'),
            ),
            h('div', { class: 'aux-panel-stat' },
                h('span', {}, _('Duplicates')),
                h('strong', {}, '0'),
            ),
            h('div', { class: 'aux-panel-stat' },
                h('span', {}, _('High NA')),
                h('strong', {}, '2'),
            ),
        ),
        h('div', { class: 'aux-panel-placeholder' }, _('This would help users spot problems before analysis.')),
    ); }
}
