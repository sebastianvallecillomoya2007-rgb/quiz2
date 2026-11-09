'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { calculateStockPolicy } = require('../src/services/inventory');
const { approvalRuleForAmount, createPurchaseOrder, findDuplicatePairs } = require('../src/services/procurement');
const db = require('../models');

test('calcula stock de seguridad y punto de reorden', () => {
  assert.deepEqual(calculateStockPolicy({
    avgDailyDemand: 40,
    maxDailyDemand: 55,
    leadTimeDays: 3
  }), { safetyStock: 45, reorderPoint: 165 });
});

test('rechaza parámetros negativos para la política de inventario', () => {
  assert.throws(
    () => calculateStockPolicy({ avgDailyDemand: -1, maxDailyDemand: 2, leadTimeDays: 3 }),
    /valores no negativos/
  );
});

test('detecta órdenes del mismo proveedor, material, cantidad similar y ventana', () => {
  const duplicates = findDuplicatePairs([
    {
      id: 1, number: 'OC-1041', supplierId: 1, orderDate: '2026-10-02',
      lines: [{ materialId: 1, quantity: 200 }]
    },
    {
      id: 2, number: 'OC-1042', supplierId: 1, orderDate: '2026-10-02',
      lines: [{ materialId: 1, quantity: 200 }]
    },
    {
      id: 3, number: 'OC-1043', supplierId: 2, orderDate: '2026-10-02',
      lines: [{ materialId: 1, quantity: 200 }]
    }
  ], { windowDays: 3, quantityTolerance: 0.1 });

  assert.equal(duplicates.length, 1);
  assert.equal(duplicates[0].firstOrder, 'OC-1041');
  assert.equal(duplicates[0].secondOrder, 'OC-1042');
});

test('selecciona la regla de aprobación aplicable al monto', () => {
  const rules = [
    { minAmount: 0, maxAmount: 250000, id: 1 },
    { minAmount: 250000.01, maxAmount: 2000000, id: 2 },
    { minAmount: 2000000.01, maxAmount: 10000000, id: 3 },
    { minAmount: 10000000.01, maxAmount: null, id: 4 }
  ];
  assert.equal(approvalRuleForAmount(rules, 250000).id, 1);
  assert.equal(approvalRuleForAmount(rules, 1290000).id, 2);
  assert.equal(approvalRuleForAmount(rules, 15000000).id, 4);
});

test('rechaza órdenes en moneda distinta de CRC antes de tocar la base de datos', async () => {
  await assert.rejects(
    () => createPurchaseOrder({ currency: 'USD', lines: [{}], quoteCount: 0 }),
    /órdenes deben usar CRC/
  );
});

test('registra al menos veinte entidades Sequelize', () => {
  const entities = Object.keys(db).filter(key => key !== 'sequelize' && key !== 'Sequelize');
  assert.ok(entities.length >= 20, `Se registraron ${entities.length} entidades.`);
});

test('define el esquema de base de datos con todas las entidades', async () => {
  const migration = require('../migrations/20261109000000-create-inventory-schema');
  const tables = [];
  const queryInterface = {
    createTable: async (name) => tables.push(name),
    addConstraint: async () => {},
    addIndex: async () => {}
  };
  await migration.up(queryInterface);
  assert.ok(tables.length >= 20);
  assert.ok(tables.includes('stock_movements'));
  assert.ok(tables.includes('purchase_orders'));
  assert.ok(tables.includes('inventory_alerts'));
  const modelTables = Object.keys(db)
    .filter(key => key !== 'sequelize' && key !== 'Sequelize')
    .map(key => db[key].tableName)
    .sort();
  assert.deepEqual(tables.sort(), modelTables);
});

test('carga datos semilla de órdenes, stock y materiales de la práctica', async () => {
  const seeder = require('../seeders/20261109000000-demo-construction-inventory');
  const inserts = new Map();
  const transaction = { commit: async () => {}, rollback: async () => {} };
  await seeder.up({
    sequelize: { transaction: async () => transaction },
    bulkInsert: async (table, rows) => inserts.set(table, rows)
  });
  assert.equal(inserts.get('materials').length, 6);
  assert.equal(inserts.get('purchase_orders').length, 7);
  assert.equal(inserts.get('stock_movements').length, 6);
  assert.equal(inserts.get('purchase_orders')[0].number, 'OC-1041');
  assert.equal(inserts.get('purchase_orders')[1].number, 'OC-1042');
});
