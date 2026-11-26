#!/usr/bin/env bash
set -euo pipefail
admin="11111111-2222-4333-8444-555555555555"
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -qAt -c "select public.mind_drive_reserve_upload('$admin','eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee','10000000-0000-4000-8000-000000000005','race-a.mp4',3000000000,now(),'[]'::jsonb,5000000000)" >/tmp/mind-drive-a.log 2>&1 &
pid_a=$!
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -qAt -c "select public.mind_drive_reserve_upload('$admin','ffffffffffffffffffffffffffffffff','10000000-0000-4000-8000-000000000006','race-b.mp4',3000000000,now(),'[]'::jsonb,5000000000)" >/tmp/mind-drive-b.log 2>&1 &
pid_b=$!
set +e
wait "$pid_a"; status_a=$?
wait "$pid_b"; status_b=$?
set -e
if [[ $status_a -eq $status_b ]]; then
  cat /tmp/mind-drive-a.log /tmp/mind-drive-b.log
  echo "Expected exactly one concurrent 3 GB reservation to succeed" >&2
  exit 1
fi
if [[ $status_a -ne 0 ]] && ! grep -q 'managed cap exceeded' /tmp/mind-drive-a.log; then cat /tmp/mind-drive-a.log; exit 1; fi
if [[ $status_b -ne 0 ]] && ! grep -q 'managed cap exceeded' /tmp/mind-drive-b.log; then cat /tmp/mind-drive-b.log; exit 1; fi
result=$(psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -qAt -c "select count(*)||':'||sum(expected_size) from private.mind_drive_uploads where status in ('reserved','creating','uploading')")
[[ "$result" == "1:3000000000" ]] || { echo "Unexpected concurrent ledger state: $result" >&2; exit 1; }