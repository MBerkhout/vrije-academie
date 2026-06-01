#!/bin/bash
# Start the Medusa Postgres database container
# Usage: ./start-db.sh

CONTAINER="medusa-postgres"

if docker ps --format '{{.Names}}' | grep -q "^${CONTAINER}$"; then
  echo "✓ $CONTAINER is already running"
else
  if docker ps -a --format '{{.Names}}' | grep -q "^${CONTAINER}$"; then
    echo "Starting existing $CONTAINER container..."
    docker start $CONTAINER
  else
    echo "Creating and starting $CONTAINER container..."
    docker run -d \
      --name $CONTAINER \
      -e POSTGRES_USER=medusa \
      -e POSTGRES_PASSWORD=medusa \
      -e POSTGRES_DB=medusa \
      -p 5432:5432 \
      --restart unless-stopped \
      postgres:15
  fi
  echo "✓ $CONTAINER started"
fi
