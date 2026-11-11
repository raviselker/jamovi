import { h } from '../../../common/htmlelementcreator';
import { AuxView } from '../types';

export default class GuidanceAuxView extends AuxView {
    constructor() {
        super('guidance');
    }

    getTitle() { return _('Tasks and Guidance'); }

    getIconSvg() { return `
            <svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <path d="M6 19c0-6 4-6 4-10a2 2 0 1 1 4 0c0 4 4 4 4 10" />
                <path d="M6 19h12" />
                <path d="M12 5V3" />
            </svg>
        `; }

    getBody() { return this.createBodyElement(
        h('h2', {}, _('Tasks and Guidance')),
        h('p', {}, _('Step-based workflows for common goals.')),
        h('div', { class: 'aux-panel-list' },
            h('div', { class: 'aux-panel-list-item' }, _('Prepare a data set')),
            h('div', { class: 'aux-panel-list-item' }, _('Run a t-test')),
            h('div', { class: 'aux-panel-list-item' }, _('Check assumptions')),
            h('div', { class: 'aux-panel-list-item' }, _('Interpret effect sizes')),
        ),
        h('div', { class: 'aux-panel-placeholder' }, _('This is more workflow coaching than static help.')),
    ); }
}
