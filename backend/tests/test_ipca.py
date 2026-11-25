"""IPCA official SIDRA parser checks. No external requests in CI."""
import pytest
from app.ipca import parse_sidra_ipca

def samples(*months):
    rows=[{"D1C":"Brasil","V":"Valor","D3C":"Mês (Código)"}]
    for period,index in months:
        rows.append({"D1C":"1","D2C":"2266","D3C":period,"V":str(index)})
    return rows

def test_parses_index_series_and_months():
    r=parse_sidra_ipca(samples(("199406","100.00"),("199407","105.50"),("199408","107.20")))
    assert r==[
        {"month":"1994-06","index":100},
        {"month":"1994-07","index":105.5},
        {"month":"1994-08","index":107.2}
    ]

def test_rejects_missing_official_month_and_duplicate_conflicts():
    with pytest.raises(ValueError,match="incompleta"):
        parse_sidra_ipca(samples(("199406","100"),("199408","106")))
    with pytest.raises(ValueError,match="conflitantes"):
        parse_sidra_ipca(samples(("199406","100"),("199406","200")))

def test_rejects_invalid_indices_and_missing_plan_real_anchor():
    with pytest.raises(ValueError,match="inválido"):
        parse_sidra_ipca(samples(("199406","-5")))
    with pytest.raises(ValueError,match="indisponível"):
        parse_sidra_ipca(samples(("199406","foo")))
    with pytest.raises(ValueError,match="Plano Real"):
        parse_sidra_ipca(samples(("199407","105")))

def test_ignores_pre_real_data_and_sidra_header():
    r=parse_sidra_ipca(samples(("199305","3"),("199406","100"),("199407","104")))
    assert len(r)==2
    assert r[0]["month"]=="1994-06"
