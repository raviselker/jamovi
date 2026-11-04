from typing import TypeAlias
from uuid import uuid4

import pytest

from jamovi.server.dataset import Column
from jamovi.server.dataset import DataSet
from jamovi.server.dataset import ColumnType
from jamovi.server.dataset import MeasureType
from jamovi.server.dataset import DataType


ColumnProperty: TypeAlias = bool | str | int | ColumnType | MeasureType


def test_column_data_types(empty_dataset):
    """test if column data types change accordingly"""
    dataset = empty_dataset

    fred = dataset.append_column("fred")
    fred.change(data_type=DataType.INTEGER, measure_type=MeasureType.CONTINUOUS)

    jim = dataset.append_column("jim")
    jim.change(data_type=DataType.TEXT, measure_type=MeasureType.NOMINAL)

    will = dataset.append_column("will")
    will.change(data_type=DataType.INTEGER, measure_type=MeasureType.NOMINAL)

    assert fred.data_type is DataType.INTEGER
    assert jim.data_type is DataType.TEXT
    assert will.data_type is DataType.INTEGER


@pytest.mark.parametrize(
    ("property_name", "value"),
    [
        ("auto_measure", True),
        ("auto_measure", False),
        ("column_type", ColumnType.DATA),
        ("column_type", ColumnType.COMPUTED),
        ("description", "the fish was delish äüïöëÿ"),
        ("formula", "6 + 2 - 3"),
        ("formula_message", "your formula is bad"),
        ("id", 7),
        ("import_name", "bruce äüïöëÿ"),
        ("measure_type", MeasureType.CONTINUOUS),
        ("name", "fred äüïöëÿ"),
    ],
)
def test_columns_persist_properties(
    empty_column: Column,
    property_name: str,
    value: ColumnProperty,
):
    """Column properties are persisted."""
    # GIVEN a column
    column = empty_column

    # WHEN i change its property values
    setattr(column, property_name, value)

    # THEN the property values are persisted
    assert getattr(column, property_name) == value


@pytest.mark.parametrize(
    ("index",),
    [
        (0,),
        (1,),
        (2,),
        (3,),
    ],
)
def test_column_insertion(
    simple_dataset: DataSet,
    index: int,
):
    """Test column insertions"""
    # GIVEN a simple dataset with 3 columns, a name, and an index
    new_name = str(uuid4())

    # WHEN inserting new columns
    column_names = list(map(lambda x: x.name, simple_dataset))
    simple_dataset.insert_column(index, new_name)

    # THEN the column names after are what they should be
    column_names_after = list(map(lambda x: x.name, simple_dataset))
    column_names.insert(index, new_name)
    assert column_names == column_names_after


@pytest.mark.parametrize(
    ("index",),
    [
        (0,),
        (1,),
        (2,),
    ],
)
def test_column_deletion(
    simple_dataset: DataSet,
    index: int,
):
    """Test column deletions"""
    # GIVEN a simple dataset with 3 columns and an index

    # WHEN deleting a column
    column_names = list(map(lambda x: x.name, simple_dataset))
    simple_dataset.delete_columns(index, index)

    # THEN the column names after are what they should be
    column_names_after = list(map(lambda x: x.name, simple_dataset))
    del column_names[index]
    assert column_names == column_names_after



def test_summary_excludes_blank_cells(empty_dataset):
    """Blank cells are not counted as values."""
    # GIVEN a decimal column of four rows with two values
    column = empty_dataset.append_column("fred")
    column.change(data_type=DataType.DECIMAL, measure_type=MeasureType.CONTINUOUS)
    empty_dataset.set_row_count(4)
    column.set_value(0, 1.5)
    column.set_value(2, 2.5)

    # WHEN the column is summarised
    summary = column.summary

    # THEN only the two values are counted
    assert summary["n"] == 2


def test_summary_excludes_user_missing_values(empty_dataset):
    """Values defined as missing are not counted as values."""
    # GIVEN an integer column where -99 is defined as missing
    column = empty_dataset.append_column("fred")
    column.change(data_type=DataType.INTEGER, measure_type=MeasureType.CONTINUOUS)
    empty_dataset.set_row_count(3)
    for index, value in enumerate([1, -99, 3]):
        column.set_value(index, value)
    column.set_missing_values(["== -99"])

    # WHEN the column is summarised
    summary = column.summary

    # THEN -99 is not counted
    assert summary["n"] == 2


def test_summary_bins_few_integers_individually(empty_dataset):
    """A continuous integer column with few distinct values gets a bin per value."""
    # GIVEN an integer column holding 1, 1, 3 and a blank
    column = empty_dataset.append_column("fred")
    column.change(data_type=DataType.INTEGER, measure_type=MeasureType.CONTINUOUS)
    empty_dataset.set_row_count(4)
    for index, value in enumerate([1, 1, 3]):
        column.set_value(index, value)

    # WHEN the column is summarised
    summary = column.summary

    # THEN there is a bin for each of 1, 2 and 3
    assert summary["counts"] == [2, 0, 1]


def test_summary_bins_decimals_into_twenty(empty_dataset):
    """A continuous decimal column is binned into twenty bins."""
    # GIVEN a decimal column from 0 to 1
    column = empty_dataset.append_column("fred")
    column.change(data_type=DataType.DECIMAL, measure_type=MeasureType.CONTINUOUS)
    empty_dataset.set_row_count(3)
    for index, value in enumerate([0.0, 0.5, 1.0]):
        column.set_value(index, value)

    # WHEN the column is summarised
    counts = column.summary["counts"]

    # THEN the minimum, middle and maximum land in the first, middle and last bins
    assert (len(counts), counts[0], counts[10], counts[19]) == (20, 1, 1, 1)


def test_summary_counts_text_ids(empty_dataset):
    """Text IDs are counted, leaving out blanks."""
    # GIVEN a text ID column holding a, b, a and a blank
    column = empty_dataset.append_column("fred")
    column.change(data_type=DataType.TEXT, measure_type=MeasureType.ID)
    empty_dataset.set_row_count(4)
    for index, value in enumerate(["a", "b", "a"]):
        column.set_value(index, value)

    # WHEN the column is summarised
    summary = column.summary

    # THEN the three values are counted
    assert summary["n"] == 3

