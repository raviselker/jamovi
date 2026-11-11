import { h } from '../../../common/htmlelementcreator';
import { AuxView } from '../types';

export default class AssistantAuxView extends AuxView {
    constructor() {
        super('assistant');
    }

    getTitle() {
        return _('AI Assistant');
    }

    getIconSvg() {
        return `
            <svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <path d="M7 9a5 5 0 0 1 10 0v3a5 5 0 0 1-5 5h-3l-3 3v-4a5 5 0 0 1-4-4V9a5 5 0 0 1 5-5" />
                <path d="M10 9.5h4" />
                <path d="M12 7.5v4" />
            </svg>
        `;
    }

    getBody() {
        return this.createBodyElement(
            h('h2', {}, _('Assistant')),
            h('p', {}, _('Context-aware guidance for the active module, analysis, and currently focused option.')),
            h('div', { class: 'aux-panel-placeholder' },
                h('div', { class: 'aux-panel-kicker' }, _('Current context')),
                h('strong', {}, _('Descriptives > Statistics')),
                h('p', {}, _('Explain what each option does, suggest next settings, and answer questions about the active analysis.')),
            ),
            h('div', { class: 'aux-panel-list' },
                h('div', { class: 'aux-panel-list-item' }, _('Summarise the selected analysis and current option choices.')),
                h('div', { class: 'aux-panel-list-item' }, _('Flag likely follow-up analyses or assumption checks.')),
                h('div', { class: 'aux-panel-list-item' }, _('Offer plain-language explanations for outputs and settings.')),
            ),
        );
    }
}
