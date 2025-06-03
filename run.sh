#!/bin/sh
set -e

echo "Starting Docker Compose services..."
docker-compose up -d

echo "Installing dependencies and starting Node.js app..."
npm install
node app.js &
NODE_PID=$!

# Wait for Kafka Connect to be ready
until curl -s http://localhost:8083/; do
  echo "Waiting for Kafka Connect to be ready..."
  sleep 5
done

echo "Registering Redis Streams source connector..."
sh register-redis-connector.sh

echo "All services started. Node.js app running with PID $NODE_PID."
wait $NODE_PID
