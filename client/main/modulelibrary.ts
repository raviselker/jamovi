// opens the module library (the aux panel's modules view) filtered: for the
// places the app links to it, the ribbon's module menus, and an analysis
// asking for its module to be found
//
//   searchTerm takes the library's search syntax: 'module::<name>' for a
//   module by name, 'plot::' for modules providing plots

export type ModuleLibraryFilter = 'all' | 'installed';

export interface IModuleLibrary {
    show(filter: ModuleLibraryFilter, searchTerm?: string): void;
}
