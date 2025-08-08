const express = require('express');
const handler = require('./api/merge').default; // import the exported default handler

const app = express();

// health check
app.get('/', (req, res) => res.send('HeadCast API is up ✅'));

// forward POSTs to our Next-style handler that uses formidable internally
app.post('/api/merge', (req, res) => handler(req, res));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Listening on ${PORT}`));

