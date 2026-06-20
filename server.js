// Web app entry point: serves the React frontend and mounts the API router.
const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const routes = require('./server/routes');
const { setGoogleCloudProject } = require('./server/utils');

setGoogleCloudProject();

const app = express();
app.use(bodyParser.json());

const PORT = process.env.PORT || 3000;

app.use('/ui', express.static(path.join(__dirname, 'build')));

app.use(routes);

app.get('/ui/*', (req, res) => {
    res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

app.get('/', (req, res) => {
    res.status(404).send('Not Found');
});

const server = app.listen(PORT, () => {
    console.log(`BigID Gemini Task Automator backend listening on port ${PORT}`);
    console.log(`OAuth callback URL configured.`);
});

require('./server/socket')(server);
