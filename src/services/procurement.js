'use strict';

const { Op } = require('sequelize');
const { AppError } = require('../utils/errors');

function findDuplicatePairs(orders, options = {}) {
  const windowDays = Number(options.windowDays ?? process.env.DUPLICATE_WINDOW_DAYS ?? 3);
  const tolerance = Number(options.quantityTolerance ?? process.env.DUPLICATE_QUANTITY_TOLERANCE ?? 0.1);
  if (!Number.isInteger(windowDays) || windowDays < 0 || !Number.isFinite(tolerance) || tolerance < 0 || tolerance > 1) {
    throw new AppError(422, 'La ventana y la tolerancia de duplicados no son válidas.');
  }
  const results = [];
  for (let first = 0; first < orders.length; first++) {
    for (let second = first + 1; second < orders.length; second++) {
      const left = orders[first];
      const right = orders[second];
      if (Number(left.supplierId) !== Number(right.supplierId)) continue;
      const daysApart = Math.abs(new Date(left.orderDate) - new Date(right.orderDate)) / 86400000;
      if (daysApart > windowDays) continue;
      for (const leftLine of left.lines || []) {
        const rightLine = (right.lines || []).find(line => Number(line.materialId) === Number(leftLine.materialId));
        if (!rightLine) continue;
        const leftQty = Number(leftLine.quantity);
        const rightQty = Number(rightLine.quantity);
        const quantityDifference = Math.abs(leftQty - rightQty) / Math.max(leftQty, rightQty);
        if (quantityDifference <= tolerance) {
          results.push({
            firstOrder: left.number,
            secondOrder: right.number,
            supplierId: Number(left.supplierId),
            materialId: Number(leftLine.materialId),
            firstQuantity: leftQty,
            secondQuantity: rightQty,
            daysApart: Number(daysApart.toFixed(1)),
            rule: `Mismo proveedor y material; cantidades con diferencia <= ${tolerance * 100}% en <= ${windowDays} días.`
          });
        }
      }
    }
  }
  return results;
}

async function listPossibleDuplicates(options = {}) {
  const { PurchaseOrder, PurchaseOrderLine, Supplier, Material } = require('../../models');
  const orders = await PurchaseOrder.findAll({
    where: { status: { [Op.notIn]: ['CANCELLED', 'REJECTED'] } },
    include: [
      { model: PurchaseOrderLine, as: 'lines', include: [{ model: Material, as: 'material' }] },
      { model: Supplier, as: 'supplier' }
    ],
    order: [['orderDate', 'DESC']]
  });
  return findDuplicatePairs(orders, options);
}

function approvalRuleForAmount(rules, amount) {
  return rules.find(rule =>
    Number(rule.minAmount) <= amount &&
    (rule.maxAmount === null || rule.maxAmount === undefined || amount <= Number(rule.maxAmount))
  );
}

async function createPurchaseOrder(input) {
  const {
    sequelize, Supplier, Project, User, Category, Material, PurchaseOrder,
    PurchaseOrderLine, PurchaseRequisition, ApprovalRule, AuditLog
  } = require('../../models');
  if (!Array.isArray(input.lines) || input.lines.length === 0) throw new AppError(422, 'La orden debe incluir al menos una línea.');
  if (!Number.isInteger(Number(input.quoteCount)) || Number(input.quoteCount) < 0) {
    throw new AppError(422, 'quoteCount debe ser un entero no negativo.');
  }
  if (input.currency && input.currency !== 'CRC') {
    throw new AppError(422, 'La matriz de aprobación está definida en colones; las órdenes deben usar CRC.');
  }
  const ids = ['supplierId', 'projectId', 'requestedByUserId', 'categoryId'];
  if (ids.some(key => !Number.isInteger(Number(input[key])))) throw new AppError(422, 'Faltan identificadores válidos para crear la orden.');

  return sequelize.transaction(async transaction => {
    const [supplier, project, requester, category] = await Promise.all([
      Supplier.findByPk(input.supplierId, { transaction }),
      Project.findByPk(input.projectId, { transaction, lock: transaction.LOCK.UPDATE }),
      User.findByPk(input.requestedByUserId, { transaction }),
      Category.findByPk(input.categoryId, { transaction })
    ]);
    if (!supplier || !supplier.active || !project || !requester || !requester.active || !category) {
      throw new AppError(404, 'No se encontró un proveedor, obra, usuario activo o categoría válida.');
    }
    const materialIds = input.lines.map(line => Number(line.materialId));
    const materials = await Material.findAll({ where: { id: { [Op.in]: materialIds }, active: true }, transaction });
    if (materials.length !== new Set(materialIds).size) throw new AppError(422, 'La orden contiene materiales inexistentes o inactivos.');
    for (const line of input.lines) {
      if (!Number.isFinite(Number(line.quantity)) || Number(line.quantity) <= 0 ||
          !Number.isFinite(Number(line.unitPrice)) || Number(line.unitPrice) < 0) {
        throw new AppError(422, 'Cada línea requiere cantidad positiva y precio no negativo.');
      }
    }
    const lines = input.lines.map(line => ({
      materialId: Number(line.materialId),
      quantity: Number(line.quantity),
      unitPrice: Number(line.unitPrice),
      totalLineAmount: Number((Number(line.quantity) * Number(line.unitPrice)).toFixed(2))
    }));
    const totalAmount = Number(lines.reduce((sum, line) => sum + line.totalLineAmount, 0).toFixed(2));
    const orderDate = input.orderDate || new Date().toISOString().slice(0, 10);
    const periodStart = new Date(`${orderDate}T00:00:00.000Z`);
    periodStart.setUTCDate(periodStart.getUTCDate() - 30);
    const recentOrders = await PurchaseOrder.findAll({
      where: {
        requestedByUserId: requester.id,
        projectId: project.id,
        categoryId: category.id,
        orderDate: { [Op.between]: [periodStart.toISOString().slice(0, 10), orderDate] },
        status: { [Op.notIn]: ['CANCELLED', 'REJECTED'] }
      },
      attributes: ['totalAmount'],
      transaction
    });
    const cumulativeAmount = Number((totalAmount + recentOrders.reduce((sum, order) => sum + Number(order.totalAmount), 0)).toFixed(2));
    const rules = await ApprovalRule.findAll({ where: { active: true }, order: [['minAmount', 'ASC']], transaction });
    const rule = approvalRuleForAmount(rules, cumulativeAmount);
    if (!rule) throw new AppError(500, 'No existe una regla de aprobación para el monto acumulado.');
    if (Number(input.quoteCount) < Number(rule.minQuotes)) {
      throw new AppError(422, `Se requieren al menos ${rule.minQuotes} cotización(es) para el monto acumulado de CRC ${cumulativeAmount}.`);
    }

    let requisition = null;
    if (input.requisitionId) {
      requisition = await PurchaseRequisition.findByPk(input.requisitionId, { transaction });
      if (!requisition || requisition.status !== 'APPROVED') throw new AppError(409, 'La requisición debe existir y estar aprobada.');
    }
    const order = await PurchaseOrder.create({
      number: input.number || `OC-${Date.now()}`,
      supplierId: supplier.id,
      requisitionId: requisition ? requisition.id : null,
      approvalRuleId: rule.id,
      projectId: project.id,
      requestedByUserId: requester.id,
      categoryId: category.id,
      orderDate,
      currency: input.currency || 'CRC',
      totalAmount,
      approvalStep: 0,
      status: 'PENDING_APPROVAL',
      notes: input.notes || null
    }, { transaction });
    await PurchaseOrderLine.bulkCreate(lines.map(line => ({ ...line, purchaseOrderId: order.id })), { transaction });
    await AuditLog.create({
      userId: requester.id, action: 'PURCHASE_ORDER_CREATED', entityType: 'PurchaseOrder',
      entityId: order.id, details: { totalAmount, cumulativeAmount, approvalRuleId: rule.id }
    }, { transaction });
    return { order, totalAmount, cumulativeAmount, minQuotes: rule.minQuotes };
  });
}

async function decidePurchaseOrder(orderId, input) {
  const { sequelize, PurchaseOrder, ApprovalRule, User, PurchaseApproval, AuditLog } = require('../../models');
  if (!['APPROVED', 'REJECTED'].includes(input.decision)) throw new AppError(422, 'La decisión debe ser APPROVED o REJECTED.');
  return sequelize.transaction(async transaction => {
    const order = await PurchaseOrder.findByPk(orderId, { transaction, lock: transaction.LOCK.UPDATE });
    if (!order || order.status !== 'PENDING_APPROVAL') throw new AppError(404, 'No existe una orden pendiente de aprobación.');
    const approver = await User.findByPk(input.approverUserId, { transaction });
    if (!approver || !approver.active) throw new AppError(404, 'El usuario aprobador no existe o está inactivo.');
    if (Number(order.requestedByUserId) === Number(approver.id)) throw new AppError(403, 'La persona solicitante no puede aprobar su propia orden.');
    const rule = await ApprovalRule.findByPk(order.approvalRuleId, { transaction });
    if (!rule) throw new AppError(409, 'La regla asociada a esta orden ya no existe.');
    const requiredRole = Number(order.approvalStep) === 0 ? rule.firstApproverRole : rule.secondApproverRole;
    if (!requiredRole || approver.role !== requiredRole) {
      throw new AppError(403, `Esta aprobación requiere el rol ${requiredRole || 'no definido'}.`);
    }
    const step = Number(order.approvalStep) + 1;
    await PurchaseApproval.create({
      purchaseOrderId: order.id, approverUserId: approver.id, step,
      decision: input.decision, comments: input.comments || null, decidedAt: new Date()
    }, { transaction });
    if (input.decision === 'REJECTED') {
      await order.update({ status: 'REJECTED' }, { transaction });
    } else if (step === 1 && rule.secondApproverRole) {
      await order.update({ approvalStep: step }, { transaction });
    } else {
      await order.update({ approvalStep: step, status: 'APPROVED' }, { transaction });
    }
    await AuditLog.create({
      userId: approver.id, action: `PURCHASE_ORDER_${input.decision}`,
      entityType: 'PurchaseOrder', entityId: order.id, details: { step, requiredRole }
    }, { transaction });
    return order;
  });
}

module.exports = {
  approvalRuleForAmount,
  createPurchaseOrder,
  decidePurchaseOrder,
  findDuplicatePairs,
  listPossibleDuplicates
};
