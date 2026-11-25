"""Série oficial de números-índice IPCA do IBGE/SIDRA (tabela 1737, variável 2266).

Não se simula uma taxa histórica: todos os valores são consultados diretamente do IBGE.
Os meses anteriores ao Plano Real não estão habilitados na calculadora pública.
"""
from __future__ import annotations

import asyncio
import re
import time
from datetime import datetime, timezone
from decimal import Decimal, InvalidOperation

import httpx
from fastapi import APIRouter, HTTPException, Response

router = APIRouter(prefix="/api/ipca", tags=["ipca"])
SIDRA_SOURCE = "https://apisidra.ibge.gov.br/values/t/1737/n1/all/v/2266/p/all"
SIDRA_DOC = "https://sidra.ibge.gov.br/tabela/1737"
CACHE_SECONDS = 6 * 60 * 60
_cache: dict | None = None
_cache_at = 0.0
_lock = asyncio.Lock()
_MONTH = re.compile(r"^(19\d{2}|20\d{2})(0[1-9]|1[0-2])$")


def parse_sidra_ipca(rows: object) -> list[dict]:
    """Validate official SIDRA schema and reject gaps rather than invent rates."""
    if not isinstance(rows, list):
        raise ValueError("Resposta inválida do IBGE.")
    monthly: dict[str, Decimal] = {}
    year_limit = datetime.now(timezone.utc).year
    for row in rows:
        if not isinstance(row, dict):
            continue
        period = next((
            value for key, value in row.items()
            if re.fullmatch(r"D\d+C", str(key)) and isinstance(value, str)
            and _MONTH.fullmatch(value) and 1994 <= int(value[:4]) <= year_limit
        ), None)
        if not period or period < "199406":
            continue
        value = row.get("V")
        try:
            index = Decimal(str(value).replace(",", "."))
        except (InvalidOperation, ValueError, TypeError):
            raise ValueError("Número-índice do IBGE indisponível.")
        if not index.is_finite() or index <= 0:
            raise ValueError("Número-índice do IBGE inválido.")
        if period in monthly and monthly[period] != index:
            raise ValueError("Valores conflitantes para um mês do IBGE.")
        monthly[period] = index
    if not monthly or "199406" not in monthly:
        raise ValueError("Série do Plano Real indisponível.")
    ordered = sorted(monthly)
    for a, b in zip(ordered, ordered[1:]):
        year, month = divmod(int(a), 100)
        next_period = f"{year + (month == 12):04d}{month % 12 + 1:02d}"
        if b != next_period:
            raise ValueError(f"Série oficial incompleta após {a[:4]}/{a[4:]}.")
    return [{"month": f"{m[:4]}-{m[4:]}", "index": float(monthly[m])} for m in ordered]


async def read_ipca() -> dict:
    global _cache, _cache_at
    if _cache is not None and time.monotonic() - _cache_at < CACHE_SECONDS:
        return _cache
    async with _lock:
        if _cache is not None and time.monotonic() - _cache_at < CACHE_SECONDS:
            return _cache
        try:
            async with httpx.AsyncClient(timeout=20.0, follow_redirects=False) as client:
                result = await client.get(SIDRA_SOURCE, headers={"Accept": "application/json"})
                result.raise_for_status()
                payload = result.json()
            months = parse_sidra_ipca(payload)
        except (httpx.HTTPError, ValueError, TypeError) as exc:
            if _cache is not None:
                return {**_cache, "stale": True}
            raise HTTPException(503, detail="Os dados oficiais do IPCA estão temporariamente indisponíveis.") from exc
        data = {
            "source": "IBGE / SIDRA",
            "sourceUrl": SIDRA_DOC,
            "method": "Número-índice do mês final dividido pelo número-índice do mês anterior ao inicial",
            "referenceMonth": months[-1]["month"],
            "months": months,
            "stale": False,
        }
        _cache, _cache_at = data, time.monotonic()
        return data


@router.get("/series")
async def ipca_series(response: Response):
    data = await read_ipca()
    response.headers["Cache-Control"] = "public, max-age=1800, stale-while-revalidate=1800"
    return data
