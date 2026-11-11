import { h } from '../../../common/htmlelementcreator';
import type Instance from '../../instance';
import { ColumnType } from '../../dataset';
import { AuxView } from '../types';

export default class DatasetAuxView extends AuxView {
    model: Instance;
    rowsValue: HTMLElement | null = null;
    visibleRowsValue: HTMLElement | null = null;
    columnsValue: HTMLElement | null = null;
    filtersValue: HTMLElement | null = null;
    editedCellsValue: HTMLElement | null = null;
    stateText: HTMLElement | null = null;

    constructor(model: Instance) {
        super('dataset');
        this.model = model;
    }

    getTitle() { return _('Dataset Overview'); }

    getIconSvg() { return `
            <svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <rect x="4" y="5" width="16" height="14" rx="2" />
                <path d="M4 10h16" />
                <path d="M10 5v14" />
            </svg>
        `; }

    createStat(label: string) {
        const value = h('strong', {}, '0');
        const stat = h('div', { class: 'aux-panel-stat' }, h('span', {}, label), value);
        return { stat, value };
    }

    getBody() {
        const rows = this.createStat(_('Rows'));
        const visibleRows = this.createStat(_('Visible rows'));
        const columns = this.createStat(_('Columns'));
        const filters = this.createStat(_('Active filters'));
        const editedCells = this.createStat(_('Edited cells'));
        const state = h('div', { class: 'aux-panel-placeholder' });

        const body = this.createBodyElement(
            h('p', {}, _('A compact status summary for the active data set.')),
            h('div', { class: 'aux-panel-grid' },
                rows.stat, visibleRows.stat, columns.stat, filters.stat, editedCells.stat),
            state,
        );

        this.rowsValue = rows.value;
        this.visibleRowsValue = visibleRows.value;
        this.columnsValue = columns.value;
        this.filtersValue = filters.value;
        this.editedCellsValue = editedCells.value;
        this.stateText = state;

        return body;
    }

    onMount(): void {
        const dataSetModel = this.model.dataSetModel();
        for (const eventName of [
            'dataSetLoaded', 'columnsChanged', 'change:rowCount', 'change:columnCount',
            'change:rowCountExFiltered', 'change:filtersVisible', 'change:editedCellCount', 'change:edited',
        ])
            this.listen(dataSetModel, eventName, this.requestUpdate);
        this.update();
    }

    onShow(): void {
        this.update();
    }

    update(): void {
        if (this.rowsValue === null || this.visibleRowsValue === null || this.columnsValue === null || this.filtersValue === null || this.editedCellsValue === null || this.stateText === null)
            return;

        const dataSetModel = this.model.dataSetModel();
        const rows = dataSetModel.get('rowCount') || 0;
        const visibleRows = dataSetModel.visibleRowCount() || 0;
        const columns = dataSetModel.get('columnCount') || 0;
        const editedCells = dataSetModel.get('editedCellCount') || 0;
        const activeFilters = dataSetModel.filterCount(true);
        const filtersVisible = dataSetModel.get('filtersVisible');
        const computedColumns = dataSetModel.attributes.columns.filter(column => column.columnType === ColumnType.COMPUTED || column.columnType === ColumnType.RECODED).length;
        const edited = dataSetModel.get('edited');

        this.rowsValue.textContent = rows.toLocaleString();
        this.visibleRowsValue.textContent = visibleRows.toLocaleString();
        this.columnsValue.textContent = columns.toLocaleString();
        this.filtersValue.textContent = activeFilters.toLocaleString();
        this.editedCellsValue.textContent = editedCells.toLocaleString();

        this.stateText.textContent = [
            filtersVisible ? _('Filters are visible.') : _('Filters are hidden.'),
            n_('{n} transformed or computed column.', '{n} transformed or computed columns.', computedColumns, { n: computedColumns.toLocaleString() }),
            edited ? _('Data set is edited.') : _('Data set is saved.'),
        ].join(' ');
    }
}
