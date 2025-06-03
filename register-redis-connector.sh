#!/bin/sh
# Register the Redis Streams source connector with the redis-kafka-connect service
curl -X POST -H "Content-Type: application/json" --data @redis-streams-source-connector.json http://localhost:8083/connectors
