import { h } from '../../../common/htmlelementcreator';
import { AuxView } from '../types';

export default class SearchAuxView extends AuxView {
    constructor() {
        super('search');
    }
    getTitle() { return _('Search'); }
    getIconSvg() { return `
            <svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="11" cy="11" r="6" />
                <path d="m20 20-4.2-4.2" />
            </svg>
        `; }
    getBody() { return this.createBodyElement(
        h('h2', {}, _('Search')),
        h('p', {}, _('One place to search analyses, options, variables, results, and help content.')),
        h('div', { class: 'aux-panel-placeholder' },
            h('div', { class: 'aux-panel-kicker' }, _('Example searches')),
            h('p', {}, _('Find "normality", jump to "Descriptives", locate variable "age", or search results headings.')),
        ),
    ); }
}
