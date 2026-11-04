"""Optional Cloudflare credential exchange. Never called unless explicitly configured.

This adapter does NOT provide a billing cap. Do not activate metered TURN until
the account's hard cost containment is verified. No media flows through here.
"""
import re
import json

import httpx


class TurnUnavailable(Exception):
    pass


class CloudflareTurn:
    def __init__(self, key_id, token, *, transport=None):
        self.key_id, self.token, self.transport = key_id, token, transport

    async def credentials(self, ttl):
        url = f"https://rtc.live.cloudflare.com/v1/turn/keys/{self.key_id}/credentials/generate-ice-servers"
        try:
            async with httpx.AsyncClient(timeout=5, follow_redirects=False, trust_env=False, transport=self.transport) as client:
                async with client.stream("POST", url, headers={"Authorization": "Bearer " + self.token.get_secret_value()}, json={"ttl": ttl}) as response:
                    if response.status_code != 201:
                        raise ValueError("Upstream refused")
                    body = bytearray()
                    async for chunk in response.aiter_bytes():
                        body.extend(chunk)
                        if len(body) > 32768:
                            raise ValueError("Oversized response")
            data = json.loads(body)
            result = []
            entries = data["iceServers"]
            if not isinstance(entries, list) or not 1 <= len(entries) <= 8:
                raise ValueError("Invalid ICE servers")
            for entry in entries:
                urls = entry["urls"]
                if isinstance(urls, str):
                    urls = [urls]
                if not isinstance(urls, list) or not 1 <= len(urls) <= 8:
                    raise ValueError("Invalid ICE URLs")
                for value in urls:
                    if not isinstance(value, str) or not re.fullmatch(r"(?:stun:stun|turns?:turn)\.cloudflare\.com:(?:3478|443|5349|80)(?:\?transport=(?:udp|tcp))?", value):
                        raise ValueError("Unexpected ICE destination")
                clean = {"urls": urls}
                if any(u.startswith(("turn:", "turns:")) for u in urls):
                    for name in ("username", "credential"):
                        value = entry[name]
                        if (not isinstance(value, str) or not 1 <= len(value) <= 2048 or
                                any(ord(c) < 32 for c in value) or self.token.get_secret_value() in value):
                            raise ValueError("Invalid temporary credential")
                        clean[name] = value
                result.append(clean)
            if not any(any(u.startswith(("turn:", "turns:")) for u in s["urls"]) for s in result):
                raise ValueError("Missing relay")
            return result
        except (httpx.HTTPError, ValueError, KeyError, TypeError):
            raise TurnUnavailable("TURN credential provider unavailable") from None
