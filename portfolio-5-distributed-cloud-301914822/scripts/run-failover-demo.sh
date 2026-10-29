#!/usr/bin/env bash

set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
portfolio_dir="$(cd "${script_dir}/.." && pwd)"
compose_file="${portfolio_dir}/docker-compose.yml"
compose=(docker compose -f "${compose_file}")
services=(mongo1 mongo2 mongo3)
replica_uri="mongodb://mongo1:27017,mongo2:27017,mongo3:27017/?replicaSet=nubian-rs&serverSelectionTimeoutMS=10000&connectTimeoutMS=2000&socketTimeoutMS=15000"
local_uri="mongodb://localhost:27017/?directConnection=true&serverSelectionTimeoutMS=2000&connectTimeoutMS=2000&socketTimeoutMS=3000"
stopped_service=""

restore_stopped_member() {
  if [[ -n "${stopped_service}" ]]; then
    echo "Restoring ${stopped_service} after an interrupted demonstration."
    "${compose[@]}" start "${stopped_service}" >/dev/null || true
  fi
}

trap restore_stopped_member EXIT

read_current_primary() {
  local control_service="$1"
  local observed_primary

  observed_primary="$(
    "${compose[@]}" exec -T "${control_service}" \
      mongosh --quiet "${local_uri}" --eval '
        const primary = rs.status().members.find(
          (member) => member.health === 1 && member.stateStr === "PRIMARY"
        );
        if (!primary) quit(2);
        print(primary.name.split(":")[0]);
      ' 2>/dev/null || true
  )"

  printf '%s\n' "${observed_primary}" | tail -n 1 | tr -d '\r'
}

confirm_writable_primary() {
  local service="$1"
  local confirmed_primary

  confirmed_primary="$(
    "${compose[@]}" exec -T "${service}" \
      mongosh --quiet "${local_uri}" --eval '
        const hello = db.getSiblingDB("admin").runCommand({ hello: 1 });
        if (hello.isWritablePrimary !== true) quit(2);
        print((hello.me ?? hello.primary).split(":")[0]);
      ' 2>/dev/null || true
  )"

  printf '%s\n' "${confirmed_primary}" | tail -n 1 | tr -d '\r'
}

echo "Portfolio 5 failover demonstration"

"${compose[@]}" exec -T mongo1 \
  mongosh --quiet \
  --file /portfolio5/mongodb/validate-topology.js

"${compose[@]}" exec -T mongo1 \
  mongosh --quiet "${replica_uri}" \
  --file /portfolio5/mongodb/seed-majority-write.js

"${compose[@]}" exec -T mongo1 \
  mongosh --quiet \
  --file /portfolio5/mongodb/validate-replication.js

initial_primary="$(read_current_primary mongo1)"
case "${initial_primary}" in
  mongo1|mongo2|mongo3) ;;
  *)
    echo "Could not identify the initial primary: ${initial_primary}" >&2
    exit 1
    ;;
esac

control_service=""
for service in "${services[@]}"; do
  if [[ "${service}" != "${initial_primary}" ]]; then
    control_service="${service}"
    break
  fi
done

if [[ -z "${control_service}" ]]; then
  echo "Could not choose a running control service." >&2
  exit 1
fi

echo "Initial primary: ${initial_primary}"
confirmed_primary="$(confirm_writable_primary "${initial_primary}")"
if [[ "${confirmed_primary}" != "${initial_primary}" ]]; then
  echo "Primary changed before the failure step; rerun the demonstration." >&2
  exit 1
fi
echo "PASS primary rechecked immediately before stop: ${confirmed_primary}"
echo "Stopping current primary without deleting its volume: ${initial_primary}"
stopped_service="${initial_primary}"
"${compose[@]}" stop "${stopped_service}"

election_deadline=$((SECONDS + 60))
new_primary=""
while (( SECONDS < election_deadline )); do
  candidate="$(read_current_primary "${control_service}")"
  case "${candidate}" in
    mongo1|mongo2|mongo3)
      if [[ "${candidate}" != "${initial_primary}" ]]; then
        new_primary="${candidate}"
      fi
      ;;
  esac

  if [[ -n "${new_primary}" ]]; then
    break
  fi

  sleep 1
done

if [[ -z "${new_primary}" ]]; then
  echo "No replacement primary was elected within 60 seconds." >&2
  exit 1
fi

echo "PASS replacement primary elected: ${new_primary}"

"${compose[@]}" exec -T "${control_service}" \
  mongosh --quiet "${replica_uri}" \
  --file /portfolio5/mongodb/write-after-failover.js

echo "Restarting former primary: ${stopped_service}"
restarted_service="${stopped_service}"
"${compose[@]}" up -d --wait --wait-timeout 60 "${restarted_service}"

"${compose[@]}" exec -T "${control_service}" \
  mongosh --quiet \
  --file /portfolio5/mongodb/validate-after-failover.js

echo "PASS restarted member rejoined with both expected papers: ${restarted_service}"
stopped_service=""
echo "FAILOVER DEMONSTRATION PASSED"
