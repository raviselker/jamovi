import { h } from '../../../../common/htmlelementcreator';
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

export default class HelpAuxView extends AuxView {
    model: Instance;
    titleElement: HTMLElement | null = null;
    crumbsElement: HTMLElement | null = null;
    contentElement: HTMLElement | null = null;
    // the analysis the panel is following, as ns::name
    followedKey: string | null = null;
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

    // the width the document's scrollbar takes up, for the css to make room
    // for (see --aux-help-edge)
    measureScrollbar(): void {
        if (this.contentElement === null || this.viewElement === null || ! this.shown)
            return;
        const width = scrollbarGutterWidth(this.contentElement);
        this.viewElement.style.setProperty('--aux-help-scrollbar', `${ width }px`);
    }

    update(): void {
        const analysis = this.model.get('selectedAnalysis');
        if ( ! (analysis instanceof Analysis)) {
            this.followedKey = null;
            this.trail = [];
            this.current = null;
            this.loadId++;
            this.showMessage(_('Select an analysis to see its help.'));
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
        this.contentElement.replaceChildren(article);
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

    // the breadcrumb shows only once a link's been followed: the documents
    // followed from, then the one showing
    updateCrumbs(): void {
        if (this.crumbsElement === null)
            return;

        this.crumbsElement.hidden = this.trail.length === 0;
        if (this.trail.length === 0) {
            this.crumbsElement.replaceChildren();
            return;
        }

        const items: Node[] = [];
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
