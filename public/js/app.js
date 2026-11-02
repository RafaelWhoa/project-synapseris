/**
 * SynapseRIS — Frontend Controller (RIS + Orthanc PACS + HL7 FHIR R4)
 */

const appState = {
  profile: 'admin', // 'admin' | 'radiologist'
  adminUserName: 'Mariana Costa — Coordenação RIS/PACS',
  activeRadiologistId: 'prac-rad-01',
  previousView: 'admin',
  currentView: 'admin',
  orthancConfig: {
    url: 'http://localhost:8042',
    port: 8042,
    defaultViewer: 'stone-webviewer'
  },
  orthancStatus: {
    online: false,
    mode: 'DEMO_FALLBACK'
  },
  radiologists: [],
  reportTemplates: [],
  metrics: {
    totalStudies: 0,
    unassigned: 0,
    inProgress: 0,
    finalized: 0,
    urgentCases: 0,
    modalityDistribution: {}
  },
  worklist: [],
  activeCaseId: null,
  assigningCaseId: null,
  viewerMode: 'simulator', // 'iframe' | 'simulator'
  selectedViewerEngine: 'stone-webviewer',
  dicomSim: {
    slice: 18,
    maxSlices: 48,
    windowWidth: 1500,
    windowLevel: -500,
    inverted: false,
    zoom: 1.0
  }
};

const MODALITY_META = {
  CT: { label: 'CT — Tomografia', color: '#0ea5e9' },
  MR: { label: 'MR — Ressonância', color: '#a855f7' },
  CR: { label: 'CR — Radiografia Comp.', color: '#f59e0b' },
  DX: { label: 'DX — Radiografia Dig.', color: '#10b981' },
  US: { label: 'US — Ultrassonografia', color: '#6366f1' },
  PT: { label: 'PT — PET-CT Nuclear', color: '#f43f5e' }
};

const STATUS_LABELS = {
  unassigned: { text: 'Não Atribuído', cls: 'status-unassigned' },
  awaiting: { text: 'Aguardando Laudo', cls: 'status-awaiting' },
  draft: { text: 'Rascunho', cls: 'status-draft' },
  final: { text: 'Finalizado', cls: 'status-final' }
};

/* ==========================================================================
   INICIALIZAÇÃO E CARREGAMENTO DE DADOS DA API
   ========================================================================== */
document.addEventListener('DOMContentLoaded', async () => {
  await loadInitialData();
  setupCanvasWheelListener();
});

async function loadInitialData(syncOrthanc = false) {
  try {
    const [configRes, worklistRes] = await Promise.all([
      fetch('/api/config').then((r) => r.json()),
      fetch(`/api/worklist${syncOrthanc ? '?syncOrthanc=true' : ''}`).then((r) => r.json())
    ]);

    appState.orthancConfig = configRes.orthancConfig || appState.orthancConfig;
    appState.orthancStatus = configRes.orthancStatus || appState.orthancStatus;
    appState.radiologists = worklistRes.radiologists || configRes.radiologists || [];
    appState.reportTemplates = worklistRes.reportTemplates || configRes.reportTemplates || [];
    appState.metrics = worklistRes.metrics || appState.metrics;
    appState.worklist = worklistRes.items || [];

    if (appState.radiologists.length > 0 && !appState.activeRadiologistId) {
      appState.activeRadiologistId = appState.radiologists[0].id;
    }

    populateStaticSelectors();
    updateOrthancStatusUI();
    renderDashboardMetrics();
    renderModalityDonutChart();
    renderAdminWorklist();
    renderRadiologistWorklist();
  } catch (err) {
    showToast('Erro ao carregar dados iniciais do servidor RIS.', 'error');
    console.error(err);
  }
}

function populateStaticSelectors() {
  const loginRadSelect = document.getElementById('login-radiologist-select');
  const activeRadFilter = document.getElementById('active-radiologist-filter');
  const assignModalSelect = document.getElementById('assign-modal-select');
  const loginOrthancInput = document.getElementById('login-orthanc-url');

  if (loginOrthancInput && appState.orthancConfig.url) {
    loginOrthancInput.value = appState.orthancConfig.url;
  }

  const radOptionsHtml = appState.radiologists
    .map((r) => `<option value="${r.id}">${r.name} — ${r.specialty} (${r.crm})</option>`)
    .join('');

  if (loginRadSelect) loginRadSelect.innerHTML = radOptionsHtml;
  if (activeRadFilter) {
    activeRadFilter.innerHTML = radOptionsHtml;
    activeRadFilter.value = appState.activeRadiologistId;
  }
  if (assignModalSelect) {
    assignModalSelect.innerHTML =
      `<option value="">-- Deixar Não Atribuído --</option>` + radOptionsHtml;
  }

  // Templates de Laudo
  const tplSelect = document.getElementById('ws-template-select');
  if (tplSelect) {
    tplSelect.innerHTML =
      `<option value="">Selecione um modelo estruturado de laudo...</option>` +
      appState.reportTemplates
        .map((t) => `<option value="${t.id}">[${t.modality}] ${t.title}</option>`)
        .join('');
  }
}

/* ==========================================================================
   1. AUTENTICAÇÃO E ALTERNÂNCIA DE PERFIS
   ========================================================================== */
function selectLoginProfile(profile) {
  appState.profile = profile;
  const btnAdmin = document.getElementById('role-btn-admin');
  const btnRad = document.getElementById('role-btn-radiologist');
  const adminFields = document.getElementById('login-admin-fields');
  const radFields = document.getElementById('login-radiologist-fields');

  if (profile === 'admin') {
    btnAdmin.classList.add('active');
    btnRad.classList.remove('active');
    adminFields.classList.remove('hidden');
    radFields.classList.add('hidden');
  } else {
    btnRad.classList.add('active');
    btnAdmin.classList.remove('active');
    radFields.classList.remove('hidden');
    adminFields.classList.add('hidden');
  }
}

function enterApplication() {
  const adminUserSelect = document.getElementById('login-admin-user');
  const radUserSelect = document.getElementById('login-radiologist-select');

  if (appState.profile === 'admin') {
    appState.adminUserName = adminUserSelect ? adminUserSelect.value : 'Administrador RIS';
  } else if (radUserSelect && radUserSelect.value) {
    appState.activeRadiologistId = radUserSelect.value;
    const filterEl = document.getElementById('active-radiologist-filter');
    if (filterEl) filterEl.value = appState.activeRadiologistId;
  }

  updateTopbarUserIdentity();

  document.getElementById('login-screen').classList.add('hidden');
  document.getElementById('app-shell').classList.remove('hidden');

  if (appState.profile === 'admin') {
    switchView('admin');
    showToast('Sessão iniciada como Administrador / Operador RIS.');
  } else {
    switchView('radiologist');
    const rad = getRadiologistById(appState.activeRadiologistId);
    showToast(`Bem-vindo(a), ${rad ? rad.name : 'Médico Radiologista'}.`);
  }
}

function logoutToLoginScreen() {
  document.getElementById('app-shell').classList.add('hidden');
  document.getElementById('login-screen').classList.remove('hidden');
}

function toggleProfileQuick() {
  if (appState.profile === 'admin') {
    appState.profile = 'radiologist';
    updateTopbarUserIdentity();
    switchView('radiologist');
    showToast('Perfil alternado para: Médico Radiologista');
  } else {
    appState.profile = 'admin';
    updateTopbarUserIdentity();
    switchView('admin');
    showToast('Perfil alternado para: Administrador / Operador');
  }
}

function updateTopbarUserIdentity() {
  const avatarEl = document.getElementById('active-user-avatar');
  const nameEl = document.getElementById('active-user-name');
  const roleEl = document.getElementById('active-user-role');

  if (appState.profile === 'admin') {
    avatarEl.textContent = 'AD';
    avatarEl.style.background = 'linear-gradient(135deg, #0ea5e9, #6366f1)';
    nameEl.textContent = appState.adminUserName.split('—')[0].trim();
    roleEl.textContent = 'Administrador / Operador';
  } else {
    const rad = getRadiologistById(appState.activeRadiologistId) || appState.radiologists[0];
    avatarEl.textContent = rad ? rad.avatar : 'MD';
    avatarEl.style.background = 'linear-gradient(135deg, #10b981, #0ea5e9)';
    nameEl.textContent = rad ? rad.name : 'Médico Radiologista';
    roleEl.textContent = rad ? `Médico Radiologista • ${rad.crm.split('/')[0].trim()}` : 'Médico Radiologista';
  }
}

function getRadiologistById(id) {
  return appState.radiologists.find((r) => r.id === id) || null;
}

function switchView(viewName) {
  if (appState.currentView !== 'workspace') {
    appState.previousView = appState.currentView;
  }
  appState.currentView = viewName;

  const views = {
    admin: document.getElementById('admin-view'),
    radiologist: document.getElementById('radiologist-view'),
    workspace: document.getElementById('workspace-view')
  };

  Object.entries(views).forEach(([key, el]) => {
    if (!el) return;
    if (key === viewName) {
      el.classList.remove('hidden');
    } else {
      el.classList.add('hidden');
    }
  });

  ['admin', 'radiologist', 'workspace'].forEach((tab) => {
    const btn = document.getElementById(`nav-${tab}`);
    if (btn) {
      btn.classList.toggle('active', tab === viewName);
    }
  });

  if (viewName === 'admin') {
    renderDashboardMetrics();
    renderModalityDonutChart();
    renderAdminWorklist();
  } else if (viewName === 'radiologist') {
    renderRadiologistWorklist();
  }
}

function openWorkspaceDefault() {
  const targetCase =
    appState.worklist.find((c) => c.caseId === appState.activeCaseId) ||
    appState.worklist.find((c) => c.workflow.status === 'draft' || c.workflow.status === 'awaiting') ||
    appState.worklist[0];

  if (targetCase) {
    openReportingWorkspace(targetCase.caseId);
  }
}

/* ==========================================================================
   2. STATUS ORTHANC PACS & MÉTRICAS DO DASHBOARD ADMIN
   ========================================================================== */
async function checkAndSyncOrthanc(notify = false) {
  try {
    await loadInitialData(true);
    if (notify) {
      if (appState.orthancStatus.online) {
        showToast(`Orthanc PACS Online em ${appState.orthancConfig.url}! Estudos sincronizados.`);
      } else {
        showToast(
          `Orthanc local (${appState.orthancConfig.url}) não respondeu ao ping HTTP; operando 100% com Worklist HL7 FHIR R4 integrada.`
        );
      }
    }
  } catch (err) {
    if (notify) showToast('Modo demonstração HL7 FHIR ativo.', 'info');
  }
}

function updateOrthancStatusUI() {
  const dot = document.getElementById('orthanc-status-dot');
  const txt = document.getElementById('orthanc-status-text');
  const badgeMode = document.getElementById('orthanc-badge-mode');
  const urlEl = document.getElementById('info-orthanc-url');
  const viewerEl = document.getElementById('info-orthanc-viewer');
  const detailedMsg = document.getElementById('orthanc-detailed-msg');
  const directLink = document.getElementById('orthanc-direct-link');

  const orthUrl = appState.orthancConfig.url || 'http://localhost:8042';
  if (urlEl) urlEl.textContent = orthUrl;
  if (viewerEl) viewerEl.textContent = appState.orthancConfig.defaultViewer || 'stone-webviewer';
  if (directLink) directLink.href = orthUrl;

  if (appState.orthancStatus && appState.orthancStatus.online) {
    dot.className = 'status-dot online';
    txt.textContent = `Orthanc Online (:8042)`;
    if (badgeMode) {
      badgeMode.innerHTML = `<span class="status-badge status-final">● CONECTADO AO ORTHANC PACS</span>`;
    }
    if (detailedMsg) {
      const sys = appState.orthancStatus.system || {};
      detailedMsg.textContent = `Instância '${sys.name || 'Orthanc'}' (v${sys.version || '1.x'}, AET: ${sys.dicomAet || 'ORTHANC'}) respondendo em ${orthUrl}.`;
    }
  } else {
    dot.className = 'status-dot demo';
    txt.textContent = `Orthanc :8042 (Demo / Proxy)`;
    if (badgeMode) {
      badgeMode.innerHTML = `<span class="status-badge status-awaiting">● PROXY PACS + MODO DEMO HL7 FHIR</span>`;
    }
    if (detailedMsg) {
      detailedMsg.textContent = `Endpoint configurado para ${orthUrl}. Caso o navegador ou container bloqueie acesso direto, o Simulador DICOM e os mocks HL7 FHIR R4 operam automaticamente.`;
    }
  }
}

function renderDashboardMetrics() {
  const m = appState.metrics;
  setText('kpi-total-studies', m.totalStudies ?? 0);
  setText('kpi-unassigned', m.unassigned ?? 0);
  setText('kpi-in-progress', m.inProgress ?? 0);
  setText('kpi-finalized', m.finalized ?? 0);
  setText('kpi-urgent', m.urgentCases ?? 0);
}

/**
 * Renderiza o Gráfico Donut SVG de distribuição de modalidades (CT, MR, CR, DX, US, PT)
 */
function renderModalityDonutChart() {
  const svg = document.getElementById('modality-donut-svg');
  const legendContainer = document.getElementById('modality-legend-container');
  const totalNumEl = document.getElementById('donut-total-num');
  if (!svg || !legendContainer) return;

  const dist = appState.metrics.modalityDistribution || {};
  const modalities = ['CT', 'MR', 'CR', 'DX', 'US', 'PT'];
  const total = modalities.reduce((acc, mod) => acc + (dist[mod] || 0), 0);

  if (totalNumEl) totalNumEl.textContent = total;

  // Construção dos segmentos no círculo de raio r = 15.9155 (circunferência = 100)
  let cumulativePercent = 0;
  let circlesHtml = `
    <circle cx="21" cy="21" r="15.91549430918954" fill="transparent" stroke="#1e293b" stroke-width="5.5"></circle>
  `;

  let legendHtml = '';

  modalities.forEach((mod) => {
    const count = dist[mod] || 0;
    const pct = total > 0 ? (count / total) * 100 : 0;
    const meta = MODALITY_META[mod] || { label: mod, color: '#38bdf8' };

    if (count > 0) {
      const dashArray = `${pct} ${100 - pct}`;
      const dashOffset = 25 - cumulativePercent;
      circlesHtml += `
        <circle
          cx="21"
          cy="21"
          r="15.91549430918954"
          fill="transparent"
          stroke="${meta.color}"
          stroke-width="5.5"
          stroke-dasharray="${dashArray}"
          stroke-dashoffset="${dashOffset}"
        >
          <title>${meta.label}: ${count} exames (${pct.toFixed(1)}%)</title>
        </circle>
      `;
      cumulativePercent += pct;
    }

    legendHtml += `
      <div class="legend-item">
        <div class="legend-item-left">
          <span class="legend-swatch" style="background: ${meta.color};"></span>
          <span><strong>${mod}</strong> <span style="color: var(--text-secondary); font-size: 11px;">${meta.label.split('—')[1] || ''}</span></span>
        </div>
        <span style="font-family: var(--font-mono); font-weight: 700;">
          ${count} <span style="color: var(--text-muted); font-weight: 400;">(${pct.toFixed(0)}%)</span>
        </span>
      </div>
    `;
  });

  svg.innerHTML = circlesHtml;
  legendContainer.innerHTML = legendHtml;
}

/* ==========================================================================
   3. TABELA DE EXAMES — VISÃO ADMINISTRADOR
   ========================================================================== */
function renderAdminWorklist() {
  const tbody = document.getElementById('admin-worklist-tbody');
  const countEl = document.getElementById('admin-table-count');
  if (!tbody) return;

  const query = (document.getElementById('admin-search-input')?.value || '').trim().toLowerCase();
  const modFilter = document.getElementById('admin-filter-modality')?.value || 'ALL';
  const statusFilter = document.getElementById('admin-filter-status')?.value || 'ALL';
  const prioFilter = document.getElementById('admin-filter-priority')?.value || 'ALL';

  const filtered = appState.worklist.filter((item) => {
    if (modFilter !== 'ALL' && item.dicom.Modality !== modFilter) return false;
    if (statusFilter !== 'ALL' && item.workflow.status !== statusFilter) return false;
    if (prioFilter !== 'ALL' && item.workflow.priority !== prioFilter) return false;

    if (query) {
      const haystack = [
        item.dicom.PatientName,
        item.dicom.PatientID,
        item.dicom.AccessionNumber,
        item.dicom.StudyDescription,
        item.workflow.originHospital,
        item.workflow.assignedRadiologist?.name || ''
      ]
        .join(' ')
        .toLowerCase();
      if (!haystack.includes(query)) return false;
    }
    return true;
  });

  if (countEl) countEl.textContent = filtered.length;

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="9" style="text-align: center; padding: 32px; color: var(--text-secondary);">
          Nenhum exame encontrado para os filtros selecionados.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = filtered
    .map((item) => {
      const age = calculateAge(item.dicom.PatientBirthDate);
      const dobFormatted = formatDateBR(item.dicom.PatientBirthDate);
      const receivedFormatted = formatDateTimeBR(item.workflow.receivedAt);
      const statusMeta = STATUS_LABELS[item.workflow.status] || STATUS_LABELS.unassigned;
      const rad = item.workflow.assignedRadiologist;

      return `
        <tr>
          <td class="patient-cell">
            <div class="p-name">${escapeHtml(item.dicom.PatientName)}</div>
            <div class="p-sub">ID: ${escapeHtml(item.dicom.PatientID)} &bull; Nasc: ${dobFormatted} (${age}a)</div>
          </td>
          <td class="study-cell">
            <div class="s-desc">${escapeHtml(item.dicom.StudyDescription)}</div>
            <div class="s-uid">Acc: ${escapeHtml(item.dicom.AccessionNumber)} &bull; ${item.fhir.ImagingStudy.numberOfSeries} séries (${item.fhir.ImagingStudy.numberOfInstances} img)</div>
          </td>
          <td>
            <div style="font-weight: 500;">${escapeHtml(item.workflow.originHospital)}</div>
          </td>
          <td>
            <span class="modality-badge mod-${item.dicom.Modality}">${item.dicom.Modality}</span>
          </td>
          <td>
            <span class="priority-badge ${item.workflow.priority === 'urgent' ? 'priority-urgent' : 'priority-routine'}">
              ${item.workflow.priority === 'urgent' ? '⚡ URGENTE' : 'ROTINA'}
            </span>
          </td>
          <td style="font-family: var(--font-mono); font-size: 12px;">
            ${receivedFormatted}
          </td>
          <td>
            ${
              rad
                ? `<div style="font-weight: 600;">${escapeHtml(rad.name)}</div>
                   <div style="font-size: 11px; color: var(--text-secondary);">${escapeHtml(rad.crm.split('/')[0])}</div>`
                : `<span style="color: #fbbf24; font-size: 12px; font-weight: 600;">⚠ Não Atribuído</span>`
            }
          </td>
          <td>
            <span class="status-badge ${statusMeta.cls}">${statusMeta.text}</span>
          </td>
          <td>
            <div class="action-btn-group">
              <button type="button" class="btn btn-secondary btn-sm" onclick="openAssignModal('${item.caseId}')" title="Atribuir Radiologista">
                👤 Atribuir
              </button>
              <button type="button" class="btn btn-primary btn-sm" onclick="openReportingWorkspace('${item.caseId}')" title="Abrir Estação de Laudo e Viewer DICOM">
                🖥️ Visualizar
              </button>
              <button type="button" class="btn btn-ghost btn-sm" onclick="openPatientHistoryModal('${item.caseId}')" title="Prontuário Clínico e Recursos HL7 FHIR">
                📋 Histórico
              </button>
            </div>
          </td>
        </tr>
      `;
    })
    .join('');
}

/* ==========================================================================
   4. WORKLIST DO MÉDICO RADIOLOGISTA
   ========================================================================== */
function onChangeActiveRadiologist(radiologistId) {
  appState.activeRadiologistId = radiologistId;
  if (appState.profile === 'radiologist') {
    updateTopbarUserIdentity();
  }
  renderRadiologistWorklist();
}

function renderRadiologistWorklist() {
  const tbody = document.getElementById('radiologist-worklist-tbody');
  const countEl = document.getElementById('rad-table-count');
  if (!tbody) return;

  const query = (document.getElementById('rad-search-input')?.value || '').trim().toLowerCase();
  const periodFilter = document.getElementById('rad-filter-period')?.value || 'ALL';
  const modFilter = document.getElementById('rad-filter-modality')?.value || 'ALL';
  const statusFilter = document.getElementById('rad-filter-status')?.value || 'ALL';
  const scopeFilter = document.getElementById('rad-filter-scope')?.value || 'ALL';

  // Data de referência do ambiente (2026-11-02)
  const refNow = new Date('2026-11-02T23:59:59-04:00');

  const filtered = appState.worklist.filter((item) => {
    if (modFilter !== 'ALL' && item.dicom.Modality !== modFilter) return false;
    if (statusFilter !== 'ALL' && item.workflow.status !== statusFilter) return false;

    if (scopeFilter === 'MINE') {
      if (item.workflow.assignedRadiologist?.id !== appState.activeRadiologistId) return false;
    }

    if (periodFilter !== 'ALL') {
      const studyDate = new Date(item.dicom.StudyDate);
      const diffDays = (refNow - studyDate) / (1000 * 60 * 60 * 24);
      if (periodFilter === 'TODAY' && item.dicom.StudyDate.slice(0, 10) !== '2026-11-02') return false;
      if (periodFilter === 'LAST_3_DAYS' && diffDays > 3.5) return false;
      if (periodFilter === 'LAST_7_DAYS' && diffDays > 7.5) return false;
      if (periodFilter === 'LAST_30_DAYS' && diffDays > 30.5) return false;
    }

    if (query) {
      const haystack = [
        item.dicom.PatientName,
        item.dicom.PatientID,
        item.dicom.AccessionNumber,
        item.dicom.StudyDescription,
        item.workflow.clinicalIndication
      ]
        .join(' ')
        .toLowerCase();
      if (!haystack.includes(query)) return false;
    }

    return true;
  });

  if (countEl) countEl.textContent = filtered.length;

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" style="text-align: center; padding: 32px; color: var(--text-secondary);">
          Nenhum estudo encontrado para os filtros aplicados na Worklist do Radiologista.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = filtered
    .map((item) => {
      const age = calculateAge(item.dicom.PatientBirthDate);
      const dobFormatted = formatDateBR(item.dicom.PatientBirthDate);
      const statusMeta = STATUS_LABELS[item.workflow.status] || STATUS_LABELS.unassigned;
      const rad = item.workflow.assignedRadiologist;

      const btnLabel =
        item.workflow.status === 'final'
          ? '🔍 Revisar Laudo'
          : item.workflow.status === 'draft'
            ? '✍️ Continuar Laudo'
            : '🩺 Laudar / Continuar';

      const btnClass = item.workflow.status === 'final' ? 'btn-secondary' : 'btn-primary';

      return `
        <tr>
          <td>
            <span class="priority-badge ${item.workflow.priority === 'urgent' ? 'priority-urgent' : 'priority-routine'}">
              ${item.workflow.priority === 'urgent' ? '⚡ URGENTE' : 'ROTINA'}
            </span>
          </td>
          <td class="patient-cell">
            <div class="p-name">${escapeHtml(item.dicom.PatientName)}</div>
            <div class="p-sub">ID: ${escapeHtml(item.dicom.PatientID)} &bull; ${dobFormatted} (${age}a, ${item.dicom.PatientSex})</div>
          </td>
          <td class="study-cell">
            <div class="s-desc">${escapeHtml(item.dicom.StudyDescription)}</div>
            <div class="s-uid">Acc: ${escapeHtml(item.dicom.AccessionNumber)} &bull; ${escapeHtml(item.workflow.clinicalIndication)}</div>
          </td>
          <td>
            <span class="modality-badge mod-${item.dicom.Modality}">${item.dicom.Modality}</span>
          </td>
          <td style="font-family: var(--font-mono); font-size: 12px;">
            ${formatDateTimeBR(item.workflow.receivedAt)}
          </td>
          <td>
            ${rad ? escapeHtml(rad.name) : '<span style="color: #fbbf24;">Fila Livre</span>'}
          </td>
          <td>
            <span class="status-badge ${statusMeta.cls}">${statusMeta.text}</span>
          </td>
          <td>
            <div class="action-btn-group">
              <button type="button" class="btn ${btnClass} btn-sm" onclick="openReportingWorkspace('${item.caseId}')">
                ${btnLabel}
              </button>
              <button type="button" class="btn btn-ghost btn-sm" onclick="openPatientHistoryModal('${item.caseId}')" title="Ver Prontuário">
                📋
              </button>
            </div>
          </td>
        </tr>
      `;
    })
    .join('');
}

/* ==========================================================================
   5. WORKSPACE DE LAUDO INTEGRADO — SPLIT SCREEN (60% VIEWER / 40% RIS)
   ========================================================================== */
function openReportingWorkspace(caseId) {
  const item = appState.worklist.find((c) => c.caseId === caseId);
  if (!item) return;

  appState.activeCaseId = caseId;
  switchView('workspace');

  // Preenche cabeçalho demográfico
  const age = calculateAge(item.dicom.PatientBirthDate);
  setText('ws-patient-name', item.dicom.PatientName);
  setText('ws-origin-hospital', item.workflow.originHospital);
  setText('ws-patient-id', item.dicom.PatientID);
  setText('ws-patient-dob', `${formatDateBR(item.dicom.PatientBirthDate)} (${age} anos)`);
  setText('ws-patient-sex', `${item.dicom.PatientSex === 'M' ? 'Masculino' : 'Feminino'} • ${item.patientRecord.bloodType}`);
  setText('ws-accession-number', item.dicom.AccessionNumber);
  setText('ws-study-date', formatDateTimeBR(item.dicom.StudyDate));
  setText('ws-patient-allergies', (item.patientRecord.allergies || []).join(', ') || 'Nega alergias');
  setText('ws-clinical-indication', item.workflow.clinicalIndication);

  // Badges de prioridade e status
  const prioBadge = document.getElementById('ws-priority-badge');
  if (prioBadge) {
    prioBadge.className = `priority-badge ${item.workflow.priority === 'urgent' ? 'priority-urgent' : 'priority-routine'}`;
    prioBadge.textContent = item.workflow.priority === 'urgent' ? '⚡ URGENTE' : 'ROTINA';
  }

  const statusMeta = STATUS_LABELS[item.workflow.status] || STATUS_LABELS.unassigned;
  const statusBadge = document.getElementById('ws-status-badge');
  if (statusBadge) {
    statusBadge.className = `status-badge ${statusMeta.cls}`;
    statusBadge.textContent = statusMeta.text;
  }

  // Preenche campos do editor rico
  const sec = item.workflow.reportSections || {};
  document.getElementById('editor-technique').innerText = sec.technique || '';
  document.getElementById('editor-findings').innerText = sec.findings || '';
  document.getElementById('editor-conclusion').innerText = sec.conclusion || '';

  // Banner de assinatura caso finalizado
  const sigBanner = document.getElementById('ws-signature-banner');
  if (sigBanner) {
    if (item.workflow.status === 'final') {
      const signer = item.workflow.assignedRadiologist || getRadiologistById(appState.activeRadiologistId);
      sigBanner.classList.remove('hidden');
      sigBanner.innerHTML = `
        <strong>✔ Laudo Assinado Digitalmente (HL7 FHIR DiagnosticReport.status = final)</strong><br/>
        Responsável: ${escapeHtml(signer ? `${signer.name} (${signer.crm})` : 'Médico Radiologista')} &bull;
        Data/Hora Emissão: ${formatDateTimeBR(sec.signedAt || item.fhir.DiagnosticReport.issued)}
      `;
    } else {
      sigBanner.classList.add('hidden');
    }
  }

  // Configura lado esquerdo (60% DICOM Viewer)
  setupWorkspaceDicomViewer(item);
}

function setupWorkspaceDicomViewer(item) {
  const modBadge = document.getElementById('ws-viewer-modality-badge');
  if (modBadge) {
    modBadge.className = `modality-badge mod-${item.dicom.Modality}`;
    modBadge.textContent = item.dicom.Modality;
  }

  // Atualiza HUD do Simulador / Placeholder
  setText('hud-patient-name', item.dicom.PatientName);
  setText('hud-patient-id', item.dicom.PatientID);
  setText('hud-patient-dob', formatDateBR(item.dicom.PatientBirthDate));
  setText('hud-patient-sex', item.dicom.PatientSex);
  setText('hud-accession', item.dicom.AccessionNumber);
  setText('hud-study-desc', item.dicom.StudyDescription);
  setText('hud-study-uid', item.dicom.StudyInstanceUID);

  const firstSeries = item.fhir.ImagingStudy.series?.[0];
  setText('hud-series-desc', firstSeries ? firstSeries.description : item.dicom.StudyDescription);

  // Ajusta preset padrão conforme modalidade
  if (item.dicom.Modality === 'CT') {
    if (item.dicom.StudyDescription.toUpperCase().includes('CRÂNIO')) {
      setDicomPreset('brain', false);
    } else if (item.dicom.StudyDescription.toUpperCase().includes('ABDOME')) {
      setDicomPreset('abdomen', false);
    } else {
      setDicomPreset('lung', false);
    }
  } else if (item.dicom.Modality === 'MR') {
    appState.dicomSim.windowWidth = 600;
    appState.dicomSim.windowLevel = 300;
  } else {
    appState.dicomSim.windowWidth = 2000;
    appState.dicomSim.windowLevel = 500;
  }

  appState.dicomSim.slice = 18;
  appState.dicomSim.inverted = false;
  const slider = document.getElementById('dicom-slice-slider');
  if (slider) slider.value = 18;

  updateViewerUrlAndMode(item);
  drawDicomSimulatorCanvas();
}

function updateViewerUrlAndMode(item) {
  if (!item) item = appState.worklist.find((c) => c.caseId === appState.activeCaseId);
  if (!item) return;

  const engine = appState.selectedViewerEngine;
  let targetUrl = item.viewerUrls.stoneWebViewer;

  if (engine === 'ohif') {
    targetUrl = item.viewerUrls.ohifViewer;
  } else if (engine === 'explorer.html') {
    targetUrl = item.viewerUrls.orthancExplorer;
  }

  setText('ws-viewer-url-display', targetUrl);
  const extLink = document.getElementById('ws-open-external-viewer');
  if (extLink) extLink.href = targetUrl;

  const connBadge = document.getElementById('hud-orthanc-conn-badge');
  if (connBadge) {
    connBadge.textContent = appState.orthancStatus.online
      ? `● Orthanc PACS Online (${appState.orthancConfig.url}) — Pronto para Iframe / Stone WebViewer`
      : `● Orthanc Viewer URL: ${targetUrl}`;
  }

  const iframeEl = document.getElementById('orthanc-viewer-iframe');
  const placeholderEl = document.getElementById('orthanc-viewer-placeholder');

  // Se o estudo foi sincronizado diretamente do Orthanc ou o usuário escolheu modo iframe
  if (appState.viewerMode === 'iframe' && engine !== 'simulator') {
    iframeEl.src = targetUrl;
    iframeEl.classList.remove('hidden');
    placeholderEl.classList.add('hidden');
  } else {
    iframeEl.classList.add('hidden');
    placeholderEl.classList.remove('hidden');
  }
}

function onChangeViewerEngine(engineValue) {
  appState.selectedViewerEngine = engineValue;
  if (engineValue === 'simulator') {
    appState.viewerMode = 'simulator';
  }
  updateViewerUrlAndMode();
}

function toggleViewerMode() {
  appState.viewerMode = appState.viewerMode === 'iframe' ? 'simulator' : 'iframe';
  updateViewerUrlAndMode();
  if (appState.viewerMode === 'iframe') {
    showToast('Carregando URL do DICOM Viewer Orthanc no container (60%)...');
  } else {
    showToast('Exibindo Simulador Clínico DICOM Multi-Slice.');
    drawDicomSimulatorCanvas();
  }
}

function tryLoadLiveOrthancIframe() {
  appState.viewerMode = 'iframe';
  if (appState.selectedViewerEngine === 'simulator') {
    appState.selectedViewerEngine = 'stone-webviewer';
    const sel = document.getElementById('ws-viewer-engine-select');
    if (sel) sel.value = 'stone-webviewer';
  }
  updateViewerUrlAndMode();
  showToast(`Container iframe apontado para ${ document.getElementById('ws-viewer-url-display')?.textContent }`);
}

/* ==========================================================================
   SIMULADOR VISUAL DICOM INTERATIVO (CANVAS RADIOLÓGICO)
   ========================================================================== */
function onDicomSliceChange(val) {
  appState.dicomSim.slice = Number(val);
  drawDicomSimulatorCanvas();
}

function setDicomPreset(preset, redraw = true) {
  const presets = {
    brain: { w: 80, l: 40 },
    lung: { w: 1500, l: -600 },
    bone: { w: 2500, l: 480 },
    abdomen: { w: 400, l: 50 }
  };
  const p = presets[preset] || presets.lung;
  appState.dicomSim.windowWidth = p.w;
  appState.dicomSim.windowLevel = p.l;
  if (redraw) drawDicomSimulatorCanvas();
}

function toggleDicomInvert() {
  appState.dicomSim.inverted = !appState.dicomSim.inverted;
  drawDicomSimulatorCanvas();
}

function setupCanvasWheelListener() {
  const canvas = document.getElementById('dicom-simulator-canvas');
  if (!canvas) return;
  canvas.addEventListener(
    'wheel',
    (e) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? 1 : -1;
      const next = Math.max(1, Math.min(appState.dicomSim.maxSlices, appState.dicomSim.slice + delta));
      appState.dicomSim.slice = next;
      const slider = document.getElementById('dicom-slice-slider');
      if (slider) slider.value = next;
      drawDicomSimulatorCanvas();
    },
    { passive: false }
  );
}

function drawDicomSimulatorCanvas() {
  const canvas = document.getElementById('dicom-simulator-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;

  const item = appState.worklist.find((c) => c.caseId === appState.activeCaseId);
  const modality = item?.dicom.Modality || 'CT';
  const desc = (item?.dicom.StudyDescription || '').toUpperCase();
  const slice = appState.dicomSim.slice;
  const phase = (slice - 24) / 24; // -1 a +1

  setText('hud-slice-label', `${slice} / ${appState.dicomSim.maxSlices}`);
  setText('hud-wl-label', `W: ${appState.dicomSim.windowWidth} / L: ${appState.dicomSim.windowLevel}`);

  ctx.save();
  ctx.fillStyle = appState.dicomSim.inverted ? '#f1f5f9' : '#020409';
  ctx.fillRect(0, 0, w, h);

  // Grade milimetrada sutil de estação PACS
  ctx.strokeStyle = appState.dicomSim.inverted ? 'rgba(0,0,0,0.08)' : 'rgba(56, 189, 248, 0.08)';
  ctx.lineWidth = 1;
  for (let x = 0; x < w; x += 40) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
  }
  for (let y = 0; y < h; y += 40) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }

  const cx = w / 2;
  const cy = h / 2;
  const scaleRadius = Math.max(0.55, 1 - Math.abs(phase) * 0.35);

  if (modality === 'CT' && !desc.includes('CRÂNIO')) {
    // Corte Axial Torácico / Abdominal Tomográfico
    ctx.strokeStyle = appState.dicomSim.inverted ? '#1e293b' : '#cbd5e1';
    ctx.lineWidth = 6;
    ctx.fillStyle = appState.dicomSim.inverted ? '#cbd5e1' : '#1e293b';
    ctx.beginPath();
    ctx.ellipse(cx, cy, 175 * scaleRadius, 125 * scaleRadius, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Campos pulmonares direito e esquerdo
    ctx.fillStyle = appState.dicomSim.inverted ? '#f8fafc' : '#060a12';
    ctx.beginPath();
    ctx.ellipse(cx - 65 * scaleRadius, cy - 5, 58 * scaleRadius, 82 * scaleRadius, 0.12, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.ellipse(cx + 65 * scaleRadius, cy - 5, 54 * scaleRadius, 80 * scaleRadius, -0.12, 0, Math.PI * 2);
    ctx.fill();

    // Coração / Mediastino
    ctx.fillStyle = appState.dicomSim.inverted ? '#475569' : '#94a3b8';
    ctx.beginPath();
    ctx.ellipse(cx + 12, cy - 12, 34 * scaleRadius, 42 * scaleRadius, 0.25, 0, Math.PI * 2);
    ctx.fill();

    // Corpo vertebral + arcos costais hiperdensos
    ctx.fillStyle = appState.dicomSim.inverted ? '#0f172a' : '#f8fafc';
    ctx.beginPath();
    ctx.arc(cx, cy + 72 * scaleRadius, 18 * scaleRadius, 0, Math.PI * 2);
    ctx.fill();

    // Trama vascular pulmonar
    ctx.strokeStyle = appState.dicomSim.inverted ? '#334155' : 'rgba(148, 163, 184, 0.45)';
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 1.4 - 0.7 + phase * 0.4;
      ctx.beginPath();
      ctx.moveTo(cx - 35 * scaleRadius, cy);
      ctx.lineTo(cx - (65 + Math.cos(angle) * 35) * scaleRadius, cy + Math.sin(angle) * 45 * scaleRadius);
      ctx.stroke();
    }
  } else if (modality === 'MR' || desc.includes('CRÂNIO')) {
    // Corte Axial RM / TC Encéfalo
    ctx.strokeStyle = appState.dicomSim.inverted ? '#0f172a' : '#e2e8f0';
    ctx.lineWidth = 7;
    ctx.fillStyle = appState.dicomSim.inverted ? '#cbd5e1' : '#334155';
    ctx.beginPath();
    ctx.ellipse(cx, cy, 118 * scaleRadius, 148 * scaleRadius, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Foice inter-hemisférica
    ctx.strokeStyle = appState.dicomSim.inverted ? '#334155' : '#94a3b8';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy - 142 * scaleRadius);
    ctx.lineTo(cx, cy + 142 * scaleRadius);
    ctx.stroke();

    // Ventrículos laterais
    ctx.fillStyle = appState.dicomSim.inverted ? '#f8fafc' : '#050811';
    ctx.beginPath();
    ctx.ellipse(cx - 18, cy - 6, 12 * scaleRadius, 32 * scaleRadius, -0.2, 0, Math.PI * 2);
    ctx.ellipse(cx + 18, cy - 6, 12 * scaleRadius, 32 * scaleRadius, 0.2, 0, Math.PI * 2);
    ctx.fill();

    // Foco hiperintenso em DWI caso protocolo AVC (CASE-002)
    if (item?.caseId === 'CASE-002' && slice >= 15 && slice <= 23) {
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.arc(cx - 52 * scaleRadius, cy - 18 * scaleRadius, 6, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (modality === 'PT') {
    // PET-CT Fusão Metabólica
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.ellipse(cx, cy, 155 * scaleRadius, 110 * scaleRadius, 0, 0, Math.PI * 2);
    ctx.fill();

    // Fígado com foco hipermetabólico SUVmáx 8.4 (Hotspot PET)
    const grad = ctx.createRadialGradient(cx - 55, cy - 10, 2, cx - 55, cy - 10, 26);
    grad.addColorStop(0, '#fef08a');
    grad.addColorStop(0.45, '#f43f5e');
    grad.addColorStop(1, 'rgba(244, 63, 94, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx - 55, cy - 10, 26, 0, Math.PI * 2);
    ctx.fill();
  } else if (modality === 'US') {
    // Setor Acústico Convex Ultrassonográfico
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.moveTo(cx, 50);
    ctx.arc(cx, 50, 320, Math.PI * 0.28, Math.PI * 0.72);
    ctx.closePath();
    ctx.fill();

    // Doppler Color Box
    ctx.strokeStyle = '#38bdf8';
    ctx.strokeRect(cx - 70, cy - 30, 140, 90);
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.ellipse(cx - 15, cy + 12, 16, 8, 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#3b82f6';
    ctx.beginPath();
    ctx.ellipse(cx + 18, cy + 18, 14, 7, -0.2, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // Radiografia Digital CR / DX
    ctx.fillStyle = appState.dicomSim.inverted ? '#e2e8f0' : '#0f172a';
    ctx.fillRect(cx - 140, cy - 170, 280, 340);
    ctx.strokeStyle = appState.dicomSim.inverted ? '#1e293b' : '#cbd5e1';
    ctx.lineWidth = 4;
    for (let v = -4; v <= 4; v++) {
      ctx.strokeRect(cx - 26, cy + v * 32 - 12, 52, 22);
    }
  }

  // Marcadores radiológicos Direito (R) / Esquerdo (L) e Escala em cm
  ctx.fillStyle = '#38bdf8';
  ctx.font = 'bold 13px "JetBrains Mono", monospace';
  ctx.fillText('R', 20, cy);
  ctx.fillText('L', w - 30, cy);

  ctx.restore();
}

/* ==========================================================================
   EDITOR DE LAUDO RICO, TEMPLATES, RASCUNHO E ASSINATURA FINAL
   ========================================================================== */
function applySelectedTemplate() {
  const selectEl = document.getElementById('ws-template-select');
  const tplId = selectEl ? selectEl.value : '';
  if (!tplId) {
    showToast('Selecione um template de laudo na lista antes de aplicar.');
    return;
  }

  const tpl = appState.reportTemplates.find((t) => t.id === tplId);
  if (!tpl) return;

  document.getElementById('editor-technique').innerText = tpl.technique;
  document.getElementById('editor-findings').innerText = tpl.findings;
  document.getElementById('editor-conclusion').innerText = tpl.conclusion;

  showToast(`Template "${tpl.title}" aplicado ao editor.`);
}

function execEditorCmd(command) {
  document.execCommand(command, false, null);
}

function insertClinicalSnippet(text) {
  const findingsEl = document.getElementById('editor-findings');
  if (!findingsEl) return;
  const current = findingsEl.innerText.trim();
  findingsEl.innerText = current ? `${current}\n${text}` : text;
  showToast('Trecho padrão inserido na seção de Achados.');
}

async function handleSaveDraft() {
  if (!appState.activeCaseId) return;

  const payload = {
    technique: document.getElementById('editor-technique').innerText.trim(),
    findings: document.getElementById('editor-findings').innerText.trim(),
    conclusion: document.getElementById('editor-conclusion').innerText.trim(),
    radiologistId: appState.activeRadiologistId
  };

  try {
    const res = await fetch(`/api/reports/${encodeURIComponent(appState.activeCaseId)}/draft`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Falha ao salvar rascunho');

    updateCaseInLocalState(data.item, data.metrics);
    openReportingWorkspace(appState.activeCaseId);
    showToast('💾 Rascunho salvo com sucesso (DiagnosticReport.status = preliminary).');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function handleFinalizeReport() {
  if (!appState.activeCaseId) return;

  const technique = document.getElementById('editor-technique').innerText.trim();
  const findings = document.getElementById('editor-findings').innerText.trim();
  const conclusion = document.getElementById('editor-conclusion').innerText.trim();

  if (!findings || !conclusion) {
    showToast('Preencha ao menos os Achados e a Impressão/Conclusão antes de assinar o laudo.', 'error');
    return;
  }

  try {
    const res = await fetch(`/api/reports/${encodeURIComponent(appState.activeCaseId)}/finalize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        technique,
        findings,
        conclusion,
        radiologistId: appState.activeRadiologistId
      })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Falha ao finalizar laudo');

    updateCaseInLocalState(data.item, data.metrics);
    openReportingWorkspace(appState.activeCaseId);
    showToast('✍️ Laudo finalizado e assinado digitalmente (HL7 FHIR DiagnosticReport: final)!');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function backToPreviousWorklist() {
  const target = appState.profile === 'radiologist' ? 'radiologist' : (appState.previousView || 'admin');
  switchView(target);
}

function updateCaseInLocalState(updatedItem, updatedMetrics) {
  const idx = appState.worklist.findIndex((c) => c.caseId === updatedItem.caseId);
  if (idx !== -1) {
    appState.worklist[idx] = updatedItem;
  }
  if (updatedMetrics) {
    appState.metrics = updatedMetrics;
  }
  renderDashboardMetrics();
  renderModalityDonutChart();
  renderAdminWorklist();
  renderRadiologistWorklist();
}

/* ==========================================================================
   6. MODAIS: ATRIBUIÇÃO DE RADIOLOGISTA, PRONTUÁRIO E INSPETOR HL7 FHIR R4
   ========================================================================== */
function openAssignModal(caseId) {
  const item = appState.worklist.find((c) => c.caseId === caseId);
  if (!item) return;

  appState.assigningCaseId = caseId;
  const infoEl = document.getElementById('assign-modal-study-info');
  const selectEl = document.getElementById('assign-modal-select');

  if (infoEl) {
    infoEl.innerHTML = `
      Paciente: <strong>${escapeHtml(item.dicom.PatientName)}</strong> (${escapeHtml(item.dicom.PatientID)})<br/>
      Exame: <strong>${escapeHtml(item.dicom.StudyDescription)}</strong> (${item.dicom.Modality})
    `;
  }
  if (selectEl) {
    selectEl.value = item.workflow.assignedRadiologist?.id || '';
  }

  document.getElementById('assign-modal').classList.remove('hidden');
}

async function confirmAssignRadiologist() {
  if (!appState.assigningCaseId) return;
  const radiologistId = document.getElementById('assign-modal-select')?.value || null;

  try {
    const res = await fetch(`/api/worklist/${encodeURIComponent(appState.assigningCaseId)}/assign`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ radiologistId })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Erro ao atribuir radiologista.');

    updateCaseInLocalState(data.item, data.metrics);
    closeModal('assign-modal');
    showToast('Médico radiologista atribuído com sucesso (FHIR ServiceRequest atualizado).');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function openPatientHistoryModal(caseId) {
  const item = appState.worklist.find((c) => c.caseId === caseId);
  if (!item) return;

  const titleEl = document.getElementById('history-modal-title');
  const contentEl = document.getElementById('history-modal-content');

  if (titleEl) {
    titleEl.textContent = `Prontuário Clínico & Recursos HL7 FHIR R4 — ${item.dicom.PatientName}`;
  }

  const historyListHtml = (item.patientRecord.medicalHistory || [])
    .map(
      (h) => `
      <div style="padding: 10px 12px; background: var(--bg-primary); border: 1px solid var(--border-subtle); border-radius: 6px; margin-bottom: 8px;">
        <div style="font-size: 12px; font-weight: 700; color: var(--accent-cyan);">${escapeHtml(h.date)} — ${escapeHtml(h.type)}</div>
        <div style="font-size: 13px; color: var(--text-primary); margin-top: 3px;">${escapeHtml(h.summary)}</div>
      </div>
    `
    )
    .join('');

  contentEl.innerHTML = `
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px;">
      <div class="kv-box">
        <div class="k">Paciente (DICOM PatientName / ID)</div>
        <div class="v">${escapeHtml(item.dicom.PatientName)} (${escapeHtml(item.dicom.PatientID)})</div>
      </div>
      <div class="kv-box">
        <div class="k">CPF / Telefone / Tipo Sanguíneo</div>
        <div class="v">${escapeHtml(item.patientRecord.cpf)} &bull; ${escapeHtml(item.patientRecord.phone)} &bull; ${escapeHtml(item.patientRecord.bloodType)}</div>
      </div>
    </div>

    <div style="margin-bottom: 16px; padding: 12px; background: rgba(14, 165, 233, 0.08); border: 1px solid var(--border-subtle); border-radius: 6px;">
      <div style="font-size: 11.5px; text-transform: uppercase; color: var(--accent-cyan); font-weight: 700; margin-bottom: 4px;">
        Resumo Clínico &amp; Anamnese Dirigida
      </div>
      <div style="font-size: 13.5px;">${escapeHtml(item.patientRecord.clinicalSummary)}</div>
    </div>

    <h4 style="margin-bottom: 8px; font-size: 13px; text-transform: uppercase; color: var(--text-secondary);">
      Exames e Eventos Anteriores do Prontuário
    </h4>
    <div style="margin-bottom: 18px;">${historyListHtml}</div>

    <h4 style="margin-bottom: 8px; font-size: 13px; text-transform: uppercase; color: var(--text-secondary);">
      Payloads HL7 FHIR R4 Associados (Patient, ServiceRequest, ImagingStudy, DiagnosticReport)
    </h4>
    <pre class="fhir-json-pre">${escapeHtml(JSON.stringify(item.fhir, null, 2))}</pre>
  `;

  document.getElementById('history-fhir-modal').classList.remove('hidden');
}

function openCurrentPatientHistory() {
  if (appState.activeCaseId) {
    openPatientHistoryModal(appState.activeCaseId);
  }
}

function openCurrentCaseFhirReport() {
  const item = appState.worklist.find((c) => c.caseId === appState.activeCaseId);
  if (!item) return;

  const titleEl = document.getElementById('history-modal-title');
  const contentEl = document.getElementById('history-modal-content');

  if (titleEl) {
    titleEl.textContent = `Recurso HL7 FHIR R4 DiagnosticReport — ${item.dicom.AccessionNumber}`;
  }

  contentEl.innerHTML = `
    <p style="color: var(--text-secondary); margin-bottom: 12px; font-size: 13px;">
      Representação padronizada do laudo segundo o perfil <code>http://hl7.org/fhir/StructureDefinition/DiagnosticReport</code> com corpo codificado em Base64 em <code>presentedForm</code>:
    </p>
    <pre class="fhir-json-pre">${escapeHtml(JSON.stringify(item.fhir.DiagnosticReport, null, 2))}</pre>
  `;

  document.getElementById('history-fhir-modal').classList.remove('hidden');
}

async function openFhirBundleModal() {
  try {
    const res = await fetch('/api/fhir/Bundle');
    const bundle = await res.json();

    const titleEl = document.getElementById('history-modal-title');
    const contentEl = document.getElementById('history-modal-content');

    if (titleEl) {
      titleEl.textContent = `Barramento HL7 FHIR R4 — Bundle Completo (${bundle.total} Recursos)`;
    }

    contentEl.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; flex-wrap: wrap; gap: 8px;">
        <span style="font-size: 13px; color: var(--text-secondary);">
          Endpoints FHIR R4 ativos: <code>/api/fhir/Bundle</code>, <code>/api/fhir/Patient</code>, <code>/api/fhir/ServiceRequest</code>, <code>/api/fhir/ImagingStudy</code>, <code>/api/fhir/DiagnosticReport</code>
        </span>
        <a href="/api/fhir/Bundle" target="_blank" rel="noopener" class="btn btn-primary btn-sm">
          Abrir JSON Puro &#8599;
        </a>
      </div>
      <pre class="fhir-json-pre">${escapeHtml(JSON.stringify(bundle, null, 2))}</pre>
    `;

    document.getElementById('history-fhir-modal').classList.remove('hidden');
  } catch (err) {
    showToast('Erro ao carregar Bundle HL7 FHIR R4.', 'error');
  }
}

function closeModal(modalId) {
  const el = document.getElementById(modalId);
  if (el) el.classList.add('hidden');
}

/* ==========================================================================
   UTILITÁRIOS DE FORMATAÇÃO E TOAST
   ========================================================================== */
function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

function calculateAge(isoDateStr) {
  if (!isoDateStr) return '--';
  const birth = new Date(isoDateStr);
  const ref = new Date('2026-11-02');
  let age = ref.getFullYear() - birth.getFullYear();
  const m = ref.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && ref.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

function formatDateBR(isoDateStr) {
  if (!isoDateStr) return '--';
  const parts = isoDateStr.slice(0, 10).split('-');
  if (parts.length !== 3) return isoDateStr;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

function formatDateTimeBR(isoStr) {
  if (!isoStr) return '--';
  const d = new Date(isoStr);
  if (Number.isNaN(d.getTime())) return isoStr;
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${dd}/${mm}/${yyyy} ${hh}:${min}`;
}

function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function showToast(message) {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = 'toast-item';
  toast.textContent = message;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.25s ease';
    setTimeout(() => toast.remove(), 260);
  }, 3600);
}
