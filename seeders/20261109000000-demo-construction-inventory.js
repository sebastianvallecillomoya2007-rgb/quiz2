'use strict';

const now = new Date('2026-11-09T12:00:00.000Z');
const created = rows => rows.map(row => ({ created_at: now, updated_at: now, ...row }));

module.exports = {
  async up(queryInterface) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      await queryInterface.bulkInsert('projects', created([
        { id: 1, code: 'OBRA-NORTE', name: 'Residencial Norte', address: 'San José', status: 'ACTIVE' },
        { id: 2, code: 'OBRA-SUR', name: 'Centro Logístico Sur', address: 'Alajuela', status: 'ACTIVE' }
      ]), { transaction });
      await queryInterface.bulkInsert('warehouses', created([
        { id: 1, code: 'BOD-CENTRAL', name: 'Bodega Central', warehouse_type: 'CENTRAL', project_id: null, address: 'San José', active: true },
        { id: 2, code: 'BOD-NORTE', name: 'Bodega Obra Norte', warehouse_type: 'PROJECT', project_id: 1, address: 'San José', active: true },
        { id: 3, code: 'BOD-SUR', name: 'Bodega Obra Sur', warehouse_type: 'PROJECT', project_id: 2, address: 'Alajuela', active: true }
      ]), { transaction });
      await queryInterface.bulkInsert('users', created([
        { id: 1, name: 'Ana Solís', email: 'ana.solis@example.test', role: 'PROJECT_MANAGER', active: true },
        { id: 2, name: 'Luis Mora', email: 'luis.mora@example.test', role: 'AREA_MANAGER', active: true },
        { id: 3, name: 'Carolina Vega', email: 'carolina.vega@example.test', role: 'PROCUREMENT_MANAGER', active: true },
        { id: 4, name: 'Diego Rojas', email: 'diego.rojas@example.test', role: 'FINANCE_MANAGER', active: true },
        { id: 5, name: 'Sofía Campos', email: 'sofia.campos@example.test', role: 'GENERAL_MANAGER', active: true },
        { id: 6, name: 'Comité de Compras', email: 'comite@example.test', role: 'PROCUREMENT_COMMITTEE', active: true },
        { id: 7, name: 'Mario Jiménez', email: 'mario.jimenez@example.test', role: 'WAREHOUSE_OPERATOR', active: true }
      ]), { transaction });
      await queryInterface.bulkInsert('suppliers', created([
        { id: 1, code: 'PROV-A', name: 'Proveedor A', email: 'ventas.a@example.test', active: true },
        { id: 2, code: 'PROV-B', name: 'Proveedor B', email: 'ventas.b@example.test', active: true },
        { id: 3, code: 'PROV-C', name: 'Proveedor C', email: 'ventas.c@example.test', active: true },
        { id: 4, code: 'PROV-D', name: 'Proveedor D', email: 'ventas.d@example.test', active: true },
        { id: 5, code: 'PROV-E', name: 'Proveedor E', email: 'ventas.e@example.test', active: true },
        { id: 6, code: 'PROV-F', name: 'Proveedor F', email: 'ventas.f@example.test', active: true }
      ]), { transaction });
      await queryInterface.bulkInsert('categories', created([
        { id: 1, code: 'CONSTRUCCION', name: 'Materiales de construcción', parent_id: null },
        { id: 2, code: 'CEMENTO-AGREGADOS', name: 'Cemento y agregados', parent_id: 1 },
        { id: 3, code: 'ACERO', name: 'Acero y refuerzo', parent_id: 1 },
        { id: 4, code: 'MAMPOSTERIA', name: 'Mampostería', parent_id: 1 },
        { id: 5, code: 'SEGURIDAD', name: 'Seguridad industrial', parent_id: null },
        { id: 6, code: 'GUANTES', name: 'Guantes de protección', parent_id: 5 },
        { id: 7, code: 'TUBERIA', name: 'Tubería y conexiones', parent_id: 1 }
      ]), { transaction });
      await queryInterface.bulkInsert('units', created([
        { id: 1, code: 'SACO', name: 'Saco de 50 kg' },
        { id: 2, code: 'UNIDAD', name: 'Unidad' },
        { id: 3, code: 'M3', name: 'Metro cúbico' },
        { id: 4, code: 'PAR', name: 'Par' }
      ]), { transaction });
      await queryInterface.bulkInsert('materials', created([
        { id: 1, code: 'CEM-GRIS-50', name: 'Cemento gris 50 kg', description: 'Cemento gris de uso general, saco de 50 kg', category_id: 2, unit_id: 1, min_stock: 50, max_stock: 500, avg_daily_demand: 40, max_daily_demand: 55, lead_time_days: 3, active: true },
        { id: 2, code: 'VAR-3-G40', name: 'Varilla #3 grado 40', description: 'Varilla corrugada de 3/8 pulgadas', category_id: 3, unit_id: 2, min_stock: 100, max_stock: 2000, avg_daily_demand: 120, max_daily_demand: 160, lead_time_days: 5, active: true },
        { id: 3, code: 'BLK-12-20-40', name: 'Block 12 x 20 x 40 cm', description: 'Block de concreto para mampostería', category_id: 4, unit_id: 2, min_stock: 500, max_stock: 5000, avg_daily_demand: 600, max_daily_demand: 900, lead_time_days: 4, active: true },
        { id: 4, code: 'ARENA-M3', name: 'Arena para construcción', description: 'Arena lavada por metro cúbico', category_id: 2, unit_id: 3, min_stock: 5, max_stock: 80, avg_daily_demand: 6, max_daily_demand: 10, lead_time_days: 2, active: true },
        { id: 5, code: 'GUANTE-NIT-L', name: 'Guantes de nitrilo talla L', description: 'Guantes de nitrilo talla grande', category_id: 6, unit_id: 4, min_stock: 20, max_stock: 500, avg_daily_demand: 5, max_daily_demand: 8, lead_time_days: 4, active: true },
        { id: 6, code: 'PVC-12-SDR135', name: 'Tubo PVC 1/2 SDR 13.5', description: 'Tubo PVC para instalaciones', category_id: 7, unit_id: 2, min_stock: 10, max_stock: 300, avg_daily_demand: 4, max_daily_demand: 7, lead_time_days: 5, active: true }
      ]), { transaction });
      await queryInterface.bulkInsert('supplier_products', created([
        { supplier_id: 1, material_id: 1, supplier_item_code: 'CEM-50', supplier_item_name: 'Cemento gris 50 kg', active: true },
        { supplier_id: 2, material_id: 1, supplier_item_code: 'CEMENTO-GRAL', supplier_item_name: 'Saco cemento uso general', active: true },
        { supplier_id: 1, material_id: 2, supplier_item_code: 'V3-G40', supplier_item_name: 'Varilla #3 grado 40', active: true },
        { supplier_id: 3, material_id: 2, supplier_item_code: 'VAR-3-40', supplier_item_name: 'Varilla corrugada 3/8', active: true },
        { supplier_id: 4, material_id: 2, supplier_item_code: 'HIERRO-38', supplier_item_name: 'Hierro 3/8 x 6 m', active: true },
        { supplier_id: 5, material_id: 5, supplier_item_code: 'NITRILO-L', supplier_item_name: 'Guante nitrilo L', active: true },
        { supplier_id: 6, material_id: 5, supplier_item_code: 'GUANTE-TR-L', supplier_item_name: 'Guantes trabajo L', active: true },
        { supplier_id: 2, material_id: 6, supplier_item_code: 'PVC-12', supplier_item_name: 'Tubo PVC 1/2 SDR 13.5', active: true }
      ]), { transaction });
      await queryInterface.bulkInsert('supplier_contracts', created([
        { id: 1, supplier_id: 1, contract_number: 'CTR-PROV-A-2026', start_date: '2026-01-01', end_date: '2026-12-31', status: 'ACTIVE' }
      ]), { transaction });
      await queryInterface.bulkInsert('supplier_contract_lines', created([
        { id: 1, supplier_contract_id: 1, material_id: 1, unit_price: 6300, currency: 'CRC' },
        { id: 2, supplier_contract_id: 1, material_id: 2, unit_price: 2050, currency: 'CRC' }
      ]), { transaction });
      await queryInterface.bulkInsert('approval_rules', created([
        { id: 1, min_amount: 0, max_amount: 250000, first_approver_role: 'AREA_MANAGER', second_approver_role: null, min_quotes: 1, active: true },
        { id: 2, min_amount: 250000.01, max_amount: 2000000, first_approver_role: 'PROCUREMENT_MANAGER', second_approver_role: null, min_quotes: 2, active: true },
        { id: 3, min_amount: 2000000.01, max_amount: 10000000, first_approver_role: 'FINANCE_MANAGER', second_approver_role: null, min_quotes: 3, active: true },
        { id: 4, min_amount: 10000000.01, max_amount: null, first_approver_role: 'GENERAL_MANAGER', second_approver_role: 'PROCUREMENT_COMMITTEE', min_quotes: 3, active: true }
      ]), { transaction });
      await queryInterface.bulkInsert('purchase_requisitions', created([
        { id: 1, number: 'REQ-2026-001', project_id: 1, requested_by_user_id: 1, category_id: 2, justification: 'Reposición de materiales para obra norte', status: 'APPROVED' }
      ]), { transaction });
      await queryInterface.bulkInsert('requisition_lines', created([
        { id: 1, requisition_id: 1, material_id: 1, quantity: 300, estimated_unit_price: 6300 }
      ]), { transaction });

      const orders = [
        { id: 1, number: 'OC-1041', supplier_id: 1, category_id: 2, date: '2026-10-02', amount: 1290000, rule: 2 },
        { id: 2, number: 'OC-1042', supplier_id: 1, category_id: 2, date: '2026-10-02', amount: 1290000, rule: 2 },
        { id: 3, number: 'OC-1047', supplier_id: 2, category_id: 2, date: '2026-10-06', amount: 284000, rule: 2 },
        { id: 4, number: 'OC-1050', supplier_id: 3, category_id: 3, date: '2026-10-08', amount: 1075000, rule: 2 },
        { id: 5, number: 'OC-1053', supplier_id: 3, category_id: 3, date: '2026-10-09', amount: 1032000, rule: 2 },
        { id: 6, number: 'OC-1058', supplier_id: 4, category_id: 3, date: '2026-10-13', amount: 156000, rule: 1 },
        { id: 7, number: 'OC-1061', supplier_id: 1, category_id: 2, date: '2026-10-15', amount: 1890000, rule: 2 }
      ];
      await queryInterface.bulkInsert('purchase_orders', created(orders.map(order => ({
        id: order.id, number: order.number, supplier_id: order.supplier_id, requisition_id: order.id === 7 ? 1 : null,
        approval_rule_id: order.rule, project_id: 1, requested_by_user_id: 1, category_id: order.category_id,
        order_date: order.date, currency: 'CRC', total_amount: order.amount,
        approval_step: 1, status: 'APPROVED', notes: 'Datos ficticios para el análisis del Quiz 2'
      }))), { transaction });
      await queryInterface.bulkInsert('purchase_order_lines', created([
        { id: 1, purchase_order_id: 1, material_id: 1, quantity: 200, unit_price: 6450, total_line_amount: 1290000 },
        { id: 2, purchase_order_id: 2, material_id: 1, quantity: 200, unit_price: 6450, total_line_amount: 1290000 },
        { id: 3, purchase_order_id: 3, material_id: 1, quantity: 40, unit_price: 7100, total_line_amount: 284000 },
        { id: 4, purchase_order_id: 4, material_id: 2, quantity: 500, unit_price: 2150, total_line_amount: 1075000 },
        { id: 5, purchase_order_id: 5, material_id: 2, quantity: 480, unit_price: 2150, total_line_amount: 1032000 },
        { id: 6, purchase_order_id: 6, material_id: 2, quantity: 60, unit_price: 2600, total_line_amount: 156000 },
        { id: 7, purchase_order_id: 7, material_id: 1, quantity: 300, unit_price: 6300, total_line_amount: 1890000 }
      ]), { transaction });
      await queryInterface.bulkInsert('purchase_approvals', created(orders.map(order => ({
        purchase_order_id: order.id, approver_user_id: order.rule === 1 ? 2 : 3,
        step: 1, decision: 'APPROVED', comments: 'Aprobación de ejemplo', decided_at: new Date(`${order.date}T12:00:00.000Z`)
      }))), { transaction });
      await queryInterface.bulkInsert('goods_receipts', created([
        { id: 1, number: 'REC-OC-1061-01', purchase_order_id: 7, warehouse_id: 1, received_by_user_id: 7, received_at: new Date('2026-10-16T09:00:00.000Z'), status: 'POSTED' }
      ]), { transaction });
      await queryInterface.bulkInsert('goods_receipt_lines', created([
        { id: 1, goods_receipt_id: 1, purchase_order_line_id: 7, material_id: 1, quantity_accepted: 190 }
      ]), { transaction });
      await queryInterface.bulkInsert('stock_movements', created([
        { id: 1, material_id: 1, movement_type: 'ENTRY', quantity: 190, source_warehouse_id: null, destination_warehouse_id: 1, adjustment_direction: null, performed_by_user_id: 7, origin_type: 'PURCHASE_ORDER', origin_id: 7, origin_document: 'OC-1061 / REC-OC-1061-01', notes: 'Recepción parcial de la orden', moved_at: new Date('2026-10-16T09:00:00.000Z') },
        { id: 2, material_id: 2, movement_type: 'ENTRY', quantity: 850, source_warehouse_id: null, destination_warehouse_id: 1, adjustment_direction: null, performed_by_user_id: 7, origin_type: 'OPENING_BALANCE', origin_id: null, origin_document: 'SALDO-INICIAL-2026', notes: 'Saldo ficticio inicial', moved_at: new Date('2026-10-01T08:00:00.000Z') },
        { id: 3, material_id: 3, movement_type: 'ENTRY', quantity: 2800, source_warehouse_id: null, destination_warehouse_id: 1, adjustment_direction: null, performed_by_user_id: 7, origin_type: 'OPENING_BALANCE', origin_id: null, origin_document: 'SALDO-INICIAL-2026', notes: 'Saldo ficticio inicial', moved_at: new Date('2026-10-01T08:00:00.000Z') },
        { id: 4, material_id: 4, movement_type: 'ENTRY', quantity: 14, source_warehouse_id: null, destination_warehouse_id: 1, adjustment_direction: null, performed_by_user_id: 7, origin_type: 'OPENING_BALANCE', origin_id: null, origin_document: 'SALDO-INICIAL-2026', notes: 'Saldo ficticio inicial', moved_at: new Date('2026-10-01T08:00:00.000Z') },
        { id: 5, material_id: 5, movement_type: 'ENTRY', quantity: 100, source_warehouse_id: null, destination_warehouse_id: 1, adjustment_direction: null, performed_by_user_id: 7, origin_type: 'OPENING_BALANCE', origin_id: null, origin_document: 'SALDO-INICIAL-2026', notes: 'Saldo ficticio inicial', moved_at: new Date('2026-10-01T08:00:00.000Z') },
        { id: 6, material_id: 6, movement_type: 'ENTRY', quantity: 30, source_warehouse_id: null, destination_warehouse_id: 1, adjustment_direction: null, performed_by_user_id: 7, origin_type: 'OPENING_BALANCE', origin_id: null, origin_document: 'SALDO-INICIAL-2026', notes: 'Saldo ficticio inicial', moved_at: new Date('2026-10-01T08:00:00.000Z') }
      ]), { transaction });
      await queryInterface.bulkInsert('supplier_evaluations', created([
        { id: 1, supplier_id: 1, category_id: 1, evaluated_by_user_id: 3, evaluated_at: '2026-11-01', total_score: 82, comments: 'Buena calidad y entrega; comparar precios y mantener alternativa.' },
        { id: 2, supplier_id: 2, category_id: 1, evaluated_by_user_id: 3, evaluated_at: '2026-11-01', total_score: 79, comments: 'Cobertura adecuada y precio competitivo.' },
        { id: 3, supplier_id: 3, category_id: 1, evaluated_by_user_id: 3, evaluated_at: '2026-11-01', total_score: 75, comments: 'Proveedor alternativo para acero.' }
      ]), { transaction });
      await queryInterface.bulkInsert('supplier_evaluation_scores', created([
        { supplier_evaluation_id: 1, criterion: 'Precio', weight: 30, rating: 4, weighted_score: 24 },
        { supplier_evaluation_id: 1, criterion: 'Calidad', weight: 25, rating: 5, weighted_score: 25 },
        { supplier_evaluation_id: 1, criterion: 'Plazo', weight: 20, rating: 4, weighted_score: 16 },
        { supplier_evaluation_id: 1, criterion: 'Crédito', weight: 15, rating: 3, weighted_score: 9 },
        { supplier_evaluation_id: 1, criterion: 'Servicio y riesgo', weight: 10, rating: 4, weighted_score: 8 },
        { supplier_evaluation_id: 2, criterion: 'Precio', weight: 30, rating: 5, weighted_score: 30 },
        { supplier_evaluation_id: 2, criterion: 'Calidad', weight: 25, rating: 4, weighted_score: 20 },
        { supplier_evaluation_id: 2, criterion: 'Plazo', weight: 20, rating: 4, weighted_score: 16 },
        { supplier_evaluation_id: 2, criterion: 'Crédito', weight: 15, rating: 3, weighted_score: 9 },
        { supplier_evaluation_id: 2, criterion: 'Servicio y riesgo', weight: 10, rating: 2, weighted_score: 4 },
        { supplier_evaluation_id: 3, criterion: 'Precio', weight: 30, rating: 3, weighted_score: 18 },
        { supplier_evaluation_id: 3, criterion: 'Calidad', weight: 25, rating: 4, weighted_score: 20 },
        { supplier_evaluation_id: 3, criterion: 'Plazo', weight: 20, rating: 5, weighted_score: 20 },
        { supplier_evaluation_id: 3, criterion: 'Crédito', weight: 15, rating: 3, weighted_score: 9 },
        { supplier_evaluation_id: 3, criterion: 'Servicio y riesgo', weight: 10, rating: 4, weighted_score: 8 }
      ]), { transaction });
      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  async down(queryInterface) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      for (const table of [
        'supplier_evaluation_scores', 'supplier_evaluations', 'stock_movements',
        'goods_receipt_lines', 'goods_receipts', 'purchase_approvals', 'purchase_order_lines',
        'purchase_orders', 'requisition_lines', 'purchase_requisitions', 'approval_rules',
        'supplier_contract_lines', 'supplier_contracts', 'supplier_products', 'materials',
        'units', 'categories', 'suppliers', 'users', 'warehouses', 'projects'
      ]) await queryInterface.bulkDelete(table, null, { transaction });
      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }
};
