"""One process/worker only. No credentials on command line or in exception logs."""
import os
import sys

import uvicorn
from pydantic import ValidationError


def main():
    try:
        port = int(os.environ.get("PORT", "10000"))
        if not 1024 <= port <= 65535:
            raise ValueError("Invalid port")
        from backend.app.call_signaling import app
    except (ValidationError, ValueError):
        print("Call configuration refused. Check host, origins and secrets in the provider dashboard.", file=sys.stderr)
        return 1
    uvicorn.run(app, host="0.0.0.0", port=port, workers=1, proxy_headers=False,
                ws_max_size=32768, ws_max_queue=16, access_log=False, log_level="warning")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
