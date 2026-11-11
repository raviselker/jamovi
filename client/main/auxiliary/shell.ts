import interactionManager, { keyTips, type IFocusLoopDeactivateEvent } from '../../common/interactionmanager';
import type { SplitPanel } from '../splitpanel';
import ContextMenu from '../contextmenu';
import ContextMenuButton from '../contextmenu/contextmenubutton';
import RibbonGroup from '../ribbon/ribbongroup';
import AuxPanel from './panel';
import AuxToolbar from './toolbar';
import type { AuxPresentation, AuxSide, AuxView, AuxViewId, AuxViewSelection } from './types';

export default class AuxShell {
    splitPanel: SplitPanel;
    toolbar: AuxToolbar;
    panel: AuxPanel;
    views: AuxView[];
    viewMap: Map<AuxViewId, AuxView>;
    activeView: AuxViewSelection = null;
    presentation: AuxPresentation = 'hidden';
    side: AuxSide = 'end';
    pinned = false;
    // the panel's current width. as an overlay each view has its own (see
    // widthFor()); docked, the panel's part of the layout, so it keeps one
    // width whatever it's showing
    width = 320;
    defaultWidth = 320;
    viewWidths = new Map<AuxViewId, number>();
    dockedWidth: number | null = null;
    minWidth = 240;
    maxWidth = 640;
    resizePointerId: number | null = null;
    resizeStartX = 0;
    resizeStartWidth = this.width;
    defaultTitle = '';
    lastInternalPointerDownAt = 0;
    // the element focus returns to when the panel is closed with Escape
    exitTarget: HTMLElement | null = null;
    // cancels a focus that's waiting for the panel to finish showing
    cancelPendingFocus: (() => void) | null = null;
    private markInternalPointerDown: () => void;
    private handleDocumentPointerDown: (event: PointerEvent) => void;
    private handlePanelFocusOut: () => void;
    private handlePanelKeyDown: (event: KeyboardEvent) => void;
    private handleToolbarKeyDown: (event: KeyboardEvent) => void;
    private handleToolbarContextMenu: (event: MouseEvent) => void;
    private handleToolbarMouseDown: (event: MouseEvent) => void;
    private handleLoopDeactivate: (event: IFocusLoopDeactivateEvent) => void;

    constructor(splitPanel: SplitPanel, views: AuxView[], options: { reorderable?: boolean } = {}) {
        this.splitPanel = splitPanel;
        this.views = views;
        this.viewMap = new Map(views.map(view => [view.id, view]));
        if (views.length > 0)
            this.defaultTitle = views[0].title;
        this.toolbar = new AuxToolbar(views, { reorderable: options.reorderable });
        this.panel = new AuxPanel(views);

        this.toolbar.onToggleView = view => this.toggleView(view);
        this.panel.onTogglePinned = () => {
            if (this.activeView !== null)
                this.setState(this.activeView, this.pinned ? 'overlay' : 'docked');
        };
        this.panel.onClose = () => {
            if (this.activeView !== null)
                this.setState(this.activeView, 'hidden');
        };
        this.panel.onResizeStart = event => this.handleResizeStart(event);
        this.panel.onResizeMove = event => this.handleResizeMove(event);
        this.panel.onResizeEnd = event => this.handleResizeEnd(event);
        this.panel.onResizeKey = event => this.handleResizeKey(event);

        // in the keyboard focus modes, Escape deactivates the panel's loop
        // and FocusLoop returns focus to the exit selector, the panel itself
        // then only needs closing (when it's an overlay)
        this.handleLoopDeactivate = event => {
            if (event.reason === 'programmatic')
                this.closeOverlay();
        };
        this.panel.loop.on('deactivate', this.handleLoopDeactivate);

        // keyboard navigation (and so exitKeys) isn't active in the default
        // focus mode, so Escape is handled here instead
        this.handlePanelKeyDown = event => {
            if (event.code !== 'Escape' || event.defaultPrevented || interactionManager.getMode() !== 'default')
                return;

            event.preventDefault();
            this.exitPanel();
        };
        this.panel.element.addEventListener('keydown', this.handlePanelKeyDown);

        this.handleToolbarKeyDown = event => {
            if (event.code === 'Escape' && this.presentation === 'overlay')
                this.closeOverlay();
        };
        this.toolbar.element.addEventListener('keydown', this.handleToolbarKeyDown);

        this.handleToolbarContextMenu = event => this.showToolbarMenu(event);
        this.toolbar.element.addEventListener('contextmenu', this.handleToolbarContextMenu);
        // a right click mustn't focus the toolbar: that activates its focus
        // loop, which for a moment after takes focus back from anything
        // outside it, the context menu included, closing the menu as it opens
        this.handleToolbarMouseDown = event => {
            if (event.button === 2)
                event.preventDefault();
        };
        this.toolbar.element.addEventListener('mousedown', this.handleToolbarMouseDown);

        this.markInternalPointerDown = () => {
            this.lastInternalPointerDownAt = Date.now();
        };
        this.panel.element.addEventListener('pointerdown', this.markInternalPointerDown, true);
        this.toolbar.element.addEventListener('pointerdown', this.markInternalPointerDown, true);

        this.handleDocumentPointerDown = event => {
            const target = event.target as Node;
            if (this.presentation === 'overlay' && ! this.panel.contains(target) && ! this.toolbar.contains(target) && ! ContextMenu.el.contains(target))
                this.closeOverlay();
        };
        document.addEventListener('pointerdown', this.handleDocumentPointerDown, true);

        this.handlePanelFocusOut = () => {
            setTimeout(() => {
                if (this.presentation !== 'overlay')
                    return;

                const activeElement = document.activeElement;
                if (activeElement && (this.panel.contains(activeElement) || this.toolbar.contains(activeElement) || ContextMenu.el.contains(activeElement)))
                    return;

                // focus was lost rather than moved, i.e. the focused control
                // was removed when a view re-rendered. clicks outside the
                // panel are handled by the document pointerdown listener
                if (activeElement === null || activeElement === document.body)
                    return;

                if (Date.now() - this.lastInternalPointerDownAt < 150)
                    return;

                this.closeOverlay();
            }, 0);
        };
        this.panel.element.addEventListener('focusout', this.handlePanelFocusOut);
    }

    mount() {
        this.splitPanel.append(this.toolbar.element, this.panel.element);
    }

    // the toolbar's context menu, which moves the panel (and the toolbar) to
    // the other side. it names the physical side, as that's what the user
    // sees, rather than the logical start or end
    showToolbarMenu(event: MouseEvent) {
        event.preventDefault();

        const toLeft = this.isOnRight();
        const moveButton = new ContextMenuButton({
            title: toLeft ? _('Move to left side') : _('Move to right side'),
            name: 'auxMoveSide',
            useActionHub: false,
        });
        moveButton.addEventListener('menuActioned', () => this.toggleSide());

        // opened from the keyboard (the context menu key, Shift+F10), the
        // event has no pointer position, so it opens by the focused button
        let { clientX: x, clientY: y } = event;
        if (event.button !== 2) {
            const target = event.target instanceof Element ? event.target : this.toolbar.element;
            const rect = target.getBoundingClientRect();
            x = toLeft ? rect.left : rect.right;
            y = rect.top + rect.height / 2;
        }

        ContextMenu.show([new RibbonGroup({ orientation: 'vertical', items: [moveButton] })], x, y);
    }

    toggleSide() {
        this.side = this.side === 'end' ? 'start' : 'end';
        this.setState(this.activeView, this.presentation);
    }

    initialise() {
        this.applyWidth();
        this.setState(null, 'hidden');
    }

    // whether the toolbar buttons can be reordered; disabling it restores
    // their registered order
    setReorderable(reorderable: boolean) {
        this.toolbar.setReorderable(reorderable);
    }

    // a view's width: what it was last resized to, else its own default,
    // else the shell's
    widthFor(view: AuxViewId): number {
        return this.viewWidths.get(view) ?? this.viewMap.get(view)?.defaultWidth ?? this.defaultWidth;
    }

    // keeps a resize: the docked width, or the overlay's for the view showing
    setWidth(width: number) {
        this.width = this.clampWidth(width);
        if (this.presentation === 'docked')
            this.dockedWidth = this.width;
        else if (this.activeView !== null)
            this.viewWidths.set(this.activeView, this.width);
        this.applyWidth();
    }

    // the width for a change of view or presentation
    nextWidth(view: AuxViewSelection, presentation: AuxPresentation, previousPresentation: AuxPresentation): number {
        if (presentation === 'docked') {
            // staying docked, or pinning the overlay showing: the size it is
            if (previousPresentation !== 'hidden')
                return this.width;
            return this.dockedWidth ?? (view !== null ? this.widthFor(view) : this.width);
        }
        if (presentation === 'overlay' && view !== null)
            return this.widthFor(view);
        return this.width;
    }

    applyWidth() {
        this.splitPanel.style.setProperty('--aux-panel-width', `${ this.width }px`);
        this.panel.setWidthRange(this.width, this.minWidth, this.getMaxWidth());
    }

    getMaxWidth() {
        return Math.max(this.minWidth, Math.min(this.maxWidth, Math.floor(window.innerWidth * 0.6)));
    }

    clampWidth(width: number) {
        return Math.max(this.minWidth, Math.min(this.getMaxWidth(), width));
    }

    getExitTarget(): HTMLElement | null {
        if (this.exitTarget !== null && this.exitTarget.isConnected)
            return this.exitTarget;
        if (this.activeView !== null)
            return this.toolbar.buttons.get(this.activeView) || null;
        return null;
    }

    exitPanel() {
        if (this.presentation === 'hidden')
            return;

        const exitTarget = this.getExitTarget();
        if (this.presentation === 'overlay')
            this.setState(this.activeView, 'hidden');
        else
            exitTarget?.focus();
    }

    notifyLayoutChange(containerSpaceChanged: boolean) {
        void this.splitPanel.offsetWidth;
        if (containerSpaceChanged)
            this.splitPanel.onContainerSpaceChanged();
        else
            this.splitPanel.onTransitioning();
    }

    setState(view: AuxViewSelection, presentation: AuxPresentation) {
        const previousView = this.activeView;
        const previousPresentation = this.presentation;
        const previousSide = this.side;
        const previouslyShownView =
            previousPresentation === 'hidden' || previousView === null
                ? null
                : this.viewMap.get(previousView) || null;

        if (previousPresentation === 'hidden' && presentation !== 'hidden') {
            const activeElement = document.activeElement;
            this.exitTarget = activeElement instanceof HTMLElement && activeElement !== document.body && ! this.panel.contains(activeElement)
                ? activeElement
                : null;
        }

        // the panel is about to be hidden, so focus inside it would be lost
        const restoreFocus = presentation === 'hidden'
            && previousPresentation !== 'hidden'
            && document.activeElement !== null
            && this.panel.contains(document.activeElement);
        const exitTarget = restoreFocus ? this.getExitTarget() : null;
        const nextShownView =
            presentation === 'hidden' || view === null
                ? null
                : this.viewMap.get(view) || null;

        this.activeView = view;
        this.presentation = presentation;
        this.width = this.clampWidth(this.nextWidth(view, presentation, previousPresentation));
        if (presentation === 'docked')
            this.dockedWidth = this.width;
        this.applyWidth();
        if (presentation !== 'hidden')
            this.pinned = presentation === 'docked';

        const renderedView = presentation === 'hidden' ? 'none' : (view || 'none');
        this.splitPanel.dataset.auxPresentation = presentation;
        this.splitPanel.dataset.auxView = renderedView;
        this.splitPanel.dataset.auxSide = this.side;
        this.panel.setAriaHidden(presentation === 'hidden');

        nextShownView?.render();

        const title = view ? (this.viewMap.get(view)?.title || this.defaultTitle) : this.defaultTitle;
        this.panel.setTitle(title);
        this.panel.setPinned(this.pinned);
        this.toolbar.setActiveView(view, presentation !== 'hidden');
        this.panel.setActiveView(view);

        if (previouslyShownView !== null && previouslyShownView !== nextShownView) {
            previouslyShownView.shown = false;
            previouslyShownView.onHide();
        }

        if (nextShownView !== null && nextShownView !== previouslyShownView) {
            nextShownView.shown = true;
            nextShownView.onShow();
        }

        const containerSpaceChanged =
            previousPresentation === 'docked' ||
            presentation === 'docked' ||
            (previousSide !== this.side && (previousPresentation === 'docked' || presentation === 'docked'));

        this.notifyLayoutChange(containerSpaceChanged);

        keyTips.update({ silent: true });

        if (exitTarget !== null)
            exitTarget.focus();

        if (presentation !== 'hidden') {
            this.focusWhenShown(() => {
                if (nextShownView !== null)
                    nextShownView.focus();
                else
                    this.panel.focus();

                // focus is now in the panel, so this only updates where
                // focus returns to when the panel is exited
                const exitTarget = this.getExitTarget();
                if (exitTarget !== null && this.panel.contains(document.activeElement))
                    this.panel.loop.activate({ exitSelector: exitTarget });
            });
        }
        else {
            this.cancelPendingFocus?.();
        }
    }

    focusWhenShown(focus: () => void) {
        this.cancelPendingFocus?.();

        // while the panel is transitioning in from hidden, it's still
        // visibility: hidden, and nothing in it can take focus
        if (getComputedStyle(this.panel.element).visibility === 'visible') {
            setTimeout(focus, 0);
            return;
        }

        const element = this.panel.element;
        let timer: ReturnType<typeof setTimeout> | null = null;

        const cleanUp = () => {
            element.removeEventListener('transitionend', onTransitionEnd);
            if (timer !== null)
                clearTimeout(timer);
            if (this.cancelPendingFocus === cleanUp)
                this.cancelPendingFocus = null;
        };

        const finish = () => {
            cleanUp();
            focus();
        };

        const onTransitionEnd = (event: TransitionEvent) => {
            if (event.target === element && event.propertyName === 'visibility')
                finish();
        };

        element.addEventListener('transitionend', onTransitionEnd);
        // in case no transition runs (i.e. reduced motion, or it's interrupted)
        timer = setTimeout(finish, 400);
        this.cancelPendingFocus = cleanUp;
    }

    showView(view: AuxViewId) {
        if (this.activeView === view && this.presentation !== 'hidden') {
            const shownView = this.viewMap.get(view);
            this.focusWhenShown(() => {
                if (shownView !== undefined)
                    shownView.focus();
                else
                    this.panel.focus();
            });
            return;
        }

        this.setState(view, this.pinned ? 'docked' : 'overlay');
    }

    toggleView(view: AuxViewId) {
        if (this.activeView === view && this.presentation !== 'hidden') {
            this.setState(view, 'hidden');
            return;
        }

        this.setState(view, this.pinned ? 'docked' : 'overlay');
    }

    closeOverlay() {
        if (this.presentation === 'overlay')
            this.setState(this.activeView, 'hidden');
    }

    // whether the panel is physically on the right, from its logical side
    // and the layout direction
    isOnRight() {
        const rtl = getComputedStyle(this.splitPanel).direction === 'rtl';
        return (this.side === 'end') !== rtl;
    }

    updateWidthFromPointer(clientX: number) {
        const delta = clientX - this.resizeStartX;
        let nextWidth = this.resizeStartWidth;

        if (this.isOnRight())
            nextWidth = this.resizeStartWidth - delta;
        else
            nextWidth = this.resizeStartWidth + delta;

        this.setWidth(nextWidth);
        this.notifyLayoutChange(this.presentation === 'docked');
    }

    handleResizeStart(event: PointerEvent) {
        if (event.button !== 0 || this.resizePointerId !== null)
            return;

        this.resizePointerId = event.pointerId;
        this.resizeStartX = event.clientX;
        this.resizeStartWidth = this.width;
        this.panel.resizeHandle.setPointerCapture(event.pointerId);
        event.preventDefault();
    }

    handleResizeMove(event: PointerEvent) {
        if (event.pointerId !== this.resizePointerId)
            return;

        // the button was released without us receiving a pointerup
        if ((event.buttons & 1) === 0) {
            this.handleResizeEnd(event);
            return;
        }

        this.updateWidthFromPointer(event.clientX);
    }

    handleResizeEnd(event: PointerEvent) {
        if (event.pointerId !== this.resizePointerId)
            return;

        this.resizePointerId = null;
        if (this.panel.resizeHandle.hasPointerCapture(event.pointerId))
            this.panel.resizeHandle.releasePointerCapture(event.pointerId);
    }

    handleResizeKey(event: KeyboardEvent) {
        const step = event.shiftKey ? 64 : 16;
        // the handle is on the panel's inner edge, so moving it away from
        // the panel's side makes the panel wider
        const onRight = this.isOnRight();
        const growKey = onRight ? 'ArrowLeft' : 'ArrowRight';
        const shrinkKey = onRight ? 'ArrowRight' : 'ArrowLeft';

        let width: number;
        if (event.code === growKey)
            width = this.width + step;
        else if (event.code === shrinkKey)
            width = this.width - step;
        else if (event.code === 'Home')
            width = this.minWidth;
        else if (event.code === 'End')
            width = this.getMaxWidth();
        else
            return;

        event.preventDefault();
        this.setWidth(width);
        this.notifyLayoutChange(this.presentation === 'docked');
    }

    dispose() {
        this.setState(this.activeView, 'hidden');
        this.panel.element.removeEventListener('pointerdown', this.markInternalPointerDown, true);
        this.toolbar.element.removeEventListener('pointerdown', this.markInternalPointerDown, true);
        this.panel.element.removeEventListener('focusout', this.handlePanelFocusOut);
        this.panel.element.removeEventListener('keydown', this.handlePanelKeyDown);
        this.toolbar.element.removeEventListener('keydown', this.handleToolbarKeyDown);
        this.toolbar.element.removeEventListener('contextmenu', this.handleToolbarContextMenu);
        this.toolbar.element.removeEventListener('mousedown', this.handleToolbarMouseDown);
        this.panel.loop.off('deactivate', this.handleLoopDeactivate);
        document.removeEventListener('pointerdown', this.handleDocumentPointerDown, true);

        for (const view of this.views)
            view.dispose();

        this.panel.dispose();
        this.toolbar.dispose();
        this.viewMap.clear();
        this.activeView = null;
    }
}
