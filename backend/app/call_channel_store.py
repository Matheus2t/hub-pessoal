"""Durable definition of the single permanent Call channel, never live presence."""
import asyncio
import sqlite3
from pathlib import Path
from typing import Annotated, Protocol

import httpx
from pydantic import BaseModel, ConfigDict, Field

from .call_protocol import Identifier, Name


CHANNEL_SCHEMA = """CREATE TABLE IF NOT EXISTS call_channel (
    singleton INTEGER PRIMARY KEY CHECK (singleton = 1),
    definition TEXT NOT NULL
)"""
SELECT = "SELECT definition FROM call_channel WHERE singleton = 1"
INSERT = "INSERT INTO call_channel VALUES (1, ?) ON CONFLICT DO NOTHING RETURNING definition"
UPDATE = "UPDATE call_channel SET definition = ? WHERE singleton = 1 AND definition = ? RETURNING definition"


class ChannelDefinition(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)
    id: Identifier
    name: Name
    created_at: int
    revision: Annotated[int, Field(ge=1)] = 1
    blocked: dict[Annotated[str, Field(pattern=r"^[0-9a-f]{64}$")], Name] = Field(default_factory=dict, max_length=100)


class ChannelUnavailable(Exception):
    """The database failed. Do not substitute an in-memory channel."""


class ChannelStore(Protocol):
    async def read(self) -> tuple[str, ChannelDefinition] | None: ...
    async def save(self, previous: str | None, channel: ChannelDefinition) -> bool: ...


class SQLChannelStore:
    async def read(self) -> tuple[str, ChannelDefinition] | None:
        try:
            rows = await self.query(SELECT, [])
            if not rows:
                return None
            raw = rows[0]["definition"]
            return raw, ChannelDefinition.model_validate_json(raw)
        except (TypeError, KeyError, ValueError) as error:
            raise ChannelUnavailable from error

    async def save(self, previous: str | None, channel: ChannelDefinition) -> bool:
        definition = channel.model_dump_json()
        return bool(await self.query(INSERT, [definition]) if previous is None else
                    await self.query(UPDATE, [definition, previous]))

    async def query(self, sql: str, params: list[str]) -> list[dict]:
        raise NotImplementedError


class D1ChannelStore(SQLChannelStore):
    def __init__(self, account: str, database: str, token: str):
        self.url = f"https://api.cloudflare.com/client/v4/accounts/{account}/d1/database/{database}/query"
        self._token = token

    async def query(self, sql: str, params: list[str]) -> list[dict]:
        try:
            async with httpx.AsyncClient(timeout=4, trust_env=False) as client:
                response = await client.post(self.url, headers={"Authorization": f"Bearer {self._token}"},
                                             json={"sql": sql, "params": params})
            response.raise_for_status()
            payload = response.json()
            result, = payload["result"]
            if not payload["success"] or not result["success"] or not isinstance(result["results"], list):
                raise ChannelUnavailable
            return result["results"]
        except (httpx.HTTPError, ValueError, TypeError, KeyError) as error:
            raise ChannelUnavailable from error


class SQLiteChannelStore(SQLChannelStore):
    """Local tests only. Production settings can select only external D1."""

    def __init__(self, path: Path):
        self.path = path
        with sqlite3.connect(self.path) as connection:
            connection.execute(CHANNEL_SCHEMA)
        connection.close()

    async def query(self, sql: str, params: list[str]) -> list[dict]:
        def run():
            connection = sqlite3.connect(self.path, timeout=2)
            try:
                with connection:
                    connection.row_factory = sqlite3.Row
                    return [dict(row) for row in connection.execute(sql, params)]
            finally:
                connection.close()

        try:
            return await asyncio.to_thread(run)
        except sqlite3.Error as error:
            raise ChannelUnavailable from error
