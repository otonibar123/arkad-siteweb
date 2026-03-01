/* ========================================
   Arkad Consulting — Portal Dashboard
   ======================================== */

/* --- Status Labels --- */
var STATUS_LABELS = {
  pending: 'En attente',
  paid: 'Payée',
  overdue: 'En retard',
  active: 'Actif',
  completed: 'Terminé',
  draft: 'Brouillon',
  cancelled: 'Annulé'
};

/* --- Format Date (DD/MM/YYYY) --- */
function formatDate(dateStr) {
  if (!dateStr) return '—';
  var d = new Date(dateStr);
  var day = ('0' + d.getDate()).slice(-2);
  var month = ('0' + (d.getMonth() + 1)).slice(-2);
  var year = d.getFullYear();
  return day + '/' + month + '/' + year;
}

/* --- Format Currency --- */
function formatCurrency(amount) {
  if (amount === null || amount === undefined) return '—';
  return parseFloat(amount).toLocaleString('fr-FR', {
    style: 'currency',
    currency: 'EUR'
  });
}

/* --- Load Profile --- */
function loadProfile(userId) {
  var welcomeEl = document.getElementById('portal-welcome');
  var companyEl = document.getElementById('portal-company');

  _supabase
    .from('profiles')
    .select('full_name, company')
    .eq('id', userId)
    .single()
    .then(function (result) {
      if (result.data) {
        var name = result.data.full_name || 'Client';
        welcomeEl.textContent = 'Bonjour, ' + name;
        if (result.data.company) {
          companyEl.textContent = result.data.company;
        }
      }
    });
}

/* --- Load Invoices --- */
function loadInvoices(userId) {
  var tbody = document.getElementById('invoices-tbody');
  var emptyState = document.getElementById('invoices-empty');
  var tableWrap = document.getElementById('invoices-table-wrap');

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
        html += '<td data-label="N°">' + escapeHtml(inv.invoice_number) + '</td>';
        html += '<td data-label="Libellé">' + escapeHtml(inv.label) + '</td>';
        html += '<td data-label="Date">' + formatDate(inv.issued_date) + '</td>';
        html += '<td data-label="Montant HT">' + formatCurrency(inv.amount_ht) + '</td>';
        html += '<td data-label="Montant TTC">' + formatCurrency(inv.amount_ttc) + '</td>';
        html += '<td data-label="Statut"><span class="portal-badge portal-badge--' + statusClass + '">' + statusLabel + '</span></td>';
        html += '<td data-label="Télécharger">';
        if (inv.file_path) {
          html += '<button class="portal-download-btn" onclick="downloadFile(\'invoices\', \'' + escapeAttr(inv.file_path) + '\')">PDF</button>';
        }
        html += '</td>';
        html += '</tr>';
      }
      tbody.innerHTML = html;
      tableWrap.style.display = 'block';
      emptyState.style.display = 'none';
    });
}

/* --- Load Contracts --- */
function loadContracts(userId) {
  var tbody = document.getElementById('contracts-tbody');
  var emptyState = document.getElementById('contracts-empty');
  var tableWrap = document.getElementById('contracts-table-wrap');

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
        html += '<td data-label="Description">' + escapeHtml(c.description || '—') + '</td>';
        html += '<td data-label="Date de signature">' + formatDate(c.signed_date) + '</td>';
        html += '<td data-label="Statut"><span class="portal-badge portal-badge--' + statusClass + '">' + statusLabel + '</span></td>';
        html += '<td data-label="Télécharger">';
        if (c.file_path) {
          html += '<button class="portal-download-btn" onclick="downloadFile(\'contracts\', \'' + escapeAttr(c.file_path) + '\')">PDF</button>';
        }
        html += '</td>';
        html += '</tr>';
      }
      tbody.innerHTML = html;
      tableWrap.style.display = 'block';
      emptyState.style.display = 'none';
    });
}

/* --- Download File --- */
function downloadFile(bucket, filePath) {
  _supabase.storage
    .from(bucket)
    .createSignedUrl(filePath, 3600)
    .then(function (result) {
      if (result.error) {
        alert('Erreur lors du téléchargement : ' + result.error.message);
        return;
      }
      window.open(result.data.signedUrl, '_blank');
    });
}

/* --- Escape HTML --- */
function escapeHtml(str) {
  if (!str) return '';
  var div = document.createElement('div');
  div.appendChild(document.createTextNode(str));
  return div.innerHTML;
}

/* --- Escape Attribute --- */
function escapeAttr(str) {
  if (!str) return '';
  return str.replace(/'/g, "\\'").replace(/"/g, '&quot;');
}

/* --- Tab Switching --- */
function initTabs() {
  var tabs = document.querySelectorAll('.portal-tab');
  var sections = document.querySelectorAll('.portal-section');

  for (var i = 0; i < tabs.length; i++) {
    tabs[i].addEventListener('click', function () {
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
    });
  }
}

/* --- Dashboard Init --- */
function initDashboard() {
  var loadingEl = document.getElementById('portal-loading');
  var dashboardEl = document.getElementById('portal-dashboard');

  guardAuth(function (session) {
    var userId = session.user.id;

    loadProfile(userId);
    loadInvoices(userId);
    loadContracts(userId);
    initTabs();

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
