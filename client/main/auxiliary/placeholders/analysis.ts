import { h } from '../../../common/htmlelementcreator';
import type Instance from '../../instance';
import { Analysis } from '../../analyses';
import { AuxView } from '../types';

export default class AnalysisAuxView extends AuxView {
    model: Instance;
    descriptionElement: HTMLParagraphElement | null = null;
    listElement: HTMLDivElement | null = null;
    stateElement: HTMLDivElement | null = null;

    constructor(model: Instance) {
        super('analysis');
        this.model = model;
    }

    getTitle() {
        return _('Analysis Details');
    }

    getIconSvg() {
        return `
            <svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <path d="M5 19V9" />
                <path d="M12 19V5" />
                <path d="M19 19v-7" />
                <path d="M3.5 19.5h17" />
            </svg>
        `;
    }

    getBody() {
        this.descriptionElement = h('p', {}, _('Metadata and state for the currently selected analysis.'));
        this.listElement = h('div', { class: 'aux-panel-list' });
        this.stateElement = h('div', { class: 'aux-panel-placeholder' });

        return this.createBodyElement(this.descriptionElement, this.listElement, this.stateElement);
    }

    onMount(): void {
        const analyses = this.model.analyses();
        this.listen(analyses, 'analysisCreated', this.requestUpdate);
        this.listen(analyses, 'analysisDeleted', this.requestUpdate);
        this.listen(analyses, 'analysisResultsChanged', this.requestUpdate);
        this.listen(analyses, 'analysisHeadingChanged', this.requestUpdate);
        this.listen(analyses, 'analysisOptionsChanged', this.requestUpdate);
        this.listen(this.model, 'change:selectedAnalysis', this.requestUpdate);
        this.update();
    }

    onShow(): void {
        this.update();
    }

    createListItem(text: string) {
        return h('div', { class: 'aux-panel-list-item' }, text);
    }

    update(): void {
        if (this.listElement === null || this.stateElement === null || this.descriptionElement === null)
            return;

        const selectedAnalysis = this.model.get('selectedAnalysis');
        if (! (selectedAnalysis instanceof Analysis)) {
            this.descriptionElement.textContent = _('Metadata and state for the currently selected analysis.');
            this.listElement.replaceChildren();
            this.stateElement.textContent = _('Select an analysis in the results or the TOC to inspect its details.');
            return;
        }

        const hasOptions = selectedAnalysis.options !== null;
        const heading = hasOptions ? selectedAnalysis.getHeading() : '';
        const analysisLabel = heading || selectedAnalysis.results?.title || selectedAnalysis.name;
        const assignedVariables = hasOptions ? selectedAnalysis.getUsingColumns().length : 0;
        const optionValues = hasOptions ? selectedAnalysis.options.getValues() : {};
        const optionNames = Object.keys(optionValues).filter(name => ! name.startsWith('results/'));
        const dependentCount = selectedAnalysis.dependents.length;

        this.descriptionElement.textContent = _('Metadata and state for the currently selected analysis.');
        this.listElement.replaceChildren(
            this.createListItem(_('Module: {module}', { module: selectedAnalysis.ns })),
            this.createListItem(_('Analysis: {analysis}', { analysis: analysisLabel })),
            this.createListItem(_('Assigned variables: {count}', { count: assignedVariables.toLocaleString() })),
            this.createListItem(_('Option values set: {count}', { count: optionNames.length.toLocaleString() })),
            this.createListItem(_('Dependent analyses: {count}', { count: dependentCount.toLocaleString() })),
        );

        const revision = selectedAnalysis.revision.toLocaleString();
        this.stateElement.textContent = selectedAnalysis.enabled
            ? _('Revision {revision}. Analysis is enabled.', { revision })
            : _('Revision {revision}. Analysis is disabled.', { revision });
    }
}
