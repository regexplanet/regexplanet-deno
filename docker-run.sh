#!/bin/bash
#
# run server in docker
#

set -o errexit
set -o pipefail
set -o nounset

SCRIPT_HOME="$( cd "$( dirname "$0" )" && pwd )"
APP_NAME=regexplanet-deno

ENVFILE=${1:-.env}

if [ ! -r "${ENVFILE}" ]
then
    echo "ERROR: no .env file '${ENVFILE}'!"
    exit 1
fi

DOCKER_BUILDKIT=1 docker buildx build \
    --build-arg LASTMOD=$(date -u +%Y-%m-%dT%H:%M:%SZ) \
    --build-arg COMMIT=local@$(git rev-parse --short HEAD) \
    --progress=plain \
    --tag "${APP_NAME}" \
    .

echo "INFO: loading env file '${ENVFILE}'"
export $(grep "^[^#]" "${ENVFILE}")

echo "INFO: run docker container '${APP_NAME}' on ${HOSTNAME}:${PORT}"

docker run \
    --env HOSTNAME=${HOSTNAME} \
    --env PORT=${PORT} \
    --name "${APP_NAME}" \
    --publish ${PORT}:${PORT} \
    --rm \
    "${APP_NAME}"
