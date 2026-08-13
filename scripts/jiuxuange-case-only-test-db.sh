#!/usr/bin/env bash

set -euo pipefail

PG_BIN="${JIUXUANGE_TEST_PG_BIN:-/usr/local/opt/postgresql@16/bin}"
PG_DATA="${JIUXUANGE_TEST_PG_DATA:-/tmp/jiuxuange-case-only-postgres-16}"
PG_PORT="${JIUXUANGE_TEST_PG_PORT:-55432}"
PG_DATABASE="${JIUXUANGE_TEST_PG_DATABASE:-jiuxuange_case_only_test}"
PG_LOG="${JIUXUANGE_TEST_PG_LOG:-/tmp/jiuxuange-case-only-postgres-16.log}"

export JIUXUANGE_DATABASE_URL="postgresql://127.0.0.1:${PG_PORT}/${PG_DATABASE}"

require_binary() {
  if [[ ! -x "${PG_BIN}/$1" ]]; then
    echo "PostgreSQL 16 binary is missing: ${PG_BIN}/$1" >&2
    exit 1
  fi
}

server_running() {
  if "${PG_BIN}/pg_ctl" -D "${PG_DATA}" status >/dev/null 2>&1; then
    return 0
  fi

  local active_data_directory
  active_data_directory="$(
    "${PG_BIN}/psql" -h 127.0.0.1 -p "${PG_PORT}" -d postgres \
      -Atqc "show data_directory" 2>/dev/null || true
  )"
  [[ "${active_data_directory}" == "${PG_DATA}" ]]
}

start_server() {
  require_binary initdb
  require_binary pg_ctl
  require_binary createdb
  require_binary psql
  if [[ ! -f "${PG_DATA}/PG_VERSION" ]]; then
    "${PG_BIN}/initdb" -D "${PG_DATA}" -A trust --no-locale --encoding=UTF8 >/dev/null
  fi
  if ! server_running; then
    "${PG_BIN}/pg_ctl" -D "${PG_DATA}" -l "${PG_LOG}" \
      -o "-h 127.0.0.1 -p ${PG_PORT}" start >/dev/null
  fi
  if ! "${PG_BIN}/psql" -h 127.0.0.1 -p "${PG_PORT}" -d postgres \
    -Atqc "select 1 from pg_database where datname='${PG_DATABASE}'" | grep -q 1; then
    "${PG_BIN}/createdb" -h 127.0.0.1 -p "${PG_PORT}" "${PG_DATABASE}"
  fi
  echo "${JIUXUANGE_DATABASE_URL}"
}

reset_database() {
  start_server >/dev/null
  "${PG_BIN}/dropdb" -h 127.0.0.1 -p "${PG_PORT}" --if-exists --force "${PG_DATABASE}"
  "${PG_BIN}/createdb" -h 127.0.0.1 -p "${PG_PORT}" "${PG_DATABASE}"
  JIUXUANGE_DATABASE_URL="${JIUXUANGE_DATABASE_URL}" node_modules/.bin/tsx \
    scripts/jiuxuange-case-only-migrate.ts
  echo "${JIUXUANGE_DATABASE_URL}"
}

stop_server() {
  if [[ -f "${PG_DATA}/PG_VERSION" ]] && server_running; then
    "${PG_BIN}/pg_ctl" -D "${PG_DATA}" -m fast stop >/dev/null
  fi
}

case "${1:-}" in
  start)
    start_server
    ;;
  reset)
    reset_database
    ;;
  stop)
    stop_server
    ;;
  *)
    echo "Usage: $0 {start|reset|stop}" >&2
    exit 2
    ;;
esac
