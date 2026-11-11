import { h } from '../../../common/htmlelementcreator';
import { AuxView } from '../types';

export default class ReviewAuxView extends AuxView {
    constructor() {
        super('review');
    }

    getTitle() { return _('Collaboration and Review'); }

    getIconSvg() { return `
            <svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <rect x="6" y="4" width="12" height="16" rx="2" />
                <path d="M9 8h6" />
                <path d="M9 12h6" />
                <path d="m9.5 16 1.5 1.5 3.5-3.5" />
            </svg>
        `; }

    getBody() { return this.createBodyElement(
        h('h2', {}, _('Collaboration and Review')),
        h('p', {}, _('Shared comments, teaching prompts, or review flags for results.')),
        h('div', { class: 'aux-panel-placeholder' }, _('This is more speculative, but it gives a place for collaboration-oriented tooling later.')),
    ); }
}
