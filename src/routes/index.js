'use strict';

const express = require('express');
const {
  Material, Category, Unit, Warehouse, StockMovement, InventoryAlert,
  PurchaseOrder, PurchaseOrderLine, Supplier, User, Project, ApprovalRule,
  PurchaseApproval, AuditLog
} = require('../../models');
const { AppError } = require('../utils/errors');
const {
  calculateStockPolicy,
  getStockAtWarehouse,
  getStockByWarehouse,
  recordMovement
} = require('../services/inventory');
const {
  createPurchaseOrder,
  decidePurchaseOrder,
  listPossibleDuplicates
} = require('../services/procurement');

const router = express.Router();

router.get('/health', (request, response) => response.json({ status: 'ok', service: 'inventario-constructora' }));

router.get('/warehouses', async (request, response) => {
  response.json(await Warehouse.findAll({ where: { active: true }, order: [['name', 'ASC']] }));
});

router.get('/users', async (request, response) => {
  response.json(await User.findAll({ where: { active: true }, attributes: ['id', 'name', 'email', 'role'], order: [['name', 'ASC']] }));
});

router.get('/suppliers', async (request, response) => {
  response.json(await Supplier.findAll({ where: { active: true }, order: [['name', 'ASC']] }));
});

router.get('/projects', async (request, response) => {
  response.json(await Project.findAll({ where: { status: 'ACTIVE' }, order: [['name', 'ASC']] }));
});

router.get('/categories', async (request, response) => {
  response.json(await Category.findAll({ order: [['name', 'ASC']] }));
});

router.get('/materials', async (request, response) => {
  const materials = await Material.findAll({
    where: { active: true },
    include: [{ model: Category, as: 'category' }, { model: Unit, as: 'unit' }],
    order: [['name', 'ASC']]
  });
  response.json(materials);
});

router.get('/materials/:id/stock', async (request, response) => {
  const material = await Material.findByPk(request.params.id, {
    include: [{ model: Category, as: 'category' }, { model: Unit, as: 'unit' }]
  });
  if (!material) throw new AppError(404, 'No se encontró el material.');
  const stocks = await getStockByWarehouse(material.id);
  const policy = calculateStockPolicy(material);
  const filtered = request.query.warehouseId
    ? stocks.filter(item => Number(item.warehouse.id) === Number(request.query.warehouseId))
    : stocks;
  if (request.query.warehouseId && filtered.length === 0) throw new AppError(404, 'No se encontró la bodega.');
  response.json({
    material,
    policy,
    warehouses: filtered.map(item => ({
      id: item.warehouse.id,
      code: item.warehouse.code,
      name: item.warehouse.name,
      stockOnHand: item.stock,
      status: item.stock < policy.reorderPoint ? 'REORDER' : 'OK'
    }))
  });
});

router.get('/materials/:id/traceability', async (request, response) => {
  const material = await Material.findByPk(request.params.id, {
    include: [{ model: Category, as: 'category' }, { model: Unit, as: 'unit' }]
  });
  if (!material) throw new AppError(404, 'No se encontró el material.');
  const movements = await StockMovement.findAll({
    where: { materialId: material.id },
    include: [
      { model: Warehouse, as: 'sourceWarehouse' },
      { model: Warehouse, as: 'destinationWarehouse' },
      { model: User, as: 'performedBy' }
    ],
    order: [['movedAt', 'DESC'], ['id', 'DESC']]
  });
  response.json({ material, movements });
});

router.post('/movements', async (request, response) => {
  const required = ['materialId', 'movementType', 'quantity', 'performedByUserId', 'originType', 'originDocument'];
  if (required.some(key => request.body[key] === undefined || request.body[key] === null || request.body[key] === '')) {
    throw new AppError(422, `Campos requeridos: ${required.join(', ')}.`);
  }
  const result = await recordMovement(request.body);
  response.status(201).json(result);
});

router.get('/alerts/reorder', async (request, response) => {
  const [materials, warehouses] = await Promise.all([
    Material.findAll({ where: { active: true }, include: [{ model: Unit, as: 'unit' }] }),
    Warehouse.findAll({ where: { active: true } })
  ]);
  const alerts = [];
  for (const material of materials) {
    const policy = calculateStockPolicy(material);
    const recordedMovements = await StockMovement.findAll({
      where: { materialId: material.id },
      attributes: ['sourceWarehouseId', 'destinationWarehouseId'],
      raw: true
    });
    const stockedWarehouseIds = new Set(recordedMovements.flatMap(movement =>
      [movement.sourceWarehouseId, movement.destinationWarehouseId]
        .filter(Boolean)
        .map(id => Number(id))
    ));
    for (const warehouse of warehouses) {
      if (!stockedWarehouseIds.has(Number(warehouse.id))) {
        const staleAlert = await InventoryAlert.findOne({
          where: { materialId: material.id, warehouseId: warehouse.id, alertType: 'REORDER', status: 'OPEN' }
        });
        if (staleAlert) {
          await staleAlert.update({ status: 'RESOLVED', resolvedAt: new Date(), stockOnHand: 0 });
        }
        continue;
      }
      const stock = await getStockAtWarehouse(material.id, warehouse.id);
      const where = { materialId: material.id, warehouseId: warehouse.id, alertType: 'REORDER', status: 'OPEN' };
      if (stock < policy.reorderPoint) {
        const [alert, created] = await InventoryAlert.findOrCreate({
          where,
          defaults: { ...where, stockOnHand: stock, reorderPoint: policy.reorderPoint }
        });
        if (!created) await alert.update({ stockOnHand: stock, reorderPoint: policy.reorderPoint });
        alerts.push({ ...alert.toJSON(), material: material.toJSON(), warehouse: warehouse.toJSON() });
      } else {
        const alert = await InventoryAlert.findOne({ where });
        if (alert) await alert.update({ status: 'RESOLVED', resolvedAt: new Date(), stockOnHand: stock });
      }
    }
  }
  response.json({ count: alerts.length, alerts });
});

router.get('/orders/possible-duplicates', async (request, response) => {
  const days = request.query.days === undefined ? undefined : Number(request.query.days);
  const tolerance = request.query.tolerance === undefined ? undefined : Number(request.query.tolerance);
  const duplicates = await listPossibleDuplicates({ windowDays: days, quantityTolerance: tolerance });
  response.json({
    count: duplicates.length,
    rule: 'Mismo proveedor, mismo material, cantidad con diferencia relativa dentro de la tolerancia y fecha dentro de la ventana configurada.',
    duplicates
  });
});

router.get('/purchase-orders', async (request, response) => {
  const orders = await PurchaseOrder.findAll({
    include: [
      { model: Supplier, as: 'supplier' },
      { model: Project, as: 'project' },
      { model: PurchaseOrderLine, as: 'lines', include: [{ model: Material, as: 'material' }] },
      { model: ApprovalRule, as: 'approvalRule' },
      { model: PurchaseApproval, as: 'approvals', include: [{ model: User, as: 'approver', attributes: ['id', 'name', 'role'] }] }
    ],
    order: [['orderDate', 'DESC']]
  });
  response.json(orders);
});

router.post('/purchase-orders', async (request, response) => {
  const result = await createPurchaseOrder(request.body);
  response.status(201).json(result);
});

router.post('/purchase-orders/:id/approvals', async (request, response) => {
  if (!request.body.approverUserId) throw new AppError(422, 'approverUserId es obligatorio.');
  const order = await decidePurchaseOrder(request.params.id, request.body);
  response.json(order);
});

router.get('/audit-logs', async (request, response) => {
  const limit = Number(request.query.limit || 100);
  if (!Number.isInteger(limit) || limit < 1 || limit > 500) throw new AppError(422, 'limit debe ser un entero entre 1 y 500.');
  response.json(await AuditLog.findAll({ order: [['createdAt', 'DESC']], limit }));
});

module.exports = router;
