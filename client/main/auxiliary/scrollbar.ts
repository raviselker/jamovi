// the width an element's vertical scrollbar takes up beside its content, for
// a view to make room for: chromium's classic scrollbars take up space,
// firefox's overlay scrollbars take up none. the element should keep its
// gutter (scrollbar-gutter: stable), so the width's there to measure
// whether or not it's scrolling, and its content doesn't move as the
// scrollbar comes and goes
export function scrollbarGutterWidth(element: HTMLElement): number {
    const style = getComputedStyle(element);
    const borders = parseFloat(style.borderInlineStartWidth) + parseFloat(style.borderInlineEndWidth);
    return Math.max(0, element.offsetWidth - element.clientWidth - borders);
}
