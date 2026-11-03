const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { URL } = require('node:url');

const orthancConfig = require('./config/orthanc.config');
const mockData = require('./data/mockFhirData');
const orthancService = require('./services/orthancService');
const cptacDataset = require('./services/cptacDatasetService');

const PUBLIC_DIR = path.resolve(__dirname, '../public');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon'
};

function sendJson(res, statusCode, payload, contentType = 'application/json; charset=utf-8') {
  const body = JSON.stringify(payload, null, 2);
  res.writeHead(statusCode, {
    'Content-Type': contentType,
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Cache-Control': 'no-store'
  });
  res.end(body);
}

function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (chunk) => {
      raw += chunk;
      if (raw.length > 2 * 1024 * 1024) {
        reject(new Error('Payload excede o limite permitido.'));
      }
    });
    req.on('end', () => {
      if (!raw) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(new Error('JSON inválido no corpo da requisição.'));
      }
    });
    req.on('error', reject);
  });
}

function computeDashboardMetrics(cases) {
  const totalStudies = cases.length;
  const unassigned = cases.filter((c) => c.workflow.status === 'unassigned').length;
  const inProgress = cases.filter((c) => c.workflow.status === 'draft' || c.workflow.status === 'awaiting').length;
  const finalized = cases.filter((c) => c.workflow.status === 'final').length;
  const urgentCases = cases.filter((c) => c.workflow.priority === 'urgent').length;

  const modalityCounts = {
    CT: 0,
    MR: 0,
    CR: 0,
    DX: 0,
    US: 0,
    PT: 0
  };

  for (const c of cases) {
    const mod = c.dicom.Modality;
    if (modalityCounts[mod] !== undefined) {
      modalityCounts[mod] += 1;
    } else {
      modalityCounts[mod] = (modalityCounts[mod] || 0) + 1;
    }
  }

  return {
    totalStudies,
    unassigned,
    inProgress,
    finalized,
    urgentCases,
    modalityDistribution: modalityCounts
  };
}

async function handleApiRequest(req, res, parsedUrl) {
  const pathname = parsedUrl.pathname;
  const method = req.method.toUpperCase();

  if (method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    });
    return res.end();
  }

  // 1. Configuração do Sistema, Orthanc, Dataset CPTAC-CM, Radiologistas e Templates de Laudo
  if (method === 'GET' && pathname === '/api/config') {
    const orthancStatus = await orthancService.checkOrthancStatus();
    const cptacStudies = cptacDataset.loadCptacDatasetFromCsv();
    return sendJson(res, 200, {
      orthancConfig: orthancConfig.orthanc,
      datasetConfig: {
        ...orthancConfig.dataset,
        loadedStudiesCount: cptacStudies.length,
        totalInstances: cptacStudies.reduce((acc, s) => acc + s.numberOfInstances, 0)
      },
      orthancStatus,
      radiologists: mockData.RADIOLOGISTS,
      reportTemplates: mockData.REPORT_TEMPLATES
    });
  }

  // 2. Status em tempo real do Orthanc PACS
  if (method === 'GET' && pathname === '/api/orthanc/status') {
    const status = await orthancService.checkOrthancStatus();
    return sendJson(res, 200, status);
  }

  // 3. Leitura direta de corte DICOM real (.dcm) do Dataset CPTAC-CM
  const sliceMatch = pathname.match(/^\/api\/cptac\/slice\/([^/]+)$/);
  if (method === 'GET' && sliceMatch) {
    const caseId = decodeURIComponent(sliceMatch[1]);
    const rawCase = mockData.getRawCaseById(caseId);
    if (!rawCase || !rawCase.isRealCptacDataset) {
      return sendJson(res, 404, { error: `Estudo '${caseId}' não possui arquivos DICOM locais no CPTAC-CM.` });
    }

    const seriesIndex = Math.max(
      0,
      Math.min(rawCase.study.series.length - 1, Number(parsedUrl.searchParams.get('seriesIndex') || 0))
    );
    const activeSeries = rawCase.study.series[seriesIndex];
    const dcmFiles = cptacDataset.listDcmFilesInSeriesDir(activeSeries.absSeriesDir);

    if (dcmFiles.length === 0) {
      return sendJson(res, 404, {
        error: `Nenhum arquivo .dcm encontrado na pasta da série: ${activeSeries.absSeriesDir}`
      });
    }

    const requestedSlice = parsedUrl.searchParams.get('slice');
    const sliceIdx =
      requestedSlice !== null
        ? Math.max(0, Math.min(dcmFiles.length - 1, Number(requestedSlice) - 1))
        : Math.floor(dcmFiles.length / 2);

    const wwParam = parsedUrl.searchParams.get('ww');
    const wlParam = parsedUrl.searchParams.get('wl');

    const sliceData = cptacDataset.readAndWindowDicomSlice(
      dcmFiles[sliceIdx],
      wwParam !== null && wwParam !== '' ? Number(wwParam) : null,
      wlParam !== null && wlParam !== '' ? Number(wlParam) : null
    );

    return sendJson(res, 200, {
      caseId: rawCase.caseId,
      studyInstanceUID: rawCase.study.studyInstanceUID,
      seriesIndex,
      seriesNumber: activeSeries.number,
      seriesDescription: activeSeries.description,
      seriesModality: activeSeries.modality,
      sliceNumber: sliceIdx + 1,
      totalSlices: dcmFiles.length,
      ...sliceData
    });
  }

  // 4. Upload sob demanda de um estudo CPTAC-CM do disco local para o Orthanc PACS (:8042)
  const uploadMatch = pathname.match(/^\/api\/cptac\/upload\/([^/]+)$/);
  if (method === 'POST' && uploadMatch) {
    const caseId = decodeURIComponent(uploadMatch[1]);
    const body = await parseJsonBody(req);
    try {
      const uploadResult = await cptacDataset.uploadCptacStudyToOrthanc(caseId, {
        seriesIndex: body.seriesIndex,
        maxInstances: body.maxInstances || 60
      });
      let updatedItem = null;
      if (uploadResult.orthancStudyId) {
        updatedItem = mockData.linkOrthancStudyId(caseId, uploadResult.orthancStudyId);
      } else {
        updatedItem = mockData.getHydratedCaseById(caseId);
      }
      return sendJson(res, 200, {
        message: `Enviados ${uploadResult.uploadedInstances} cortes DICOM reais do CPTAC-CM para o Orthanc PACS!`,
        uploadResult,
        item: updatedItem
      });
    } catch (err) {
      return sendJson(res, 502, {
        error: `Não foi possível enviar para o Orthanc em ${orthancConfig.orthanc.url}: ${err.message}`
      });
    }
  }

  // 5. Camada de Proxy/Integração Orthanc: GET /studies e GET /api/orthanc/studies
  if (method === 'GET' && (pathname === '/api/orthanc/studies' || pathname === '/studies')) {
    const result = await orthancService.getStudiesWithFallback();
    return sendJson(res, 200, result);
  }

  // 6. Camada de Proxy/Integração Orthanc: GET /patients/:id e GET /api/orthanc/patients/:id
  const patientMatch = pathname.match(/^\/(?:api\/orthanc\/)?patients\/([^/]+)$/);
  if (method === 'GET' && patientMatch) {
    const patientId = decodeURIComponent(patientMatch[1]);
    const result = await orthancService.getPatientByIdWithFallback(patientId);
    if (!result) {
      return sendJson(res, 404, { error: `Paciente '${patientId}' não encontrado.` });
    }
    return sendJson(res, 200, result);
  }

  // 7. Worklist Geral + Métricas do Dashboard + Sincronização opcional com Orthanc
  if (method === 'GET' && pathname === '/api/worklist') {
    if (parsedUrl.searchParams.get('syncOrthanc') === 'true') {
      await orthancService.getStudiesWithFallback();
    }
    const cases = mockData.getAllHydratedCases();
    const metrics = computeDashboardMetrics(cases);
    return sendJson(res, 200, {
      timestamp: new Date().toISOString(),
      orthancUrl: orthancConfig.orthanc.url,
      defaultViewer: orthancConfig.orthanc.defaultViewer,
      datasetPath: orthancConfig.dataset.rootPath,
      metrics,
      radiologists: mockData.RADIOLOGISTS,
      reportTemplates: mockData.REPORT_TEMPLATES,
      items: cases
    });
  }

  // 8. Detalhe de um item específico da Worklist
  const worklistItemMatch = pathname.match(/^\/api\/worklist\/([^/]+)$/);
  if (method === 'GET' && worklistItemMatch) {
    const caseId = decodeURIComponent(worklistItemMatch[1]);
    const item = mockData.getHydratedCaseById(caseId);
    if (!item) {
      return sendJson(res, 404, { error: `Estudo '${caseId}' não encontrado.` });
    }
    return sendJson(res, 200, item);
  }

  // 9. Atribuir Médico Radiologista a um Exame
  const assignMatch = pathname.match(/^\/api\/worklist\/([^/]+)\/assign$/);
  if (method === 'POST' && assignMatch) {
    const caseId = decodeURIComponent(assignMatch[1]);
    const body = await parseJsonBody(req);
    const updated = mockData.assignRadiologistToCase(caseId, body.radiologistId);
    if (!updated) {
      return sendJson(res, 404, { error: `Estudo '${caseId}' não encontrado.` });
    }
    return sendJson(res, 200, {
      message: 'Radiologista atribuído com sucesso.',
      item: updated,
      metrics: computeDashboardMetrics(mockData.getAllHydratedCases())
    });
  }

  // 10. Salvar Rascunho de Laudo
  const draftMatch = pathname.match(/^\/api\/reports\/([^/]+)\/draft$/);
  if (method === 'POST' && draftMatch) {
    const caseId = decodeURIComponent(draftMatch[1]);
    const body = await parseJsonBody(req);
    const updated = mockData.saveReportDraft(caseId, body);
    if (!updated) {
      return sendJson(res, 404, { error: `Estudo '${caseId}' não encontrado.` });
    }
    return sendJson(res, 200, {
      message: 'Rascunho de laudo salvo com sucesso.',
      item: updated,
      fhirDiagnosticReport: updated.fhir.DiagnosticReport,
      metrics: computeDashboardMetrics(mockData.getAllHydratedCases())
    });
  }

  // 11. Finalizar / Assinar Laudo
  const finalizeMatch = pathname.match(/^\/api\/reports\/([^/]+)\/finalize$/);
  if (method === 'POST' && finalizeMatch) {
    const caseId = decodeURIComponent(finalizeMatch[1]);
    const body = await parseJsonBody(req);
    const updated = mockData.finalizeReport(caseId, body);
    if (!updated) {
      return sendJson(res, 404, { error: `Estudo '${caseId}' não encontrado.` });
    }
    return sendJson(res, 200, {
      message: 'Laudo finalizado e assinado digitalmente (FHIR DiagnosticReport status: final).',
      item: updated,
      fhirDiagnosticReport: updated.fhir.DiagnosticReport,
      metrics: computeDashboardMetrics(mockData.getAllHydratedCases())
    });
  }

  // 12. Endpoints HL7 FHIR R4 nativos
  if (method === 'GET' && pathname === '/api/fhir/Bundle') {
    return sendJson(res, 200, mockData.buildFhirBundle(), 'application/fhir+json; charset=utf-8');
  }

  const fhirResourceMatch = pathname.match(/^\/api\/fhir\/(Patient|ServiceRequest|ImagingStudy|DiagnosticReport)$/);
  if (method === 'GET' && fhirResourceMatch) {
    const resourceType = fhirResourceMatch[1];
    const cases = mockData.getAllHydratedCases();
    const entries = cases.map((c) => ({
      fullUrl: `urn:uuid:${c.fhir[resourceType].id}`,
      resource: c.fhir[resourceType]
    }));
    return sendJson(
      res,
      200,
      {
        resourceType: 'Bundle',
        type: 'searchset',
        total: entries.length,
        entry: entries
      },
      'application/fhir+json; charset=utf-8'
    );
  }

  return sendJson(res, 404, { error: `Endpoint não encontrado: ${method} ${pathname}` });
}

function serveStaticFile(req, res, parsedUrl) {
  let relativePath = decodeURIComponent(parsedUrl.pathname);
  if (relativePath === '/' || relativePath === '') {
    relativePath = '/index.html';
  }

  const safePath = path.normalize(relativePath).replace(/^(\.\.[/\\])+/, '');
  const filePath = path.join(PUBLIC_DIR, safePath);

  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    return res.end('Acesso negado.');
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      const indexFile = path.join(PUBLIC_DIR, 'index.html');
      fs.readFile(indexFile, (readErr, content) => {
        if (readErr) {
          res.writeHead(500);
          return res.end('Erro ao carregar interface web.');
        }
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(content);
      });
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    fs.readFile(filePath, (readErr, content) => {
      if (readErr) {
        res.writeHead(500);
        return res.end('Erro interno ao ler arquivo.');
      }
      res.writeHead(200, {
        'Content-Type': contentType,
        'Cache-Control': 'no-cache'
      });
      res.end(content);
    });
  });
}

function createRisServer() {
  return http.createServer(async (req, res) => {
    try {
      const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
      if (
        parsedUrl.pathname.startsWith('/api/') ||
        parsedUrl.pathname === '/studies' ||
        parsedUrl.pathname.startsWith('/patients/')
      ) {
        await handleApiRequest(req, res, parsedUrl);
      } else {
        serveStaticFile(req, res, parsedUrl);
      }
    } catch (err) {
      sendJson(res, 500, {
        error: 'Erro interno no servidor RIS/PACS.',
        details: err.message
      });
    }
  });
}

if (require.main === module) {
  const server = createRisServer();
  const { port, host } = orthancConfig.server;
  server.listen(port, host, async () => {
    const orthancStatus = await orthancService.checkOrthancStatus();
    const cptacStudies = cptacDataset.loadCptacDatasetFromCsv();
    console.log('==================================================================');
    console.log('  SynapseRIS — Sistema de Informação em Radiologia & Fluxo PACS');
    console.log(`  URL da Aplicação : http://localhost:${port}`);
    console.log(`  Orthanc PACS URL : ${orthancConfig.orthanc.url} (${orthancStatus.online ? 'ONLINE' : 'MODO DEMO ATIVO'})`);
    console.log(`  Dataset CPTAC-CM : ${cptacStudies.length} estudos reais indexados (${orthancConfig.dataset.rootPath})`);
    console.log(`  Padrão de Dados  : HL7 FHIR R4 + DICOM Part 10 Nativo`);
    console.log('==================================================================');
  });
}

module.exports = { createRisServer };
