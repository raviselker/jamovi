import { h, htmlTrusted } from '../../common/htmlelementcreator';
import interactionManager, { keyTips, type FocusLoop } from '../../common/interactionmanager';
import { findInitialFocus, type AuxView, type AuxViewId } from './types';

export default class AuxPanel {
    element: HTMLElement;
    loop: FocusLoop;
    resizeHandle: HTMLDivElement;
    titleElement: HTMLDivElement;
    pinButton: HTMLButtonElement;
    closeButton: HTMLButtonElement;
    viewElements = new Map<AuxViewId, HTMLElement>();
    activeView: AuxViewId | null = null;
    onTogglePinned: (() => void) | null = null;
    onClose: (() => void) | null = null;
    onResizeStart: ((event: PointerEvent) => void) | null = null;
    onResizeMove: ((event: PointerEvent) => void) | null = null;
    onResizeEnd: ((event: PointerEvent) => void) | null = null;
    onResizeKey: ((event: KeyboardEvent) => void) | null = null;

    createActionIcon(svg: string) {
        return h('div', { class: 'aux-panel-action-icon', 'aria-hidden': 'true' }, htmlTrusted(svg));
    }

    constructor(views: AuxView[]) {
        this.element = h('aside', {
            id: 'aux-panel',
            role: 'complementary',
            'aria-label': _('Assistance panel'),
            tabindex: '-1',
        });
        this.loop = interactionManager.registerLoop(this.element, {
            exitKeys: ['Escape'],
            exitSelector: '#aux-toolbar .aux-toolbar-button.active',
        });
        keyTips.register(this.element, {
            key: 'X',
            maintainAccessibility: true,
            action: () => this.focus(),
            position: { x: '50%', y: '12px' },
            label: _('Assistance panel'),
        });

        this.resizeHandle = h('div', {
            id: 'aux-panel-resize',
            role: 'separator',
            'aria-label': _('Resize assistance panel'),
            title: _('Resize assistance panel'),
            'aria-orientation': 'vertical',
            tabindex: '0',
        });

        this.titleElement = h('div', { id: 'aux-panel-title' });

        this.pinButton = h('button', { class: 'aux-panel-action', type: 'button' },
            this.createActionIcon(`
                <svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M8 4h8" />
                    <path d="M9 4v5l-3 4h12l-3-4V4" />
                    <path d="M12 13v7" />
                </svg>
            `));

        this.closeButton = h('button', {
            class: 'aux-panel-action',
            type: 'button',
            'aria-label': _('Close panel'),
            title: _('Close panel'),
        }, this.createActionIcon(`
            <svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <path d="m7 7 10 10" />
                <path d="m17 7-10 10" />
            </svg>
        `));

        const actions = h('div', { id: 'aux-panel-actions' }, this.pinButton, this.closeButton);
        const header = h('div', { id: 'aux-panel-header' }, this.titleElement, actions);

        const body = h('div', { id: 'aux-panel-body' });

        for (const view of views) {
            const element = view.createPanelElement();
            body.append(element);
            this.viewElements.set(view.id, element);
            for (const action of view.getPanelActions()) {
                action.dataset.auxView = view.id;
                action.hidden = true;
                this.pinButton.before(action);
            }
        }

        // the resize handle is placed by the grid, it's last here so it
        // comes after the view's content in the tab order
        this.element.append(header, body, this.resizeHandle);

        this.pinButton.addEventListener('click', () => this.onTogglePinned?.());
        this.closeButton.addEventListener('click', () => this.onClose?.());

        this.resizeHandle.addEventListener('pointerdown', event => this.onResizeStart?.(event));
        this.resizeHandle.addEventListener('pointermove', event => this.onResizeMove?.(event));
        // lostpointercapture catches cases where pointerup never reaches
        // the handle (i.e. a context menu or focus change mid-drag)
        ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(eventName => {
            this.resizeHandle.addEventListener(eventName, event => this.onResizeEnd?.(event as PointerEvent));
        });
        this.resizeHandle.addEventListener('keydown', event => this.onResizeKey?.(event));
    }

    contains(target: Node) {
        return this.element.contains(target);
    }

    focus() {
        if (this.activeView !== null) {
            const view = this.viewElements.get(this.activeView);
            if (view) {
                (findInitialFocus(view) || view).focus();
                return;
            }
        }

        this.element.focus();
    }

    setWidthRange(width: number, min: number, max: number) {
        this.resizeHandle.setAttribute('aria-valuenow', width.toString());
        this.resizeHandle.setAttribute('aria-valuemin', min.toString());
        this.resizeHandle.setAttribute('aria-valuemax', max.toString());
        this.resizeHandle.setAttribute('aria-valuetext', _('{width} pixels', { width: width.toLocaleString() }));
    }

    setAriaHidden(hidden: boolean) {
        this.element.setAttribute('aria-hidden', hidden ? 'true' : 'false');
    }

    setTitle(title: string) {
        this.titleElement.textContent = title;
    }

    setPinned(pinned: boolean) {
        const label = pinned ? _('Unpin panel') : _('Pin panel');
        this.pinButton.setAttribute('aria-label', label);
        this.pinButton.title = label;
        this.pinButton.classList.toggle('active', pinned);
        this.pinButton.replaceChildren(this.createActionIcon(pinned ? `
            <svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <path d="M8 4h8" />
                <path d="M9 4v5l-3 4h12l-3-4V4" fill="currentColor" />
                <path d="M12 13v7" />
            </svg>
        ` : `
            <svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <path d="M8 4h8" />
                <path d="M9 4v5l-3 4h12l-3-4V4" />
                <path d="M12 13v7" />
            </svg>
        `));
    }

    setActiveView(view: AuxViewId | null) {
        this.activeView = view;
        this.viewElements.forEach((element, elementView) => {
            const active = elementView === view;
            element.classList.toggle('active', active);
            element.setAttribute('aria-hidden', active ? 'false' : 'true');
        });
        this.element.querySelectorAll<HTMLElement>('#aux-panel-actions [data-aux-view]')
            .forEach(action => action.hidden = action.dataset.auxView !== view);
    }

    dispose() {
        this.viewElements.clear();
        this.loop.unregister();
        this.element.remove();
        this.onTogglePinned = null;
        this.onClose = null;
        this.onResizeStart = null;
        this.onResizeMove = null;
        this.onResizeEnd = null;
        this.onResizeKey = null;
    }
}
