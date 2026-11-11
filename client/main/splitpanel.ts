'use strict';

import { EventDistributor } from '../common/eventmap';
import SplitPanelSection from './splitpanelsection';
import type { SplitPanelPlacement, SplitPanelRole, SplitPanelSectionInit } from './splitpanelsection';

const OPTIONS_SECTION_INDEX = 1;
const COLLAPSED_WIDTH_THRESHOLD = 40;
const MIN_PANEL_WIDTH_PX = 200;
const TRANSITION_TIME_MS = 300;
const TRANSITION_DELAY_MS = 20;

type PanelWidthsPx = number[];
type SplitMode = 'mixed' | 'data' | 'results';
type CollapsedEdgePanel = 'data' | 'results' | null;
type PanelState = {
    id: string;
    role: SplitPanelRole;
    visible: boolean;
    adjustable: boolean;
    fixed: boolean;
    lastWidthPx: number | null;
};
type LayoutSnapshot = {
    adjustableWidthPx: number;
    widthsPx: PanelWidthsPx;
    collapsedEdge: CollapsedEdgePanel;
    widthTokens: (number | string | null)[];
};
type LayoutState = {
    dataWidthPx: number | null;
    optionsWidthPx: number | null;
    resultsWidth: string | null;
    otherWidthPx: number | null;
};

export class SplitPanel extends EventDistributor {

    _resizing: boolean = false;
    _collapsedEdgePanel: CollapsedEdgePanel = null;
    mode: SplitMode = 'mixed';
    _optionsVisible: boolean = false;
    _allowDocking: { left: boolean, right: boolean, both: boolean } = { left: false, right: false, both: false };
    _transition: Promise<void>;
    _initialWidthsSaved: boolean = false;
    firstSection: SplitPanelSection;
    _sections: { [name: string]: SplitPanelSection } = {};
    _sectionsByRole: Partial<Record<SplitPanelRole, SplitPanelSection>> = {};
    _panelStates: { [name: string]: PanelState } = {};
    _sectionsList: SplitPanelSection[] = [];
    widths: number[];
    optionsChanging: 'opening' | 'closing' | null;
    _layoutState: LayoutState;
    transitionCheckActive: boolean;
    _startPosX: number;
    _startPosY: number;
    _splittersMoved: boolean;

    constructor() {
        super();

        this.classList.add('splitpanel');

        this.classList.add("silky-splitpanel");
        this.style.position = "relative";
        // overflow is left visible so the aux toolbar and panel (positioned
        // at the split panel's edge) aren't clipped; the page itself doesn't
        // scroll, so the panel hidden off the edge can't cause scrollbars

        this._transition = Promise.resolve();
        this._layoutState = {
            dataWidthPx: null,
            optionsWidthPx: null,
            resultsWidth: null,
            otherWidthPx: null,
        };
    }

    getDataSection() {
        return this.getSectionByRole('data') || this.getSection(0);
    }

    getOptionsSection() {
        return this.getSectionByRole('options') || this.getSection(OPTIONS_SECTION_INDEX);
    }

    getResultsSection() {
        return this.getSectionByRole('results') || this.getSection(-1);
    }

    getSectionByRole(role: SplitPanelRole) {
        return this._sectionsByRole[role] || null;
    }

    getSectionsByPlacement(placement: SplitPanelPlacement) {
        return this._sectionsList.filter(section => section.placement === placement);
    }

    createPanelState(section: SplitPanelSection): PanelState {
        return {
            id: section.name,
            role: section.role,
            visible: section.getVisibility(),
            adjustable: section.adjustable,
            fixed: section.fixed,
            lastWidthPx: section.lastWidth,
        };
    }

    syncPanelState(section: SplitPanelSection) {
        this._panelStates[section.name] = this.createPanelState(section);
        return this._panelStates[section.name];
    }

    getPanelState(sectionRef: number | string | SplitPanelSection) {
        let section = typeof sectionRef === 'object' ? sectionRef : this.getSection(sectionRef);
        return this._panelStates[section.name] || this.syncPanelState(section);
    }

    getPanelStates() {
        return this._sectionsList.map(section => this.getPanelState(section));
    }

    getColumnTemplates() {
        return getComputedStyle(this).gridTemplateColumns.split(' ');
    }

    getSectionColumnIndex(section: SplitPanelSection) {
        return section.listIndex * 2;
    }

    getDataPanelWidth(columnTemplates?: string[]) {
        let templates = columnTemplates || this.getColumnTemplates();
        return templates[this.getSectionColumnIndex(this.getDataSection())];
    }

    getResultsPanelWidth(columnTemplates?: string[]) {
        let templates = columnTemplates || this.getColumnTemplates();
        return templates[this.getSectionColumnIndex(this.getResultsSection())];
    }

    getOptionsAndDataWidthPx(columnTemplates?: string[]) {
        let templates = columnTemplates || this.getColumnTemplates();
        let optionsSection = this.getOptionsSection();
        if ( ! optionsSection)
            return parseInt(this.getDataPanelWidth(templates));

        let startIndex = this.getSectionColumnIndex(this.getDataSection());
        let endIndex = this.getSectionColumnIndex(optionsSection);
        let total = 0;
        for (let i = startIndex; i <= endIndex; i++)
            total += parseInt(templates[i]) || 0;
        return total;
    }

    getSectionWidthValue(section: SplitPanelSection, columnTemplates?: string[]) {
        let templates = columnTemplates || this.getColumnTemplates();
        return parseInt(templates[this.getSectionColumnIndex(section)]);
    }

    setSectionWidthToken(section: SplitPanelSection, value: string, columnTemplates: string[]) {
        columnTemplates[this.getSectionColumnIndex(section)] = value;
    }

    readPanelWidthsPx() {
        let columnTemplates = this.getColumnTemplates();
        return this.readPanelWidthsPxFromTemplates(columnTemplates);
    }

    readPanelWidthsPxFromTemplates(columnTemplates: string[]) {
        let widths: PanelWidthsPx = [];

        for (let i = 0; i < this._sectionsList.length; i++)
            widths[i] = parseInt(columnTemplates[this.getSectionColumnIndex(this._sectionsList[i])]);

        return widths;
    }

    determineCollapsedEdge(widths?: PanelWidthsPx) {
        let currentWidths = widths || this.readPanelWidthsPx();
        let previousCollapsedEdge = this._collapsedEdgePanel;
        let wideCount = 0;

        for (let i = 0; i < currentWidths.length; i++) {
            if (currentWidths[i] > COLLAPSED_WIDTH_THRESHOLD)
                wideCount += 1;
        }

        let dataCollapsed = this.isPanelCollapsed(this.getDataSection(), currentWidths);
        let resultsCollapsed = this.isPanelCollapsed(this.getResultsSection(), currentWidths);

        if (dataCollapsed && (wideCount <= 1 || previousCollapsedEdge === 'data'))
            return 'data';
        if (resultsCollapsed && wideCount <= 1)
            return 'results';
        return null;
    }

    readLayoutSnapshot(widths?: PanelWidthsPx, columnTemplates?: string[]): LayoutSnapshot {
        let templates = columnTemplates || this.getColumnTemplates();
        let currentWidths = widths || this.readPanelWidthsPxFromTemplates(templates);
        let adjustableWidthPx = 0;
        let widthTokens: (number | string | null)[] = [];

        this.applyToSections((currentSection) => {
            if (currentSection.adjustable) {
                if (currentSection.fixed === false) {
                    widthTokens[currentSection.listIndex] = currentWidths[currentSection.listIndex];
                    adjustableWidthPx += currentWidths[currentSection.listIndex];
                }
                else
                    widthTokens[currentSection.listIndex] = templates[currentSection.listIndex * 2];
            }
            else
                widthTokens[currentSection.listIndex] = null;
        });

        return {
            adjustableWidthPx,
            widthsPx: currentWidths,
            collapsedEdge: this.determineCollapsedEdge(currentWidths),
            widthTokens,
        };
    }

    writeLayoutSnapshot(snapshot: LayoutSnapshot) {
        return this.writePanelWidthsPx(snapshot.widthsPx);
    }

    writePanelWidthsPx(widths: PanelWidthsPx) {
        let columnTemplates = this.getColumnTemplates();

        for (let i = 0; i < this._sectionsList.length; i++)
            columnTemplates[this.getSectionColumnIndex(this._sectionsList[i])] = `${ widths[i] }px`;

        return columnTemplates;
    }

    getPanelWidthPx(section: SplitPanelSection, widths?: PanelWidthsPx) {
        let currentWidths = widths || this.readPanelWidthsPx();
        return currentWidths[section.listIndex];
    }

    isPanelCollapsed(section: SplitPanelSection, widths?: PanelWidthsPx) {
        return this.getPanelWidthPx(section, widths) <= COLLAPSED_WIDTH_THRESHOLD;
    }

    setPanelCollapsedAppearance(section: SplitPanelSection, collapsed: boolean) {
        section.style.opacity = collapsed ? '0' : '';
    }

    syncEdgePanelAppearance(widths?: PanelWidthsPx) {
        let currentWidths = widths || this.readPanelWidthsPx();
        this.setPanelCollapsedAppearance(this.getDataSection(), this.isPanelCollapsed(this.getDataSection(), currentWidths));
        this.setPanelCollapsedAppearance(this.getResultsSection(), this.isPanelCollapsed(this.getResultsSection(), currentWidths));
    }

    updateCollapsedModeState(widths?: PanelWidthsPx) {
        let snapshot = this.readLayoutSnapshot(widths);
        this._collapsedEdgePanel = snapshot.collapsedEdge;
    }

    clearCollapsedModeState() {
        this._collapsedEdgePanel = null;
    }

    isResultsFocused() {
        return this._collapsedEdgePanel === 'data';
    }

    isDataFocused() {
        return this._collapsedEdgePanel === 'results';
    }

    getSection(i: number | string) {
        if (typeof i === 'number') {
            if (i < 0)
                return this._sectionsList[this._sectionsList.length + i];
            else
                return this._sectionsList[i];
        }

        return this._sections[i];
    }

    onWindowResize() {
        this._saveWidths();
    }

    addPanel(name: string, properties: SplitPanelSectionInit = {}) {
        let section = new SplitPanelSection(this._sectionsList.length, name, {}, this);
        this._sectionsList[section.listIndex] = section;
        this._sections[section.name] = section;

        section.addEventListener("splitpanel-hide", (event) => {
            this.setVisibility(section, false);
        });

        this.append(section);

        if (this.firstSection === undefined)
            this.firstSection = section;

        if (section.listIndex > 0) {
            let prevSection = this.getSection(section.listIndex - 1);
            prevSection.setNextSection("right", section);
            section.setNextSection("left", prevSection);
         }

         section.initalise(properties);
         this.syncPanelState(section);

         if (section.role !== 'custom' && this._sectionsByRole[section.role] === undefined)
            this._sectionsByRole[section.role] = section;

         if (this.resetState())
            this.normalise();

        return section;
    }

    async setVisibility(i, value) {

        let callId = Math.floor(Math.random() * 1000);

        if (this._optionsVisible === value)
            return;

        this._optionsVisible = value;

        this._transition = this._transition.then(() => {
            return new Promise(async (resolve) => {

                let optionsSection = this.getOptionsSection();
                if (optionsSection.getVisibility() === value) {
                    resolve();
                    return;
                }

                optionsSection.classList.add('initialised');

                this.optionsChanging = value ? 'opening' : 'closing';

                if (value) {
                    let columnTemplates = this.getColumnTemplates();
                    this._layoutState.resultsWidth = this.getResultsPanelWidth(columnTemplates);
                    this._layoutState.otherWidthPx = this.getOptionsAndDataWidthPx(columnTemplates);
                    this.allowDocking('left');
                }

                if (this.resetState())
                   this.normalise();

                optionsSection.setVisibility(value);
                this.syncPanelState(optionsSection);
                this.onTransitioning();

                optionsSection.addEventListener('transitionend', async () => {
                    await this.checkDockConditions(false);
                    if (value === false) {
                        this.suspendDocking('left');
                        this._layoutState.resultsWidth = null;
                        this._layoutState.otherWidthPx = null;
                    }
                    this.optionsChanging = null;
                    if (this.resetState())
                       this.normalise(true);

                    if (value === false)
                        this._saveWidths();

                    resolve();
                }, { once:true });
            });
        });
    }

    _applyColumnTemplates(columnTemplates, normalise: boolean, clean?) {
        if (normalise)
            this._normaliseWidths(columnTemplates, clean);

        let dataSection = this.getDataSection();
        if (dataSection.adjustable) {
            let dataWidth = this.getDataPanelWidth(columnTemplates);
            if ((this._allowDocking.left === false && this._allowDocking.both === false) && ! this.isResultsFocused())
                this.setSectionWidthToken(dataSection, `minmax(${ MIN_PANEL_WIDTH_PX }px, ${dataWidth} )`, columnTemplates);
            else
                this.setSectionWidthToken(dataSection, `minmax(auto, ${dataWidth} )`, columnTemplates);
        }

        let resultsSection = this.getResultsSection();
        if (resultsSection.adjustable) {
            let resultsWidth = this.getResultsPanelWidth(columnTemplates);
            if ((this._allowDocking.right === false && this._allowDocking.both === false) && ! this.isDataFocused())
                this.setSectionWidthToken(resultsSection, `minmax(${ MIN_PANEL_WIDTH_PX }px, ${resultsWidth} )`, columnTemplates);
            else
                this.setSectionWidthToken(resultsSection, `minmax(auto, ${resultsWidth} )`, columnTemplates);
        }

        this.style.gridTemplateColumns = columnTemplates.join(' ');
    }

    normalise(clean?) {
        let columnTemplates = this.getColumnTemplates();
        this._applyColumnTemplates(columnTemplates, true, clean);
    }

    getLayoutKey(el: HTMLElement) {
        const style = getComputedStyle(el);
        const gridTemplate = style.gridTemplateColumns;
        const width = el.offsetWidth;
        const paddingLeft = style.paddingLeft;
        const paddingRight = style.paddingRight;
        const paddingTop = style.paddingTop;
        const paddingBottom = style.paddingBottom;

        // outerHeight(true) includes margin, so we calculate that manually
        const height = el.offsetHeight;
        const marginTop = parseFloat(style.marginTop) || 0;
        const marginBottom = parseFloat(style.marginBottom) || 0;
        const outerHeight = height + marginTop + marginBottom;

        return `${ gridTemplate } ${ width } ${ outerHeight } ${ paddingLeft } ${ paddingRight } ${ paddingTop } ${ paddingBottom }`;
    }

    onTransitioning(layoutKey?: string) {
        let event = new CustomEvent('form-changed');
        this.dispatchEvent(event);
        if (layoutKey || ! this.transitionCheckActive) {
            this.transitionCheckActive = true;
            if ( ! layoutKey)
                layoutKey = this.getLayoutKey(this);

            setTimeout(() => {
                let nextLayoutKey = this.getLayoutKey(this);
                if (layoutKey !== nextLayoutKey)
                    this.onTransitioning(nextLayoutKey);
                else {
                    this.transitionCheckActive = false;
                }
            }, 50);
        }
    }

    onContainerSpaceChanged() {
        // Some transitions, such as the docked aux panel changing the split
        // panel's padding, alter the space available to the grid without
        // coming through a splitter drag or options-panel width transition.
        // In those cases any cached results width must be cleared so the
        // results panel can expand or shrink with the container again.
        if (this._layoutState.resultsWidth !== null) {
            this._layoutState.resultsWidth = null;
            this._layoutState.otherWidthPx = null;
            this._layoutState.dataWidthPx = null;
            this._layoutState.optionsWidthPx = null;

            if (this.resetState())
                this.normalise();
        }

        this.onTransitioning();
    }

    applyToSections(action: (SplitPanelSection) => (boolean | void)) {
        let section = this.firstSection;
        while (section !== null)
        {
            if (action(section) === false)
                return;

            section = section.getNext('right');
        }
    }

    render() {
        this.applyToSections((currentSection: SplitPanelSection) => {

            let splitter = currentSection.getSplitter();
            if (splitter !== null) {
                currentSection.before(splitter);

                let data = { left: currentSection.getNext("left"), right: currentSection, self: this};

                // the pointer currently dragging this splitter (null when not dragging)
                let dragPointerId: number = null;

                const endResize = async (event: PointerEvent) => {
                    if (dragPointerId === null || event.pointerId !== dragPointerId)
                        return;

                    dragPointerId = null;

                    if (splitter.hasPointerCapture(event.pointerId))
                        splitter.releasePointerCapture(event.pointerId);

                    this._saveWidths();

                    this._resizing = false;
                    this.suspendDocking('both');

                    await this.checkDockConditions(true);

                    this.normalise();
                };

                splitter.addEventListener("pointerdown", (event: PointerEvent) => {
                    if (event.button !== 0 || this._resizing)
                        return;

                    splitter.setPointerCapture(event.pointerId);
                    dragPointerId = event.pointerId;

                    this._resizing = true;
                    this._startPosX = event.pageX;
                    this._startPosY = event.pageY;

                    this.clearCollapsedModeState();

                    this.allowDocking('both');
                });

                // lostpointercapture catches cases where pointerup never reaches
                // the splitter (i.e. a context menu or focus change mid-drag)
                ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(eventName => {
                    splitter.addEventListener(eventName, endResize);
                });

                splitter.addEventListener("pointermove", async (event: PointerEvent) => {
                    if (dragPointerId === null || event.pointerId !== dragPointerId)
                        return;

                    // the button was released without us receiving a pointerup
                    if ((event.buttons & 1) === 0) {
                        await endResize(event);
                        return;
                    }

                    this._layoutState.resultsWidth = null;
                    this._layoutState.dataWidthPx = null;
                    this._layoutState.optionsWidthPx = null;

                    let xpos = event.pageX;
                    let ypos = event.pageY;

                    let diffX = xpos - this._startPosX;
                    let diffY = ypos - this._startPosY;

                    this._startPosX = xpos;
                    this._startPosY = ypos;

                    await this.modifyLayout(data, diffX);

                    this._splittersMoved = true;
                });
            }
        });
    }

    allowDocking(type: ('left' | 'right' | 'both')) {
        let changed = this._allowDocking[type] === false;
        this._allowDocking[type] = true;
        if (changed)
            this.normalise();
    }

    suspendDocking(type: ('left' | 'right' | 'both'), silent?: boolean) {
        if (this._allowDocking[type] === false)
            return;

        this._allowDocking[type] = false;
        if ( ! silent)
            this.normalise();
    }

    _saveWidths() {
        if (this._collapsedEdgePanel === null) {
            let snapshot = this.readLayoutSnapshot();
            let widths = snapshot.widthsPx;
            this.applyToSections((currentSection) => {
                currentSection.lastWidth = widths[currentSection.listIndex];
                if (currentSection === this.getResultsSection())
                    currentSection.lastWidth -= 2;
                this.syncPanelState(currentSection);
            });

            if (this._layoutState.resultsWidth) {
                let columnTemplates = this.getColumnTemplates();
                let newOtherWidth = this.getOptionsAndDataWidthPx(columnTemplates);
                this._layoutState.resultsWidth = `${ this.getSectionWidthValue(this.getResultsSection(), columnTemplates) + (newOtherWidth  - this._layoutState.otherWidthPx) }px`;
                this._layoutState.dataWidthPx = widths[this.getDataSection().listIndex] ?? null;
                this._layoutState.optionsWidthPx = widths[this.getOptionsSection().listIndex] ?? null;
                this._layoutState.otherWidthPx = newOtherWidth;
            }
        }
    }

    _normaliseWidths(columnTemplates, clean) {
        let snapshot = this.readLayoutSnapshot(undefined, columnTemplates);
        let widthTokens = snapshot.widthTokens.slice();

        if (this._layoutState.resultsWidth)
            widthTokens[this.getResultsSection().listIndex] = this._layoutState.resultsWidth;

        for (let i = 0; i < widthTokens.length; i++) {
            if (widthTokens[i] !== null) {
                if (clean && ((i === 0 && this.isResultsFocused()) || (i === widthTokens.length - 1 && this.isDataFocused())))
                        columnTemplates[i*2] = '0fr';
                else if (typeof widthTokens[i] === 'string')
                    columnTemplates[i*2] = widthTokens[i];
                else {
                    if (snapshot.adjustableWidthPx === 0)
                        columnTemplates[i*2] = '10fr';
                    else
                        columnTemplates[i*2] = (widthTokens[i] * 10) / snapshot.adjustableWidthPx + 'fr';
                }
            }
            else
                columnTemplates[i*2] = 'min-content';

            if (i != 0)
                columnTemplates[i*2 - 1] = 'min-content';
        }
    }

    resetState() {
        if (this._sectionsList.length !== 3)
            return false;

        let dataPanel = this.getDataSection();
        let resultsPanel = this.getResultsSection();
        let dataFocused = this.mode === 'data' || (this.mode === 'mixed' && this.optionsChanging);

        if (dataFocused) {
            resultsPanel.fixed = true;
            dataPanel.fixed = false;
        }
        else {
            resultsPanel.fixed = false;
            dataPanel.fixed = true;
        }

        resultsPanel.adjustable = true;
        dataPanel.adjustable = true;
        this.syncPanelState(resultsPanel);
        this.syncPanelState(dataPanel);

        return true;
    }

    async transitionToResultsMode(columnTemplates: string[]) {
        let section = this.getResultsSection();
        section.style.width = '';
        section.style.opacity = '';

        this.getResultsSection().fixed = false;
        this.getDataSection().adjustable = false;

        let $dataPanel = this.getDataSection();
        $dataPanel.style.width = this.getDataPanelWidth(columnTemplates);

        this._applyColumnTemplates(columnTemplates, true);

        this._collapsedEdgePanel = 'data';

        await new Promise<void>((resolve) => {
            setTimeout(() => {
                $dataPanel.style.width = '0px';
                setTimeout(() => {
                    this.onTransitioning();
                    if (this.resetState())
                        this.normalise(true);
                    $dataPanel.style.width = '';
                    resolve();
                }, TRANSITION_TIME_MS);
            }, TRANSITION_DELAY_MS);
        });
    }

    async transitionToDataMode(columnTemplates: string[]) {
        let section = this.getDataSection();
        section.style.width = '';
        section.style.opacity = '';

        this.getResultsSection().adjustable = false;
        this.getResultsSection().fixed = false;
        this.getDataSection().fixed = false;

        let $resultsPanel = this.getResultsSection();
        $resultsPanel.style.width = this.getResultsPanelWidth(columnTemplates);

        this._applyColumnTemplates(columnTemplates, true);

        this._collapsedEdgePanel = 'results';

        await new Promise<void>((resolve) => {
            setTimeout(() => {
                $resultsPanel.style.width = '0px';
                setTimeout(() => {
                    this.onTransitioning();
                    if (this.resetState())
                        this.normalise(true);
                    $resultsPanel.style.width = '';
                    resolve();
                }, TRANSITION_TIME_MS);
            }, TRANSITION_DELAY_MS);
        });
    }

    async restoreMixedModeFromResults(columnTemplates: string[]) {
        let section = this.getDataSection();
        section.style.width = '';
        section.style.opacity = '';

        this.getResultsSection().adjustable = false;
        this.getResultsSection().fixed = false;
        this.getDataSection().fixed = false;

        let $resultsPanel = this.getResultsSection();
        $resultsPanel.style.width = `${this.getResultsPanelWidth(columnTemplates)}px`;

        this._applyColumnTemplates(columnTemplates, true);

        await new Promise<void>((resolve) => {
            setTimeout(() => {
                let width = this.getResultsSection().lastWidth;
                $resultsPanel.style.width = `${width}px`;
                setTimeout(() => {
                    this.onTransitioning();
                    this.refreshDockState(true);
                    if (this.resetState())
                        this.normalise(true);
                    $resultsPanel.style.width = '';
                    resolve();
                }, TRANSITION_TIME_MS);
            }, TRANSITION_DELAY_MS);
        });
    }

    async restoreMixedModeFromData(columnTemplates: string[]) {
        let section = this.getResultsSection();
        section.style.width = '';
        section.style.opacity = '';

        this.getDataSection().adjustable = false;
        section.fixed = false;

        let $dataPanel = this.getDataSection();
        $dataPanel.style.width = this.getDataPanelWidth(columnTemplates);

        this._applyColumnTemplates(columnTemplates, true);

        await new Promise<void>((resolve) => {
            setTimeout(() => {
                let width = this.getDataSection().lastWidth;
                $dataPanel.style.width = `${width}px`;
                setTimeout(() => {
                    this.onTransitioning();
                    this.refreshDockState(true);
                    if (this.resetState())
                        this.normalise(true);
                    $dataPanel.style.width = '';
                    resolve();
                }, TRANSITION_TIME_MS);
            }, TRANSITION_DELAY_MS);
        });
    }

    setMode(mode: SplitMode, silent?: boolean) {

        if (this._initialWidthsSaved === false)
            this._saveWidths();

        this._transition = this._transition.then(() => {
            return new Promise(async (resolve) => {
                let changed = mode != this.mode;
                let prevMode = this.mode;
                this.mode = mode;

                if (mode !== 'mixed' || (changed && ! this._resizing)) {  //this condition is here because low down mixed mode doesn't always get run
                    this.allowDocking('left');
                    this.allowDocking('right');
                }

                this._layoutState.resultsWidth = null;

                let columnTemplates = this.getColumnTemplates();
                if (mode === 'results') {
                    await this.transitionToResultsMode(columnTemplates);
                    resolve();
                }
                else if (mode === 'data') {
                    await this.transitionToDataMode(columnTemplates);
                    resolve();
                }
                else {
                    this.clearCollapsedModeState();

                    if (changed && ! this._resizing) {
                        if (prevMode === 'results') {
                            await this.restoreMixedModeFromResults(columnTemplates);
                            resolve();
                        }
                        else if (prevMode === 'data') {
                            await this.restoreMixedModeFromData(columnTemplates);
                            resolve();
                        }
                        else
                            resolve();
                    }
                    else
                        resolve();
                }

                if (! silent && changed) {
                    let event = new CustomEvent('mode-changed');
                    this.dispatchEvent(event);
                }
            });
        });
    }

    refreshDockState(silent?: boolean) {
        if (this.mode === 'mixed') {
            this.suspendDocking('right', silent);
            if (this._optionsVisible)
                this.allowDocking('left');
            else
                this.suspendDocking('left', silent);
        }
        else {
            this.allowDocking('left');
            this.allowDocking('right');
        }
        this.checkDockConditions(false);
    }

    async modifyLayout(data: { left: SplitPanelSection, right: SplitPanelSection }, diffX) {
        if (diffX === 0)
            return;

        let leftSection = data.left;
        while (leftSection && leftSection.adjustable === false)
            leftSection = leftSection.getNext('left');
        if ( ! leftSection || leftSection.adjustable === false)
            return;

        let rightSection = data.right;
        while (rightSection && rightSection.adjustable === false)
            rightSection = rightSection.getNext('right');
        if ( ! rightSection || rightSection.adjustable === false)
            return;

        let changed = false;
        let snapshot = this.readLayoutSnapshot();
        let widths = snapshot.widthsPx;
        let shrinkingSection = diffX < 0 ? leftSection : rightSection;
        let growingSection = diffX > 0 ? leftSection : rightSection;
        const dir = window.getComputedStyle(this).direction;
        if (dir === 'rtl') {
            const temp = shrinkingSection;
            shrinkingSection = growingSection;
            growingSection = temp;
        }

        let shrinkingIndex = shrinkingSection.listIndex;
        let currentWidth = widths[shrinkingIndex];
        let shrunkWidth = currentWidth - Math.abs(diffX);

        let minWidth = shrinkingSection.getMinWidth();
        if (shrunkWidth < minWidth) {
            shrunkWidth = minWidth;
            diffX = minWidth - currentWidth; //how much we actually moved;
        }
        else if (shrunkWidth < 0) {
            shrunkWidth = 0;
            diffX = -currentWidth; //how much we actually moved;
        }

        if (shrinkingSection.width != shrunkWidth) {
            widths[shrinkingIndex] = shrunkWidth;
            shrinkingSection.width = shrunkWidth;
            changed = true;
        }

        let growingIndex = growingSection.listIndex;
        let grownWidth = widths[growingIndex] + Math.abs(diffX);
        if (growingSection.width != grownWidth) {
            widths[growingIndex] = grownWidth;
            growingSection.width = grownWidth;
            changed = true;
        }

        rightSection.style.width = '';
        leftSection.style.width = '';

        if (changed) {
            this.onTransitioning();
            let columnTemplates = this.writeLayoutSnapshot(snapshot);
            this._applyColumnTemplates(columnTemplates, true);
            await this.checkDockConditions(false);
        }
    }

    async checkDockConditions(updateMode) {
        return new Promise<void>((resolve) => {
            setTimeout( async() => {
                this.widths = this.readPanelWidthsPx();
                this.updateCollapsedModeState(this.widths);
                this.syncEdgePanelAppearance(this.widths);

                if (updateMode) {
                    if (this.isResultsFocused())
                        await this.setMode('results');
                    else if (this.isDataFocused())
                        await this.setMode('data');
                    else
                        await this.setMode('mixed');
                }

                resolve();
            }, 0);
        });
    }
}

customElements.define('jmv-splitpanel', SplitPanel);
