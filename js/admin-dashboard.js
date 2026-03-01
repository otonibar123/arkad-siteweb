/* ========================================
   Arkad Consulting — Admin Dashboard
   ======================================== */

/* --- State --- */
var adminClients = [];
var currentClientId = null;
var pendingDeleteType = null; // 'invoice' or 'contract'
var pendingDeleteId = null;
var pendingDeleteFilePath = null;

/* --- View Switching --- */
function showClientsView() {
  document.getElementById('view-clients').classList.add('admin-view--active');
  document.getElementById('view-client-detail').classList.remove('admin-view--active');
  currentClientId = null;
}

function showClientDetail(clientId) {
  currentClientId = clientId;
  document.getElementById('view-clients').classList.remove('admin-view--active');
  document.getElementById('view-client-detail').classList.add('admin-view--active');

  var client = null;
  for (var i = 0; i < adminClients.length; i++) {
    if (adminClients[i].id === clientId) {
      client = adminClients[i];
      break;
    }
  }

  if (client) {
    document.getElementById('detail-client-name').textContent = client.full_name || 'Client';
    var info = [];
    if (client.email) info.push(client.email);
    if (client.company) info.push(client.company);
    document.getElementById('detail-client-info').textContent = info.join(' — ') || '';
  }

  loadAdminInvoices(clientId);
  loadAdminContracts(clientId);
  initDetailTabs();
}

/* --- Detail Tabs --- */
function initDetailTabs() {
  var tabs = document.querySelectorAll('#view-client-detail .portal-tab');
  var sections = document.querySelectorAll('#view-client-detail .portal-section');

  for (var i = 0; i < tabs.length; i++) {
    tabs[i].removeEventListener('click', handleDetailTabClick);
    tabs[i].addEventListener('click', handleDetailTabClick);
  }
}

function handleDetailTabClick() {
  var tabs = document.querySelectorAll('#view-client-detail .portal-tab');
  var sections = document.querySelectorAll('#view-client-detail .portal-section');
  var target = this.getAttribute('data-tab');

  for (var j = 0; j < tabs.length; j++) {
    tabs[j].classList.remove('portal-tab--active');
  }
  for (var j = 0; j < sections.length; j++) {
    sections[j].classList.remove('portal-section--active');
  }
  this.classList.add('portal-tab--active');
  var targetSection = document.getElementById(target);
  if (targetSection) targetSection.classList.add('portal-section--active');
}

/* --- Load Clients --- */
function loadClients() {
  _supabase
    .from('profiles')
    .select('id, full_name, company, email')
    .eq('is_admin', false)
    .order('full_name', { ascending: true })
    .then(function (result) {
      if (result.error) {
        adminClients = [];
        renderClients([]);
        return;
      }
      adminClients = result.data || [];
      loadClientCounts();
    });
}

function loadClientCounts() {
  var invoicePromise = _supabase
    .from('invoices')
    .select('user_id');

  var contractPromise = _supabase
    .from('contracts')
    .select('user_id');

  Promise.all([invoicePromise, contractPromise]).then(function (results) {
    var invoices = (results[0].data || []);
    var contracts = (results[1].data || []);

    var invoiceCounts = {};
    for (var i = 0; i < invoices.length; i++) {
      var uid = invoices[i].user_id;
      invoiceCounts[uid] = (invoiceCounts[uid] || 0) + 1;
    }

    var contractCounts = {};
    for (var i = 0; i < contracts.length; i++) {
      var uid = contracts[i].user_id;
      contractCounts[uid] = (contractCounts[uid] || 0) + 1;
    }

    for (var i = 0; i < adminClients.length; i++) {
      adminClients[i]._invoiceCount = invoiceCounts[adminClients[i].id] || 0;
      adminClients[i]._contractCount = contractCounts[adminClients[i].id] || 0;
    }

    renderClients(adminClients);
  });
}

function renderClients(clients) {
  var tbody = document.getElementById('clients-tbody');
  var emptyState = document.getElementById('clients-empty');
  var tableWrap = document.getElementById('clients-table-wrap');
  var countEl = document.getElementById('admin-client-count');

  if (!clients || clients.length === 0) {
    tableWrap.style.display = 'none';
    emptyState.style.display = 'block';
    countEl.textContent = '0 client';
    return;
  }

  countEl.textContent = clients.length + ' client' + (clients.length > 1 ? 's' : '');
  tableWrap.style.display = 'block';
  emptyState.style.display = 'none';

  var html = '';
  for (var i = 0; i < clients.length; i++) {
    var c = clients[i];
    html += '<tr>';
    html += '<td data-label="Nom">' + escapeHtml(c.full_name || '—') + '</td>';
    html += '<td data-label="Email">' + escapeHtml(c.email || '—') + '</td>';
    html += '<td data-label="Entreprise">' + escapeHtml(c.company || '—') + '</td>';
    html += '<td data-label="Factures">' + (c._invoiceCount || 0) + '</td>';
    html += '<td data-label="Contrats">' + (c._contractCount || 0) + '</td>';
    html += '<td data-label="Action"><button class="admin-action-btn admin-action-btn--manage" onclick="showClientDetail(\'' + escapeAttr(c.id) + '\')">G\u00e9rer</button></td>';
    html += '</tr>';
  }
  tbody.innerHTML = html;
}

/* --- Client Search --- */
function initSearch() {
  var input = document.getElementById('admin-search-input');
  if (!input) return;

  input.addEventListener('input', function () {
    var query = this.value.trim().toLowerCase();
    if (!query) {
      renderClients(adminClients);
      return;
    }
    var filtered = [];
    for (var i = 0; i < adminClients.length; i++) {
      var c = adminClients[i];
      var name = (c.full_name || '').toLowerCase();
      var email = (c.email || '').toLowerCase();
      var company = (c.company || '').toLowerCase();
      if (name.indexOf(query) !== -1 || email.indexOf(query) !== -1 || company.indexOf(query) !== -1) {
        filtered.push(c);
      }
    }
    renderClients(filtered);
  });
}

/* ========================================
   Invoices CRUD
   ======================================== */

function loadAdminInvoices(userId) {
  var tbody = document.getElementById('admin-invoices-tbody');
  var emptyState = document.getElementById('admin-invoices-empty');
  var tableWrap = document.getElementById('admin-invoices-table-wrap');

  _supabase
    .from('invoices')
    .select('*')
    .eq('user_id', userId)
    .order('issued_date', { ascending: false })
    .then(function (result) {
      if (result.error || !result.data || result.data.length === 0) {
        tableWrap.style.display = 'none';
        emptyState.style.display = 'block';
        return;
      }

      var html = '';
      for (var i = 0; i < result.data.length; i++) {
        var inv = result.data[i];
        var statusClass = inv.status || 'pending';
        var statusLabel = STATUS_LABELS[inv.status] || inv.status;
        html += '<tr>';
        html += '<td data-label="N\u00b0">' + escapeHtml(inv.invoice_number) + '</td>';
        html += '<td data-label="Libell\u00e9">' + escapeHtml(inv.label) + '</td>';
        html += '<td data-label="Date">' + formatDate(inv.issued_date) + '</td>';
        html += '<td data-label="Montant HT">' + formatCurrency(inv.amount_ht) + '</td>';
        html += '<td data-label="Montant TTC">' + formatCurrency(inv.amount_ttc) + '</td>';
        html += '<td data-label="Statut"><span class="portal-badge portal-badge--' + statusClass + '">' + statusLabel + '</span></td>';
        html += '<td data-label="PDF">';
        if (inv.file_path) {
          html += '<button class="portal-download-btn" onclick="downloadFile(\'invoices\', \'' + escapeAttr(inv.file_path) + '\')">PDF</button>';
        } else {
          html += '<span style="color:var(--creme-35)">\u2014</span>';
        }
        html += '</td>';
        html += '<td data-label="Actions"><div class="admin-actions">';
        html += '<button class="admin-action-btn admin-action-btn--edit" onclick="editInvoice(\'' + escapeAttr(inv.id) + '\')">Modifier</button>';
        html += '<button class="admin-action-btn admin-action-btn--delete" onclick="confirmDeleteInvoice(\'' + escapeAttr(inv.id) + '\', \'' + escapeAttr(inv.file_path || '') + '\')">Supprimer</button>';
        html += '</div></td>';
        html += '</tr>';
      }
      tbody.innerHTML = html;
      tableWrap.style.display = 'block';
      emptyState.style.display = 'none';
    });
}

function openInvoiceModal(invoiceData) {
  var form = document.getElementById('form-invoice');
  var title = document.getElementById('modal-invoice-title');
  var fileCurrentEl = document.getElementById('invoice-file-current');
  form.reset();
  document.getElementById('invoice-id').value = '';
  fileCurrentEl.textContent = '';

  if (invoiceData) {
    title.textContent = 'Modifier la facture';
    document.getElementById('invoice-id').value = invoiceData.id;
    document.getElementById('invoice-number').value = invoiceData.invoice_number || '';
    document.getElementById('invoice-label').value = invoiceData.label || '';
    document.getElementById('invoice-date').value = invoiceData.issued_date || '';
    document.getElementById('invoice-amount-ht').value = invoiceData.amount_ht || '';
    document.getElementById('invoice-amount-ttc').value = invoiceData.amount_ttc || '';
    document.getElementById('invoice-status').value = invoiceData.status || 'pending';
    if (invoiceData.file_path) {
      fileCurrentEl.textContent = 'Fichier actuel : ' + invoiceData.file_path.split('/').pop();
    }
  } else {
    title.textContent = 'Nouvelle facture';
  }
  openModal('modal-invoice');
}

function editInvoice(invoiceId) {
  _supabase
    .from('invoices')
    .select('*')
    .eq('id', invoiceId)
    .single()
    .then(function (result) {
      if (result.error || !result.data) {
        alert('Erreur lors du chargement de la facture.');
        return;
      }
      openInvoiceModal(result.data);
    });
}

function handleInvoiceSubmit(e) {
  e.preventDefault();
  var submitBtn = document.getElementById('invoice-submit-btn');
  submitBtn.disabled = true;
  submitBtn.textContent = 'Enregistrement...';

  var invoiceId = document.getElementById('invoice-id').value;
  var fileInput = document.getElementById('invoice-file');
  var file = fileInput.files[0];

  var invoiceData = {
    invoice_number: document.getElementById('invoice-number').value.trim(),
    label: document.getElementById('invoice-label').value.trim(),
    issued_date: document.getElementById('invoice-date').value,
    amount_ht: parseFloat(document.getElementById('invoice-amount-ht').value),
    amount_ttc: parseFloat(document.getElementById('invoice-amount-ttc').value),
    status: document.getElementById('invoice-status').value
  };

  if (!invoiceId) {
    invoiceData.user_id = currentClientId;
  }

  if (file) {
    uploadFile('invoices', currentClientId, file, function (filePath) {
      invoiceData.file_path = filePath;
      saveInvoice(invoiceId, invoiceData, submitBtn);
    }, function (err) {
      alert('Erreur upload : ' + err);
      submitBtn.disabled = false;
      submitBtn.textContent = 'Enregistrer';
    });
  } else {
    saveInvoice(invoiceId, invoiceData, submitBtn);
  }
}

function saveInvoice(invoiceId, data, submitBtn) {
  var query;
  if (invoiceId) {
    query = _supabase.from('invoices').update(data).eq('id', invoiceId);
  } else {
    query = _supabase.from('invoices').insert(data);
  }

  query.then(function (result) {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Enregistrer';
    if (result.error) {
      alert('Erreur : ' + result.error.message);
      return;
    }
    closeModal('modal-invoice');
    loadAdminInvoices(currentClientId);
    loadClientCounts();
  });
}

function confirmDeleteInvoice(invoiceId, filePath) {
  pendingDeleteType = 'invoice';
  pendingDeleteId = invoiceId;
  pendingDeleteFilePath = filePath || null;
  document.getElementById('confirm-message').textContent = 'Supprimer cette facture ?';
  openModal('modal-confirm');
}

function deleteInvoice(invoiceId, filePath) {
  _supabase
    .from('invoices')
    .delete()
    .eq('id', invoiceId)
    .then(function (result) {
      if (result.error) {
        alert('Erreur : ' + result.error.message);
        return;
      }
      if (filePath) {
        _supabase.storage.from('invoices').remove([filePath]);
      }
      closeModal('modal-confirm');
      loadAdminInvoices(currentClientId);
      loadClientCounts();
    });
}

/* ========================================
   Contracts CRUD
   ======================================== */

function loadAdminContracts(userId) {
  var tbody = document.getElementById('admin-contracts-tbody');
  var emptyState = document.getElementById('admin-contracts-empty');
  var tableWrap = document.getElementById('admin-contracts-table-wrap');

  _supabase
    .from('contracts')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .then(function (result) {
      if (result.error || !result.data || result.data.length === 0) {
        tableWrap.style.display = 'none';
        emptyState.style.display = 'block';
        return;
      }

      var html = '';
      for (var i = 0; i < result.data.length; i++) {
        var c = result.data[i];
        var statusClass = c.status || 'active';
        var statusLabel = STATUS_LABELS[c.status] || c.status;
        html += '<tr>';
        html += '<td data-label="Titre">' + escapeHtml(c.title) + '</td>';
        html += '<td data-label="Description">' + escapeHtml(c.description || '\u2014') + '</td>';
        html += '<td data-label="Date de signature">' + formatDate(c.signed_date) + '</td>';
        html += '<td data-label="Statut"><span class="portal-badge portal-badge--' + statusClass + '">' + statusLabel + '</span></td>';
        html += '<td data-label="PDF">';
        if (c.file_path) {
          html += '<button class="portal-download-btn" onclick="downloadFile(\'contracts\', \'' + escapeAttr(c.file_path) + '\')">PDF</button>';
        } else {
          html += '<span style="color:var(--creme-35)">\u2014</span>';
        }
        html += '</td>';
        html += '<td data-label="Actions"><div class="admin-actions">';
        html += '<button class="admin-action-btn admin-action-btn--edit" onclick="editContract(\'' + escapeAttr(c.id) + '\')">Modifier</button>';
        html += '<button class="admin-action-btn admin-action-btn--delete" onclick="confirmDeleteContract(\'' + escapeAttr(c.id) + '\', \'' + escapeAttr(c.file_path || '') + '\')">Supprimer</button>';
        html += '</div></td>';
        html += '</tr>';
      }
      tbody.innerHTML = html;
      tableWrap.style.display = 'block';
      emptyState.style.display = 'none';
    });
}

function openContractModal(contractData) {
  var form = document.getElementById('form-contract');
  var title = document.getElementById('modal-contract-title');
  var fileCurrentEl = document.getElementById('contract-file-current');
  form.reset();
  document.getElementById('contract-id').value = '';
  fileCurrentEl.textContent = '';

  if (contractData) {
    title.textContent = 'Modifier le contrat';
    document.getElementById('contract-id').value = contractData.id;
    document.getElementById('contract-title').value = contractData.title || '';
    document.getElementById('contract-description').value = contractData.description || '';
    document.getElementById('contract-signed-date').value = contractData.signed_date || '';
    document.getElementById('contract-status').value = contractData.status || 'active';
    if (contractData.file_path) {
      fileCurrentEl.textContent = 'Fichier actuel : ' + contractData.file_path.split('/').pop();
    }
  } else {
    title.textContent = 'Nouveau contrat';
  }
  openModal('modal-contract');
}

function editContract(contractId) {
  _supabase
    .from('contracts')
    .select('*')
    .eq('id', contractId)
    .single()
    .then(function (result) {
      if (result.error || !result.data) {
        alert('Erreur lors du chargement du contrat.');
        return;
      }
      openContractModal(result.data);
    });
}

function handleContractSubmit(e) {
  e.preventDefault();
  var submitBtn = document.getElementById('contract-submit-btn');
  submitBtn.disabled = true;
  submitBtn.textContent = 'Enregistrement...';

  var contractId = document.getElementById('contract-id').value;
  var fileInput = document.getElementById('contract-file');
  var file = fileInput.files[0];

  var contractData = {
    title: document.getElementById('contract-title').value.trim(),
    description: document.getElementById('contract-description').value.trim(),
    signed_date: document.getElementById('contract-signed-date').value,
    status: document.getElementById('contract-status').value
  };

  if (!contractId) {
    contractData.user_id = currentClientId;
  }

  if (file) {
    uploadFile('contracts', currentClientId, file, function (filePath) {
      contractData.file_path = filePath;
      saveContract(contractId, contractData, submitBtn);
    }, function (err) {
      alert('Erreur upload : ' + err);
      submitBtn.disabled = false;
      submitBtn.textContent = 'Enregistrer';
    });
  } else {
    saveContract(contractId, contractData, submitBtn);
  }
}

function saveContract(contractId, data, submitBtn) {
  var query;
  if (contractId) {
    query = _supabase.from('contracts').update(data).eq('id', contractId);
  } else {
    query = _supabase.from('contracts').insert(data);
  }

  query.then(function (result) {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Enregistrer';
    if (result.error) {
      alert('Erreur : ' + result.error.message);
      return;
    }
    closeModal('modal-contract');
    loadAdminContracts(currentClientId);
    loadClientCounts();
  });
}

function confirmDeleteContract(contractId, filePath) {
  pendingDeleteType = 'contract';
  pendingDeleteId = contractId;
  pendingDeleteFilePath = filePath || null;
  document.getElementById('confirm-message').textContent = 'Supprimer ce contrat ?';
  openModal('modal-confirm');
}

function deleteContract(contractId, filePath) {
  _supabase
    .from('contracts')
    .delete()
    .eq('id', contractId)
    .then(function (result) {
      if (result.error) {
        alert('Erreur : ' + result.error.message);
        return;
      }
      if (filePath) {
        _supabase.storage.from('contracts').remove([filePath]);
      }
      closeModal('modal-confirm');
      loadAdminContracts(currentClientId);
      loadClientCounts();
    });
}

/* ========================================
   File Upload
   ======================================== */

function uploadFile(bucket, userId, file, onSuccess, onError) {
  var timestamp = Date.now();
  var safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  var filePath = userId + '/' + timestamp + '_' + safeName;

  _supabase.storage
    .from(bucket)
    .upload(filePath, file, { upsert: true })
    .then(function (result) {
      if (result.error) {
        onError(result.error.message);
        return;
      }
      onSuccess(filePath);
    });
}

/* ========================================
   Modals
   ======================================== */

function openModal(modalId) {
  document.getElementById(modalId).classList.add('admin-modal--active');
}

function closeModal(modalId) {
  document.getElementById(modalId).classList.remove('admin-modal--active');
}

/* ========================================
   Confirm Delete Handler
   ======================================== */

function initConfirmDelete() {
  var btn = document.getElementById('confirm-delete-btn');
  if (!btn) return;

  btn.addEventListener('click', function () {
    if (pendingDeleteType === 'invoice' && pendingDeleteId) {
      deleteInvoice(pendingDeleteId, pendingDeleteFilePath);
    } else if (pendingDeleteType === 'contract' && pendingDeleteId) {
      deleteContract(pendingDeleteId, pendingDeleteFilePath);
    }
    pendingDeleteType = null;
    pendingDeleteId = null;
    pendingDeleteFilePath = null;
  });
}

/* ========================================
   Admin Init
   ======================================== */

function initAdmin() {
  var loadingEl = document.getElementById('admin-loading');
  var dashboardEl = document.getElementById('admin-dashboard');

  guardAdmin(function (session) {
    loadClients();
    initSearch();
    initConfirmDelete();

    loadingEl.style.display = 'none';
    dashboardEl.style.display = 'block';
  });

  // Logout button
  var logoutBtn = document.getElementById('btn-logout');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', function () {
      handleLogout();
    });
  }
}
