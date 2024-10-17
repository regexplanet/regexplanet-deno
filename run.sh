#!/usr/bin/env bash
#
# run locally
#

set -o errexit
set -o pipefail
set -o nounset

ENVFILE=${1:-.env}

if [ ! -f "${ENVFILE}" ]
then
    echo "ERROR: no .env file '${ENVFILE}'!"
    exit 1
fi

echo "INFO: loading env file '${ENVFILE}'"
export $(grep "^[^#]" "${ENVFILE}")

deno run \
    --allow-env \
    --allow-net \
    --allow-read \
    --watch \
    src/server.ts
