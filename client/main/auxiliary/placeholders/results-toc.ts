import { h } from '../../../common/htmlelementcreator';
import type Instance from '../../instance';
import { Analysis } from '../../analyses';
import { AuxView } from '../types';

export default class ResultsTocAuxView extends AuxView {
    model: Instance;
    listElement: HTMLDivElement | null = null;
    emptyElement: HTMLDivElement | null = null;
    lastStructureKey = '';

    constructor(model: Instance) {
        super('results-toc');
        this.model = model;
    }

    getTitle() {
        return _('Results Table of Contents');
    }

    getIconSvg() {
        return `
            <svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <path d="M8 7h11" />
                <path d="M8 12h11" />
                <path d="M8 17h11" />
                <circle cx="4.5" cy="7" r="1" data-fill="currentColor" />
                <circle cx="4.5" cy="12" r="1" data-fill="currentColor" />
                <circle cx="4.5" cy="17" r="1" data-fill="currentColor" />
            </svg>
        `;
    }

    getBody() {
        this.listElement = h('div', { class: 'aux-panel-nav' });
        this.emptyElement = h('div', { class: 'aux-panel-placeholder' }, _('No analyses in the results yet.'));

        const body = this.createBodyElement(
            h('p', {}, _('A navigation outline for the current results document.')),
            this.listElement,
            this.emptyElement,
        );

        return body;
    }

    onMount(): void {
        const analyses = this.model.analyses();
        this.listen(analyses, 'analysisCreated', this.requestUpdate);
        this.listen(analyses, 'analysisDeleted', this.requestUpdate);
        this.listen(analyses, 'analysisHeadingChanged', this.requestUpdate);
        this.listen(this.model, 'change:selectedAnalysis', this.updateSelectionState);
        this.update();
    }

    onShow(): void {
        this.update();
    }

    update(): void {
        if (this.listElement === null || this.emptyElement === null)
            return;

        const analyses = [...this.model.analyses()].filter(analysis => analysis.name !== 'empty');
        const structureKey = analyses
            .map(analysis => `${ analysis.id }:${ this.getAnalysisLabel(analysis) }`)
            .join('|');

        if (structureKey === this.lastStructureKey) {
            this.updateSelectionState();
            return;
        }

        this.lastStructureKey = structureKey;

        this.listElement.replaceChildren();

        for (const analysis of analyses) {
            const label = this.getAnalysisLabel(analysis);
            const button = h('button', {
                type: 'button',
                class: 'aux-panel-nav-item',
                title: label,
                'data-analysis-id': analysis.id.toString(),
            }, label);
            button.addEventListener('click', () => {
                this.model.set('selectedAnalysis', analysis);
                // only navigating from the TOC scrolls the results to the analysis
                this.model.trigger('scrollToAnalysis', analysis);
            });
            this.listElement.append(button);
        }

        this.emptyElement.style.display = analyses.length === 0 ? '' : 'none';
        this.updateSelectionState();
    }

    updateSelectionState(): void {
        if (this.listElement === null)
            return;

        const selectedAnalysis = this.model.get('selectedAnalysis');
        this.listElement.querySelectorAll<HTMLButtonElement>('.aux-panel-nav-item').forEach(button => {
            const buttonId = Number(button.dataset.analysisId);
            const selected = selectedAnalysis instanceof Analysis && selectedAnalysis.id === buttonId;
            button.classList.toggle('active', selected);
        });
    }

    getAnalysisLabel(analysis: Analysis): string {
        if (analysis.options) {
            const heading = analysis.getHeading();
            if (heading)
                return heading;
        }

        if (analysis.results?.title)
            return analysis.results.title;

        return analysis.name;
    }
}
