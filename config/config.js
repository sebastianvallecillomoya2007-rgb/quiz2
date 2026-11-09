'use strict';

require('dotenv').config();

const common = {
  username: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'inventario_constructora',
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT || 3306),
  dialect: process.env.DB_DIALECT || 'mysql',
  logging: false
};

module.exports = {
  development: common,
  test: { ...common, database: process.env.DB_NAME_TEST || 'inventario_constructora_test' },
  production: { ...common, logging: false }
};
