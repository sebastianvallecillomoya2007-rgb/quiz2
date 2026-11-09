'use strict';

const express = require('express');
const path = require('path');
const routes = require('./routes');
const { AppError } = require('./utils/errors');

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.resolve(__dirname, '..', 'public')));
app.get('/guia', (request, response) => {
  response.sendFile(path.resolve(__dirname, '..', 'README.md'));
});
app.use('/api', routes);
app.use((request, response, next) => next(new AppError(404, 'Ruta no encontrada.')));
app.use((error, request, response, next) => {
  if (response.headersSent) return next(error);
  const knownStatuses = {
    SequelizeValidationError: 422,
    SequelizeUniqueConstraintError: 409,
    SequelizeForeignKeyConstraintError: 409
  };
  const status = Number.isInteger(error.status) ? error.status : knownStatuses[error.name] || 500;
  if (status >= 500) console.error(error);
  response.status(status).json({
    error: status === 500 ? 'Error interno del servidor.' : error.message,
    ...(error.errors ? { details: error.errors.map(item => item.message) } : {})
  });
});

module.exports = app;
