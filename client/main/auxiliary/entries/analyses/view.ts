import type Instance from '../../../instance';
import type { IModuleMeta } from '../../../modules';
import { h } from '../../../../common/htmlelementcreator';
import { AuxView } from '../../types';
import { createSearchBox, highlightSearch, matchesSearch, type SearchBox } from '../../search';

type Translator = (value: string) => string;

// every installed module's analyses, whether or not the module's shown in the
// ribbon; a module hidden from the ribbon is still run from here
export default class AnalysesAuxView extends AuxView {
    model: Instance;
    searchBox: SearchBox | null = null;
    listElement: HTMLElement | null = null;
    // the modules expanded, kept as the list's rebuilt
    expanded = new Set<string>();
    updateId = 0;

    constructor(model: Instance) {
        super('analyses');
        this.model = model;
    }

    getTitle() {
        return _('Analyses');
    }

    getIconSvg() {
        return `
            <svg viewBox="0 0 24 24" fill="none">
                <path data-fill="currentColor" d="M4 8h4V4H4v4zm6 12h4v-4h-4v4zm-6 0h4v-4H4v4zm0-6h4v-4H4v4zm6 0h4v-4h-4v4zm6-10v4h4V4h-4zm-6 4h4V4h-4v4zm6 6h4v-4h-4v4zm0 6h4v-4h-4v4z" />
            </svg>
        `;
    }

    getBody() {
        this.searchBox = createSearchBox({
            label: _('Search analyses'),
            onSearch: () => void this.update(),
        });
        this.searchBox.element.classList.add('aux-analyses-search');
        this.listElement = h('div', { class: 'aux-analyses-list' });
        return this.createBodyElement(this.searchBox.element, this.listElement);
    }

    onMount(): void {
        const modules = this.model.modules();
        this.listen(modules, 'change:modules', this.requestUpdate);
        this.listen(modules, 'modulesChanged', this.requestUpdate);
        this.listen(modules, 'moduleVisibilityChanged', this.requestUpdate);
        this.listen(this.model.settings(), 'change:permissions_library_show_hide', this.requestUpdate);
        void this.update();
    }

    onShow(): void {
        void this.update();
    }

    async update(): Promise<void> {
        const updateId = ++this.updateId;
        const modules: IModuleMeta[] = this.model.modules().get('modules') || [];
        const translators = await Promise.all(modules.map(module => module.getTranslator));
        if (updateId !== this.updateId || this.listElement === null)
            return;

        // the list is rebuilt, so the focus is put back where it was
        const focused = this.listElement.contains(document.activeElement)
            ? (document.activeElement as HTMLElement).dataset.key : undefined;

        const query = (this.searchBox?.input.value ?? '').trim();
        if (query !== '')
            this.listElement.replaceChildren(this.createResults(modules, translators, query));
        else
            this.listElement.replaceChildren(...modules.map((module, index) => this.createModule(modules, module, translators[index])));

        if (focused !== undefined)
            Array.from(this.listElement.querySelectorAll<HTMLElement>('[data-key]'))
                .find(element => element.dataset.key === focused)?.focus();
    }

    // a module, expanded to its analyses
    createModule(modules: IModuleMeta[], module: IModuleMeta, translate: Translator): HTMLElement {
        const count = this.getAnalyses(module).length;
        const summary = h('summary', { class: 'aux-analyses-module-summary', 'data-key': `module:${ module.name }` },
            this.createModuleIcon(modules, module),
            h('span', { class: 'aux-analyses-module-text' },
                h('span', { class: 'aux-analyses-module-name' }, module.name),
                h('span', { class: 'aux-analyses-module-title', dir: 'auto' }, translate(module.title))),
            h('span', { class: 'aux-analyses-module-count' }, count.toLocaleString()));
        const body = h('div', { class: 'aux-analyses-module-body' });
        for (const analysis of this.getAnalyses(module))
            body.append(this.createAnalysisButton(module, analysis, translate));

        const details = h('details', { class: 'aux-analyses-module-details' }, summary, body);
        details.open = this.expanded.has(module.name);
        details.addEventListener('toggle', () => {
            if (details.open)
                this.expanded.add(module.name);
            else
                this.expanded.delete(module.name);
        });

        // the ribbon toggle sits over the summary's end, beside it rather than
        // in it, so it doesn't also expand the module
        const state = module.visible ? 'visible' : 'hidden';
        const canToggle = this.model.settings().getSetting('permissions_library_show_hide', false)
            && (module.ops.includes('show') || module.ops.includes('hide'));
        let ribbon: HTMLElement | string = '';
        if (canToggle) {
            const label = module.visible
                ? _('Hide {moduleName} from the ribbon', { moduleName: module.name })
                : _('Show {moduleName} in the ribbon', { moduleName: module.name });
            ribbon = h('button', { type: 'button', class: 'aux-analyses-ribbon', 'data-state': state, 'data-key': `ribbon:${ module.name }`, 'aria-label': label, title: label });
            ribbon.addEventListener('click', () => {
                this.model.modules().toggleModuleVisibility(module.name);
                void this.update();
            });
        }
        else if ( ! module.visible) {
            ribbon = h('span', { class: 'aux-analyses-ribbon', 'data-state': state, role: 'img', 'aria-label': _('Not in the ribbon'), title: _('Not in the ribbon') });
        }

        return h('div', { class: 'aux-analyses-module' }, details, ribbon);
    }

    // searching, the modules give way to the analyses that match, from every module
    createResults(modules: IModuleMeta[], translators: Translator[], query: string): HTMLElement {
        const items = h('div', { class: 'aux-analyses-items aux-analyses-results' });
        modules.forEach((module, index) => {
            const translate = translators[index];
            const moduleMatches = matchesSearch(module.name, query);
            for (const analysis of this.getAnalyses(module)) {
                const text = [ analysis.title, analysis.menuTitle, analysis.menuSubtitle ]
                    .map(value => translate(value || '')).join('\n');
                if (moduleMatches || matchesSearch(text, query))
                    items.append(this.createAnalysisButton(module, analysis, translate, query));
            }
        });

        if (items.childElementCount === 0)
            return h('div', { class: 'aux-panel-placeholder' }, _('No analyses found.'));
        return items;
    }

    // searching (search isn't null), the module's named, and the matches marked
    createAnalysisButton(module: IModuleMeta, analysis: IModuleMeta['analyses'][number], translate: Translator, search: string | null = null): HTMLElement {
        const mark = (text: string) => highlightSearch(text, search ?? '');
        const button = h('button', {
            type: 'button',
            class: 'aux-analyses-item',
            'data-key': `analysis:${ module.name }::${ analysis.name }`,
        }, h('span', { dir: 'auto' }, mark(translate(analysis.menuTitle || analysis.title))));
        // tells apart analyses with the same title (i.e. the two One-Way ANOVAs)
        if (analysis.menuSubtitle)
            button.firstElementChild!.append(h('span', { class: 'aux-analyses-item-subtitle' }, ' ', mark(translate(analysis.menuSubtitle))));
        if (search !== null)
            button.append(h('span', { class: 'aux-analyses-item-module' }, mark(module.name)));
        button.addEventListener('click', () => this.model.createAnalysis({
            name: analysis.name,
            ns: module.name,
            title: translate(analysis.title),
        }));
        return button;
    }

    // an analysis in both the analyses and the plots menus is listed twice
    getAnalyses(module: IModuleMeta): IModuleMeta['analyses'] {
        const names = new Set<string>();
        return module.analyses.filter(analysis => ! names.has(analysis.name) && names.add(analysis.name));
    }

    // the module's initials, in one of four colours by its place in the list
    createModuleIcon(modules: IModuleMeta[], module: IModuleMeta): HTMLElement {
        return h('span', {
            class: 'aux-analyses-icon',
            'data-tone': String(modules.indexOf(module) % 4),
            'aria-hidden': 'true',
        }, module.name.slice(0, 2).toLocaleUpperCase());
    }
}
