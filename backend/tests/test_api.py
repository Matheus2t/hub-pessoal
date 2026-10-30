from decimal import Decimal

import pytest
from fastapi import HTTPException
from sqlalchemy.exc import SQLAlchemyError

from app import main
from app.schemas import CalculationInput


class FakeDatabase:
    def __init__(self, failure=None):
        self.failure = failure
        self.added = []

    def add(self, item):
        self.added.append(item)

    def commit(self):
        if self.failure:
            raise self.failure

    def rollback(self):
        pass


def input_data():
    return CalculationInput(initial_capital=Decimal('1000'), monthly_contribution=Decimal('100'), monthly_rate=Decimal('0'), months=3)


def test_calculation_returns_without_persistence():
    result = main.calculate(input_data(), None)
    assert result['final_amount'] == Decimal('1300.00')


def test_calculation_persists_when_database_is_available():
    db = FakeDatabase()
    result = main.calculate(input_data(), db)
    assert result['final_amount'] == Decimal('1300.00')
    assert len(db.added) == 1


def test_database_failure_is_not_hidden_when_persistence_is_enabled():
    db = FakeDatabase(SQLAlchemyError('database unavailable'))
    with pytest.raises(HTTPException) as error:
        main.calculate(input_data(), db)
    assert error.value.status_code == 503


def test_public_history_is_disabled_without_authentication(monkeypatch):
    monkeypatch.setattr(main.settings, 'public_history_enabled', False)
    with pytest.raises(HTTPException) as error:
        main.history()
    assert error.value.status_code == 404
