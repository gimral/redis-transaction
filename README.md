# Redis Transaction, Kafka, and RedisInsight Environment

This project sets up a full environment with Redis (with RedisJSON), Kafka (KRaft mode), RedisInsight, Kafka UI, and a Node.js app that writes to Redis Streams and Kafka via a source connector.

## Prerequisites
- Docker & Docker Compose
- Node.js (v18+ recommended)

## Services
- **redis**: Redis server with append-only persistence
- **redisinsight**: RedisInsight UI (http://localhost:5540)
- **kafka**: Apache Kafka (KRaft mode, no Zookeeper)
- **kafka-ui**: Kafka UI (http://localhost:8080)
- **redis-kafka-connect**: Kafka Connect with Redis Streams source connector
- **Node.js app**: Express app for interacting with Redis

## Usage

1. **Start everything**

    ```sh
    sh run.sh
    ```
    This will:
    - Start all Docker Compose services
    - Install Node.js dependencies
    - Start the Node.js app
    - Register the Redis Streams source connector

2. **Access UIs**
    - Node App UI: [http://localhost:3000](http://localhost:3000)
    - RedisInsight: [http://localhost:5540](http://localhost:5540)
    - Kafka UI: [http://localhost:8080](http://localhost:8080)

3. **Node.js API**
    - POST `/set-key` with `key`, `value` (integer), and `reference` (string) in the body to update a balance and emit a Redis stream event.

4. **Kafka Connect**
    - The Redis Streams source connector will pull events from the `balance-events` Redis stream and push them to the `redis-balance-events` Kafka topic.

## Development
- Edit `app.js` for Node.js logic
- Edit `docker-compose.yml` to change service configs
- Edit `redis-streams-source-connector.json` for connector config

## Clean up
To stop all services:
```sh
docker-compose down
```

## Notes
- The `.gitignore` file excludes common build, data, and editor files.
- The `plugins/` directory is for Kafka Connect plugins if needed.