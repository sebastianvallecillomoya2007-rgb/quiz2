'use strict';

const { Op } = require('sequelize');
const { AppError } = require('../utils/errors');

function calculateStockPolicy(material) {
  const average = Number(material.avgDailyDemand);
  const maximum = Number(material.maxDailyDemand);
  const leadTime = Number(material.leadTimeDays);
  if ([average, maximum, leadTime].some(value => !Number.isFinite(value) || value < 0)) {
    throw new AppError(422, 'La demanda y el plazo de entrega deben ser valores no negativos.');
  }
  const safetyStock = Math.max(0, (maximum - average) * leadTime);
  return {
    safetyStock: Number(safetyStock.toFixed(3)),
    reorderPoint: Number((average * leadTime + safetyStock).toFixed(3))
  };
}

async function getStockAtWarehouse(materialId, warehouseId, transaction) {
  const { StockMovement } = require('../../models');
  const movements = await StockMovement.findAll({
    where: {
      materialId,
      [Op.or]: [{ sourceWarehouseId: warehouseId }, { destinationWarehouseId: warehouseId }]
    },
    transaction
  });
  return Number(movements.reduce((total, movement) => {
    const quantity = Number(movement.quantity);
    if (Number(movement.destinationWarehouseId) === Number(warehouseId)) return total + quantity;
    if (Number(movement.sourceWarehouseId) === Number(warehouseId)) return total - quantity;
    return total;
  }, 0).toFixed(3));
}

async function getStockByWarehouse(materialId, transaction) {
  const { Warehouse, StockMovement } = require('../../models');
  const [warehouses, movements] = await Promise.all([
    Warehouse.findAll({ where: { active: true }, transaction }),
    StockMovement.findAll({
      where: {
        materialId,
        [Op.or]: [{ sourceWarehouseId: { [Op.ne]: null } }, { destinationWarehouseId: { [Op.ne]: null } }]
      },
      transaction
    })
  ]);
  return warehouses.map(warehouse => {
    const warehouseId = Number(warehouse.id);
    const stock = movements.reduce((total, movement) => {
      const quantity = Number(movement.quantity);
      if (Number(movement.destinationWarehouseId) === warehouseId) return total + quantity;
      if (Number(movement.sourceWarehouseId) === warehouseId) return total - quantity;
      return total;
    }, 0);
    return { warehouse, stock: Number(stock.toFixed(3)) };
  });
}

async function recordMovement(input) {
  const { sequelize, Material, User, Warehouse, StockMovement, InventoryAlert, AuditLog } = require('../../models');
  const { movementType, quantity, materialId, sourceWarehouseId, destinationWarehouseId, adjustmentDirection } = input;
  const amount = Number(quantity);
  if (!Number.isFinite(amount) || amount <= 0) throw new AppError(422, 'La cantidad debe ser un número mayor que cero.');
  if (!['ENTRY', 'EXIT', 'TRANSFER', 'ADJUSTMENT'].includes(movementType)) {
    throw new AppError(422, 'Tipo de movimiento inválido.');
  }
  if (!Number.isInteger(Number(materialId)) || !Number.isInteger(Number(input.performedByUserId))) {
    throw new AppError(422, 'materialId y performedByUserId deben ser identificadores enteros.');
  }
  const originTypes = ['PURCHASE_ORDER', 'GOODS_RECEIPT', 'ISSUE_VOUCHER', 'TRANSFER', 'ADJUSTMENT', 'OPENING_BALANCE'];
  if (!originTypes.includes(input.originType) || typeof input.originDocument !== 'string' || !input.originDocument.trim()) {
    throw new AppError(422, 'originType y originDocument deben identificar el documento de respaldo.');
  }
  if (input.movedAt && !Number.isFinite(new Date(input.movedAt).getTime())) {
    throw new AppError(422, 'movedAt debe ser una fecha válida.');
  }

  return sequelize.transaction(async transaction => {
    const material = await Material.findByPk(materialId, { transaction, lock: transaction.LOCK.UPDATE });
    const user = await User.findByPk(input.performedByUserId, { transaction });
    if (!material || !material.active) throw new AppError(404, 'El material no existe o está inactivo.');
    if (!user || !user.active) throw new AppError(404, 'El usuario no existe o está inactivo.');

    let sourceId = sourceWarehouseId || null;
    let destinationId = destinationWarehouseId || null;
    if (movementType === 'ENTRY' && (!destinationId || sourceId)) throw new AppError(422, 'Una entrada requiere solo destinationWarehouseId.');
    if (movementType === 'EXIT' && (!sourceId || destinationId)) throw new AppError(422, 'Una salida requiere solo sourceWarehouseId.');
    if (movementType === 'TRANSFER' && (!sourceId || !destinationId || Number(sourceId) === Number(destinationId))) {
      throw new AppError(422, 'Un traslado requiere dos bodegas distintas.');
    }
    if (movementType === 'ADJUSTMENT') {
      if (!['IN', 'OUT'].includes(adjustmentDirection)) throw new AppError(422, 'Un ajuste requiere adjustmentDirection IN u OUT.');
      if (adjustmentDirection === 'IN' && (!destinationId || sourceId)) throw new AppError(422, 'El ajuste de entrada requiere solo destinationWarehouseId.');
      if (adjustmentDirection === 'OUT' && (!sourceId || destinationId)) throw new AppError(422, 'El ajuste de salida requiere solo sourceWarehouseId.');
    }
    const warehouseIds = [sourceId, destinationId].filter(Boolean);
    const warehouses = await Warehouse.count({ where: { id: { [Op.in]: warehouseIds }, active: true }, transaction });
    if (warehouses !== warehouseIds.length) throw new AppError(404, 'Una de las bodegas no existe o está inactiva.');
    if (sourceId && (movementType !== 'ADJUSTMENT' || adjustmentDirection === 'OUT')) {
      const available = await getStockAtWarehouse(materialId, sourceId, transaction);
      if (available < amount) throw new AppError(409, `Stock insuficiente: disponible ${available}.`);
    }

    const movement = await StockMovement.create({
      materialId: Number(materialId),
      movementType,
      quantity: amount,
      sourceWarehouseId: sourceId,
      destinationWarehouseId: destinationId,
      adjustmentDirection: movementType === 'ADJUSTMENT' ? adjustmentDirection : null,
      performedByUserId: Number(input.performedByUserId),
      originType: input.originType,
      originId: input.originId || null,
      originDocument: input.originDocument,
      notes: input.notes || null,
      movedAt: input.movedAt ? new Date(input.movedAt) : new Date()
    }, { transaction });
    await AuditLog.create({
      userId: Number(input.performedByUserId),
      action: 'STOCK_MOVEMENT_CREATED',
      entityType: 'StockMovement',
      entityId: movement.id,
      details: { movementType, materialId: Number(materialId), quantity: amount, originDocument: input.originDocument }
    }, { transaction });

    const policy = calculateStockPolicy(material);
    const affectedWarehouseIds = [...new Set([sourceId, destinationId].filter(Boolean).map(Number))];
    const alertResults = [];
    for (const warehouseId of affectedWarehouseIds) {
      const stock = await getStockAtWarehouse(materialId, warehouseId, transaction);
      const where = { materialId, warehouseId, alertType: 'REORDER', status: 'OPEN' };
      if (stock < policy.reorderPoint) {
        const [record, created] = await InventoryAlert.findOrCreate({
          where,
          defaults: { ...where, stockOnHand: stock, reorderPoint: policy.reorderPoint },
          transaction
        });
        if (!created) await record.update({ stockOnHand: stock, reorderPoint: policy.reorderPoint }, { transaction });
        alertResults.push(record);
      } else {
        const record = await InventoryAlert.findOne({ where, transaction });
        if (record) await record.update({ status: 'RESOLVED', resolvedAt: new Date(), stockOnHand: stock }, { transaction });
      }
    }
    const balanceWarehouseId = destinationId || sourceId;
    const stockOnHand = balanceWarehouseId
      ? await getStockAtWarehouse(materialId, balanceWarehouseId, transaction)
      : null;
    return { movement, stockOnHand, policy, alerts: alertResults };
  });
}

module.exports = {
  calculateStockPolicy,
  getStockAtWarehouse,
  getStockByWarehouse,
  recordMovement
};
