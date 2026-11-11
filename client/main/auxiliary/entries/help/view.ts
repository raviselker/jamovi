import { h, htmlTrusted } from '../../../../common/htmlelementcreator';
import type { IModuleMeta } from '../../../modules';
import { createSearchBox, highlightSearch, matchesSearch, type SearchBox } from '../../search';
import host from '../../../host';
import type Instance from '../../../instance';
import { Analysis } from '../../../analyses';
import { AuxView } from '../../types';
import { renderDoc } from './render';
import { scrollbarGutterWidth } from '../../scrollbar';

// a module's help documents, written in markdown under its jamovi/docs/, and
// served by the server from /modules/<ns>/docs/<path>. an analysis' document
// is named after the analysis (ttestIS => ttestis.md)
type DocRef = {
    ns: string;
    path: string;
    // the document's title (its h1), once it's been shown
    title?: string;
    // where it was scrolled to, and which of its links was followed, when
    // it was left; going back to it through the breadcrumb returns there
    scrollTop?: number;
    linkIndex?: number;
};

// where the focus goes when a document is opened from the keyboard: the crumb
// for the document it was opened from (one key press back to it), or, going
// back through the breadcrumb, the link that was followed from it
type DocFocus = 'crumb' | 'link' | null;

type Translator = (value: string) => string;

// the help home's modules, with whether each has documents
type HomeModule = { module: IModuleMeta; tone: number; translate: Translator; hasDocs: boolean };

export default class HelpAuxView extends AuxView {
    model: Instance;
    titleElement: HTMLElement | null = null;
    crumbsElement: HTMLElement | null = null;
    contentElement: HTMLElement | null = null;
    // the analysis the panel is following, as ns::name ('' for none: the
    // home); null when it's to be shown afresh
    followedKey: string | null = null;
    // whether the panel follows the selected analysis; navigating in the
    // panel stops it, so a page stays while an analysis is set up
    following = true;
    followButton: HTMLButtonElement | null = null;
    searchBox: SearchBox | null = null;
    homeModules: HomeModule[] = [];
    homeExpanded = new Set<string>();
    // the document showing, and those its links were followed from, which
    // the breadcrumb leads back to
    current: DocRef | null = null;
    trail: DocRef[] = [];
    cache = new Map<string, Promise<string | null>>();
    keyActivated: Element | null = null;
    viewElement: HTMLElement | null = null;
    loadId = 0;

    constructor(model: Instance) {
        super('help');
        this.model = model;
    }

    // the document scrolls beneath the title and breadcrumb, which stay put
    get scroller(): HTMLElement | null {
        return this.contentElement;
    }

    getTitle() {
        return _('Help');
    }

    getIconSvg() {
        return `
            <svg viewBox="0 0 24 24" fill="none">
                <path data-fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-2h2v2zm2.07-7.75l-.9.92C13.45 12.9 13 13.5 13 15h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H8c0-2.21 1.79-4 4-4s4 1.79 4 4c0 .88-.36 1.68-.93 2.25z" />
            </svg>
        `;
    }

    getBody() {
        // the title and breadcrumb are the documents' own text, so (as with
        // the documents) their direction is taken from the text itself
        this.titleElement = h('div', { class: 'aux-help-title', role: 'heading', 'aria-level': '1', dir: 'auto', tabindex: '-1', hidden: '' });
        this.titleElement.addEventListener('click', () => this.scrollToTop());

        this.crumbsElement = h('nav', { class: 'aux-help-crumbs', 'aria-label': _('Breadcrumb'), hidden: '' });

        this.contentElement = h('div', { class: 'aux-help-content', 'aria-live': 'polite' });
        this.searchBox = createSearchBox({
            label: _('Search help'),
            onSearch: () => this.renderHome(),
        });
        this.searchBox.element.classList.add('aux-analyses-search');
        this.contentElement.addEventListener('click', event => this.onContentClick(event));

        const view = h('div', { class: 'aux-help-view' },
            h('div', { class: 'aux-help-header' }, this.crumbsElement, this.titleElement),
            this.contentElement);
        this.viewElement = view;

        // for isKeyboardClick(): the element a key that activates it went
        // to, until the pointer's used
        view.addEventListener('keydown', event => {
            if (event.key === 'Enter' || event.key === ' ')
                this.keyActivated = event.target as Element;
        }, true);
        view.addEventListener('pointerdown', () => this.keyActivated = null, true);

        return this.createBodyElement(view);
    }

    // whether a click on element came from the keyboard. chromium gives a
    // keyboard click no click count, but firefox gives a link's a count of
    // 1, the same as the mouse's, so the key press is tracked too
    isKeyboardClick(event: MouseEvent, element: Element): boolean {
        const fromKeyboard = event.detail === 0 || this.keyActivated === element;
        this.keyActivated = null;
        return fromKeyboard;
    }

    onMount(): void {
        this.listen(this.model, 'change:selectedAnalysis', this.requestUpdate);
        const onModulesChange = () => {
            if (this.current === null)
                void this.refreshHome();
        };
        this.listen(this.model.modules(), 'change:modules', onModulesChange);
        this.listen(this.model.modules(), 'modulesChanged', onModulesChange);

        // zooming changes the width of chromium's scrollbars (in css pixels),
        // and fires a resize
        const onResize = () => this.measureScrollbar();
        window.addEventListener('resize', onResize);
        this.addCleanup(() => window.removeEventListener('resize', onResize));

        this.update();
    }

    onShow(): void {
        this.measureScrollbar();
        this.update();
    }

    getPanelActions(): HTMLElement[] {
        this.followButton = h('button', { type: 'button', class: 'aux-panel-action', 'aria-label': _('Follow the selected analysis'), title: _('Follow the selected analysis') });
        this.followButton.addEventListener('click', () => this.setFollowing( ! this.following));
        this.updateFollowButton();
        return [ this.followButton ];
    }

    updateFollowButton(): void {
        if (this.followButton === null)
            return;
        this.followButton.setAttribute('aria-pressed', String(this.following));
        this.followButton.classList.toggle('active', this.following);
        // a target, its centre filled while following
        this.followButton.replaceChildren(h('div', { class: 'aux-panel-action-icon', 'aria-hidden': 'true' }, htmlTrusted(`
            <svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round">
                <circle cx="12" cy="12" r="6" />
                <path d="M12 2v4M12 18v4M2 12h4M18 12h4" />
                ${ this.following ? '<circle cx="12" cy="12" r="2.2" fill="currentColor" />' : '' }
            </svg>
        `)));
    }

    setFollowing(following: boolean): void {
        if (following === this.following)
            return;
        this.following = following;
        this.followedKey = null;
        this.updateFollowButton();
        if (following) {
            this.update();
        }
        else if (this.current !== null) {
            // shown again, for its breadcrumb and Run button
            this.current.scrollTop = this.scroller?.scrollTop ?? 0;
            void this.show(this.current);
        }
    }

    // the width the document's scrollbar takes up, for the css to make room
    // for (see --aux-help-edge)
    measureScrollbar(): void {
        if (this.contentElement === null || this.viewElement === null || ! this.shown)
            return;
        const width = scrollbarGutterWidth(this.contentElement);
        this.viewElement.style.setProperty('--aux-help-scrollbar', `${ width }px`);
    }

    update(): void {
        if ( ! this.following)
            return;

        const analysis = this.model.get('selectedAnalysis');
        if ( ! (analysis instanceof Analysis)) {
            if (this.followedKey !== '') {
                this.followedKey = '';
                void this.showHome();
            }
            return;
        }

        const key = `${ analysis.ns }::${ analysis.name }`;
        if (key === this.followedKey)
            return;

        this.followedKey = key;
        this.trail = [];
        void this.show({ ns: analysis.ns, path: `${ analysis.name.toLowerCase() }.md` });
    }

    // the link or crumb that opened a document is gone once it's shown, so
    // opened from the keyboard the focus is moved (see DocFocus). it's never
    // left to fall to the page in between: the interaction manager would
    // take it back
    async show(doc: DocRef, focus: DocFocus = null): Promise<void> {
        const loadId = ++this.loadId;
        this.current = doc;
        this.updateCrumbs();
        // the crumb's there already, before the document's loaded
        if (focus === 'crumb')
            this.focusPreviousCrumb();
        this.contentElement?.setAttribute('aria-busy', 'true');

        const source = await this.fetchDoc(doc);
        if (loadId !== this.loadId || this.contentElement === null)
            return;

        this.contentElement.removeAttribute('aria-busy');
        if (source === null) {
            this.showMessage(_('No help is available for this analysis yet.'));
            // the message rebuilds the breadcrumb, so either way it's the
            // crumb that takes the focus
            if (focus !== null)
                this.focusPreviousCrumb();
            return;
        }

        // the title is shown in the header, which stays put while the
        // document scrolls beneath it
        const article = renderDoc(source);
        const heading = article.querySelector('h1');
        doc.title = heading?.textContent?.trim() || '';
        heading?.remove();

        this.setTitle(doc.title);
        // only the last crumb's title has changed; rebuilding the breadcrumb
        // would lose the focus from the crumb focused above
        this.setCurrentCrumbTitle(doc.title);
        const run = this.following ? null : await this.createRunButton(doc);
        if (loadId !== this.loadId)
            return;
        this.contentElement.replaceChildren(...(run ? [ run ] : []), article);
        // a document newly opened starts at the top
        this.scroller?.scrollTo({ top: doc.scrollTop ?? 0 });
        if (focus === 'link') {
            const link = doc.linkIndex === undefined ? null : article.querySelectorAll<HTMLElement>('a')[doc.linkIndex];
            if (link)
                link.focus({ preventScroll: true });
            else
                this.focusPreviousCrumb();
        }
    }

    // on an analysis' document, a button that runs it; the page stays (the
    // panel isn't following) while it's set up
    async createRunButton(doc: DocRef): Promise<HTMLElement | null> {
        const modules: IModuleMeta[] = this.model.modules().get('modules') || [];
        const module = modules.find(module => module.name === doc.ns);
        const analysis = module?.analyses.find(analysis => `${ analysis.name.toLowerCase() }.md` === doc.path);
        if (module === undefined || analysis === undefined)
            return null;
        const title = (await module.getTranslator)(analysis.title);
        const button = h('button', { type: 'button', class: 'aux-help-run' }, _('Run {title}', { title }));
        button.addEventListener('click', () => this.model.createAnalysis({ name: analysis.name, ns: module.name, title }));
        return button;
    }

    // the modules, each with its overview and its analyses' documents
    async showHome(focus = false): Promise<void> {
        const loadId = ++this.loadId;
        this.current = null;
        this.trail = [];
        this.setTitle('');
        this.updateCrumbs();
        if (this.contentElement === null || this.searchBox === null)
            return;
        this.contentElement.removeAttribute('aria-busy');
        this.contentElement.replaceChildren(this.searchBox.element, h('div', { class: 'aux-analyses-list' }));
        this.scrollToTop();
        if (focus)
            this.searchBox.input.focus({ preventScroll: true });
        await this.refreshHome(loadId);
    }

    // (re)lists the modules, as they're installed and removed
    async refreshHome(loadId = this.loadId): Promise<void> {
        const modules: IModuleMeta[] = this.model.modules().get('modules') || [];
        // shortcut: a module's taken to have documents when it has an index.md
        const [ translators, hasDocs ] = await Promise.all([
            Promise.all(modules.map(module => module.getTranslator)),
            Promise.all(modules.map(module => this.fetchDoc({ ns: module.name, path: 'index.md' }).then(text => text !== null))),
        ]);
        if (loadId !== this.loadId || this.current !== null)
            return;

        this.homeModules = modules.map((module, index) => ({ module, tone: index % 4, translate: translators[index], hasDocs: hasDocs[index] }));
        this.renderHome();
    }

    renderHome(): void {
        const list = this.contentElement?.querySelector('.aux-analyses-list');
        if ( ! list)
            return;
        const query = (this.searchBox?.input.value ?? '').trim();
        if (query === '') {
            list.replaceChildren(...this.homeModules.map(item => this.createHomeModule(item)));
            return;
        }

        const items = h('div', { class: 'aux-analyses-items aux-analyses-results' });
        for (const { module, translate, hasDocs } of this.homeModules) {
            if ( ! hasDocs)
                continue;
            const moduleMatches = matchesSearch(module.name, query);
            for (const analysis of this.getAnalyses(module)) {
                const title = translate(analysis.menuTitle || analysis.title);
                if (moduleMatches || matchesSearch(title, query))
                    items.append(this.createHomeItem(module, `${ analysis.name.toLowerCase() }.md`, highlightSearch(title, query), module.name));
            }
        }
        list.replaceChildren(items.childElementCount === 0
            ? h('div', { class: 'aux-panel-placeholder' }, _('No help found.'))
            : items);
    }

    createHomeModule({ module, tone, translate, hasDocs }: HomeModule): HTMLElement {
        const summary = h('summary', { class: 'aux-analyses-module-summary' },
            h('span', { class: 'aux-analyses-icon', 'data-tone': String(tone), 'aria-hidden': 'true' }, module.name.slice(0, 2).toLocaleUpperCase()),
            h('span', { class: 'aux-analyses-module-text' },
                h('span', { class: 'aux-analyses-module-name' }, module.name),
                h('span', { class: 'aux-analyses-module-title', dir: 'auto' }, translate(module.title))),
            hasDocs ? '' : h('span', { class: 'aux-help-nohelp' }, _('No help yet')));

        const body = h('div', { class: 'aux-analyses-module-body' });
        if (hasDocs) {
            body.append(this.createHomeItem(module, 'index.md', _('Overview')));
            for (const analysis of this.getAnalyses(module)) {
                const title = translate(analysis.menuTitle || analysis.title);
                const subtitle = analysis.menuSubtitle ? ` ${ translate(analysis.menuSubtitle) }` : '';
                body.append(this.createHomeItem(module, `${ analysis.name.toLowerCase() }.md`, title + subtitle));
            }
        }
        else {
            body.append(h('div', { class: 'aux-panel-placeholder' }, _('This module has no help yet.')));
        }

        const details = h('details', { class: 'aux-analyses-module-details' }, summary, body);
        details.open = this.homeExpanded.has(module.name);
        details.addEventListener('toggle', () => {
            if (details.open)
                this.homeExpanded.add(module.name);
            else
                this.homeExpanded.delete(module.name);
        });
        return h('div', { class: `aux-analyses-module${ hasDocs ? '' : ' aux-help-nodocs' }` }, details);
    }

    createHomeItem(module: IModuleMeta, path: string, label: string | Node, moduleName?: string): HTMLElement {
        const button = h('button', { type: 'button', class: 'aux-analyses-item' }, h('span', { dir: 'auto' }, label));
        if (moduleName !== undefined)
            button.append(h('span', { class: 'aux-analyses-item-module' }, moduleName));
        button.addEventListener('click', event => {
            this.setFollowing(false);
            void this.show({ ns: module.name, path }, this.isKeyboardClick(event, button) ? 'crumb' : null);
        });
        return button;
    }

    // an analysis in both the analyses and the plots menus is listed twice
    getAnalyses(module: IModuleMeta): IModuleMeta['analyses'] {
        const names = new Set<string>();
        return module.analyses.filter(analysis => ! names.has(analysis.name) && names.add(analysis.name));
    }

    // focuses the crumb for the document the showing one was opened from, so
    // it's one key press back to it; without a breadcrumb (back at the
    // analysis' own document) the title
    focusPreviousCrumb(): void {
        const crumbs = this.crumbsElement?.hidden ? [] : Array.from(this.crumbsElement?.querySelectorAll<HTMLElement>('button.aux-help-crumb') ?? []);
        const target = crumbs[crumbs.length - 1] ?? (this.titleElement?.hidden ? null : this.titleElement);
        target?.focus({ preventScroll: true });
    }

    fetchDoc(doc: DocRef): Promise<string | null> {
        const url = `../modules/${ encodeURIComponent(doc.ns) }/docs/${ doc.path.split('/').map(encodeURIComponent).join('/') }`;
        let request = this.cache.get(url);
        if (request === undefined) {
            request = fetch(url)
                .then(response => response.ok ? response.text() : null)
                .catch(() => null);
            // a failure isn't remembered, so it's retried next time
            void request.then(text => { if (text === null) this.cache.delete(url); });
            this.cache.set(url, request);
        }
        return request;
    }

    showMessage(message: string): void {
        this.setTitle('');
        this.updateCrumbs();
        this.contentElement?.removeAttribute('aria-busy');
        this.contentElement?.replaceChildren(h('div', { class: 'aux-panel-placeholder' }, message));
    }

    setTitle(title: string): void {
        if (this.titleElement === null)
            return;
        this.titleElement.textContent = title;
        this.titleElement.hidden = title === '';
    }

    onContentClick(event: MouseEvent): void {
        const target = event.target as Element | null;
        const link = target?.closest('a');
        if ( ! link)
            return;

        const href = link.getAttribute('href') ?? '';
        event.preventDefault();

        if (/^[a-z][a-z0-9+.-]*:/i.test(href)) {
            host.openUrl(href);
            return;
        }

        // a relative link to another document in the same module's docs
        if (this.current === null || href.startsWith('#'))
            return;
        const resolved = new URL(href, `https://docs.invalid/${ this.current.path }`);
        const path = decodeURIComponent(resolved.pathname.slice(1));
        if ( ! path.endsWith('.md'))
            return;

        this.setFollowing(false);
        this.current.scrollTop = this.scroller?.scrollTop ?? 0;
        this.current.linkIndex = Array.from(this.contentElement?.querySelectorAll('a') ?? []).indexOf(link);
        this.trail.push(this.current);
        void this.show({ ns: this.current.ns, path }, this.isKeyboardClick(event, link) ? 'crumb' : null);
    }

    setCurrentCrumbTitle(title: string): void {
        const crumb = this.crumbsElement?.querySelector('.aux-help-crumb-current');
        if (crumb)
            crumb.textContent = title;
    }

    // returns to a document in the trail, dropping those after it
    backTo(index: number, fromKeyboard = false): void {
        const doc = this.trail[index];
        if (doc === undefined)
            return;
        // the crumb pressed is about to go, so the focus is held on the
        // title (which stays) until the link can take it
        if (fromKeyboard)
            this.titleElement?.focus({ preventScroll: true });
        this.trail = this.trail.slice(0, index);
        void this.show(doc, fromKeyboard ? 'link' : null);
    }

    // the breadcrumb shows on a document while not following: the home, the
    // documents followed from, then the one showing
    updateCrumbs(): void {
        if (this.crumbsElement === null)
            return;

        const shown = ! this.following && this.current !== null;
        this.crumbsElement.hidden = ! shown;
        if ( ! shown) {
            this.crumbsElement.replaceChildren();
            return;
        }

        const home = h('button', { type: 'button', class: 'aux-help-crumb' }, _('Help'));
        home.addEventListener('click', event => void this.showHome(this.isKeyboardClick(event, home)));
        const items: Node[] = [ home, h('span', { class: 'aux-help-crumb-separator', 'aria-hidden': 'true' }, '›') ];
        this.trail.forEach((doc, index) => {
            const crumb = h('button', { type: 'button', class: 'aux-help-crumb', dir: 'auto' }, doc.title || doc.path);
            crumb.addEventListener('click', event => this.backTo(index, this.isKeyboardClick(event, crumb)));
            items.push(crumb, h('span', { class: 'aux-help-crumb-separator', 'aria-hidden': 'true' }, '›'));
        });
        items.push(h('span', { class: 'aux-help-crumb aux-help-crumb-current', 'aria-current': 'page', dir: 'auto' }, this.current?.title || ''));
        this.crumbsElement.replaceChildren(...items);
    }

    scrollToTop(): void {
        this.scroller?.scrollTo({ top: 0 });
    }
}
