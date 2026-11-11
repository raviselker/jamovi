import { h } from '../../common/htmlelementcreator';

// the side panel's search: one search box, and one way of matching, for every
// view that searches

// text, and a search, compared without case or accents ('Médiation'
// matches 'mediation')
function normalise(text: string): string {
    return text.normalize('NFD').replace(/\p{M}/gu, '').toLocaleLowerCase();
}

export function matchesSearch(text: string, search: string): boolean {
    return normalise(text).includes(normalise(search.trim()));
}

// the text, with where it matches the search marked
export function highlightSearch(text: string, search: string): DocumentFragment {
    const fragment = document.createDocumentFragment();
    const term = normalise(search.trim());
    if (term === '') {
        fragment.append(text);
        return fragment;
    }

    // normalising can change the text's length, so each normalised character
    // keeps the index of the character it came from
    let normalised = '';
    const origins: number[] = [];
    for (let index = 0; index < text.length; index++) {
        const character = normalise(text[index]);
        normalised += character;
        for (let i = 0; i < character.length; i++)
            origins.push(index);
    }
    origins.push(text.length);

    let from = 0;
    let index = normalised.indexOf(term);
    while (index !== -1) {
        const start = origins[index];
        const end = origins[index + term.length];
        fragment.append(text.slice(from, start), h('mark', { class: 'aux-search-highlight' }, text.slice(start, end)));
        from = end;
        index = normalised.indexOf(term, index + term.length);
    }
    fragment.append(text.slice(from));
    return fragment;
}

export type SearchBox = {
    element: HTMLElement;
    input: HTMLInputElement;
    // sets the search, without notifying
    setValue: (value: string) => void;
};

export function createSearchBox(options: { label: string, placeholder?: string, onSearch: (value: string) => void }): SearchBox {
    const input = h('input', {
        type: 'text',
        class: 'aux-searchbox-input',
        spellcheck: 'false',
        autocomplete: 'off',
        placeholder: options.placeholder ?? options.label,
        'aria-label': options.label,
    });
    const clear = h('button', { type: 'button', class: 'aux-searchbox-clear', 'aria-label': _('Clear search'), title: _('Clear search'), hidden: '' });
    const element = h('div', { class: 'aux-searchbox', role: 'search' },
        h('span', { class: 'aux-searchbox-icon', 'aria-hidden': 'true' }), input, clear);

    const setValue = (value: string) => {
        input.value = value;
        clear.hidden = value === '';
    };
    const search = (value: string) => {
        setValue(value);
        options.onSearch(value);
    };

    input.addEventListener('input', () => search(input.value));
    clear.addEventListener('click', () => {
        search('');
        input.focus();
    });
    // Escape clears the search first; with nothing to clear, it's left to
    // close the panel
    input.addEventListener('keydown', event => {
        if (event.code !== 'Escape' || input.value === '')
            return;
        event.preventDefault();
        event.stopPropagation();
        search('');
    });

    return { element, input, setValue };
}
