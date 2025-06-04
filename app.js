const express = require('express');
const redis = require('redis');
const path = require('path');

const app = express();
const port = 3000;

// Ensure the Redis client is properly initialized and connected
const client = redis.createClient({
  url: 'redis://localhost:6379',
});

(async () => {
  try {
    await client.connect();
    console.log('Connected to Redis');
  } catch (err) {
    console.error('Error connecting to Redis:', err);
  }
})();

// Ensure the client is not closed prematurely
process.on('SIGINT', async () => {
  console.log('Closing Redis client...');
  await client.quit();
  process.exit(0);
});

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));


// Route to handle form submission
app.post('/set-key', async (req, res) => {
  const { key, value, reference } = req.body;
  // Divide keys into a fixed number of buckets to avoid creating too many unique streams/keys
  const NUM_BUCKETS = 4; // You can adjust this number as needed
  const bucket = Math.abs(hashCode(key)) % NUM_BUCKETS;
  const hashTag = `{${bucket}}`;
  const redisKey = `balance:${hashTag}:${key}`;
  const dedupKey = `dedup-keys:${hashTag}`;
  const streamKey = `balance-events:${hashTag}`;
  let retryCount = 0;
  const maxRetries = 3;
  let success = false;

  while (retryCount < maxRetries && !success) {
    try {
      // Watch the dedup-keys set and the balance key for changes
      await client.watch(dedupKey, redisKey);

      // Check if the reference already exists in the deduplication set
      const isDuplicate = await client.sIsMember(dedupKey, reference);
      if (isDuplicate) {
        await client.unwatch(); // Unwatch if duplicate detected
        return res.status(400).send('Duplicate reference detected');
      }

      // Fetch the existing JSON object or initialize it
      const existingData = await client.json.get(redisKey, '.');
      const currentBalance = existingData?.balance || 0;

      // Increment the balance
      const newBalance = currentBalance + parseInt(value, 10);

      // Get the current epoch time
      const updatedOn = Math.floor(Date.now() / 1000);

      // Use a transaction to update the balance and add the reference atomically
      const multi = client.multi();
      multi.json.set(redisKey, '.', { balance: newBalance, updatedOn });
      multi.sAdd(dedupKey, reference);
      multi.xAdd(streamKey, '*', {
        reference,
        balance: newBalance.toString(),
        updatedOn: updatedOn.toString()
      });

      // Execute the transaction
      const results = await multi.exec();
      console.log('Transaction results:', results);
      if (results !== null) {
        success = true;
        return res.send(`Balance for ${key} updated to ${newBalance}`);
      }
      retryCount++;
      console.log(`Transaction failed. Retrying ${retryCount}/${maxRetries}...`);
    } catch (err) {
      console.error('Error updating balance in Redis:', err);
      return res.status(500).send('Error updating balance in Redis');
    }
  }
  if (!success) {
    return res.status(409).send('Transaction failed after maximum retries');
  }
});

// Simple hash function for bucketing
function hashCode(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0; // Convert to 32bit integer
  }
  return hash;
}

// Start the server
app.listen(port, () => {
  console.log(`App listening at http://localhost:${port}`);
});

