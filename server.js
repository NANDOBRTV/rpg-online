const express = require('express');
const path = require('path');
const app = express();
const port = process.env.PORT || 3000;
app.disable('x-powered-by');
app.use(express.static(path.join(__dirname)));
app.get('/health', (_req, res) => res.json({ ok: true, game: 'Imperio dos Reinos' }));
app.listen(port, '0.0.0.0', () => console.log('Império dos Reinos disponível na porta ' + port));
