import I18ns from '../../../../common/i18n';
import { h } from '../../../../common/htmlelementcreator';
import host from '../../../host';
import type Instance from '../../../instance';
import { Theme } from '../../../settings';
import { AuxView } from '../../types';

function option(value: string, label: string) {
    return h('option', { value }, label);
}

function optGroup(label: string, ...options: HTMLOptionElement[]) {
    return h('optgroup', { label }, ...options);
}

function row(label: string, control: HTMLElement) {
    return h('label', { class: 'aux-settings-row' }, h('span', {}, label), control);
}

function group(title: string, ...rows: HTMLElement[]) {
    return h('fieldset', { class: 'aux-settings-group' }, h('legend', {}, title), ...rows);
}

// the application's preferences (once the ribbon's application menu)
export default class SettingsAuxView extends AuxView {
    model: Instance;
    zoomLevel = h('span', { class: 'aux-settings-zoom-level' }, '100%');
    nFormat!: HTMLSelectElement;
    pFormat!: HTMLSelectElement;
    decSymbol!: HTMLSelectElement;
    refsMode!: HTMLSelectElement;
    syntaxMode = h('input', { type: 'checkbox' });
    theme!: HTMLSelectElement;
    palette!: HTMLSelectElement;
    missings = h('input', { type: 'text', spellcheck: 'false', size: '10' });
    language = h('select', {});
    devMode = h('input', { type: 'checkbox' });

    constructor(model: Instance) {
        super('settings');
        this.model = model;
    }

    getTitle() {
        return _('Settings');
    }

    getIconSvg() {
        return `
            <svg viewBox="0 0 24 24" fill="none">
                <path data-fill="currentColor" d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58a.49.49 0 00.12-.61l-1.92-3.32a.49.49 0 00-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.48.48 0 00-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96a.49.49 0 00-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58a.49.49 0 00-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6A3.6 3.6 0 1112 8.4a3.6 3.6 0 010 7.2z" />
            </svg>
        `;
    }

    getBody() {
        const settings = this.model.settings();
        const sf = (...ns: string[]) => optGroup(_('significant figures'), ...ns.map(n => option(`sf:${ n }`, _('{n} sf', { n }))));
        const dp = (...ns: string[]) => optGroup(_('decimal places'), ...ns.map(n => option(`dp:${ n }`, _('{n} dp', { n }))));

        this.nFormat = h('select', {}, sf('3', '4', '5'), dp('2', '3', '4', '5', '16'));
        this.pFormat = h('select', {}, sf('3', '4', '5'), dp('3', '4', '5', '16'));
        this.decSymbol = h('select', {}, option('.', _('Dot')), option(',', _('Comma')));
        this.refsMode = h('select', {}, option('bottom', _('Visible')), option('hidden', _('Hidden')));
        this.theme = h('select', {},
            option('default', _('Default')),
            option('minimal', _('Minimal')),
            option('iheartspss', _('I ♥ SPSS')),
            option('hadley', _('Hadley')),
            option('bw', _('Black & white')));
        this.palette = h('select', {},
            optGroup(_('qualitative'),
                option('jmv', _('jmv')),
                option('Dark2', _('Dark2')),
                option('Set1', _('Set1')),
                option('Accent', _('Accent')),
                option('spss', _('I ♥ SPSS')),
                option('hadley', _('Hadley'))),
            optGroup(_('sequential'),
                option('Greys', _('Greys')),
                option('Blues', _('Blues')),
                option('Greens', _('Greens'))));

        const changeFormat = () => {
            const [ t, n ] = this.nFormat.value.split(':');
            const [ pt, p ] = this.pFormat.value.split(':');
            settings.setSetting('format', JSON.stringify({ t, n: parseInt(n), pt, p: parseInt(p) }));
        };
        this.nFormat.addEventListener('change', changeFormat);
        this.pFormat.addEventListener('change', changeFormat);
        this.decSymbol.addEventListener('change', () => settings.setSetting('decSymbol', this.decSymbol.value as '.' | ','));
        this.refsMode.addEventListener('change', () => settings.setSetting('refsMode', this.refsMode.value));
        this.syntaxMode.addEventListener('change', () => settings.setSetting('syntaxMode', this.syntaxMode.checked));
        this.theme.addEventListener('change', () => {
            const name = this.theme.value as Theme;
            settings.setSetting('theme', name);
            if (name === 'iheartspss')
                settings.setSetting('palette', 'spss');
            else if (name === 'bw')
                settings.setSetting('palette', 'Greys');
        });
        this.palette.addEventListener('change', () => settings.setSetting('palette', this.palette.value));
        this.missings.addEventListener('keydown', event => {
            if (event.key === 'Enter')
                this.missings.blur();
        });
        this.missings.addEventListener('blur', () => settings.setSetting('missings', this.missings.value.trim()));

        const body = this.createBodyElement(
            group(_('Results'),
                row(_('Number format'), this.nFormat),
                row(_('p-value format'), this.pFormat),
                row(_('Decimal symbol'), this.decSymbol),
                row(_('References'), this.refsMode),
                row(_('Syntax mode'), this.syntaxMode)),
            group(_('Plots'),
                row(_('Plot theme'), this.theme),
                row(_('Color palette'), this.palette)),
            group(_('Import'),
                row(_('Default missings'), this.missings)));
        body.classList.add('aux-settings');

        // zoom, the language and developer mode are the desktop app's
        if (host.isElectron)
            body.append(this.createApplicationGroup());

        return body;
    }

    createApplicationGroup(): HTMLElement {
        const settings = this.model.settings();

        const zoomOut = h('button', { type: 'button', 'aria-label': _('Zoom out') }, '-');
        const zoomIn = h('button', { type: 'button', 'aria-label': _('Zoom in') }, '+');
        zoomOut.addEventListener('click', () => settings.zoomOut());
        zoomIn.addEventListener('click', () => settings.zoomIn());
        host.on('zoom', (event: { zoom: number }) => this.zoomLevel.textContent = `${ Math.floor(event.zoom * 100) }%`);

        const available = optGroup(_('Available'));
        const inDevelopment = optGroup(_('In development'));
        let current = available;
        for (const code of I18ns.get('app').availableLanguages()) {
            if (code === '---')
                current = inDevelopment;
            else
                current.append(option(code, I18ns.get('app').getDisplayName(code)));
        }
        this.language.append(option('', _('System default')), available);
        if (inDevelopment.children.length > 0)
            this.language.append(inDevelopment);
        this.language.addEventListener('change', () => {
            settings.setSetting('selectedLanguage', this.language.value);
            host.showMessageBox({
                title: _('Restart required'),
                message: _('A change of language requires jamovi to be restarted'),
            });
        });
        this.devMode.addEventListener('change', () => settings.setSetting('devMode', this.devMode.checked));

        const version = h('div', { class: 'aux-settings-version' });
        void host.version.then((v: string) => version.textContent = _('Version {v}', { v }));

        return group(_('Application'),
            h('div', { class: 'aux-settings-row', role: 'group', 'aria-label': _('Zoom') },
                h('span', {}, _('Zoom')),
                h('span', { class: 'aux-settings-zoom' }, zoomOut, this.zoomLevel, zoomIn)),
            row(_('Language'), this.language),
            row(_('Developer mode'), this.devMode),
            version);
    }

    onMount(): void {
        const settings = this.model.settings();
        for (const name of [ 'theme', 'palette', 'decSymbol', 'devMode', 'zoom', 'format', 'missings', 'refsMode', 'syntaxMode', 'selectedLanguage' ])
            this.listen(settings, `change:${ name }`, this.update);
        this.update();
    }

    update(): void {
        const settings = this.model.settings();

        let fmt: { t?: string, n?: number, pt?: string, p?: number } = {};
        try {
            fmt = JSON.parse(settings.getSetting('format', ''));
        }
        catch (e) {
            // not set yet; the defaults below
        }
        this.nFormat.value = `${ fmt.t ?? 'sf' }:${ fmt.n ?? 3 }`;
        this.pFormat.value = `${ fmt.pt ?? 'dp' }:${ fmt.p ?? 3 }`;

        this.refsMode.value = settings.getSetting('refsMode', 'bottom');
        this.syntaxMode.checked = settings.getSetting('syntaxMode', false);
        this.theme.value = settings.getSetting('theme', Theme.DEFAULT);
        this.palette.value = settings.getSetting('palette', 'jmv');
        this.decSymbol.value = settings.getSetting('decSymbol', '.');
        this.devMode.checked = settings.getSetting('devMode', false);
        this.zoomLevel.textContent = `${ settings.getSetting('zoom', 100) }%`;
        this.missings.value = settings.getSetting('missings', 'NA');
        this.language.value = settings.getSetting('selectedLanguage', '');
    }
}
