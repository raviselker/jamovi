"""Tests for the view order kept by the data set store."""

import pytest

from jamovi.server.dataset import DataSet
from jamovi.server.dataset import DataType
from jamovi.server.dataset import MeasureType


NAN = float("nan")


@pytest.fixture
def dataset(empty_dataset: DataSet) -> DataSet:
    """A = 3.5, 1.5, (missing), 2.5, 1.5
    B = b, c, a, b, a
    C = fred, (missing), anne, bob, anne"""
    ds = empty_dataset
    ds.set_row_count(5)

    a = ds.append_column("A")
    a.set_data_type(DataType.DECIMAL)
    a.set_measure_type(MeasureType.CONTINUOUS)
    for row_no, value in enumerate([3.5, 1.5, NAN, 2.5, 1.5]):
        a.set_value(row_no, value)
    a.determine_dps()

    b = ds.append_column("B")
    b.set_data_type(DataType.TEXT)
    for row_no, value in enumerate(["b", "c", "a", "b", "a"]):
        b.set_value(row_no, value)

    c = ds.append_column("C")
    c.set_data_type(DataType.TEXT)
    c.set_measure_type(MeasureType.ID)
    for row_no, value in enumerate(["fred", "", "anne", "bob", "anne"]):
        c.set_value(row_no, value)

    return ds


def _sort(ds: DataSet, *keys: tuple[str, bool]) -> list[int]:
    ds.refresh_view_order([(ds[name].id, descending) for name, descending in keys], False)
    return ds.get_data_indices(0, ds.view_row_count)


def test_unsorted(dataset: DataSet):
    """unsorted, the view order is the data set order"""
    assert _sort(dataset) == [0, 1, 2, 3, 4]


def test_sort_by_value(dataset: DataSet):
    """missing values sort last, and ties retain the data set order"""
    assert _sort(dataset, ("A", False)) == [1, 4, 3, 0, 2]
    assert _sort(dataset, ("A", True)) == [0, 3, 1, 4, 2]


def test_sort_by_label(dataset: DataSet):
    """text columns sort by label, not by their (raw) values"""
    assert _sort(dataset, ("B", False)) == [2, 4, 0, 3, 1]


def test_sort_ids(dataset: DataSet):
    """ID columns sort by their text, with missing values last"""
    assert _sort(dataset, ("C", False)) == [2, 4, 3, 0, 1]
    assert _sort(dataset, ("C", True)) == [0, 3, 2, 4, 1]


def test_sort_by_several_columns(dataset: DataSet):
    """later columns break ties in earlier ones"""
    assert _sort(dataset, ("B", False), ("A", True)) == [4, 2, 0, 3, 1]


def test_view_indices(dataset: DataSet):
    """view indices are the inverse of the data indices"""
    order = _sort(dataset, ("A", False))
    assert dataset.get_view_indices(order) == [0, 1, 2, 3, 4]
    assert dataset.get_view_indices([0, 2]) == [3, 4]


def test_data_indices_range(dataset: DataSet):
    """only the view rows displayed are returned"""
    _sort(dataset, ("A", False))
    assert dataset.get_data_indices(3, 10) == [0, 2]


def test_refresh_reports_changes(dataset: DataSet):
    """refreshing reports whether the view order changed"""
    keys = [(dataset["A"].id, False)]
    assert dataset.refresh_view_order(keys, False) is True
    assert dataset.refresh_view_order(keys, False) is False
    dataset["A"].set_value(2, 0.5)
    assert dataset.refresh_view_order(keys, False) is True
    assert dataset.get_data_indices(0, 5) == [2, 1, 4, 3, 0]


def test_text_ignores_case(empty_dataset: DataSet):
    """capitals don't sort ahead of lower case letters"""
    ds = empty_dataset
    ds.set_row_count(4)
    column = ds.append_column("A")
    column.set_data_type(DataType.TEXT)
    for row_no, value in enumerate(["zoe", "Bob", "apple", "Zed"]):
        column.set_value(row_no, value)
    assert _sort(ds, ("A", False)) == [2, 1, 3, 0]


def test_update_keeps_rows_in_place(dataset: DataSet):
    """an update retains the order, and new rows go last"""
    keys = [(dataset["A"].id, False)]
    order = _sort(dataset, ("A", False))
    dataset["A"].set_value(1, 100.0)
    dataset.update_view_order(False)
    assert dataset.get_data_indices(0, dataset.view_row_count) == order
    assert not dataset.is_view_order_sorted(keys)

    dataset.set_row_count(6)
    dataset.update_view_order(False)
    assert dataset.get_data_indices(0, dataset.view_row_count) == order + [5]

    dataset.set_row_count(4)
    dataset.update_view_order(False)
    assert dataset.get_data_indices(0, dataset.view_row_count) == [row for row in order if row < 4]


def test_sorted_ignores_ties(dataset: DataSet):
    """rows in any order among ties are still sorted"""
    keys = [(dataset["B"].id, False)]
    _sort(dataset, ("B", False), ("A", True))
    assert dataset.is_view_order_sorted(keys)


def _search(ds: DataSet, text: str, names: list[str] = [], whole: bool = False) -> list[int]:
    ids = [ds[name].id for name in names]
    ds.refresh_view_order([], False, (text, ids, whole))
    return ds.get_data_indices(0, ds.view_row_count)


def test_search_matches_part_of_any_column_ignoring_case(dataset: DataSet):
    """GIVEN text found in different columns
    WHEN searching every column for part of it, in upper case
    THEN the rows with it in any column are displayed"""
    assert _search(dataset, "B") == [0, 3]  # B = b, and C = bob


def test_search_one_column(dataset: DataSet):
    """GIVEN a value in two columns
    WHEN searching only one of them
    THEN only that column's rows are displayed"""
    assert _search(dataset, "b", ["B"]) == [0, 3]
    assert _search(dataset, "b", ["C"]) == [3]


def test_search_whole_cell(dataset: DataSet):
    """GIVEN values containing the text
    WHEN the whole cell must match
    THEN only cells equal to it match"""
    assert _search(dataset, "ann", ["C"]) == [2, 4]
    assert _search(dataset, "ann", ["C"], whole=True) == []
    assert _search(dataset, "anne", ["C"], whole=True) == [2, 4]


def test_search_decimals_as_displayed(dataset: DataSet):
    """GIVEN decimals
    WHEN searching for one as it's displayed
    THEN its rows match, and missing values never do"""
    assert _search(dataset, "1.5", ["A"], whole=True) == [1, 4]


def test_search_and_sort_combine(dataset: DataSet):
    """GIVEN a search
    WHEN also sorting
    THEN the matching rows are displayed in sorted order"""
    dataset.refresh_view_order([(dataset["A"].id, True)], False, ("a", [dataset["B"].id], False))
    assert dataset.get_data_indices(0, dataset.view_row_count) == [4, 2]
