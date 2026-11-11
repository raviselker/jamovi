import type Instance from '../../../instance';
import host from '../../../host';
import type { IModuleMeta } from '../../../modules';
import Notify from '../../../notification';
import { h, htmlTrusted, richDescriptionOptions, richParagraphs } from '../../../../common/htmlelementcreator';
import interactionManager from '../../../../common/interactionmanager';
import Version from '../../../utils/version';
import { AuxView, findInitialFocus } from '../../types';
import { scrollbarGutterWidth } from '../../scrollbar';
import { createSearchBox, highlightSearch, matchesSearch, type SearchBox } from '../../search';

type ModuleOp = IModuleMeta['ops'][number];

type ModuleInstallState = {
    source: string;
    progress: [number, number];
    percent: number;
    cancelRequested: boolean;
    // the server only allows an install to be cancelled while it is
    // downloading, once the download completes the install can't be stopped
    cancellable: boolean;
};

type ModuleCardState = {
    module: IModuleMeta;
    installable: boolean;
    installedInLibrary: boolean;
};

type ModuleFilter = 'all' | 'installed' | 'not-installed' | 'updates' | 'plots';

type ModuleActionIcon = 'install' | 'remove';
type ModuleStatusTone = 'default' | 'info' | 'warning';

const actionIcons: Record<ModuleActionIcon, string> = {
    install: `
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M8 3v6" />
            <path d="M5.5 6.5 8 9l2.5-2.5" />
            <path d="M3.5 12.5h9" />
        </svg>`,
    remove: `
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M3.5 4.5h9" />
            <path d="M6.5 2.5h3" />
            <path d="M5 4.5v8" />
            <path d="M11 4.5v8" />
            <path d="M4.5 4.5l.5 8h6l.5-8" />
        </svg>`,
};

const statusIcons: Record<ModuleStatusTone, string> = {
    default: `
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M3.5 8.5l3 3 6-7" />
        </svg>`,
    info: `
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M8 13V3.5" />
            <path d="M4 7.5 8 3.5l4 4" />
        </svg>`,
    warning: `
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <path d="M8 2.5 14.5 13.5h-13z" />
            <path d="M8 6.5v3" />
            <path d="M8 11.5h.01" />
        </svg>`,
};

export default class ModulesAuxView extends AuxView {
    model: Instance;
    filtersElement: HTMLDivElement | null = null;
    searchBox: SearchBox | null = null;
    searchElement: HTMLInputElement | null = null;
    viewElement: HTMLElement | null = null;
    sideloadButton: HTMLButtonElement | null = null;
    summaryProgressElement: HTMLDivElement | null = null;
    messageElement: HTMLDivElement | null = null;
    listElement: HTMLDivElement | null = null;
    installStates = new Map<string, ModuleInstallState>();
    translators = new WeakMap<IModuleMeta['getTranslator'], (value: string) => string>();
    cancelledInstallSources = new Set<string>();
    pendingInstalledRemovals = new Set<string>();
    renderVersion = 0;
    selectedFilter: ModuleFilter = 'all';
    searchTerm = '';

    constructor(model: Instance) {
        super('modules');
        this.model = model;
    }

    getTitle() { return _('Module Library'); }

    getIconSvg() { return `
            <svg viewBox="0 0 24 24" fill="none">
                <rect x="3" y="3" width="8" height="8" data-fill="currentColor" />
                <rect x="13" y="3" width="8" height="8" data-fill="currentColor" />
                <rect x="3" y="13" width="8" height="8" data-fill="currentColor" />
                <path d="M16 13h2v3h3v2h-3v3h-2v-3h-3v-2h3z" data-fill="currentColor" />
            </svg>
        `; }

    getBody() {
        const filters = h('div', { class: 'aux-module-tabs aux-module-filters' },
            this.createFilterButton(_('All'), 'all'),
            this.createFilterButton(_('Installed'), 'installed'),
            this.createFilterButton(_('Not installed'), 'not-installed'),
            this.createFilterButton(_('Updates'), 'updates'),
            this.createFilterButton(_('Plots'), 'plots'),
        );

        const sideloadButton = this.createActionButton(
            _('Sideload'),
            () => void this.sideloadModule(),
            false,
            'subtle',
            '',
            'install',
        );
        sideloadButton.classList.add('aux-module-sideload-button');

        const searchBox = createSearchBox({
            label: _('Search modules'),
            onSearch: value => {
                this.searchTerm = value;
                void this.update();
            },
        });
        searchBox.element.classList.add('aux-module-searchbox');

        const summaryProgress = h('div', { class: 'aux-module-summary-progress', 'aria-hidden': 'true' });
        const message = h('div', { class: 'aux-module-message', role: 'status', hidden: '' });
        const list = h('div', { class: 'aux-panel-list aux-module-list' });

        const controls = h('div', { class: 'aux-module-controls' },
            // sideload sits beside the search, leaving the filters the
            // width of the panel
            h('div', { class: 'aux-module-search-row' },
                searchBox.element,
                sideloadButton,
            ),
            h('div', { class: 'aux-module-filter-row' }, filters),
            summaryProgress,
            message,
        );

        // the view fills the panel, the controls staying put while the cards
        // scroll beneath them, casting a shadow over them once they have
        list.addEventListener('scroll', () => {
            controls.classList.toggle('scrolled', list.scrollTop > 0);
        }, { passive: true });

        const body = h('div', { class: 'aux-module-view' }, controls, list);
        this.viewElement = body;

        this.filtersElement = filters;
        this.searchBox = searchBox;
        this.searchElement = searchBox.input;
        this.sideloadButton = sideloadButton;
        this.summaryProgressElement = summaryProgress;
        this.messageElement = message;
        this.listElement = list;
        this.updateSideloadButton();

        return body;
    }

    // filters the library before it's shown, as when the ribbon's module
    // menus or an analysis' 'find module' open it
    showFiltered(filter: ModuleFilter, searchTerm = ''): void {
        this.selectedFilter = filter;
        this.searchTerm = searchTerm;
        this.searchBox?.setValue(searchTerm);
        this.updateFilterState();
        this.requestUpdate();
    }

    createFilterButton(label: string, filter: ModuleFilter) {
        const selected = this.selectedFilter === filter;
        const button = h('button', {
            type: 'button',
            class: selected ? 'aux-module-tab active' : 'aux-module-tab',
            'data-filter': filter,
            'aria-pressed': selected ? 'true' : 'false',
        }, label);
        button.addEventListener('click', () => {
            if (filter === this.selectedFilter)
                return;
            this.selectedFilter = filter;
            // a search left over from before would quietly narrow the new
            // filter's list, even to nothing
            this.searchTerm = '';
            this.searchBox?.setValue('');
            this.updateFilterState();
            void this.update();
        });
        return button;
    }

    onMount(): void {
        // zooming changes the width of chromium's scrollbars (in css pixels),
        // and fires a resize
        const onResize = () => this.measureScrollbar();
        window.addEventListener('resize', onResize);
        this.addCleanup(() => window.removeEventListener('resize', onResize));

        const modules = this.model.modules();
        const available = modules.available();

        this.listen(modules, 'change:modules', this.requestUpdate);
        this.listen(modules, 'modulesChanged', this.requestUpdate);
        this.listen(available, 'change:modules', this.requestUpdate);
        this.listen(available, 'change:status', this.requestUpdate);
        this.listen(available, 'change:progress', this.requestUpdate);
        this.listen(available, 'change:message', this.requestUpdate);

        const settings = this.model.settings();
        this.listen(settings, 'change:permissions_library_side_load', this.updateSideloadButton);
        this.listen(settings, 'change:permissions_library_add_remove', this.requestUpdate);
        this.listen(settings, 'change:permissions_library_browseable', this.onBrowseableChanged);

        this.update();
    }

    // the width the list's scrollbar takes up, for the css to make room for
    // (see --aux-module-edge)
    measureScrollbar(): void {
        if (this.listElement === null || this.viewElement === null || ! this.shown)
            return;
        const width = scrollbarGutterWidth(this.listElement);
        this.viewElement.style.setProperty('--aux-module-scrollbar', `${ width }px`);
    }

    onShow(): void {
        this.measureScrollbar();
        if (this.canBrowseLibrary())
            this.model.modules().available().retrieve();
        this.updateFilterState();
        this.updateSideloadButton();
        this.update();
    }

    createListItem(text: string) {
        return h('div', { class: 'aux-panel-list-item' }, text);
    }

    createDescriptionContent(text: string, highlightTerm = ''): DocumentFragment {
        const fragment = document.createDocumentFragment();
        fragment.append(...richParagraphs(text, { ...richDescriptionOptions, linkTarget: '_blank' }));
        this.highlightTextNodes(fragment, highlightTerm);
        return fragment;
    }

    highlightTextNodes(root: Node, highlightTerm: string): void {
        if (highlightTerm.trim() === '')
            return;

        const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
        const textNodes: Text[] = [];
        while (walker.nextNode())
            textNodes.push(walker.currentNode as Text);

        for (const node of textNodes)
            node.replaceWith(this.createHighlightedTextContent(node.textContent || '', highlightTerm));
    }

    createHighlightedTextContent(text: string, highlightTerm = ''): DocumentFragment {
        return highlightSearch(text, highlightTerm);
    }

    getSearchHighlightTerm(): string {
        const rawSearch = this.searchTerm.trim();
        const lowerSearch = rawSearch.toLocaleLowerCase();
        if (lowerSearch.startsWith('module::'))
            return rawSearch.substring(8).trim();
        if (lowerSearch.startsWith('plot::'))
            return rawSearch.substring(6).trim();
        return rawSearch;
    }

    // whether a description is cut off depends on its width, so it's
    // rechecked whenever a description changes size (i.e. the panel resizes)
    descriptionObserver = new ResizeObserver(entries => {
        for (const entry of entries) {
            const meta = entry.target as HTMLElement;
            if (meta.isConnected)
                this.checkDescriptionClamp(meta);
            else
                this.descriptionObserver.unobserve(meta);
        }
    });

    updateDescriptionClamp(meta: HTMLElement): void {
        this.descriptionObserver.observe(meta);
        requestAnimationFrame(() => {
            if (meta.isConnected)
                this.checkDescriptionClamp(meta);
        });
    }

    // fades the last line when the collapsed description is cut off; an
    // expanded description is shown in full, so it's left as it was
    checkDescriptionClamp(meta: HTMLElement): void {
        if (meta.classList.contains('expanded') || meta.dataset.expandable !== 'true')
            return;
        meta.classList.toggle('clamped', meta.scrollHeight > meta.clientHeight + 1);
    }

    onDispose(): void {
        this.descriptionObserver.disconnect();
    }

    expandDescriptionForHiddenHighlight(meta: HTMLElement): void {
        if (meta.querySelector('.aux-search-highlight') === null)
            return;

        requestAnimationFrame(() => {
            if (! meta.isConnected || meta.classList.contains('expanded'))
                return;

            if (meta.scrollHeight <= meta.clientHeight + 1)
                return;

            const metaRect = meta.getBoundingClientRect();
            const highlights = Array.from(meta.querySelectorAll<HTMLElement>('.aux-search-highlight'));
            const highlightIsHidden = highlights.some(highlight => {
                const rect = highlight.getBoundingClientRect();
                return rect.top < metaRect.top - 1 || rect.bottom > metaRect.bottom + 1;
            });

            if (! highlightIsHidden)
                return;

            meta.classList.add('expanded');
            meta.setAttribute('aria-expanded', 'true');
        });
    }

    async update(): Promise<void> {
        if (this.listElement === null)
            return;

        const renderVersion = ++this.renderVersion;
        const installedModules = this.getInstalledModules();
        const availableModules = this.getAvailableModules();

        await this.loadTranslators([ ...installedModules, ...availableModules ]);
        if (renderVersion !== this.renderVersion)
            return;

        this.updateMessage();
        this.updateSummaryProgress(installedModules, availableModules);

        const cards = this.getVisibleModuleCards(installedModules, availableModules);
        const emptyMessage = this.getEmptyMessage();

        if (renderVersion !== this.renderVersion)
            return;

        await this.updateModuleSection(cards, emptyMessage, renderVersion);
    }

    async loadTranslators(modules: IModuleMeta[]): Promise<void> {
        await Promise.all(modules
            .filter(module => ! this.translators.has(module.getTranslator))
            .map(async module => {
                this.translators.set(module.getTranslator, await module.getTranslator);
            }));
    }

    translate(module: IModuleMeta, value: string): string {
        const translator = this.translators.get(module.getTranslator);
        return translator ? translator(value) : value;
    }

    async updateModuleSection(cards: ModuleCardState[], emptyMessage: string, renderVersion: number): Promise<void> {
        if (this.listElement === null || renderVersion !== this.renderVersion)
            return;

        let section = this.listElement.querySelector<HTMLElement>(':scope > .aux-module-section');
        const preserveScroll = section !== null && section.dataset.filter === this.selectedFilter;

        // if the card holding focus is removed, focus moves to the card that
        // takes its place
        const focusedCard = section !== null && document.activeElement !== null
            ? document.activeElement.closest<HTMLElement>('.aux-module-card')
            : null;
        const focusedCardIndex = focusedCard !== null && section !== null
            ? Array.from(section.querySelectorAll(':scope > .aux-module-card')).indexOf(focusedCard)
            : -1;
        const scrollAnchor = preserveScroll ? this.captureListScrollAnchor(section) : null;
        if (! preserveScroll) {
            section = h('div', { class: 'aux-module-section', 'data-filter': this.selectedFilter });
            this.listElement.replaceChildren(section);
        }

        const currentCards = Array.from(section.querySelectorAll<HTMLElement>(':scope > .aux-module-card[data-module-name]'));
        const nextModuleNames = new Set(cards.map(card => card.module.name));
        const removedCards = currentCards.filter(card => {
            const moduleName = card.dataset.moduleName;
            return moduleName !== undefined
                && this.selectedFilter === 'installed'
                && ! nextModuleNames.has(moduleName)
                && this.pendingInstalledRemovals.has(moduleName);
        });

        if (removedCards.length > 0 && ! this.prefersReducedMotion())
            await this.animateCardRemoval(removedCards);

        if (renderVersion !== this.renderVersion)
            return;

        const currentCardsByName = new Map<string, HTMLElement[]>();
        for (const card of currentCards) {
            const moduleName = card.dataset.moduleName;
            if (moduleName === undefined)
                continue;

            const cardsForName = currentCardsByName.get(moduleName) || [];
            cardsForName.push(card);
            currentCardsByName.set(moduleName, cardsForName);
        }

        const emptyItem = section.querySelector<HTMLElement>(':scope > [data-role="module-empty"]');

        if (cards.length === 0) {
            for (const card of currentCards)
                card.remove();

            const item = emptyItem || this.createListItem(emptyMessage);
            item.dataset.role = 'module-empty';
            item.textContent = emptyMessage;
            if (item.parentElement !== section)
                section.append(item);

            this.restoreListScrollAnchor(section, scrollAnchor, renderVersion);
            this.restoreCardFocus(section, focusedCard, focusedCardIndex);
            for (const card of removedCards) {
                if (card.dataset.moduleName !== undefined)
                    this.pendingInstalledRemovals.delete(card.dataset.moduleName);
            }
            return;
        }

        emptyItem?.remove();

        const usedCards = new Set<HTMLElement>();
        for (const [ index, state ] of cards.entries()) {
            if (renderVersion !== this.renderVersion)
                return;

            const cardsForName = currentCardsByName.get(state.module.name) || [];
            const reusableCardIndex = cardsForName.findIndex(card => this.canReuseModuleCard(card, state.installable));
            let card: HTMLElement | undefined;
            if (reusableCardIndex !== -1) {
                card = cardsForName[reusableCardIndex];
                cardsForName.splice(reusableCardIndex, 1);
            }

            if (card === undefined)
                card = this.createModuleCardShell(state.module.name, state.installable);

            usedCards.add(card);

            await this.updateModuleCard(card, state.module, state.installable, state.installedInLibrary, renderVersion);
            if (renderVersion !== this.renderVersion)
                return;

            const nextChild = section.children[index] ?? null;
            if (nextChild !== card)
                section.insertBefore(card, nextChild);
        }

        for (const card of currentCards) {
            if (! usedCards.has(card))
                card.remove();
        }
        this.restoreListScrollAnchor(section, scrollAnchor, renderVersion);
        this.restoreCardFocus(section, focusedCard, focusedCardIndex);

        for (const card of removedCards) {
            if (card.dataset.moduleName !== undefined)
                this.pendingInstalledRemovals.delete(card.dataset.moduleName);
        }
    }

    // as with the actions (see captureActionFocus()), only for the keyboard
    restoreCardFocus(section: HTMLElement, focusedCard: HTMLElement | null, focusedCardIndex: number): void {
        if (focusedCard === null || focusedCard.isConnected || ! interactionManager.inKeyboardMode())
            return;

        const cards = Array.from(section.querySelectorAll<HTMLElement>(':scope > .aux-module-card'));
        const card = cards[Math.min(focusedCardIndex, cards.length - 1)];
        const target = (card && findInitialFocus(card)) || this.searchElement;
        target?.focus();
    }

    canReuseModuleCard(card: HTMLElement, installable: boolean): boolean {
        return card.classList.contains('available-in-library') === installable;
    }

    captureListScrollAnchor(section: HTMLElement): { moduleName: string; offset: number; scrollTop: number } | null {
        if (this.listElement === null)
            return null;

        const listRect = this.listElement.getBoundingClientRect();
        const cards = Array.from(section.querySelectorAll<HTMLElement>(':scope > .aux-module-card[data-module-name]'));
        for (const card of cards) {
            const cardRect = card.getBoundingClientRect();
            if (cardRect.bottom < listRect.top)
                continue;

            const moduleName = card.dataset.moduleName;
            if (moduleName === undefined)
                continue;

            return {
                moduleName,
                offset: cardRect.top - listRect.top,
                scrollTop: this.listElement.scrollTop,
            };
        }

        return {
            moduleName: '',
            offset: 0,
            scrollTop: this.listElement.scrollTop,
        };
    }

    restoreListScrollAnchor(section: HTMLElement, anchor: { moduleName: string; offset: number; scrollTop: number } | null, renderVersion: number): void {
        if (this.listElement === null || anchor === null || renderVersion !== this.renderVersion)
            return;

        if (anchor.moduleName === '') {
            this.listElement.scrollTop = anchor.scrollTop;
            return;
        }

        const card = section.querySelector<HTMLElement>(`:scope > .aux-module-card[data-module-name="${ CSS.escape(anchor.moduleName) }"]`);
        if (card === null) {
            this.listElement.scrollTop = anchor.scrollTop;
            return;
        }

        const listRect = this.listElement.getBoundingClientRect();
        const cardRect = card.getBoundingClientRect();
        this.listElement.scrollTop += cardRect.top - listRect.top - anchor.offset;
    }

    prefersReducedMotion(): boolean {
        return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;
    }

    animateCardRemoval(cards: HTMLElement[]): Promise<void> {
        return new Promise(resolve => {
            for (const card of cards) {
                card.style.height = `${ card.offsetHeight }px`;
                card.style.overflow = 'hidden';
                card.style.boxSizing = 'border-box';
            }

            requestAnimationFrame(() => {
                for (const card of cards)
                    card.classList.add('removing');

                window.setTimeout(resolve, 260);
            });
        });
    }

    updateFilterState(): void {
        if (this.filtersElement === null)
            return;

        this.filtersElement.querySelectorAll<HTMLButtonElement>('.aux-module-tab').forEach(button => {
            const active = button.dataset.filter === this.selectedFilter;
            button.classList.toggle('active', active);
            button.setAttribute('aria-pressed', active ? 'true' : 'false');
        });

        if (this.searchElement)
            this.searchElement.setAttribute('aria-label', _('Search modules'));
    }

    canAddRemoveModules(): boolean {
        return this.model.settings().getSetting('permissions_library_add_remove', false);
    }

    canBrowseLibrary(): boolean {
        return this.model.settings().getSetting('permissions_library_browseable', true);
    }

    onBrowseableChanged(): void {
        if (this.canBrowseLibrary() && this.shown)
            this.model.modules().available().retrieve();
        this.requestUpdate();
    }

    updateMessage(): void {
        if (this.messageElement === null)
            return;

        let message = '';
        if (! this.canBrowseLibrary())
            message = _('The jamovi library is not available to your session.');
        else
            message = this.model.modules().available().get('message') || '';

        if (message === '' && ! this.canAddRemoveModules())
            message = _('Installing modules is not available on your plan');

        this.messageElement.textContent = message;
        this.messageElement.hidden = message === '';
    }

    canSideloadModules(): boolean {
        return host.isElectron && this.model.settings().getSetting('permissions_library_side_load', false);
    }

    updateSideloadButton(): void {
        if (this.sideloadButton === null)
            return;

        const canSideload = this.canSideloadModules();
        this.sideloadButton.disabled = ! canSideload;
        this.sideloadButton.hidden = ! canSideload;
        this.sideloadButton.setAttribute('aria-hidden', canSideload ? 'false' : 'true');
        this.sideloadButton.title = canSideload
            ? _('Install module from file')
            : _('Side-loading modules is not available.');
    }

    getInstalledModules(): IModuleMeta[] {
        return this.model.modules().get('modules') || [];
    }

    getAvailableModules(): IModuleMeta[] {
        if (! this.canBrowseLibrary())
            return [];
        return this.model.modules().available().get('modules') || [];
    }

    getInstalledModuleNames(installedModules: IModuleMeta[]): Set<string> {
        return new Set(installedModules.map(module => module.name));
    }

    getAvailableListModule(module: IModuleMeta, installedModules: IModuleMeta[]): IModuleMeta {
        const installedModule = installedModules.find(installed => installed.name === module.name);
        if (installedModule === undefined)
            return module;

        const availableSource = module.url || module.path;
        const ops: ModuleOp[] = [];
        if (module.ops.includes('old') || module.ops.includes('unavailable')) {
            ops.push(...module.ops.filter(op => op === 'old' || op === 'unavailable'));
        }
        else if (installedModule.incompatible) {
            if (availableSource !== '' && module.version >= installedModule.version)
                ops.push('update');
            ops.push('incompatible');
        }
        else if (module.version > installedModule.version && availableSource !== '') {
            ops.push('update');
        }
        else {
            ops.push('installed');
        }

        for (const op of installedModule.ops) {
            if (op === 'show' || op === 'hide' || op === 'remove')
                ops.push(op);
        }

        return {
            ...installedModule,
            path: module.path,
            url: availableSource || installedModule.url,
            version: Math.max(module.version, installedModule.version),
            minAppVersion: module.minAppVersion,
            isSystem: installedModule.isSystem,
            visible: installedModule.visible,
            incompatible: installedModule.incompatible,
            ops: [ ...new Set(ops) ],
        };
    }

    getModuleCards(installedModules = this.getInstalledModules(), availableModules = this.getAvailableModules()): ModuleCardState[] {
        const installedNames = this.getInstalledModuleNames(installedModules);
        const availableCards = availableModules.map(module => {
            const installedInLibrary = installedNames.has(module.name);
            return {
                module: this.getAvailableListModule(module, installedModules),
                installable: true,
                installedInLibrary,
            };
        });

        const availableNames = new Set(availableCards.map(card => card.module.name));
        const installedOnlyCards = installedModules
            .filter(module => ! availableNames.has(module.name))
            .map(module => ({
                module,
                installable: false,
                installedInLibrary: true,
            }));

        return [ ...availableCards, ...installedOnlyCards ];
    }

    getVisibleModuleCards(installedModules = this.getInstalledModules(), availableModules = this.getAvailableModules()): ModuleCardState[] {
        return this.getModuleCards(installedModules, availableModules)
            .filter(card => this.cardMatchesFilter(card))
            .filter(card => this.moduleMatchesSearch(card.module))
            .sort((left, right) => this.compareModuleCards(left, right));
    }

    compareModuleCards(left: ModuleCardState, right: ModuleCardState): number {
        const leftBase = this.isBaseModuleCard(left);
        const rightBase = this.isBaseModuleCard(right);
        if (leftBase !== rightBase)
            return leftBase ? -1 : 1;

        return this.translate(left.module, left.module.title).localeCompare(this.translate(right.module, right.module.title));
    }

    isBaseModuleCard(card: ModuleCardState): boolean {
        return card.module.isSystem || ! card.installable;
    }

    getVisibleModules(installedModules = this.getInstalledModules(), availableModules = this.getAvailableModules()): IModuleMeta[] {
        return this.getVisibleModuleCards(installedModules, availableModules)
            .map(card => card.module);
    }

    cardMatchesFilter(card: ModuleCardState): boolean {
        const isInstalled = card.installedInLibrary || ! card.installable || card.module.ops.includes('installed') || card.module.ops.includes('remove');
        switch (this.selectedFilter) {
            case 'installed':
                return isInstalled;
            case 'not-installed':
                return ! isInstalled;
            case 'updates':
                return card.module.ops.includes('update');
            case 'plots':
                return this.moduleHasPlots(card.module);
            case 'all':
            default:
                return true;
        }
    }

    // a module provides plots if it's a plots module, or has plot analyses
    moduleHasPlots(module: IModuleMeta): boolean {
        return module.category === 'plots' || module.analyses.some(analysis => analysis.category === 'plots');
    }

    getEmptyMessage(): string {
        switch (this.selectedFilter) {
            case 'installed':
                return _('No installed modules found.');
            case 'not-installed':
                return _('No additional modules available right now.');
            case 'updates':
                return _('No module updates found.');
            case 'plots':
                return _('No plot modules found.');
            case 'all':
            default:
                return _('No modules found.');
        }
    }

    updateSummaryProgress(installedModules = this.getInstalledModules(), availableModules = this.getAvailableModules()): void {
        const summary = this.summaryProgressElement;
        if (summary === null)
            return;

        // the summary's controls are replaced as installs start and finish
        // (i.e. Update all becomes Cancel all), so focus is kept within it
        const hadFocus = document.activeElement !== null && summary.contains(document.activeElement);
        this.renderSummaryProgress(summary, installedModules, availableModules);
        if (hadFocus && ! summary.contains(document.activeElement))
            (findInitialFocus(summary) || this.searchElement)?.focus();
    }

    renderSummaryProgress(summary: HTMLDivElement, installedModules: IModuleMeta[], availableModules: IModuleMeta[]): void {
        const activeInstalls = [ ...this.installStates.values() ];
        if (activeInstalls.length === 0) {
            const updateableModules = this.getVisibleModules(installedModules, availableModules)
                .filter(module => module.ops.includes('update'))
                .filter(module => ! this.installStates.has(module.name));

            if (updateableModules.length > 0 && this.canAddRemoveModules()) {
                const button = this.createActionButton(
                    _('Update all ({count})', { count: updateableModules.length.toString() }),
                    () => this.updateAll(updateableModules),
                    false,
                    'primary');
                button.classList.add('aux-module-summary-action');
                summary.classList.add('active');
                summary.setAttribute('aria-hidden', 'false');
                summary.replaceChildren(button);
                return;
            }

            summary.classList.remove('active');
            summary.setAttribute('aria-hidden', 'true');
            summary.replaceChildren();
            return;
        }

        const totalValue = activeInstalls.reduce((sum, state) => sum + state.progress[0], 0);
        const totalMax = activeInstalls.reduce((sum, state) => sum + state.progress[1], 0);
        const percent = totalMax > 0
            ? Math.max(0, Math.min(100, Math.round((100 * totalValue) / totalMax)))
            : 0;
        const allCancelling = activeInstalls.every(state => state.cancelRequested);
        const anyCancellable = activeInstalls.some(state => state.cancellable && ! state.cancelRequested);

        const summaryState: ModuleInstallState = {
            source: '',
            progress: [ totalValue, totalMax ],
            percent,
            cancelRequested: allCancelling,
            cancellable: anyCancellable,
        };
        const summaryText = n_('Installing {n} module', 'Installing {n} modules', activeInstalls.length, { n: activeInstalls.length.toLocaleString() });

        summary.classList.add('active');
        summary.setAttribute('aria-hidden', 'false');
        const existingWrap = summary.querySelector<HTMLElement>('.aux-module-progress-wrap-summary');
        if (existingWrap !== null) {
            this.updateInstallProgress(existingWrap, summaryState, summaryText);
            return;
        }

        const wrap = this.createInstallProgress(summaryState, {
            text: summaryText,
            className: 'aux-module-progress-wrap aux-module-progress-wrap-summary',
            cancelAction: () => this.cancelAllInstalls(),
            cancelLabel: _('Cancel all'),
        });

        summary.replaceChildren(wrap);
    }

    updateAll(modules: IModuleMeta[]): void {
        for (const module of modules)
            this.installModule(module);
    }

    cancelAllInstalls(): void {
        const modulesBySource = new Map<string, IModuleMeta>();
        const availableModules = this.getAvailableModules();
        const installedModules = this.getInstalledModules();
        for (const module of [ ...availableModules, ...installedModules ]) {
            const source = module.url || module.path;
            if (source)
                modulesBySource.set(source, module);
        }

        for (const [ moduleName, state ] of this.installStates) {
            if (state.cancelRequested || ! state.cancellable)
                continue;

            const module = modulesBySource.get(state.source);
            if (module !== undefined) {
                this.cancelInstallModule(module);
                continue;
            }

            this.installStates.set(moduleName, {
                ...state,
                cancelRequested: true,
            });
            this.cancelledInstallSources.add(state.source);
            this.cancelInstallBySource(state.source, error => {
                this.cancelledInstallSources.delete(state.source);
                const currentState = this.installStates.get(moduleName);
                if (currentState !== undefined) {
                    this.installStates.set(moduleName, {
                        ...currentState,
                        cancelRequested: false,
                    });
                }
                this.updateSummaryProgress();
                this.notifyUnableToCancelInstall(error);
            }, () => {
                this.installStates.delete(moduleName);
                this.updateSummaryProgress();
                void this.update();
            });
        }

        this.updateSummaryProgress();
    }

    moduleMatchesSearch(module: IModuleMeta): boolean {
        const rawSearch = this.searchTerm.trim().toLocaleLowerCase();
        if (rawSearch === '')
            return true;

        if (rawSearch.startsWith('module::')) {
            const term = rawSearch.substring(8).trim();
            return term === '' || module.name.toLowerCase().startsWith(term);
        }

        if (rawSearch.startsWith('plot::')) {
            const term = rawSearch.substring(6).trim();
            if ( ! this.moduleHasPlots(module))
                return false;
            return term === '' || module.name.toLowerCase().startsWith(term);
        }

        // match against both the translated text shown on the card, and the
        // original text, so english search terms still work
        const texts = [
            module.title,
            module.description,
            ...module.analyses.map(analysis => analysis.title),
            ...module.analyses.map(analysis => analysis.menuTitle),
            ...module.analyses.map(analysis => analysis.menuSubtitle),
        ].filter(value => value);

        const haystack = [
            module.name,
            module.category,
            ...module.authors,
            ...texts,
            ...texts.map(text => this.translate(module, text)),
        ]
            .filter(value => value)
            .join('\n')
            .toLocaleLowerCase();

        return matchesSearch(haystack, rawSearch);
    }

    async createModuleCard(module: IModuleMeta, installable: boolean, installedInLibrary = false): Promise<HTMLElement> {
        const card = this.createModuleCardShell(module.name, installable);
        await this.updateModuleCard(card, module, installable, installedInLibrary, this.renderVersion);
        return card;
    }

    createModuleCardShell(moduleName: string, installable: boolean): HTMLElement {
        const installedBadge = this.createStatusChip(_('Installed'));
        installedBadge.classList.add('aux-module-installed-badge', 'hidden');
        installedBadge.setAttribute('aria-hidden', 'true');

        // a module's own text (its title, description, authors and analysis
        // names) is in English unless the module ships a translation, so
        // its direction can differ from the UI's: dir=auto takes it from
        // the text itself
        const meta = h('div', { class: 'aux-module-meta', dir: 'auto' });
        this.bindModuleMetaToggle(meta);

        const card = h('div', {
            class: installable ? 'aux-panel-placeholder aux-module-card available-in-library' : 'aux-panel-placeholder aux-module-card',
            'data-module-name': moduleName,
        },
            h('div', { class: 'aux-module-header' },
                h('div', { class: 'aux-module-icon', 'aria-hidden': 'true' }),
                h('div', { class: 'aux-module-title-wrap' },
                    h('div', { class: 'aux-module-title', dir: 'auto' }),
                    h('div', { class: 'aux-module-package-meta' },
                        h('span', { class: 'aux-module-name' }),
                        h('span', { class: 'aux-module-version' }),
                    ),
                ),
            ),
            installedBadge,
            meta,
            h('div', { class: 'aux-module-authors', dir: 'auto', hidden: '' }),
            h('div', { class: 'aux-module-notice', hidden: '' }),
            h('div', { class: 'aux-module-actions', hidden: '' }),
            h('div', { class: 'aux-module-analyses-host', hidden: '' }),
        );

        return card;
    }

    bindModuleMetaToggle(meta: HTMLElement): void {
        const toggleExpanded = () => {
            if (meta.dataset.expandable !== 'true')
                return;

            const expanded = meta.classList.toggle('expanded');
            meta.setAttribute('aria-expanded', expanded ? 'true' : 'false');
            if (! expanded)
                this.checkDescriptionClamp(meta);
        };

        meta.addEventListener('click', event => {
            const target = event.target;
            if (target instanceof HTMLElement && target.closest('a'))
                return;
            toggleExpanded();
        });
        meta.addEventListener('keydown', event => {
            if (event.key !== 'Enter' && event.key !== ' ')
                return;
            event.preventDefault();
            toggleExpanded();
        });
    }

    async updateModuleCard(card: HTMLElement, module: IModuleMeta, installable: boolean, installedInLibrary: boolean, renderVersion: number): Promise<void> {
        const translator = await module.getTranslator;
        if (renderVersion !== this.renderVersion)
            return;

        const highlightTerm = this.getSearchHighlightTerm();

        card.dataset.moduleName = module.name;
        card.className = 'aux-panel-placeholder aux-module-card';
        card.classList.toggle('available-in-library', installable);
        card.classList.toggle('installed-in-library', installedInLibrary);

        this.updateModuleCardHeader(card, module, translator, highlightTerm);
        this.updateInstalledBadge(card, module, installable, installedInLibrary);
        this.updateModuleCardDescription(card, module, translator, highlightTerm);
        this.updateModuleCardAuthors(card, module, highlightTerm);
        this.updateModuleCardActions(card, module, installable, installedInLibrary);
        this.updateModuleCardAnalyses(card, module, installable, installedInLibrary, translator, highlightTerm);
    }

    updateModuleCardHeader(card: HTMLElement, module: IModuleMeta, translator: (value: string) => string, highlightTerm: string): void {
        const icon = card.querySelector<HTMLElement>('.aux-module-icon');
        if (icon !== null)
            icon.textContent = this.getModuleInitials(module);

        const title = card.querySelector<HTMLElement>('.aux-module-title');
        if (title !== null)
            title.replaceChildren(this.createHighlightedTextContent(translator(module.title), highlightTerm));

        const name = card.querySelector<HTMLElement>('.aux-module-name');
        if (name !== null)
            name.replaceChildren(this.createHighlightedTextContent(module.name, highlightTerm));

        const version = card.querySelector<HTMLElement>('.aux-module-version');
        if (version !== null)
            version.textContent = _('v{version}', { version: Version.stringify(module.version, 3) });
    }

    updateInstalledBadge(card: HTMLElement, module: IModuleMeta, installable: boolean, installedInLibrary: boolean): void {
        let installedBadge = card.querySelector<HTMLElement>('.aux-module-installed-badge');
        if (installedBadge === null) {
            installedBadge = this.createStatusChip(_('Installed'));
            installedBadge.classList.add('aux-module-installed-badge', 'hidden');
            const header = card.querySelector<HTMLElement>('.aux-module-header');
            if (header !== null)
                header.after(installedBadge);
            else
                card.prepend(installedBadge);
        }

        const showInstalledBadge = installedInLibrary || ! installable || module.ops.includes('installed') || module.ops.includes('remove');
        const needsUpdate = showInstalledBadge && this.moduleNeedsUpdate(module);
        const updateAvailable = showInstalledBadge && module.ops.includes('update');

        let badgeLabel = _('Installed');
        let tone: ModuleStatusTone = 'default';
        if (needsUpdate) {
            badgeLabel = _('Needs update');
            tone = 'warning';
        }
        else if (updateAvailable) {
            badgeLabel = _('Update available');
            tone = 'info';
        }

        installedBadge.dataset.tone = tone;
        installedBadge.replaceChildren(this.createStatusIcon(tone), h('span', {}, badgeLabel));
        installedBadge.classList.toggle('hidden', ! showInstalledBadge);
        installedBadge.setAttribute('aria-hidden', showInstalledBadge ? 'false' : 'true');

        // an incompatible module can't be used until it's updated, so the
        // card calls this out rather than relying on the badge
        card.classList.toggle('needs-update', needsUpdate);
        const notice = card.querySelector<HTMLElement>('.aux-module-notice');
        if (notice !== null) {
            notice.hidden = ! needsUpdate;
            if (needsUpdate) {
                const message = module.ops.includes('update')
                    ? _("This module won't work until it's updated.")
                    : _("This module won't work until it's updated, but no update is available yet.");
                notice.replaceChildren(this.createStatusIcon('warning'), h('span', {}, message));
            }
        }
    }

    moduleNeedsUpdate(module: IModuleMeta): boolean {
        return module.incompatible === true || module.ops.includes('incompatible');
    }

    updateModuleCardDescription(card: HTMLElement, module: IModuleMeta, translator: (value: string) => string, highlightTerm: string): void {
        const meta = card.querySelector<HTMLElement>('.aux-module-meta');
        if (meta === null)
            return;

        const description = translator(module.description).trim();
        meta.replaceChildren();
        meta.classList.remove('expanded', 'clamped');

        if (description) {
            meta.append(this.createDescriptionContent(description, highlightTerm));
            meta.title = meta.textContent || '';
            meta.tabIndex = 0;
            meta.dataset.expandable = 'true';
            meta.setAttribute('role', 'button');
            meta.setAttribute('aria-expanded', 'false');
            this.updateDescriptionClamp(meta);
            this.expandDescriptionForHiddenHighlight(meta);
            return;
        }

        const analysisCount = module.analyses.length;
        meta.textContent = n_('{n} analysis', '{n} analyses', analysisCount, { n: analysisCount.toLocaleString() });
        meta.removeAttribute('title');
        meta.removeAttribute('role');
        meta.removeAttribute('aria-expanded');
        delete meta.dataset.expandable;
        meta.removeAttribute('tabindex');
    }

    updateModuleCardAuthors(card: HTMLElement, module: IModuleMeta, highlightTerm: string): void {
        const authors = card.querySelector<HTMLElement>('.aux-module-authors');
        if (authors === null)
            return;

        const authorList = module.authors.filter(author => author && author.trim() !== '');
        authors.replaceChildren();
        authors.hidden = authorList.length === 0;
        if (authorList.length > 0)
            authors.append(this.createHighlightedTextContent(authorList.join(', '), highlightTerm));
    }

    getModuleLabel(module: IModuleMeta): string {
        // trim any leading short name from the title, i.e. 'GAMLj - General
        // Analyses for Linear Models' becomes 'General Analyses for Linear Models'
        let label = this.translate(module, module.title);
        if (label.slice(0, module.name.length).toLocaleLowerCase() === module.name.toLocaleLowerCase()) {
            const separator = label.slice(module.name.length).match(/^[ :-]{1,3}/);
            if (separator !== null)
                label = label.slice(module.name.length + separator[0].length);
        }
        if (module.name !== module.title)
            label = `${ module.name } - ${ label }`;
        return label;
    }

    createInstallButton(module: IModuleMeta, action: 'install' | 'update'): HTMLButtonElement {
        const version = Version.stringify(module.version, 3);
        const moduleName = this.getModuleLabel(module);
        const button = this.createActionButton(
            action === 'install' ? _('Install') : _('Update'),
            () => this.installModule(module), false, this.moduleNeedsUpdate(module) ? 'attention' : 'primary', '', 'install');
        button.dataset.installAction = action;
        button.dataset.action = action;
        button.setAttribute('aria-label', action === 'install'
            ? _('Install module {moduleName} version {version}', { moduleName, version })
            : _('Update module {moduleName} to version {version}', { moduleName, version }));
        return button;
    }

    updateModuleCardActions(card: HTMLElement, module: IModuleMeta, installable: boolean, installedInLibrary: boolean): void {
        const actions = card.querySelector<HTMLElement>('.aux-module-actions');
        if (actions === null)
            return;

        const installState = this.installStates.get(module.name);
        const isInstalling = installState !== undefined;
        const addRemove = this.canAddRemoveModules();
        const canInstall = addRemove && installable && (module.ops.includes('install') || module.ops.includes('update'));
        if (canInstall)
            actions.dataset.role = 'module-actions';
        else
            delete actions.dataset.role;

        const signature = [
            installable ? 'installable' : 'installed',
            installedInLibrary ? 'library-installed' : 'direct-list',
            isInstalling ? 'installing' : 'idle',
            module.ops.join(','),
            addRemove ? 'add-remove' : 'no-add-remove',
        ].join('|');

        if (actions.dataset.signature === signature) {
            if (isInstalling && installState !== undefined) {
                const progressElement = actions.querySelector<HTMLElement>('[data-role="install-progress"]');
                if (progressElement !== null)
                    this.updateInstallProgress(progressElement, installState);
            }
            return;
        }

        actions.dataset.signature = signature;

        const focusedAction = this.captureActionFocus(actions);
        actions.replaceChildren();

        if (isInstalling && canInstall) {
            actions.append(this.createInstallProgress(installState, {
                cancelAction: () => this.cancelInstallModule(module),
            }));
        }
        else if (addRemove && installable && module.ops.includes('install')) {
            actions.append(this.createInstallButton(module, 'install'));
        }

        if (addRemove && ! isInstalling && module.ops.includes('update'))
            actions.append(this.createInstallButton(module, 'update'));

        if (addRemove && module.ops.includes('remove')) {
            const button = this.createActionButton(_('Remove'), () => this.uninstallModule(module), false, 'subtle', '', 'remove');
            button.dataset.action = 'remove';
            button.setAttribute('aria-label', _('Remove module {moduleName}', { moduleName: this.getModuleLabel(module) }));
            actions.append(button);
        }

        if (! isInstalling) {
            if (module.ops.includes('installed') && ! installedInLibrary) {
                const chip = this.createStatusChip(_('Installed'));
                chip.setAttribute('aria-label', _('Module {moduleName} is installed', { moduleName: this.getModuleLabel(module) }));
                chip.setAttribute('role', 'img');
                actions.append(chip);
            }
            if (module.ops.includes('unavailable'))
                actions.append(this.createStatusChip(_('Unavailable'), 'warning'));
            if (module.ops.includes('old'))
                actions.append(this.createStatusChip(_('Requires newer jamovi'), 'warning'));
        }

        actions.hidden = actions.childElementCount === 0;
        this.restoreActionFocus(card, actions, focusedAction);
    }

    // a card's actions are rebuilt as its state changes, so if one has focus
    // it's restored to its replacement (i.e. Install becomes Remove), or the
    // next action available. only for the keyboard: a click leaves focus on
    // the button too, but moving it to the replacement then isn't wanted
    captureActionFocus(actions: HTMLElement): string | null {
        if ( ! interactionManager.inKeyboardMode())
            return null;
        const activeElement = document.activeElement;
        if (! (activeElement instanceof HTMLElement) || ! actions.contains(activeElement))
            return null;
        return activeElement.dataset.action || '';
    }

    restoreActionFocus(card: HTMLElement, actions: HTMLElement, focusedAction: string | null): void {
        if (focusedAction === null)
            return;

        const target = (focusedAction !== '' ? actions.querySelector<HTMLElement>(`[data-action="${ focusedAction }"]`) : null)
            || findInitialFocus(actions)
            || card.querySelector<HTMLElement>('.aux-module-meta[tabindex]');
        target?.focus();
    }

    updateModuleCardAnalyses(card: HTMLElement, module: IModuleMeta, installable: boolean, installedInLibrary: boolean, translator: (value: string) => string, highlightTerm: string): void {
        const analysesHost = card.querySelector<HTMLElement>('.aux-module-analyses-host');
        if (analysesHost === null)
            return;

        analysesHost.replaceChildren();

        // an installed module's analyses are run from the analyses view
        const isInstalled = installedInLibrary || ! installable || module.ops.includes('installed') || module.ops.includes('remove');
        const analyses = isInstalled
            ? null
            : installable
            ? this.createAvailableAnalyses(module, translator, highlightTerm)
            : null;

        analysesHost.hidden = analyses === null || analyses.childElementCount === 0;
        if (analyses !== null && analyses.childElementCount > 0)
            analysesHost.append(analyses);
    }

    getModuleInitials(module: IModuleMeta): string {
        const source = module.name.trim();
        const words = source
            .replace(/([a-z])([A-Z])/g, '$1 $2')
            .split(/[\s:_-]+/)
            .filter(word => /[A-Za-z0-9]/.test(word));

        if (words.length >= 2)
            return `${ words[0][0] }${ words[1][0] }`.toUpperCase();

        return source.replace(/[^A-Za-z0-9]/g, '').slice(0, 2).toUpperCase() || 'J';
    }

    createAvailableAnalyses(module: IModuleMeta, translator: (value: string) => string, highlightTerm = ''): HTMLDivElement {
        const analyses = h('div', { class: 'aux-module-analyses' });
        for (const analysis of module.analyses.slice(0, 4)) {
            const label = translator(analysis.menuTitle || analysis.title);
            analyses.append(this.createActionButton(label, () => this.runAnalysis(module, analysis.name, analysis.title), true, 'default', highlightTerm));
        }
        return analyses;
    }

    createActionButton(label: string, action: () => void, secondary = false, emphasis: 'default' | 'primary' | 'subtle' | 'attention' = 'default', highlightTerm = '', iconType: ModuleActionIcon | null = null): HTMLButtonElement {
        const button = h('button', {
            type: 'button',
            class: secondary ? 'aux-module-analysis-button' : 'aux-module-action-button',
            'data-emphasis': emphasis,
        });

        const icon = this.createActionIcon(iconType, secondary);
        if (icon)
            button.append(icon);

        // dir=auto, as an analysis button's label is the module's own text
        button.append(h('span', { class: 'aux-module-action-label', dir: 'auto' }, this.createHighlightedTextContent(label, highlightTerm)));
        button.addEventListener('click', action);
        return button;
    }

    createActionIcon(iconType: ModuleActionIcon | null, secondary: boolean): HTMLSpanElement | null {
        if (secondary || iconType === null)
            return null;

        return h('span', { class: 'aux-module-action-icon' }, htmlTrusted(actionIcons[iconType]));
    }

    createStatusIcon(tone: ModuleStatusTone = 'default'): HTMLSpanElement {
        return h('span', { class: 'aux-module-status-icon', 'aria-hidden': 'true' }, htmlTrusted(statusIcons[tone]));
    }

    createStatusChip(label: string, tone: 'default' | 'warning' = 'default'): HTMLSpanElement {
        return h('span', { class: 'aux-module-status-chip', 'data-tone': tone },
            ...(tone === 'default' ? [ this.createStatusIcon() ] : []),
            h('span', {}, label),
        );
    }

    createInstallProgress(state: ModuleInstallState, options?: { text?: string; className?: string; cancelAction?: () => void; cancelLabel?: string }): HTMLDivElement {
        const wrap = h('div', { class: options?.className || 'aux-module-progress-wrap', 'data-role': 'install-progress' },
            h('div', { class: 'aux-module-progress-text' },
                options?.text || (state.cancelRequested ? _('Cancelling') : _('Installing'))),
            h('div', {
                class: 'aux-module-progress',
                role: 'progressbar',
                'aria-valuemin': '0',
                'aria-valuemax': '100',
                'aria-valuenow': state.percent.toString(),
            }, h('div', { class: 'aux-module-progress-bar', style: `width: ${ state.percent }%` })),
            h('div', { class: 'aux-module-progress-label' }, _('{percent}%', { percent: state.percent.toString() })),
        );

        if (options?.cancelAction !== undefined) {
            const cancelAction = options.cancelAction;
            const cancelButton = this.createActionButton(
                options.cancelLabel || _('Cancel'),
                () => {
                    if (cancelButton.getAttribute('aria-disabled') !== 'true')
                        cancelAction();
                },
                false,
                'subtle');
            cancelButton.classList.add('aux-module-progress-cancel');
            cancelButton.dataset.action = 'cancel';
            // aria-disabled rather than disabled, so it keeps focus when the
            // install can no longer be cancelled
            cancelButton.setAttribute('aria-disabled', state.cancelRequested || ! state.cancellable ? 'true' : 'false');
            wrap.append(cancelButton);
        }

        return wrap;
    }

    updateInstallProgress(progressElement: HTMLElement, state: ModuleInstallState, text?: string): void {
        const progressText = progressElement.querySelector<HTMLElement>('.aux-module-progress-text');
        if (progressText !== null)
            progressText.textContent = text || (state.cancelRequested ? _('Cancelling') : _('Installing'));

        const progressBar = progressElement.querySelector<HTMLElement>('.aux-module-progress');
        if (progressBar !== null)
            progressBar.setAttribute('aria-valuenow', state.percent.toString());

        const progressBarFill = progressElement.querySelector<HTMLElement>('.aux-module-progress-bar');
        if (progressBarFill !== null)
            progressBarFill.style.width = `${ state.percent }%`;

        const progressLabel = progressElement.querySelector<HTMLElement>('.aux-module-progress-label');
        if (progressLabel !== null)
            progressLabel.textContent = _('{percent}%', { percent: state.percent.toString() });

        const cancelButton = progressElement.querySelector<HTMLButtonElement>('.aux-module-progress-cancel');
        if (cancelButton !== null)
            cancelButton.setAttribute('aria-disabled', state.cancelRequested || ! state.cancellable ? 'true' : 'false');
    }

    updateInstallCard(module: IModuleMeta): void {
        if (this.listElement === null)
            return;

        const card = this.listElement.querySelector<HTMLElement>(`.aux-module-card[data-module-name="${ CSS.escape(module.name) }"]`);
        if (card === null)
            return;

        const installState = this.installStates.get(module.name);
        const isInstalling = installState !== undefined;
        const actions = card.querySelector<HTMLElement>('[data-role="module-actions"]');
        if (actions === null)
            return;

        if (isInstalling) {
            const progressElement = actions.querySelector<HTMLElement>('[data-role="install-progress"]');
            if (progressElement !== null) {
                this.updateInstallProgress(progressElement, installState);
                return;
            }

            const focusedAction = this.captureActionFocus(actions);
            actions.replaceChildren(this.createInstallProgress(installState, {
                cancelAction: () => this.cancelInstallModule(module),
            }));
            this.restoreActionFocus(card, actions, focusedAction);
            return;
        }

        const source = module.url || module.path;
        if (! source)
            return;

        const focusedAction = this.captureActionFocus(actions);
        actions.replaceChildren();

        if (this.canAddRemoveModules()) {
            if (module.ops.includes('install'))
                actions.append(this.createInstallButton(module, 'install'));

            if (module.ops.includes('update'))
                actions.append(this.createInstallButton(module, 'update'));
        }

        this.restoreActionFocus(card, actions, focusedAction);
    }

    installModule(module: IModuleMeta): void {
        const source = module.url || module.path;
        if (! source || ! this.canAddRemoveModules())
            return;

        this.installModuleFromSource(source, module.name, this.translate(module, module.title));
    }

    async sideloadModule(): Promise<void> {
        if (! this.canSideloadModules())
            return;

        const filters = [ { name: _('jamovi modules'), extensions: [ 'jmo' ] } ];
        const result = await host.showOpenDialog({ filters }) as { cancelled: boolean; paths?: string[] };
        if (result.cancelled)
            return;

        const source = result.paths?.[0];
        if (! source)
            return;

        this.installModuleFromSource(source, source, _('Selected module'), false);
        this.sideloadButton?.focus();
    }

    installModuleFromSource(source: string, installKey: string, moduleTitle: string, cancellable = true): void {
        if (this.installStates.has(installKey))
            return;

        this.cancelledInstallSources.delete(source);
        this.installStates.set(installKey, {
            source,
            progress: [ 0, 1 ],
            percent: 0,
            cancelRequested: false,
            cancellable,
        });
        this.updateSummaryProgress();
        const module = this.getModuleByInstallKey(installKey);
        if (module !== null)
            this.updateInstallCard(module);

        const install = this.model.installModule(source);
        void (async () => {
            try {
                for await (const progress of install) {
                    const previousState = this.installStates.get(installKey);
                    if (previousState === undefined && this.cancelledInstallSources.has(source))
                        continue;

                    const value = progress?.[0] || 0;
                    const total = progress?.[1] || 1;
                    const percent = Math.max(0, Math.min(100, Math.round((100 * value) / total)));
                    this.installStates.set(installKey, {
                        source,
                        progress: [ value, total ],
                        percent,
                        cancelRequested: previousState?.cancelRequested === true,
                        // once the download completes, the module is being
                        // extracted, which can't be cancelled
                        cancellable: cancellable && value < total,
                    });
                    this.updateSummaryProgress();
                    const module = this.getModuleByInstallKey(installKey);
                    if (module !== null)
                        this.updateInstallCard(module);
                }
                await install;
            }
            catch (error: any) {
                const wasCancelled = this.installStates.get(installKey)?.cancelRequested === true
                    || this.cancelledInstallSources.delete(source);
                this.installStates.delete(installKey);
                this.updateSummaryProgress();
                if (! wasCancelled) {
                    this.model.trigger('notification', new Notify({
                        title: _('Unable to install module'),
                        message: error.cause || error.message || '',
                        duration: 4000,
                        type: 'error'
                    }));
                }
                this.update();
                return;
            }

            this.cancelledInstallSources.delete(source);
            this.installStates.delete(installKey);
            this.updateSummaryProgress();
            this.model.modules().available().retrieve();
            this.model.trigger('notification', new Notify({
                title: _('Module installed'),
                message: _('{module} was installed successfully', { module: moduleTitle }),
                duration: 3000,
                type: 'success'
            }));
            this.update();
        })();
    }

    getModuleByInstallKey(installKey: string): IModuleMeta | null {
        return [ ...this.getAvailableModules(), ...this.getInstalledModules() ]
            .find(module => module.name === installKey) || null;
    }

    cancelInstallModule(module: IModuleMeta): void {
        const installState = this.installStates.get(module.name);
        if (installState === undefined || installState.cancelRequested || ! installState.cancellable)
            return;

        this.installStates.set(module.name, {
            ...installState,
            cancelRequested: true,
        });
        this.cancelledInstallSources.add(installState.source);
        this.updateSummaryProgress();
        this.updateInstallCard(module);

        this.cancelInstallBySource(installState.source, error => {
            this.cancelledInstallSources.delete(installState.source);
            const currentState = this.installStates.get(module.name);
            if (currentState !== undefined) {
                this.installStates.set(module.name, {
                    ...currentState,
                    cancelRequested: false,
                });
            }
            this.updateSummaryProgress();
            this.updateInstallCard(module);
            this.notifyUnableToCancelInstall(error);
        }, () => {
            this.installStates.delete(module.name);
            this.updateSummaryProgress();
            this.updateInstallCard(module);
            void this.update();
        });
    }

    cancelInstallBySource(source: string, onError?: (error: any) => void, onSuccess?: () => void): void {
        void this.model.cancelInstallModule(source).then(() => {
            onSuccess?.();
        }, error => {
            if (onError !== undefined) {
                onError(error);
                return;
            }

            this.notifyUnableToCancelInstall(error);
        });
    }

    notifyUnableToCancelInstall(error: any): void {
        this.model.trigger('notification', new Notify({
            title: _('Unable to cancel install'),
            message: error.cause || error.message || '',
            duration: 4000,
            type: 'error'
        }));
    }

    uninstallModule(module: IModuleMeta): void {
        if (! this.canAddRemoveModules())
            return;

        if (this.selectedFilter === 'installed')
            this.pendingInstalledRemovals.add(module.name);

        void this.model.modules().uninstall(module.name).then(() => {
            this.model.trigger('notification', new Notify({
                title: _('Module uninstalled'),
                message: _('{module} was uninstalled successfully', { module: this.translate(module, module.title) }),
                duration: 3000,
                type: 'success'
            }));
            this.update();
        }, error => {
            this.pendingInstalledRemovals.delete(module.name);
            this.model.trigger('notification', new Notify({
                title: _('Unable to uninstall module'),
                message: error.message || '',
                duration: 4000,
                type: 'error'
            }));
        });
    }

    runAnalysis(module: IModuleMeta, analysisName: string, analysisTitle: string): void {
        void module.getTranslator.then(translator => {
            this.model.createAnalysis({
                name: analysisName,
                ns: module.name,
                title: translator(analysisTitle),
            });
        });
    }
}
