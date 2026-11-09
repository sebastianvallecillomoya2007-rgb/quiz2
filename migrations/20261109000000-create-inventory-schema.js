'use strict';

const Sequelize = require('sequelize');
const id = { type: Sequelize.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true };
const timestamps = {
  created_at: { type: Sequelize.DATE, allowNull: false },
  updated_at: { type: Sequelize.DATE, allowNull: false }
};
const ref = (table, allowNull = false) => ({
  type: Sequelize.BIGINT.UNSIGNED,
  allowNull,
  references: { model: table, key: 'id' },
  onUpdate: 'CASCADE',
  onDelete: allowNull ? 'SET NULL' : 'RESTRICT'
});

module.exports = {
  async up(queryInterface) {
    await queryInterface.createTable('projects', {
      id, code: { type: Sequelize.STRING(30), allowNull: false, unique: true },
      name: { type: Sequelize.STRING(120), allowNull: false }, address: Sequelize.STRING(255),
      status: { type: Sequelize.ENUM('ACTIVE', 'CLOSED'), allowNull: false, defaultValue: 'ACTIVE' }, ...timestamps
    });
    await queryInterface.createTable('warehouses', {
      id, code: { type: Sequelize.STRING(30), allowNull: false, unique: true },
      name: { type: Sequelize.STRING(120), allowNull: false },
      warehouse_type: { type: Sequelize.ENUM('CENTRAL', 'PROJECT', 'TEMPORARY'), allowNull: false },
      project_id: ref('projects', true), address: Sequelize.STRING(255),
      active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true }, ...timestamps
    });
    await queryInterface.createTable('users', {
      id, name: { type: Sequelize.STRING(120), allowNull: false },
      email: { type: Sequelize.STRING(160), allowNull: false, unique: true },
      role: { type: Sequelize.ENUM('AREA_MANAGER', 'PROCUREMENT_MANAGER', 'FINANCE_MANAGER', 'GENERAL_MANAGER', 'PROCUREMENT_COMMITTEE', 'WAREHOUSE_OPERATOR', 'PROJECT_MANAGER'), allowNull: false },
      active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true }, ...timestamps
    });
    await queryInterface.createTable('suppliers', {
      id, code: { type: Sequelize.STRING(30), allowNull: false, unique: true },
      name: { type: Sequelize.STRING(140), allowNull: false }, tax_id: Sequelize.STRING(40),
      email: Sequelize.STRING(160), phone: Sequelize.STRING(40), address: Sequelize.STRING(255),
      active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true }, ...timestamps
    });
    await queryInterface.createTable('categories', {
      id, code: { type: Sequelize.STRING(30), allowNull: false, unique: true },
      name: { type: Sequelize.STRING(100), allowNull: false }, parent_id: ref('categories', true), ...timestamps
    });
    await queryInterface.createTable('units', {
      id, code: { type: Sequelize.STRING(20), allowNull: false, unique: true },
      name: { type: Sequelize.STRING(60), allowNull: false }, ...timestamps
    });
    await queryInterface.createTable('materials', {
      id, code: { type: Sequelize.STRING(40), allowNull: false, unique: true },
      name: { type: Sequelize.STRING(160), allowNull: false }, description: Sequelize.STRING(500),
      category_id: ref('categories'), unit_id: ref('units'),
      min_stock: { type: Sequelize.DECIMAL(14, 3), allowNull: false, defaultValue: 0 },
      max_stock: { type: Sequelize.DECIMAL(14, 3), allowNull: false, defaultValue: 0 },
      avg_daily_demand: { type: Sequelize.DECIMAL(14, 3), allowNull: false, defaultValue: 0 },
      max_daily_demand: { type: Sequelize.DECIMAL(14, 3), allowNull: false, defaultValue: 0 },
      lead_time_days: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
      active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true }, ...timestamps
    });
    await queryInterface.createTable('supplier_products', {
      id, supplier_id: ref('suppliers'), material_id: ref('materials'),
      supplier_item_code: Sequelize.STRING(60), supplier_item_name: Sequelize.STRING(160),
      active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true }, ...timestamps
    });
    await queryInterface.createTable('supplier_contracts', {
      id, supplier_id: ref('suppliers'), contract_number: { type: Sequelize.STRING(50), allowNull: false, unique: true },
      start_date: { type: Sequelize.DATEONLY, allowNull: false }, end_date: { type: Sequelize.DATEONLY, allowNull: false },
      status: { type: Sequelize.ENUM('DRAFT', 'ACTIVE', 'EXPIRED', 'CANCELLED'), allowNull: false }, ...timestamps
    });
    await queryInterface.createTable('supplier_contract_lines', {
      id, supplier_contract_id: ref('supplier_contracts'), material_id: ref('materials'),
      unit_price: { type: Sequelize.DECIMAL(14, 2), allowNull: false },
      currency: { type: Sequelize.STRING(3), allowNull: false, defaultValue: 'CRC' }, ...timestamps
    });
    await queryInterface.createTable('purchase_requisitions', {
      id, number: { type: Sequelize.STRING(40), allowNull: false, unique: true },
      project_id: ref('projects'), requested_by_user_id: ref('users'), category_id: ref('categories'),
      justification: { type: Sequelize.STRING(500), allowNull: false },
      status: { type: Sequelize.ENUM('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'ORDERED'), allowNull: false, defaultValue: 'DRAFT' }, ...timestamps
    });
    await queryInterface.createTable('requisition_lines', {
      id, requisition_id: ref('purchase_requisitions'), material_id: ref('materials'),
      quantity: { type: Sequelize.DECIMAL(14, 3), allowNull: false },
      estimated_unit_price: { type: Sequelize.DECIMAL(14, 2), allowNull: false, defaultValue: 0 }, ...timestamps
    });
    await queryInterface.createTable('approval_rules', {
      id, min_amount: { type: Sequelize.DECIMAL(14, 2), allowNull: false }, max_amount: Sequelize.DECIMAL(14, 2),
      first_approver_role: { type: Sequelize.ENUM('AREA_MANAGER', 'PROCUREMENT_MANAGER', 'FINANCE_MANAGER', 'GENERAL_MANAGER'), allowNull: false },
      second_approver_role: Sequelize.ENUM('PROCUREMENT_COMMITTEE'),
      min_quotes: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false, defaultValue: 1 },
      active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true }, ...timestamps
    });
    await queryInterface.createTable('purchase_orders', {
      id, number: { type: Sequelize.STRING(40), allowNull: false, unique: true },
      supplier_id: ref('suppliers'), requisition_id: ref('purchase_requisitions', true),
      approval_rule_id: ref('approval_rules', true),
      project_id: ref('projects'), requested_by_user_id: ref('users'), category_id: ref('categories'),
      order_date: { type: Sequelize.DATEONLY, allowNull: false }, currency: { type: Sequelize.STRING(3), allowNull: false, defaultValue: 'CRC' },
      total_amount: { type: Sequelize.DECIMAL(14, 2), allowNull: false },
      approval_step: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
      status: { type: Sequelize.ENUM('PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'PARTIALLY_RECEIVED', 'RECEIVED', 'CANCELLED'), allowNull: false, defaultValue: 'PENDING_APPROVAL' },
      notes: Sequelize.STRING(500), ...timestamps
    });
    await queryInterface.createTable('purchase_order_lines', {
      id, purchase_order_id: ref('purchase_orders'), material_id: ref('materials'),
      quantity: { type: Sequelize.DECIMAL(14, 3), allowNull: false },
      unit_price: { type: Sequelize.DECIMAL(14, 2), allowNull: false },
      total_line_amount: { type: Sequelize.DECIMAL(14, 2), allowNull: false }, ...timestamps
    });
    await queryInterface.createTable('goods_receipts', {
      id, number: { type: Sequelize.STRING(40), allowNull: false, unique: true },
      purchase_order_id: ref('purchase_orders'), warehouse_id: ref('warehouses'), received_by_user_id: ref('users'),
      received_at: { type: Sequelize.DATE, allowNull: false },
      status: { type: Sequelize.ENUM('DRAFT', 'POSTED', 'CANCELLED'), allowNull: false, defaultValue: 'DRAFT' }, ...timestamps
    });
    await queryInterface.createTable('goods_receipt_lines', {
      id, goods_receipt_id: ref('goods_receipts'), purchase_order_line_id: ref('purchase_order_lines'),
      material_id: ref('materials'), quantity_accepted: { type: Sequelize.DECIMAL(14, 3), allowNull: false }, ...timestamps
    });
    await queryInterface.createTable('stock_movements', {
      id, material_id: ref('materials'),
      movement_type: { type: Sequelize.ENUM('ENTRY', 'EXIT', 'TRANSFER', 'ADJUSTMENT'), allowNull: false },
      quantity: { type: Sequelize.DECIMAL(14, 3), allowNull: false },
      source_warehouse_id: ref('warehouses', true), destination_warehouse_id: ref('warehouses', true),
      adjustment_direction: Sequelize.ENUM('IN', 'OUT'), performed_by_user_id: ref('users'),
      origin_type: { type: Sequelize.ENUM('PURCHASE_ORDER', 'GOODS_RECEIPT', 'ISSUE_VOUCHER', 'TRANSFER', 'ADJUSTMENT', 'OPENING_BALANCE'), allowNull: false },
      origin_id: { type: Sequelize.BIGINT.UNSIGNED, allowNull: true }, origin_document: { type: Sequelize.STRING(80), allowNull: false },
      notes: Sequelize.STRING(500), moved_at: { type: Sequelize.DATE, allowNull: false }, ...timestamps
    });
    await queryInterface.createTable('purchase_approvals', {
      id, purchase_order_id: ref('purchase_orders'), approver_user_id: ref('users'),
      step: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false },
      decision: { type: Sequelize.ENUM('APPROVED', 'REJECTED'), allowNull: false },
      comments: Sequelize.STRING(500), decided_at: { type: Sequelize.DATE, allowNull: false }, ...timestamps
    });
    await queryInterface.createTable('inventory_alerts', {
      id, material_id: ref('materials'), warehouse_id: ref('warehouses'),
      alert_type: { type: Sequelize.ENUM('REORDER', 'DUPLICATE_PURCHASE'), allowNull: false },
      stock_on_hand: { type: Sequelize.DECIMAL(14, 3), allowNull: false },
      reorder_point: { type: Sequelize.DECIMAL(14, 3), allowNull: false },
      status: { type: Sequelize.ENUM('OPEN', 'RESOLVED'), allowNull: false, defaultValue: 'OPEN' },
      resolved_at: Sequelize.DATE, ...timestamps
    });
    await queryInterface.createTable('audit_logs', {
      id, user_id: ref('users', true), action: { type: Sequelize.STRING(80), allowNull: false },
      entity_type: { type: Sequelize.STRING(80), allowNull: false },
      entity_id: { type: Sequelize.BIGINT.UNSIGNED, allowNull: true },
      details: Sequelize.JSON, ...timestamps
    });
    await queryInterface.createTable('supplier_evaluations', {
      id, supplier_id: ref('suppliers'), category_id: ref('categories'), evaluated_by_user_id: ref('users'),
      evaluated_at: { type: Sequelize.DATEONLY, allowNull: false },
      total_score: { type: Sequelize.DECIMAL(5, 2), allowNull: false }, comments: Sequelize.STRING(500), ...timestamps
    });
    await queryInterface.createTable('supplier_evaluation_scores', {
      id, supplier_evaluation_id: ref('supplier_evaluations'),
      criterion: { type: Sequelize.STRING(60), allowNull: false },
      weight: { type: Sequelize.DECIMAL(5, 2), allowNull: false },
      rating: { type: Sequelize.TINYINT.UNSIGNED, allowNull: false },
      weighted_score: { type: Sequelize.DECIMAL(5, 2), allowNull: false }, ...timestamps
    });

    await queryInterface.addConstraint('supplier_products', {
      fields: ['supplier_id', 'material_id'], type: 'unique', name: 'supplier_products_supplier_material_unique'
    });
    await queryInterface.addIndex('stock_movements', ['material_id', 'moved_at']);
    await queryInterface.addIndex('purchase_orders', ['supplier_id', 'order_date']);
    await queryInterface.addIndex('inventory_alerts', ['status', 'alert_type']);
  },

  async down(queryInterface) {
    for (const table of [
      'supplier_evaluation_scores', 'supplier_evaluations', 'audit_logs', 'inventory_alerts',
      'purchase_approvals', 'stock_movements', 'goods_receipt_lines', 'goods_receipts',
      'purchase_order_lines', 'purchase_orders', 'approval_rules', 'requisition_lines',
      'purchase_requisitions', 'supplier_contract_lines', 'supplier_contracts', 'supplier_products',
      'materials', 'units', 'categories', 'suppliers', 'users', 'warehouses', 'projects'
    ]) await queryInterface.dropTable(table);
  }
};
