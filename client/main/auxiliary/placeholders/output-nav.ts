import { h } from '../../../common/htmlelementcreator';
import { AuxView } from '../types';

export default class OutputNavAuxView extends AuxView {
    constructor() {
        super('output-nav');
    }

    getTitle() { return _('Output Navigator'); }

    getIconSvg() { return `
            <svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <path d="M5 7h10" />
                <path d="M5 12h14" />
                <path d="M5 17h8" />
                <path d="m15 15 4-3-4-3" />
            </svg>
        `; }

    getBody() { return this.createBodyElement(
        h('h2', {}, _('Output Navigator')),
        h('p', {}, _('Bookmarks, recently viewed sections, and important results.')),
        h('div', { class: 'aux-panel-list' },
            h('div', { class: 'aux-panel-list-item' }, _('Starred: Descriptive Statistics')),
            h('div', { class: 'aux-panel-list-item' }, _('Recent: Histogram')),
            h('div', { class: 'aux-panel-list-item' }, _('Recent: QQ Plot')),
        ),
        h('div', { class: 'aux-panel-placeholder' }, _('Related to TOC, but more about personal navigation and curation.')),
    ); }
}
