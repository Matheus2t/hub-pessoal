"""Password hashing and short-lived, room-scoped WebSocket reentry proofs."""
import hashlib
import hmac
from asyncio import to_thread

from argon2 import PasswordHasher
from argon2.exceptions import VerificationError

PROOF_SECONDS = 900
REFRESH_SECONDS = 300
HASHER = PasswordHasher(time_cost=2, memory_cost=19 * 1024, parallelism=1)


async def hash_password(password: str) -> str:
    return await to_thread(HASHER.hash, password)


async def valid_password(encoded: str, password: str) -> bool:
    try:
        return await to_thread(HASHER.verify, encoded, password)
    except (VerificationError, ValueError):
        return False


def issue_proof(key: str, room: str, device: str, password_hash: str, expires: int) -> str:
    message = f"2t-call-reentry-v1\0{room}\0{device}\0{password_hash}\0{expires}".encode()
    signature = hmac.new(key.encode(), message, hashlib.sha256).hexdigest()
    return f"{expires}.{signature}"


def valid_proof(key: str, room: str, device: str, password_hash: str, proof: str, now: float) -> bool:
    expires = int(proof.split(".", 1)[0])  # The WebSocket schema validates the wire format.
    return now < expires <= now + PROOF_SECONDS and hmac.compare_digest(
        proof, issue_proof(key, room, device, password_hash, expires)
    )
