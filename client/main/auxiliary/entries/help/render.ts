import katex from 'katex';
import { h, richMarkdown, type RichOptions } from '../../../../common/htmlelementcreator';

// renders a module's markdown help document, sanitized to the tags below,
// with its TeX ($$display$$ and $inline$) typeset by katex

const docOptions: RichOptions = {
    tags: [
        'h1', 'h2', 'h3', 'h4', 'p', 'ul', 'ol', 'li', 'blockquote', 'hr', 'br',
        'strong', 'b', 'em', 'i', 's', 'del', 'sub', 'sup', 'code', 'pre', 'a',
        'table', 'thead', 'tbody', 'tr', 'th', 'td',
    ],
    attributes: {
        a: ['href', 'title'],
    },
};

// the maths is taken out of the markdown before it's parsed (so markdown
// doesn't mangle the TeX), leaving a marker in its place that's swapped for
// the typeset maths afterwards. the markers are private use characters,
// which markdown and the sanitizer leave alone
const MATH_START = '';
const MATH_END = '';
const MATH_MARKER = /(\d+)/g;

type MathItem = {
    tex: string;
    display: boolean;
};

function extractMaths(source: string): { source: string, maths: MathItem[] } {
    const maths: MathItem[] = [];
    const marker = (tex: string, display: boolean) => {
        maths.push({ tex: tex.trim(), display });
        return `${ MATH_START }${ maths.length - 1 }${ MATH_END }`;
    };
    source = source
        .replace(/\$\$([\s\S]+?)\$\$/g, (_, tex: string) => marker(tex, true))
        .replace(/\$([^$\n]+?)\$/g, (_, tex: string) => marker(tex, false));
    return { source, maths };
}

function typesetMaths(root: HTMLElement, maths: MathItem[]): void {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const textNodes: Text[] = [];
    while (walker.nextNode()) {
        const node = walker.currentNode as Text;
        if (node.data.includes(MATH_START))
            textNodes.push(node);
    }

    for (const node of textNodes) {
        const fragment = document.createDocumentFragment();
        let last = 0;
        for (const match of node.data.matchAll(MATH_MARKER)) {
            const index = match.index ?? 0;
            if (index > last)
                fragment.append(node.data.slice(last, index));
            const item = maths[Number(match[1])];
            if (item !== undefined) {
                // maths reads left to right, even in a right-to-left document
                const element = h('span', { class: item.display ? 'aux-help-math aux-help-math-display' : 'aux-help-math', dir: 'ltr' });
                // katex escapes the TeX it's given, and with trust off (the
                // default) won't produce links or other active content
                katex.render(item.tex, element, { displayMode: item.display, throwOnError: false });
                fragment.append(element);
            }
            last = index + match[0].length;
        }
        if (last < node.data.length)
            fragment.append(node.data.slice(last));
        node.replaceWith(fragment);
    }
}

export function renderDoc(source: string): HTMLElement {
    const { source: markdown, maths } = extractMaths(source);
    // dir=auto: a document is in English unless its module ships a
    // translation, so its direction can differ from the UI's
    const article = h('article', { class: 'aux-help-doc', dir: 'auto' }, ...richMarkdown(markdown, docOptions));
    typesetMaths(article, maths);
    return article;
}
