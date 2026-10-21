'use strict';
const { createApp } = require('./app');
const port = Number(process.env.PORT || 3000);
const { server } = createApp();
server.listen(port, () => console.log(`Mr Garry's History Revision Hub running on http://localhost:${port}`));
