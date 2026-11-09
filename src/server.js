'use strict';

require('dotenv').config();
const app = require('./app');
const { sequelize } = require('../models');

const port = Number(process.env.PORT || 3000);

async function start() {
  await sequelize.authenticate();
  const server = app.listen(port, () => {
    console.log(`API de inventario disponible en http://localhost:${port}/api`);
  });
  const shutdown = async () => {
    server.close(async error => {
      if (error) {
        console.error(error);
        process.exitCode = 1;
      }
      await sequelize.close();
    });
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

start().catch(error => {
  console.error('No fue posible iniciar la API:', error);
  process.exitCode = 1;
});
