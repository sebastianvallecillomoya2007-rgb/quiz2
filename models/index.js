'use strict';

const Sequelize = require('sequelize');
const config = require('../config/config')[process.env.NODE_ENV || 'development'];
const sequelize = new Sequelize(config.database, config.username, config.password, config);
const { DataTypes } = Sequelize;
const db = { sequelize, Sequelize };

function model(name, tableName, attributes) {
  db[name] = sequelize.define(name, attributes, {
    tableName,
    underscored: true,
    timestamps: true
  });
  return db[name];
}

const Project = model('Project', 'projects', {
  code: { type: DataTypes.STRING(30), allowNull: false, unique: true },
  name: { type: DataTypes.STRING(120), allowNull: false },
  address: DataTypes.STRING(255),
  status: { type: DataTypes.ENUM('ACTIVE', 'CLOSED'), allowNull: false, defaultValue: 'ACTIVE' }
});
const Warehouse = model('Warehouse', 'warehouses', {
  code: { type: DataTypes.STRING(30), allowNull: false, unique: true },
  name: { type: DataTypes.STRING(120), allowNull: false },
  warehouseType: { type: DataTypes.ENUM('CENTRAL', 'PROJECT', 'TEMPORARY'), allowNull: false },
  projectId: DataTypes.BIGINT.UNSIGNED,
  address: DataTypes.STRING(255),
  active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true }
});
const User = model('User', 'users', {
  name: { type: DataTypes.STRING(120), allowNull: false },
  email: { type: DataTypes.STRING(160), allowNull: false, unique: true },
  role: {
    type: DataTypes.ENUM('AREA_MANAGER', 'PROCUREMENT_MANAGER', 'FINANCE_MANAGER',
      'GENERAL_MANAGER', 'PROCUREMENT_COMMITTEE', 'WAREHOUSE_OPERATOR', 'PROJECT_MANAGER'),
    allowNull: false
  },
  active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true }
});
const Supplier = model('Supplier', 'suppliers', {
  code: { type: DataTypes.STRING(30), allowNull: false, unique: true },
  name: { type: DataTypes.STRING(140), allowNull: false },
  taxId: DataTypes.STRING(40),
  email: DataTypes.STRING(160),
  phone: DataTypes.STRING(40),
  address: DataTypes.STRING(255),
  active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true }
});
const Category = model('Category', 'categories', {
  code: { type: DataTypes.STRING(30), allowNull: false, unique: true },
  name: { type: DataTypes.STRING(100), allowNull: false },
  parentId: DataTypes.BIGINT.UNSIGNED
});
const Unit = model('Unit', 'units', {
  code: { type: DataTypes.STRING(20), allowNull: false, unique: true },
  name: { type: DataTypes.STRING(60), allowNull: false }
});
const Material = model('Material', 'materials', {
  code: { type: DataTypes.STRING(40), allowNull: false, unique: true },
  name: { type: DataTypes.STRING(160), allowNull: false },
  description: DataTypes.STRING(500),
  categoryId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
  unitId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
  minStock: { type: DataTypes.DECIMAL(14, 3), allowNull: false, defaultValue: 0 },
  maxStock: { type: DataTypes.DECIMAL(14, 3), allowNull: false, defaultValue: 0 },
  avgDailyDemand: { type: DataTypes.DECIMAL(14, 3), allowNull: false, defaultValue: 0 },
  maxDailyDemand: { type: DataTypes.DECIMAL(14, 3), allowNull: false, defaultValue: 0 },
  leadTimeDays: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
  active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true }
});
const SupplierProduct = model('SupplierProduct', 'supplier_products', {
  supplierId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
  materialId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
  supplierItemCode: DataTypes.STRING(60),
  supplierItemName: DataTypes.STRING(160),
  active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true }
});
const SupplierContract = model('SupplierContract', 'supplier_contracts', {
  supplierId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
  contractNumber: { type: DataTypes.STRING(50), allowNull: false, unique: true },
  startDate: { type: DataTypes.DATEONLY, allowNull: false },
  endDate: { type: DataTypes.DATEONLY, allowNull: false },
  status: { type: DataTypes.ENUM('DRAFT', 'ACTIVE', 'EXPIRED', 'CANCELLED'), allowNull: false }
});
const SupplierContractLine = model('SupplierContractLine', 'supplier_contract_lines', {
  supplierContractId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
  materialId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
  unitPrice: { type: DataTypes.DECIMAL(14, 2), allowNull: false },
  currency: { type: DataTypes.STRING(3), allowNull: false, defaultValue: 'CRC' }
});
const PurchaseRequisition = model('PurchaseRequisition', 'purchase_requisitions', {
  number: { type: DataTypes.STRING(40), allowNull: false, unique: true },
  projectId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
  requestedByUserId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
  categoryId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
  justification: { type: DataTypes.STRING(500), allowNull: false },
  status: {
    type: DataTypes.ENUM('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'ORDERED'),
    allowNull: false,
    defaultValue: 'DRAFT'
  }
});
const RequisitionLine = model('RequisitionLine', 'requisition_lines', {
  requisitionId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
  materialId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
  quantity: { type: DataTypes.DECIMAL(14, 3), allowNull: false },
  estimatedUnitPrice: { type: DataTypes.DECIMAL(14, 2), allowNull: false, defaultValue: 0 }
});
const PurchaseOrder = model('PurchaseOrder', 'purchase_orders', {
  number: { type: DataTypes.STRING(40), allowNull: false, unique: true },
  supplierId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
  requisitionId: DataTypes.BIGINT.UNSIGNED,
  approvalRuleId: DataTypes.BIGINT.UNSIGNED,
  projectId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
  requestedByUserId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
  categoryId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
  orderDate: { type: DataTypes.DATEONLY, allowNull: false },
  currency: { type: DataTypes.STRING(3), allowNull: false, defaultValue: 'CRC' },
  totalAmount: { type: DataTypes.DECIMAL(14, 2), allowNull: false },
  approvalStep: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
  status: {
    type: DataTypes.ENUM('PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'PARTIALLY_RECEIVED', 'RECEIVED', 'CANCELLED'),
    allowNull: false,
    defaultValue: 'PENDING_APPROVAL'
  },
  notes: DataTypes.STRING(500)
});
const PurchaseOrderLine = model('PurchaseOrderLine', 'purchase_order_lines', {
  purchaseOrderId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
  materialId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
  quantity: { type: DataTypes.DECIMAL(14, 3), allowNull: false },
  unitPrice: { type: DataTypes.DECIMAL(14, 2), allowNull: false },
  totalLineAmount: { type: DataTypes.DECIMAL(14, 2), allowNull: false }
});
const GoodsReceipt = model('GoodsReceipt', 'goods_receipts', {
  number: { type: DataTypes.STRING(40), allowNull: false, unique: true },
  purchaseOrderId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
  warehouseId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
  receivedByUserId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
  receivedAt: { type: DataTypes.DATE, allowNull: false },
  status: { type: DataTypes.ENUM('DRAFT', 'POSTED', 'CANCELLED'), allowNull: false, defaultValue: 'DRAFT' }
});
const GoodsReceiptLine = model('GoodsReceiptLine', 'goods_receipt_lines', {
  goodsReceiptId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
  purchaseOrderLineId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
  materialId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
  quantityAccepted: { type: DataTypes.DECIMAL(14, 3), allowNull: false }
});
const StockMovement = model('StockMovement', 'stock_movements', {
  materialId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
  movementType: { type: DataTypes.ENUM('ENTRY', 'EXIT', 'TRANSFER', 'ADJUSTMENT'), allowNull: false },
  quantity: { type: DataTypes.DECIMAL(14, 3), allowNull: false },
  sourceWarehouseId: DataTypes.BIGINT.UNSIGNED,
  destinationWarehouseId: DataTypes.BIGINT.UNSIGNED,
  adjustmentDirection: DataTypes.ENUM('IN', 'OUT'),
  performedByUserId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
  originType: { type: DataTypes.ENUM('PURCHASE_ORDER', 'GOODS_RECEIPT', 'ISSUE_VOUCHER', 'TRANSFER', 'ADJUSTMENT', 'OPENING_BALANCE'), allowNull: false },
  originId: DataTypes.BIGINT.UNSIGNED,
  originDocument: { type: DataTypes.STRING(80), allowNull: false },
  notes: DataTypes.STRING(500),
  movedAt: { type: DataTypes.DATE, allowNull: false }
});
const ApprovalRule = model('ApprovalRule', 'approval_rules', {
  minAmount: { type: DataTypes.DECIMAL(14, 2), allowNull: false },
  maxAmount: DataTypes.DECIMAL(14, 2),
  firstApproverRole: {
    type: DataTypes.ENUM('AREA_MANAGER', 'PROCUREMENT_MANAGER', 'FINANCE_MANAGER', 'GENERAL_MANAGER'),
    allowNull: false
  },
  secondApproverRole: DataTypes.ENUM('PROCUREMENT_COMMITTEE'),
  minQuotes: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 1 },
  active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true }
});
const PurchaseApproval = model('PurchaseApproval', 'purchase_approvals', {
  purchaseOrderId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
  approverUserId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
  step: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
  decision: { type: DataTypes.ENUM('APPROVED', 'REJECTED'), allowNull: false },
  comments: DataTypes.STRING(500),
  decidedAt: { type: DataTypes.DATE, allowNull: false }
});
const InventoryAlert = model('InventoryAlert', 'inventory_alerts', {
  materialId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
  warehouseId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
  alertType: { type: DataTypes.ENUM('REORDER', 'DUPLICATE_PURCHASE'), allowNull: false },
  stockOnHand: { type: DataTypes.DECIMAL(14, 3), allowNull: false },
  reorderPoint: { type: DataTypes.DECIMAL(14, 3), allowNull: false },
  status: { type: DataTypes.ENUM('OPEN', 'RESOLVED'), allowNull: false, defaultValue: 'OPEN' },
  resolvedAt: DataTypes.DATE
});
const AuditLog = model('AuditLog', 'audit_logs', {
  userId: DataTypes.BIGINT.UNSIGNED,
  action: { type: DataTypes.STRING(80), allowNull: false },
  entityType: { type: DataTypes.STRING(80), allowNull: false },
  entityId: DataTypes.BIGINT.UNSIGNED,
  details: DataTypes.JSON
});
const SupplierEvaluation = model('SupplierEvaluation', 'supplier_evaluations', {
  supplierId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
  categoryId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
  evaluatedByUserId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
  evaluatedAt: { type: DataTypes.DATEONLY, allowNull: false },
  totalScore: { type: DataTypes.DECIMAL(5, 2), allowNull: false },
  comments: DataTypes.STRING(500)
});
const SupplierEvaluationScore = model('SupplierEvaluationScore', 'supplier_evaluation_scores', {
  supplierEvaluationId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
  criterion: { type: DataTypes.STRING(60), allowNull: false },
  weight: { type: DataTypes.DECIMAL(5, 2), allowNull: false },
  rating: { type: DataTypes.TINYINT.UNSIGNED, allowNull: false },
  weightedScore: { type: DataTypes.DECIMAL(5, 2), allowNull: false }
});

function belongsTo(child, parent, foreignKey, as) {
  child.belongsTo(parent, { foreignKey, as });
}
function hasMany(parent, child, foreignKey, as) {
  parent.hasMany(child, { foreignKey, as });
}

belongsTo(Warehouse, Project, 'projectId', 'project');
hasMany(Project, Warehouse, 'projectId', 'warehouses');
belongsTo(Category, Category, 'parentId', 'parent');
hasMany(Category, Category, 'parentId', 'children');
belongsTo(Material, Category, 'categoryId', 'category');
belongsTo(Material, Unit, 'unitId', 'unit');
hasMany(Category, Material, 'categoryId', 'materials');
hasMany(Unit, Material, 'unitId', 'materials');
belongsTo(SupplierProduct, Supplier, 'supplierId', 'supplier');
belongsTo(SupplierProduct, Material, 'materialId', 'material');
belongsTo(SupplierContract, Supplier, 'supplierId', 'supplier');
belongsTo(SupplierContractLine, SupplierContract, 'supplierContractId', 'contract');
belongsTo(SupplierContractLine, Material, 'materialId', 'material');
belongsTo(PurchaseRequisition, Project, 'projectId', 'project');
belongsTo(PurchaseRequisition, User, 'requestedByUserId', 'requestedBy');
belongsTo(PurchaseRequisition, Category, 'categoryId', 'category');
hasMany(PurchaseRequisition, RequisitionLine, 'requisitionId', 'lines');
belongsTo(RequisitionLine, PurchaseRequisition, 'requisitionId', 'requisition');
belongsTo(RequisitionLine, Material, 'materialId', 'material');
belongsTo(PurchaseOrder, Supplier, 'supplierId', 'supplier');
belongsTo(PurchaseOrder, PurchaseRequisition, 'requisitionId', 'requisition');
belongsTo(PurchaseOrder, ApprovalRule, 'approvalRuleId', 'approvalRule');
belongsTo(PurchaseOrder, Project, 'projectId', 'project');
belongsTo(PurchaseOrder, User, 'requestedByUserId', 'requestedBy');
belongsTo(PurchaseOrder, Category, 'categoryId', 'category');
hasMany(PurchaseOrder, PurchaseOrderLine, 'purchaseOrderId', 'lines');
belongsTo(PurchaseOrderLine, PurchaseOrder, 'purchaseOrderId', 'purchaseOrder');
belongsTo(PurchaseOrderLine, Material, 'materialId', 'material');
belongsTo(GoodsReceipt, PurchaseOrder, 'purchaseOrderId', 'purchaseOrder');
belongsTo(GoodsReceipt, Warehouse, 'warehouseId', 'warehouse');
belongsTo(GoodsReceipt, User, 'receivedByUserId', 'receivedBy');
hasMany(GoodsReceipt, GoodsReceiptLine, 'goodsReceiptId', 'lines');
belongsTo(GoodsReceiptLine, GoodsReceipt, 'goodsReceiptId', 'goodsReceipt');
belongsTo(GoodsReceiptLine, PurchaseOrderLine, 'purchaseOrderLineId', 'purchaseOrderLine');
belongsTo(GoodsReceiptLine, Material, 'materialId', 'material');
belongsTo(StockMovement, Material, 'materialId', 'material');
belongsTo(StockMovement, Warehouse, 'sourceWarehouseId', 'sourceWarehouse');
belongsTo(StockMovement, Warehouse, 'destinationWarehouseId', 'destinationWarehouse');
belongsTo(StockMovement, User, 'performedByUserId', 'performedBy');
belongsTo(PurchaseApproval, PurchaseOrder, 'purchaseOrderId', 'purchaseOrder');
belongsTo(PurchaseApproval, User, 'approverUserId', 'approver');
hasMany(PurchaseOrder, PurchaseApproval, 'purchaseOrderId', 'approvals');
belongsTo(InventoryAlert, Material, 'materialId', 'material');
belongsTo(InventoryAlert, Warehouse, 'warehouseId', 'warehouse');
belongsTo(AuditLog, User, 'userId', 'user');
belongsTo(SupplierEvaluation, Supplier, 'supplierId', 'supplier');
belongsTo(SupplierEvaluation, Category, 'categoryId', 'category');
belongsTo(SupplierEvaluation, User, 'evaluatedByUserId', 'evaluatedBy');
hasMany(SupplierEvaluation, SupplierEvaluationScore, 'supplierEvaluationId', 'scores');
belongsTo(SupplierEvaluationScore, SupplierEvaluation, 'supplierEvaluationId', 'evaluation');

module.exports = db;
