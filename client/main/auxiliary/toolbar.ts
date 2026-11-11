import { h } from '../../common/htmlelementcreator';
import interactionManager, { keyTips, type FocusLoop } from '../../common/interactionmanager';
import type { AuxView, AuxViewId } from './types';

export default class AuxToolbar {
    element: HTMLDivElement;
    loop: FocusLoop;
    buttons = new Map<AuxViewId, HTMLButtonElement>();
    onToggleView: ((view: AuxViewId) => void) | null = null;
    pressedView: AuxViewId | null = null;
    pressedPointerId: number | null = null;
    dragStartX = 0;
    dragStartY = 0;
    reorderActive = false;
    suppressClickView: AuxViewId | null = null;
    dropTargetView: AuxViewId | null = null;
    dropBeforeTarget = true;
    dragGhost: HTMLDivElement | null = null;
    dragGhostOffsetX = 0;
    dragGhostOffsetY = 0;
    dropAllowed = true;
    // whether the buttons can be reordered, by dragging or with
    // Ctrl+ArrowUp/ArrowDown
    reorderable = true;
    // the registered order, restored when reordering is disabled
    defaultOrder: AuxViewId[];

    constructor(views: AuxView[], options: { reorderable?: boolean } = {}) {
        this.element = h('div', {
            id: 'aux-toolbar',
            role: 'toolbar',
            'aria-label': _('Assistance panel toolbar'),
            tabindex: '-1',
        });
        this.loop = interactionManager.registerLoop(this.element, { level: 1 });
        keyTips.register(this.element, {
            key: 'T',
            maintainAccessibility: true,
            action: () => this.focus(),
            position: { x: '50%', y: '12px' },
            label: _('Assistance panel toolbar'),
        });

        for (const view of views) {
            const button = view.createToolbarButton();
            button.dataset.auxView = view.id;
            button.addEventListener('click', event => this.handleClick(event, view.id));
            button.addEventListener('pointerdown', event => this.handlePointerDown(event, view.id));
            button.addEventListener('pointermove', event => this.handlePointerMove(event));
            button.addEventListener('pointerup', event => this.handlePointerUp(event));
            // a cancelled or interrupted drag (i.e. a context menu or focus
            // change mid-drag) is abandoned rather than applied
            button.addEventListener('pointercancel', event => this.handlePointerCancel(event));
            button.addEventListener('lostpointercapture', event => this.handlePointerCancel(event));
            button.addEventListener('keydown', event => this.handleKeyDown(event, view.id));
            this.element.append(button);
            this.buttons.set(view.id, button);
        }

        this.defaultOrder = views.map(view => view.id);
        this.setReorderable(options.reorderable ?? true);
    }

    setReorderable(reorderable: boolean) {
        this.reorderable = reorderable;

        for (const button of this.buttons.values()) {
            if (reorderable)
                button.setAttribute('aria-keyshortcuts', 'Control+ArrowUp Control+ArrowDown');
            else
                button.removeAttribute('aria-keyshortcuts');
        }

        if (reorderable)
            return;

        this.abandonDrag();

        // put the buttons back in their registered order, keeping focus
        // where it was
        const focused = document.activeElement;
        for (const view of this.defaultOrder) {
            const button = this.buttons.get(view);
            if (button)
                this.element.append(button);
        }
        if (focused instanceof HTMLElement && this.element.contains(focused) && document.activeElement !== focused)
            focused.focus();
    }

    handleClick(event: MouseEvent, view: AuxViewId) {
        if (this.suppressClickView === view) {
            event.preventDefault();
            this.suppressClickView = null;
            return;
        }

        this.onToggleView?.(view);
    }

    handlePointerDown(event: PointerEvent, view: AuxViewId) {
        if (event.button !== 0 || ! this.reorderable)
            return;

        this.pressedView = view;
        this.pressedPointerId = event.pointerId;
        this.dragStartX = event.clientX;
        this.dragStartY = event.clientY;
        this.reorderActive = false;

        const button = this.buttons.get(view);
        if (button) {
            const rect = button.getBoundingClientRect();
            this.dragGhostOffsetX = event.clientX - rect.left;
            this.dragGhostOffsetY = event.clientY - rect.top;
        }
        button?.setPointerCapture(event.pointerId);
    }

    ensureDragGhost(button: HTMLButtonElement) {
        if (this.dragGhost)
            return;

        const ghost = button.cloneNode(true) as HTMLDivElement;
        ghost.classList.add('aux-toolbar-button-ghost');
        ghost.classList.remove('dragging', 'drop-before', 'drop-after', 'active');
        ghost.setAttribute('aria-hidden', 'true');
        document.body.append(ghost);
        this.dragGhost = ghost;
    }

    updateDragGhostPosition(clientX: number, clientY: number) {
        if ( ! this.dragGhost)
            return;

        this.dragGhost.style.left = `${ clientX - this.dragGhostOffsetX }px`;
        this.dragGhost.style.top = `${ clientY - this.dragGhostOffsetY }px`;
    }

    clearDragGhost() {
        this.dragGhost?.remove();
        this.dragGhost = null;
    }

    updateDragCursor(dropAllowed: boolean) {
        this.dropAllowed = dropAllowed;
        document.body.classList.add('aux-toolbar-reordering');
        document.body.classList.toggle('aux-toolbar-no-drop', dropAllowed === false);
    }

    clearDragCursor() {
        document.body.classList.remove('aux-toolbar-reordering', 'aux-toolbar-no-drop');
        this.dropAllowed = true;
    }

    handlePointerMove(event: PointerEvent) {
        if (this.pressedView === null || this.pressedPointerId !== event.pointerId)
            return;

        const draggingButton = this.buttons.get(this.pressedView);
        if ( ! draggingButton)
            return;

        // the button was released without us receiving a pointerup
        if ((event.buttons & 1) === 0) {
            this.handlePointerCancel(event);
            return;
        }

        const movedX = Math.abs(event.clientX - this.dragStartX);
        const movedY = Math.abs(event.clientY - this.dragStartY);
        if (this.reorderActive === false && movedX < 4 && movedY < 4)
            return;

        this.reorderActive = true;
        draggingButton.classList.add('dragging');
        this.element.classList.add('reordering');
        this.ensureDragGhost(draggingButton);
        this.updateDragGhostPosition(event.clientX, event.clientY);
        this.updateDragCursor(true);
        event.preventDefault();

        const toolbarRect = this.element.getBoundingClientRect();
        if (
            event.clientX < toolbarRect.left ||
            event.clientX > toolbarRect.right ||
            event.clientY < toolbarRect.top ||
            event.clientY > toolbarRect.bottom
        ) {
            this.updateDragCursor(false);
            this.clearDropIndicator();
            return;
        }

        this.updateDragCursor(true);

        const buttons = Array.from(this.element.querySelectorAll<HTMLButtonElement>('.aux-toolbar-button:not(.dragging)'));
        if (buttons.length === 0) {
            this.clearDropIndicator();
            return;
        }

        for (const button of buttons) {
            const rect = button.getBoundingClientRect();
            const threshold = rect.top + rect.height * 0.75;

            if (event.clientY < threshold) {
                this.showDropIndicator(button, true);
                return;
            }
        }

        const lastButton = buttons[buttons.length - 1];
        this.showDropIndicator(lastButton, false);
    }

    handlePointerUp(event: PointerEvent) {
        if (this.pressedView === null || this.pressedPointerId !== event.pointerId)
            return;

        const pressedView = this.pressedView;
        const button = this.buttons.get(pressedView);
        // releasing capture fires lostpointercapture, which must not cancel this drop
        this.pressedPointerId = null;
        if (button?.hasPointerCapture(event.pointerId))
            button.releasePointerCapture(event.pointerId);

        if (this.reorderActive) {
            button?.classList.remove('dragging');
            this.element.classList.remove('reordering');
            this.applyDropReorder();
            this.clearDropIndicator();
            this.clearDragGhost();
            this.clearDragCursor();
            this.suppressClickView = pressedView;
        }
        else {
            this.element.classList.remove('reordering');
            this.clearDragGhost();
            this.clearDragCursor();
        }

        this.pressedView = null;
        this.pressedPointerId = null;
        this.reorderActive = false;
    }

    handlePointerCancel(event: PointerEvent) {
        if (this.pressedView === null || this.pressedPointerId !== event.pointerId)
            return;

        this.abandonDrag();
    }

    abandonDrag() {
        if (this.pressedView === null)
            return;

        const button = this.buttons.get(this.pressedView);
        const pointerId = this.pressedPointerId;
        // releasing capture fires lostpointercapture, which comes back here
        this.pressedPointerId = null;
        if (pointerId !== null && button?.hasPointerCapture(pointerId))
            button.releasePointerCapture(pointerId);

        if (this.reorderActive)
            this.suppressClickView = this.pressedView;

        button?.classList.remove('dragging');
        this.element.classList.remove('reordering');
        this.clearDropIndicator();
        this.clearDragGhost();
        this.clearDragCursor();

        this.pressedView = null;
        this.pressedPointerId = null;
        this.reorderActive = false;
    }

    handleKeyDown(event: KeyboardEvent, view: AuxViewId) {
        if ( ! this.reorderable || ! event.ctrlKey || event.altKey || event.shiftKey)
            return;
        if (event.code !== 'ArrowUp' && event.code !== 'ArrowDown')
            return;

        const button = this.buttons.get(view);
        if ( ! button)
            return;

        // keep keyboard navigation from also moving focus
        event.preventDefault();
        event.stopPropagation();

        if (event.code === 'ArrowUp') {
            const previous = button.previousElementSibling;
            if (previous === null)
                return;
            this.element.insertBefore(button, previous);
        }
        else {
            const next = button.nextElementSibling;
            if (next === null)
                return;
            this.element.insertBefore(button, next.nextElementSibling);
        }

        button.focus();
        const buttons = Array.from(this.element.querySelectorAll('.aux-toolbar-button'));
        interactionManager.announce(_('{title} moved to position {position} of {count}', {
            title: button.title,
            position: (buttons.indexOf(button) + 1).toLocaleString(),
            count: buttons.length.toLocaleString(),
        }));
    }

    contains(target: Node) {
        return this.element.contains(target);
    }

    focus(view: AuxViewId | null = null) {
        const button = (view && this.buttons.get(view)) || this.element.querySelector<HTMLButtonElement>('.aux-toolbar-button');
        if (button)
            button.focus();
        else
            this.element.focus();
    }

    clearDropIndicator() {
        this.dropTargetView = null;
        this.dropBeforeTarget = true;
        this.buttons.forEach(button => {
            button.classList.remove('drop-before', 'drop-after');
        });
    }

    showDropIndicator(targetButton: HTMLButtonElement, beforeTarget: boolean) {
        this.clearDropIndicator();

        const targetView = targetButton.dataset.auxView as AuxViewId | undefined;
        if ( ! targetView)
            return;

        this.dropTargetView = targetView;
        this.dropBeforeTarget = beforeTarget;
        targetButton.classList.add(beforeTarget ? 'drop-before' : 'drop-after');
    }

    applyDropReorder() {
        if (this.pressedView === null || this.dropTargetView === null)
            return;

        const draggingButton = this.buttons.get(this.pressedView);
        const targetButton = this.buttons.get(this.dropTargetView);
        if ( ! draggingButton || ! targetButton || draggingButton === targetButton)
            return;

        if (this.dropBeforeTarget)
            this.element.insertBefore(draggingButton, targetButton);
        else
            this.element.insertBefore(draggingButton, targetButton.nextSibling);
    }

    setActiveView(view: AuxViewId | null, visible: boolean) {
        this.buttons.forEach((button, buttonView) => {
            const selected = visible && buttonView === view;
            button.classList.toggle('active', selected);
            button.setAttribute('aria-pressed', selected ? 'true' : 'false');
        });
    }

    dispose() {
        this.clearDropIndicator();
        this.clearDragGhost();
        this.clearDragCursor();
        this.buttons.clear();
        this.loop.unregister();
        this.element.remove();
        this.onToggleView = null;
    }
}
