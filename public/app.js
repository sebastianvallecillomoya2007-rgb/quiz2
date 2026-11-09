'use strict';

const icons = {
  grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/>',
  boxes: '<path d="m12 3 8 4.5-8 4.5-8-4.5L12 3Z"/><path d="m4 12 8 4.5 8-4.5M4 16.5l8 4.5 8-4.5M12 12v9"/>',
  arrows: '<path d="M7 7h13l-3-3M17 17H4l3 3"/><path d="M20 7v4M4 17v-4"/>',
  clipboard: '<rect x="5" y="5" width="14" height="16" rx="2"/><path d="M9 5.5V4h6v1.5M9 11h6M9 15h6"/>',
  truck: '<path d="M3 6h11v11H3zM14 10h4l3 3v4h-7z"/><circle cx="7.5" cy="18" r="1.8"/><circle cx="17.5" cy="18" r="1.8"/>',
  activity: '<path d="M3 12h4l3-7 4 14 3-7h4"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9.6 9a2.5 2.5 0 1 1 4.6 1.3c-.7 1-2.2 1.2-2.2 2.8M12 16.5h.01"/>',
  bell: '<path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9ZM10 21h4"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  layers: '<path d="m12 3 9 5-9 5-9-5 9-5Z"/><path d="m3 12 9 5 9-5M3 16l9 5 9-5"/>',
  alert: '<path d="m12 3 9 17H3L12 3Z"/><path d="M12 9v5M12 17h.01"/>',
  search: '<circle cx="10.8" cy="10.8" r="6.8"/><path d="m16 16 4 4"/>',
  refresh: '<path d="M20 7v5h-5M4 17v-5h5"/><path d="M5.5 9a7 7 0 0 1 12-2L20 12M4 12l2.5 5a7 7 0 0 0 12-2"/>',
  eye: '<path d="M2.5 12s3.2-6 9.5-6 9.5 6 9.5 6-3.2 6-9.5 6-9.5-6-9.5-6Z"/><circle cx="12" cy="12" r="2.5"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
  file: '<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9Z"/><path d="M14 3v6h6M8 13h8M8 17h8"/>'
};

const state = {
  materials: [],
  warehouses: [],
  users: [],
  suppliers: [],
  projects: [],
  categories: [],
  stock: [],
  alerts: [],
  movements: [],
  orders: [],
  duplicates: [],
  activity: [],
  activePage: 'dashboard',
  currentApprovalOrder: null
};

const pageDetails = {
  dashboard: ['Resumen general', 'Monitorea el estado de tus materiales y operaciones.'],
  inventory: ['Inventario', 'Consulta existencias por bodega, niveles de reorden y trazabilidad.'],
  movements: ['Movimientos', 'Registra y consulta los movimientos de materiales entre bodegas y obras.'],
  orders: ['Órdenes de compra', 'Gestiona proveedores, compras y niveles de aprobación.'],
  suppliers: ['Proveedores', 'Directorio de proveedores y actividad de compra.'],
  activity: ['Registro de actividad', 'Consulta la bitácora de operaciones realizadas en el sistema.']
};

function icon(name, className = '') {
  const paths = icons[name] || '';
  return `<svg class="${className}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;
}

document.querySelectorAll('[data-icon]').forEach(element => {
  element.innerHTML = icon(element.dataset.icon);
});

const byId = id => document.getElementById(id);
const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, character => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[character]));
const numberFormat = new Intl.NumberFormat('es-CR', { maximumFractionDigits: 3 });
const crcFormat = new Intl.NumberFormat('es-CR', { style: 'currency', currency: 'CRC', maximumFractionDigits: 0 });

function formatNumber(value) {
  return numberFormat.format(Number(value) || 0);
}

function formatMoney(value, currency = 'CRC') {
  return new Intl.NumberFormat('es-CR', {
    style: 'currency', currency, maximumFractionDigits: currency === 'CRC' ? 0 : 2
  }).format(Number(value) || 0);
}

function formatDate(value, options = {}) {
  if (!value) return '—';
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return '—';
  return new Intl.DateTimeFormat('es-CR', {
    day: '2-digit', month: 'short', year: options.year === false ? undefined : 'numeric',
    ...(options.time ? { hour: '2-digit', minute: '2-digit' } : {})
  }).format(date);
}

function statusLabel(status) {
  return ({
    PENDING_APPROVAL: ['Pendiente', 'pending'],
    APPROVED: ['Aprobada', 'ok'],
    REJECTED: ['Rechazada', 'rejected'],
    PARTIALLY_RECEIVED: ['Recepción parcial', 'pending'],
    RECEIVED: ['Recibida', 'ok'],
    CANCELLED: ['Cancelada', 'rejected']
  })[status] || [status || 'Sin estado', 'pending'];
}

function movementLabel(type) {
  return ({
    ENTRY: ['Entrada', 'entry'],
    EXIT: ['Salida', 'exit'],
    TRANSFER: ['Traslado', 'transfer'],
    ADJUSTMENT: ['Ajuste', 'adjustment']
  })[type] || [type || 'Movimiento', 'adjustment'];
}

function initials(value) {
  return String(value || '?').trim().split(/\s+/).slice(0, 2).map(part => part.charAt(0)).join('').toUpperCase();
}

function showToast(message, type = 'success') {
  const toast = document.createElement('div');
  toast.className = `toast${type === 'error' ? ' error' : ''}`;
  toast.textContent = message;
  byId('toast-region').appendChild(toast);
  window.setTimeout(() => toast.remove(), 4800);
}

function setGlobalError(message = '') {
  const banner = byId('global-error');
  banner.textContent = message;
  banner.classList.toggle('hidden', !message);
}

async function api(url, options = {}) {
  let response;
  try {
    response = await fetch(url, {
      ...options,
      headers: {
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...(options.headers || {})
      }
    });
  } catch (error) {
    throw new Error('No fue posible conectar con la API. Comprueba que el servidor esté activo.');
  }
  const contentType = response.headers.get('content-type') || '';
  const result = contentType.includes('application/json') ? await response.json() : await response.text();
  if (!response.ok) {
    const message = result && typeof result === 'object' ? result.error : result;
    throw new Error(message || `Error HTTP ${response.status}`);
  }
  return result;
}

function navigate(page) {
  if (!pageDetails[page]) return;
  state.activePage = page;
  document.querySelectorAll('[data-panel]').forEach(panel => {
    panel.classList.toggle('active', panel.dataset.panel === page);
  });
  document.querySelectorAll('.nav-link[data-page]').forEach(link => {
    link.classList.toggle('active', link.dataset.page === page);
  });
  byId('breadcrumb-current').textContent = pageDetails[page][0];
  byId('page-title').textContent = pageDetails[page][0];
  byId('page-subtitle').textContent = pageDetails[page][1];
  byId('primary-action').innerHTML = `${icon(page === 'orders' ? 'plus' : 'arrows')}<span>${page === 'orders' ? 'Crear orden' : 'Registrar movimiento'}</span>`;
  byId('primary-action').onclick = page === 'orders' ? openOrderModal : openMovementModal;
  byId('sidebar').classList.remove('open');
  setGlobalError('');
  if (page === 'activity' && !state.activity.length) loadActivity();
  if (page === 'suppliers') renderSuppliers();
  if (page === 'inventory') renderInventory();
  if (page === 'movements') renderMovements();
  if (page === 'orders') renderOrders();
}

async function loadReferenceData() {
  const results = await Promise.all([
    api('/api/materials'),
    api('/api/warehouses'),
    api('/api/users'),
    api('/api/suppliers'),
    api('/api/projects'),
    api('/api/categories')
  ]);
  [state.materials, state.warehouses, state.users, state.suppliers, state.projects, state.categories] = results;
  populateSelects();
}

function optionsHtml(rows, label, value = 'id') {
  return rows.map(row => `<option value="${escapeHtml(row[value])}">${escapeHtml(label(row))}</option>`).join('');
}

function populateSelects() {
  const warehouseOptions = optionsHtml(state.warehouses, row => `${row.name} · ${row.code}`);
  byId('warehouse-filter').insertAdjacentHTML('beforeend', warehouseOptions);
  ['movement-source', 'movement-destination'].forEach(id => {
    byId(id).innerHTML = `<option value="">Selecciona una bodega</option>${warehouseOptions}`;
  });
  byId('movement-material').innerHTML = `<option value="">Selecciona un material</option>${optionsHtml(state.materials, row => `${row.name} · ${row.code}`)}`;
  byId('movement-user').innerHTML = optionsHtml(state.users, row => `${row.name} · ${roleLabel(row.role)}`);
  byId('order-supplier').innerHTML = `<option value="">Selecciona un proveedor</option>${optionsHtml(state.suppliers, row => row.name)}`;
  byId('order-project').innerHTML = `<option value="">Selecciona una obra</option>${optionsHtml(state.projects, row => `${row.name} · ${row.code}`)}`;
  byId('order-requester').innerHTML = `<option value="">Selecciona un solicitante</option>${optionsHtml(state.users, row => row.name)}`;
  byId('order-category').innerHTML = `<option value="">Selecciona una categoría</option>${optionsHtml(state.categories, row => `${row.name} · ${row.code}`)}`;
}

function roleLabel(role) {
  return ({
    AREA_MANAGER: 'Jefatura de área',
    PROCUREMENT_MANAGER: 'Jefatura de Compras',
    FINANCE_MANAGER: 'Gerencia Financiera',
    GENERAL_MANAGER: 'Gerencia General',
    PROCUREMENT_COMMITTEE: 'Comité de Compras',
    WAREHOUSE_OPERATOR: 'Operador de bodega',
    PROJECT_MANAGER: 'Jefatura de obra'
  })[role] || role || 'Usuario';
}

async function loadStocks() {
  const results = await Promise.all(state.materials.map(material =>
    api(`/api/materials/${material.id}/stock`).then(data => ({ material, ...data }))
  ));
  state.stock = results.flatMap(result => result.warehouses.map(warehouseStock => ({
    material: result.material,
    policy: result.policy,
    ...warehouseStock
  })));
}

async function loadMovements() {
  const resultSets = await Promise.all(state.materials.map(material =>
    api(`/api/materials/${material.id}/traceability`).then(data =>
      data.movements.map(movement => ({ ...movement, material: data.material }))
    )
  ));
  state.movements = resultSets.flat().sort((left, right) =>
    new Date(right.movedAt) - new Date(left.movedAt) || Number(right.id) - Number(left.id)
  );
}

async function refreshDashboard() {
  setGlobalError('');
  byId('connection-label').textContent = 'Actualizando';
  byId('connection-label').previousElementSibling.className = 'connection-dot';
  try {
    await loadReferenceData();
    const [stocksResult, movementsResult, alertsResult, ordersResult, duplicateResult] = await Promise.allSettled([
      loadStocks(),
      loadMovements(),
      api('/api/alerts/reorder'),
      api('/api/purchase-orders'),
      api('/api/orders/possible-duplicates')
    ]);
    const failures = [];
    if (stocksResult.status === 'rejected') failures.push(stocksResult.reason.message);
    if (movementsResult.status === 'rejected') failures.push(movementsResult.reason.message);
    if (alertsResult.status === 'fulfilled') state.alerts = alertsResult.value.alerts || [];
    else failures.push(alertsResult.reason.message);
    if (ordersResult.status === 'fulfilled') state.orders = ordersResult.value;
    else failures.push(ordersResult.reason.message);
    if (duplicateResult.status === 'fulfilled') state.duplicates = duplicateResult.value.duplicates || [];
    else failures.push(duplicateResult.reason.message);
    if (failures.length) throw new Error(failures.join(' '));
    byId('connection-label').textContent = 'Conectado';
    byId('connection-label').previousElementSibling.className = 'connection-dot online';
    byId('notification-dot').classList.toggle('hidden', state.alerts.length === 0);
    byId('nav-alert-count').textContent = String(state.alerts.length);
    renderAll();
  } catch (error) {
    byId('connection-label').textContent = 'Sin conexión';
    byId('connection-label').previousElementSibling.className = 'connection-dot offline';
    setGlobalError(`${error.message} Configura MySQL, ejecuta las migraciones y carga la semilla.`);
    renderAll();
  }
}

function renderAll() {
  renderMetrics();
  renderChart();
  renderAlerts();
  renderRecentMovements();
  renderInventory();
  renderMovements();
  renderOrders();
  renderSuppliers();
  renderActivity();
}

function renderMetrics() {
  byId('metric-materials').textContent = formatNumber(state.materials.length);
  const totalUnits = state.stock.reduce((sum, item) => sum + Number(item.stockOnHand), 0);
  byId('metric-units').textContent = formatNumber(totalUnits);
  const affected = new Set(state.alerts.map(alert => `${alert.materialId}-${alert.warehouseId}`));
  byId('metric-reorder').textContent = formatNumber(affected.size);
  byId('metric-orders').textContent = formatNumber(state.orders.filter(order => order.status === 'PENDING_APPROVAL').length);
  byId('alert-count').textContent = formatNumber(affected.size);
  byId('nav-alert-count').textContent = formatNumber(affected.size);
  byId('metric-reorder-note').textContent = affected.size === 1 ? 'Material bajo el punto de reorden' : 'Materiales bajo el punto de reorden';
}

function aggregateMaterialStock() {
  return state.materials.map(material => {
    const rows = state.stock.filter(row => Number(row.material.id) === Number(material.id));
    const stockOnHand = rows.reduce((sum, row) => sum + Number(row.stockOnHand), 0);
    const policy = rows[0]?.policy || { reorderPoint: 0, safetyStock: 0 };
    return { material, rows, stockOnHand, policy, status: stockOnHand < Number(policy.reorderPoint) ? 'REORDER' : 'OK' };
  });
}

function renderChart() {
  const items = aggregateMaterialStock().sort((left, right) =>
    (left.status === right.status ? left.stockOnHand / Math.max(1, left.policy.reorderPoint) - right.stockOnHand / Math.max(1, right.policy.reorderPoint) : left.status === 'REORDER' ? -1 : 1)
  ).slice(0, 5);
  if (!items.length) {
    byId('inventory-chart').innerHTML = '<div class="empty-state">No hay materiales para mostrar.</div>';
    return;
  }
  byId('inventory-chart').innerHTML = items.map(item => {
    const scale = Math.max(1, Number(item.stockOnHand), Number(item.policy.reorderPoint));
    const threshold = Math.min(100, Number(item.policy.reorderPoint) / scale * 100);
    const width = Math.min(100, Math.max(0, Number(item.stockOnHand) / scale * 100));
    return `<div class="chart-row">
      <span class="chart-name" title="${escapeHtml(item.material.name)}">${escapeHtml(item.material.name)}</span>
      <span class="chart-track"><i class="chart-threshold" style="left:${threshold}%"></i><i class="chart-fill${item.status === 'REORDER' ? ' low' : ''}" style="width:${width}%"></i></span>
      <span class="chart-value">${formatNumber(item.stockOnHand)} ${escapeHtml(item.material.unit?.code || '')}</span>
    </div>`;
  }).join('');
}

function renderAlerts() {
  const alerts = state.alerts.slice(0, 4);
  if (!alerts.length) {
    byId('dashboard-alerts').innerHTML = '<div class="empty-state">Todo en orden. No hay materiales por reabastecer.</div>';
    return;
  }
  byId('dashboard-alerts').innerHTML = alerts.map(alert => `
    <div class="alert-row">
      <span class="alert-symbol">${icon('alert')}</span>
      <div class="alert-copy"><strong>${escapeHtml(alert.material?.name || 'Material')}</strong><span>${escapeHtml(alert.warehouse?.name || 'Bodega')} · ${formatNumber(alert.stockOnHand)} disponibles</span></div>
      <span class="alert-level">Mín. ${formatNumber(alert.reorderPoint)}</span>
    </div>`).join('');
}

function renderRecentMovements() {
  const rows = state.movements.slice(0, 5);
  byId('recent-movements').innerHTML = rows.length ? rows.map(movement => movementRow(movement, true)).join('') :
    '<tr><td colspan="6" class="empty-state">Aún no se registran movimientos.</td></tr>';
}

function renderInventory() {
  const warehouseId = byId('warehouse-filter').value;
  const statusFilter = byId('stock-filter').value;
  const search = byId('inventory-search').value.trim().toLowerCase();
  const rows = [];
  for (const material of state.materials) {
    const materialStocks = state.stock.filter(row => Number(row.material.id) === Number(material.id) &&
      (!warehouseId || Number(row.id) === Number(warehouseId)));
    if (!materialStocks.length && warehouseId) continue;
    for (const row of materialStocks) {
      const currentStatus = Number(row.stockOnHand) < Number(row.policy.reorderPoint) ? 'REORDER' : 'OK';
      if (statusFilter && currentStatus !== statusFilter) continue;
      if (search && !`${material.name} ${material.code} ${material.category?.name || ''}`.toLowerCase().includes(search)) continue;
      rows.push({ ...row, currentStatus });
    }
  }
  byId('inventory-count').textContent = `${formatNumber(rows.length)} ${rows.length === 1 ? 'registro' : 'registros'}`;
  byId('inventory-caption').textContent = warehouseId
    ? 'Existencias calculadas a partir de los movimientos en la bodega seleccionada.'
    : 'Existencias calculadas a partir de los movimientos por bodega.';
  byId('inventory-rows').innerHTML = rows.length ? rows.map(row => {
    const material = row.material;
    const low = row.currentStatus === 'REORDER';
    return `<tr>
      <td><div class="table-material"><span class="material-avatar">${escapeHtml(initials(material.name))}</span><span class="material-name"><strong>${escapeHtml(material.name)}</strong><span>${escapeHtml(material.code)}</span></span></div></td>
      <td>${escapeHtml(material.category?.name || 'Sin categoría')}</td>
      <td>${escapeHtml(row.name || '')}</td>
      <td><span class="quantity">${formatNumber(row.stockOnHand)}</span><span class="unit-muted">${escapeHtml(material.unit?.code || '')}</span></td>
      <td>${formatNumber(row.policy.reorderPoint)} <span class="unit-muted">${escapeHtml(material.unit?.code || '')}</span></td>
      <td><span class="status-pill ${low ? 'low' : 'ok'}">${low ? 'Reponer' : 'Disponible'}</span></td>
      <td><button class="action-icon" type="button" data-trace="${escapeHtml(material.id)}" aria-label="Ver trazabilidad de ${escapeHtml(material.name)}">${icon('eye')}</button></td>
    </tr>`;
  }).join('') : '<tr><td colspan="7" class="empty-state">No se encontraron materiales con esos filtros.</td></tr>';
}

function movementRow(movement, compact = false) {
  const [label, type] = movementLabel(movement.movementType);
  const material = movement.material || {};
  const warehouse = movement.movementType === 'TRANSFER'
    ? `${movement.sourceWarehouse?.name || '—'} → ${movement.destinationWarehouse?.name || '—'}`
    : movement.destinationWarehouse?.name || movement.sourceWarehouse?.name || '—';
  if (compact) return `<tr>
    <td><div class="table-material"><span class="material-avatar">${escapeHtml(initials(material.name))}</span><span class="material-name"><strong>${escapeHtml(material.name || 'Material')}</strong><span>${escapeHtml(material.code || '')}</span></span></div></td>
    <td><span class="type-pill ${type}">${label}</span></td><td>${escapeHtml(warehouse)}</td>
    <td>${escapeHtml(movement.originDocument)}</td><td>${formatDate(movement.movedAt, { year: false })}</td>
    <td><span class="quantity">${formatNumber(movement.quantity)}</span><span class="unit-muted">${escapeHtml(material.unit?.code || '')}</span></td>
  </tr>`;
  return `<tr>
    <td>${formatDate(movement.movedAt, { time: true })}</td>
    <td><div class="table-material"><span class="material-avatar">${escapeHtml(initials(material.name))}</span><span class="material-name"><strong>${escapeHtml(material.name || 'Material')}</strong><span>${escapeHtml(material.code || '')}</span></span></div></td>
    <td><span class="type-pill ${type}">${label}</span></td><td>${escapeHtml(warehouse)}</td>
    <td>${escapeHtml(movement.originDocument)}</td><td>${escapeHtml(movement.performedBy?.name || '—')}</td>
    <td><span class="quantity">${formatNumber(movement.quantity)}</span><span class="unit-muted">${escapeHtml(material.unit?.code || '')}</span></td>
  </tr>`;
}

function renderMovements() {
  const search = byId('movement-search').value.trim().toLowerCase();
  const rows = state.movements.filter(movement => {
    const material = movement.material || {};
    return !search || `${material.name || ''} ${material.code || ''} ${movement.originDocument || ''} ${movement.movementType || ''}`.toLowerCase().includes(search);
  });
  byId('movement-rows').innerHTML = rows.length
    ? rows.map(movement => movementRow(movement)).join('')
    : '<tr><td colspan="7" class="empty-state">No se encontraron movimientos.</td></tr>';
}

function renderOrders() {
  const search = byId('order-search').value.trim().toLowerCase();
  const filtered = state.orders.filter(order =>
    !search || `${order.number} ${order.supplier?.name || ''} ${order.project?.name || ''}`.toLowerCase().includes(search)
  );
  const duplicates = state.duplicates;
  byId('duplicate-banner').innerHTML = duplicates.length ? `
    <div class="duplicate-notice"><span class="alert-symbol">${icon('alert')}</span>
      <div class="duplicate-copy"><strong>${duplicates.length} posible${duplicates.length === 1 ? '' : 's'} compra${duplicates.length === 1 ? '' : 's'} duplicada${duplicates.length === 1 ? '' : 's'}.</strong> ${duplicates.slice(0, 2).map(pair => `${escapeHtml(pair.firstOrder)} y ${escapeHtml(pair.secondOrder)}`).join(' · ')}. Confirma la recepción antes de pagar.</div>
      <button type="button" id="show-duplicates">Revisar</button>
    </div>` : '';
  byId('order-rows').innerHTML = filtered.length ? filtered.map(order => {
    const [status, statusClass] = statusLabel(order.status);
    const requiredRole = order.approvalStep === 0 ? order.approvalRule?.firstApproverRole : order.approvalRule?.secondApproverRole;
    const approvals = (order.approvals || []).map(approval => `${roleLabel(approval.approver?.role)}: ${approval.decision === 'APPROVED' ? 'aprobó' : 'rechazó'}`).join(' · ');
    const action = order.status === 'PENDING_APPROVAL'
      ? `<button class="button button-light button-small" type="button" data-approve="${escapeHtml(order.id)}" data-role="${escapeHtml(requiredRole || '')}">Revisar aprobación</button>`
      : '<span class="table-secondary">—</span>';
    return `<tr>
      <td><strong class="order-number">${escapeHtml(order.number)}</strong></td>
      <td>${escapeHtml(order.supplier?.name || '—')}</td>
      <td>${escapeHtml(order.project?.name || '—')}</td>
      <td>${formatDate(order.orderDate, { year: false })}</td>
      <td><span class="quantity">${formatMoney(order.totalAmount, order.currency)}</span></td>
      <td><span class="status-pill ${statusClass}">${status}</span></td>
      <td>${approvals ? `<span class="table-secondary">${escapeHtml(approvals)}</span>` : '<span class="table-secondary">Por aprobar</span>'}</td>
      <td>${action}</td>
    </tr>`;
  }).join('') : '<tr><td colspan="8" class="empty-state">No hay órdenes de compra para mostrar.</td></tr>';
}

function renderSuppliers() {
  if (!state.suppliers.length) {
    byId('supplier-grid').innerHTML = '<div class="empty-state">No hay proveedores registrados.</div>';
    return;
  }
  byId('supplier-grid').innerHTML = state.suppliers.map(supplier => {
    const orders = state.orders.filter(order => Number(order.supplierId) === Number(supplier.id));
    const total = orders.reduce((sum, order) => sum + Number(order.totalAmount), 0);
    return `<article class="supplier-card">
      <div class="supplier-card-head"><span class="supplier-logo">${escapeHtml(initials(supplier.name))}</span><span><strong>${escapeHtml(supplier.name)}</strong><span>${escapeHtml(supplier.code)}</span></span></div>
      <div class="supplier-detail"><span>Correo</span><strong>${escapeHtml(supplier.email || 'No registrado')}</strong></div>
      <div class="supplier-detail"><span>Teléfono</span><strong>${escapeHtml(supplier.phone || 'No registrado')}</strong></div>
      <div class="supplier-detail"><span>Órdenes registradas</span><strong>${formatNumber(orders.length)}</strong></div>
      <div class="supplier-detail"><span>Monto histórico</span><strong>${formatMoney(total)}</strong></div>
    </article>`;
  }).join('');
}

function renderActivity() {
  byId('activity-rows').innerHTML = state.activity.length ? state.activity.map(item => `
    <tr><td>${formatDate(item.createdAt, { time: true })}</td><td>${escapeHtml(item.action)}</td>
    <td>${escapeHtml(item.entityType)}</td><td>${escapeHtml(item.entityId ?? '—')}</td>
    <td>${escapeHtml(JSON.stringify(item.details || {}))}</td></tr>`).join('') :
    '<tr><td colspan="5" class="empty-state">Todavía no hay actividad registrada.</td></tr>';
}

async function loadActivity() {
  try {
    state.activity = await api('/api/audit-logs?limit=100');
    renderActivity();
  } catch (error) {
    showToast(error.message, 'error');
  }
}

function openModal({ title, kicker = 'INVENTARIO', form, onOpen } = {}) {
  byId('modal-title').textContent = title;
  byId('modal-kicker').textContent = kicker;
  ['movement-form', 'order-form', 'approval-form', 'traceability-content'].forEach(id => byId(id).classList.add('hidden'));
  if (form) byId(form).classList.remove('hidden');
  byId('modal-backdrop').classList.remove('hidden');
  document.body.style.overflow = 'hidden';
  if (onOpen) onOpen();
  const first = byId('modal-backdrop').querySelector('.form-content:not(.hidden) input, .form-content:not(.hidden) select');
  if (first) window.setTimeout(() => first.focus(), 0);
}

function closeModal() {
  byId('modal-backdrop').classList.add('hidden');
  document.body.style.overflow = '';
  ['movement-error', 'order-error', 'approval-error'].forEach(id => {
    byId(id).classList.add('hidden');
    byId(id).textContent = '';
  });
}

function showFormError(id, message) {
  byId(id).textContent = message;
  byId(id).classList.remove('hidden');
}

function openMovementModal() {
  byId('movement-form').reset();
  byId('movement-user').value = state.users.find(user => user.role === 'WAREHOUSE_OPERATOR')?.id || '';
  byId('movement-type').value = 'ENTRY';
  updateMovementFields();
  openModal({ title: 'Registrar movimiento', kicker: 'CONTROL DE INVENTARIO', form: 'movement-form' });
}

function updateMovementFields() {
  const type = byId('movement-type').value;
  const sourceField = byId('source-field');
  const destinationField = byId('destination-field');
  const adjustmentField = byId('adjustment-field');
  const source = byId('movement-source');
  const destination = byId('movement-destination');
  const adjustment = byId('adjustment-direction').value;
  sourceField.classList.toggle('hidden', type === 'ENTRY' || (type === 'ADJUSTMENT' && adjustment === 'IN'));
  destinationField.classList.toggle('hidden', type === 'EXIT' || (type === 'ADJUSTMENT' && adjustment === 'OUT'));
  adjustmentField.classList.toggle('hidden', type !== 'ADJUSTMENT');
  source.required = !sourceField.classList.contains('hidden');
  destination.required = !destinationField.classList.contains('hidden');
  const origin = byId('movement-origin');
  if (type === 'ENTRY') origin.value = 'PURCHASE_ORDER';
  else if (type === 'EXIT') origin.value = 'ISSUE_VOUCHER';
  else if (type === 'TRANSFER') origin.value = 'TRANSFER';
  else origin.value = 'ADJUSTMENT';
}

async function submitMovement(event) {
  event.preventDefault();
  const form = event.currentTarget;
  if (!form.reportValidity()) return;
  const data = new FormData(form);
  const body = {
    materialId: Number(data.get('materialId')),
    movementType: data.get('movementType'),
    quantity: Number(data.get('quantity')),
    performedByUserId: Number(data.get('performedByUserId')),
    originType: data.get('originType'),
    originDocument: String(data.get('originDocument')).trim(),
    notes: String(data.get('notes') || '').trim() || null
  };
  const type = body.movementType;
  const adjustmentDirection = data.get('adjustmentDirection');
  if (type === 'ENTRY' || (type === 'ADJUSTMENT' && adjustmentDirection === 'IN')) {
    body.destinationWarehouseId = Number(data.get('destinationWarehouseId'));
  } else {
    body.sourceWarehouseId = Number(data.get('sourceWarehouseId'));
  }
  if (type === 'TRANSFER') body.destinationWarehouseId = Number(data.get('destinationWarehouseId'));
  if (type === 'ADJUSTMENT') body.adjustmentDirection = adjustmentDirection;
  try {
    const result = await api('/api/movements', { method: 'POST', body: JSON.stringify(body) });
    closeModal();
    showToast(`Movimiento registrado. Existencia actual: ${formatNumber(result.stockOnHand)} unidades.`);
    await refreshDashboard();
    if (state.activePage === 'activity') await loadActivity();
  } catch (error) {
    showFormError('movement-error', error.message);
  }
}

function addOrderLine() {
  const container = byId('order-lines');
  const line = document.createElement('div');
  line.className = 'line-item';
  line.innerHTML = `
    <label class="form-field"><span>Material</span><select class="line-material" required><option value="">Selecciona</option>${optionsHtml(state.materials, material => `${material.name} · ${material.code}`)}</select></label>
    <label class="form-field"><span>Cantidad</span><input class="line-quantity" type="number" min="0.001" step="0.001" placeholder="0" required></label>
    <label class="form-field"><span>Precio unit.</span><input class="line-price" type="number" min="0" step="0.01" placeholder="0.00" required></label>
    <button class="remove-line" type="button" aria-label="Eliminar línea">×</button>`;
  container.appendChild(line);
  line.querySelector('.remove-line').addEventListener('click', () => {
    line.remove();
    if (!container.children.length) addOrderLine();
    updateOrderTotal();
  });
  line.querySelectorAll('input, select').forEach(element => element.addEventListener('input', updateOrderTotal));
  updateOrderTotal();
}

function updateOrderTotal() {
  const total = [...document.querySelectorAll('.line-item')].reduce((sum, line) => {
    const quantity = Number(line.querySelector('.line-quantity').value) || 0;
    const price = Number(line.querySelector('.line-price').value) || 0;
    return sum + quantity * price;
  }, 0);
  const currency = byId('order-form').elements.currency.value || 'CRC';
  byId('order-total').textContent = formatMoney(total, currency);
}

function openOrderModal() {
  byId('order-form').reset();
  byId('order-lines').innerHTML = '';
  addOrderLine();
  updateOrderTotal();
  openModal({ title: 'Crear orden de compra', kicker: 'GESTIÓN DE COMPRAS', form: 'order-form' });
}

async function submitOrder(event) {
  event.preventDefault();
  const form = event.currentTarget;
  if (!form.reportValidity()) return;
  const data = new FormData(form);
  const lines = [...document.querySelectorAll('.line-item')].map(line => ({
    materialId: Number(line.querySelector('.line-material').value),
    quantity: Number(line.querySelector('.line-quantity').value),
    unitPrice: Number(line.querySelector('.line-price').value)
  }));
  if (!lines.length || lines.some(line => !line.materialId || !line.quantity || line.unitPrice < 0)) {
    showFormError('order-error', 'Agrega por lo menos una línea válida con material, cantidad y precio.');
    return;
  }
  const body = {
    supplierId: Number(data.get('supplierId')),
    projectId: Number(data.get('projectId')),
    requestedByUserId: Number(data.get('requestedByUserId')),
    categoryId: Number(data.get('categoryId')),
    quoteCount: Number(data.get('quoteCount')),
    currency: data.get('currency'),
    lines
  };
  try {
    const result = await api('/api/purchase-orders', { method: 'POST', body: JSON.stringify(body) });
    closeModal();
    showToast(`Orden ${result.order.number} creada y enviada a aprobación. Total acumulado: ${formatMoney(result.cumulativeAmount)}.`);
    await refreshDashboard();
    navigate('orders');
  } catch (error) {
    showFormError('order-error', error.message);
  }
}

function openApprovalModal(orderId) {
  const order = state.orders.find(item => Number(item.id) === Number(orderId));
  if (!order) return showToast('No se encontró la orden seleccionada.', 'error');
  const role = order.approvalStep === 0 ? order.approvalRule?.firstApproverRole : order.approvalRule?.secondApproverRole;
  if (!role) return showToast('No se encontró un rol de aprobación para esta orden. Revisa las reglas configuradas.', 'error');
  const candidates = state.users.filter(user => user.role === role && Number(user.id) !== Number(order.requestedByUserId));
  byId('approval-user').innerHTML = candidates.length
    ? optionsHtml(candidates, user => user.name)
    : '<option value="">No hay usuarios activos con este rol</option>';
  byId('approval-role-help').textContent = `Esta etapa requiere: ${roleLabel(role)}.`;
  byId('approval-summary').innerHTML = `<span>Orden <strong>${escapeHtml(order.number)}</strong><br>${escapeHtml(order.supplier?.name || 'Proveedor')}</span><strong>${formatMoney(order.totalAmount, order.currency)}</strong>`;
  byId('approval-form').dataset.orderId = String(order.id);
  byId('approval-form').elements.decision.value = 'APPROVED';
  openModal({ title: 'Aprobar orden de compra', kicker: 'FLUJO DE APROBACIONES', form: 'approval-form' });
}

async function submitApproval(event) {
  event.preventDefault();
  const form = event.currentTarget;
  if (!form.reportValidity()) return;
  const data = new FormData(form);
  const orderId = form.dataset.orderId;
  try {
    await api(`/api/purchase-orders/${orderId}/approvals`, {
      method: 'POST',
      body: JSON.stringify({
        approverUserId: Number(data.get('approverUserId')),
        decision: data.get('decision'),
        comments: String(data.get('comments') || '').trim() || null
      })
    });
    const decision = data.get('decision');
    closeModal();
    showToast(decision === 'APPROVED' ? 'Aprobación registrada correctamente.' : 'Orden rechazada.');
    await refreshDashboard();
    navigate('orders');
  } catch (error) {
    showFormError('approval-error', error.message);
  }
}

async function openTraceability(materialId) {
  try {
    const result = await api(`/api/materials/${materialId}/traceability`);
    byId('traceability-content').classList.remove('hidden');
    const material = result.material;
    byId('modal-title').textContent = 'Trazabilidad del material';
    byId('modal-kicker').textContent = 'HISTORIAL DE INVENTARIO';
    byId('traceability-content').innerHTML = `
      <div class="trace-product"><div><strong>${escapeHtml(material.name)}</strong><span>${escapeHtml(material.code)} · ${escapeHtml(material.unit?.name || '')}</span></div><span class="status-pill ok">${result.movements.length} movimientos</span></div>
      <div class="trace-list">${result.movements.length ? result.movements.map(movement => {
        const [label] = movementLabel(movement.movementType);
        const location = movement.movementType === 'TRANSFER'
          ? `${movement.sourceWarehouse?.name || '—'} → ${movement.destinationWarehouse?.name || '—'}`
          : movement.destinationWarehouse?.name || movement.sourceWarehouse?.name || '—';
        return `<div class="trace-item"><span class="trace-point"></span><div><strong>${escapeHtml(label)} · ${escapeHtml(location)}</strong><span>${formatDate(movement.movedAt, { time: true })} · ${escapeHtml(movement.performedBy?.name || 'Usuario')}<br>Documento: ${escapeHtml(movement.originDocument)}</span></div><em>${formatNumber(movement.quantity)} ${escapeHtml(material.unit?.code || '')}</em></div>`;
      }).join('') : '<div class="empty-state">Este material aún no tiene movimientos.</div>'}</div>
      <div class="modal-actions"><button class="button button-light modal-close" type="button">Cerrar</button></div>`;
    byId('modal-backdrop').classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  } catch (error) {
    showToast(error.message, 'error');
  }
}

async function refreshOrders() {
  try {
    const [orders, duplicates] = await Promise.all([
      api('/api/purchase-orders'),
      api('/api/orders/possible-duplicates')
    ]);
    state.orders = orders;
    state.duplicates = duplicates.duplicates || [];
    renderOrders();
    renderMetrics();
  } catch (error) {
    showToast(error.message, 'error');
  }
}

function init() {
  document.querySelectorAll('[data-page]').forEach(element => {
    element.addEventListener('click', event => {
      event.preventDefault();
      navigate(element.dataset.page);
    });
  });
  byId('primary-action').onclick = openMovementModal;
  document.querySelectorAll('[data-action="movement"]').forEach(button => button.addEventListener('click', openMovementModal));
  document.querySelectorAll('[data-action="order"]').forEach(button => button.addEventListener('click', openOrderModal));
  byId('movement-type').addEventListener('change', updateMovementFields);
  byId('adjustment-direction').addEventListener('change', updateMovementFields);
  byId('movement-form').addEventListener('submit', submitMovement);
  byId('order-form').addEventListener('submit', submitOrder);
  byId('approval-form').addEventListener('submit', submitApproval);
  byId('add-order-line').addEventListener('click', addOrderLine);
  byId('order-form').elements.currency.addEventListener('change', updateOrderTotal);
  byId('menu-toggle').addEventListener('click', () => byId('sidebar').classList.toggle('open'));
  byId('inventory-search').addEventListener('input', renderInventory);
  byId('warehouse-filter').addEventListener('change', renderInventory);
  byId('stock-filter').addEventListener('change', renderInventory);
  byId('inventory-refresh').addEventListener('click', refreshDashboard);
  byId('movement-search').addEventListener('input', renderMovements);
  byId('movement-refresh').addEventListener('click', refreshDashboard);
  byId('order-search').addEventListener('input', renderOrders);
  byId('orders-refresh').addEventListener('click', refreshOrders);
  byId('activity-refresh').addEventListener('click', loadActivity);
  byId('modal-backdrop').addEventListener('click', event => {
    if (event.target === byId('modal-backdrop') || event.target.closest('.modal-close')) closeModal();
    const traceButton = event.target.closest('[data-trace]');
    if (traceButton) openTraceability(traceButton.dataset.trace);
  });
  document.body.addEventListener('click', event => {
    const traceButton = event.target.closest('[data-trace]');
    if (traceButton && !byId('modal-backdrop').contains(traceButton)) openTraceability(traceButton.dataset.trace);
    const approveButton = event.target.closest('[data-approve]');
    if (approveButton) openApprovalModal(approveButton.dataset.approve);
  });
  byId('duplicate-banner').addEventListener('click', event => {
    if (event.target.id === 'show-duplicates') {
      const rows = state.duplicates.map(pair => `${pair.firstOrder} ↔ ${pair.secondOrder} · material ${pair.materialId} · ${pair.daysApart} días`).join('\n');
      window.alert(`Posibles órdenes duplicadas\n\n${rows}`);
    }
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      closeModal();
      byId('sidebar').classList.remove('open');
    }
  });
  byId('today-label').textContent = new Intl.DateTimeFormat('es-CR', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric'
  }).format(new Date());
  refreshDashboard();
}

init();
