#!/bin/sh
set -e
socket_path=$(docker context inspect -f '{{ .Endpoints.docker.Host }}')
echo "{\"host\":\"$socket_path\"}"
