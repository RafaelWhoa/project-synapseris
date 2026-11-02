const orthancConfig = require('../config/orthanc.config');
const mockData = require('../data/mockFhirData');

/**
 * Monta cabeçalhos HTTP para chamadas REST ao Orthanc PACS
 */
function buildOrthancHeaders() {
  const headers = {
    Accept: 'application/json'
  };
  const { username, password } = orthancConfig.orthanc;
  if (username && password) {
    const token = Buffer.from(`${username}:${password}`).toString('base64');
    headers.Authorization = `Basic ${token}`;
  }
  return headers;
}

/**
 * Realiza chamada HTTP com timeout controlado para o servidor Orthanc PACS
 */
async function requestOrthanc(endpointPath, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), orthancConfig.orthanc.timeoutMs);

  const targetUrl = `${orthancConfig.orthanc.url}${endpointPath}`;
  try {
    const response = await fetch(targetUrl, {
      ...options,
      headers: {
        ...buildOrthancHeaders(),
        ...(options.headers || {})
      },
      signal: controller.signal
    });

    if (!response.ok) {
      throw new Error(`Orthanc HTTP ${response.status}: ${response.statusText}`);
    }

    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      return await response.json();
    }
    return await response.text();
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Verifica conectividade com a instância Orthanc PACS (GET /system)
 */
async function checkOrthancStatus() {
  try {
    const systemInfo = await requestOrthanc('/system');
    let plugins = [];
    try {
      plugins = await requestOrthanc('/plugins');
    } catch {
      plugins = [];
    }

    return {
      online: true,
      mode: 'ORTHANC_LIVE',
      orthancUrl: orthancConfig.orthanc.url,
      port: orthancConfig.orthanc.port,
      defaultViewer: orthancConfig.orthanc.defaultViewer,
      fallbackViewer: orthancConfig.orthanc.fallbackViewer,
      system: {
        name: systemInfo.Name || 'Orthanc PACS Server',
        version: systemInfo.Version || '1.12+',
        dicomAet: systemInfo.DicomAet || 'ORTHANC',
        dicomPort: systemInfo.DicomPort || 4242,
        storageAreaPlugin: systemInfo.StorageAreaPlugin || null,
        hasStoneWebViewer: Array.isArray(plugins) && plugins.some((p) => String(p).includes('stone')),
        plugins
      },
      checkedAt: new Date().toISOString()
    };
  } catch (err) {
    return {
      online: false,
      mode: 'DEMO_FALLBACK',
      orthancUrl: orthancConfig.orthanc.url,
      port: orthancConfig.orthanc.port,
      defaultViewer: orthancConfig.orthanc.defaultViewer,
      fallbackViewer: orthancConfig.orthanc.fallbackViewer,
      reason: err.message || 'Orthanc PACS local não respondeu dentro do tempo limite.',
      checkedAt: new Date().toISOString()
    };
  }
}

/**
 * Busca estudos no Orthanc (GET /studies?expand) ou retorna fallback compatível com Orthanc + FHIR
 */
async function getStudiesWithFallback() {
  try {
    const rawStudies = await requestOrthanc('/studies?expand');
    if (Array.isArray(rawStudies) && rawStudies.length > 0) {
      // Sincroniza automaticamente estudos reais do Orthanc na Worklist FHIR
      const syncStats = mockData.upsertOrthancStudiesIntoStore(rawStudies);
      return {
        source: 'ORTHANC_LIVE_AND_MOCK_FHIR',
        orthancOnline: true,
        orthancUrl: orthancConfig.orthanc.url,
        orthancStudiesCount: rawStudies.length,
        syncStats,
        orthancStudies: rawStudies,
        fhirWorklist: mockData.getAllHydratedCases()
      };
    }

    return {
      source: 'ORTHANC_ONLINE_EMPTY_STORE_USING_FHIR_MOCK',
      orthancOnline: true,
      orthancUrl: orthancConfig.orthanc.url,
      orthancStudiesCount: 0,
      orthancStudies: [],
      fhirWorklist: mockData.getAllHydratedCases()
    };
  } catch (err) {
    // Fallback 100% funcional no modo demonstração quando a API do Orthanc não responde
    const cases = mockData.getAllHydratedCases();
    const simulatedOrthancStudies = cases.map((c) => ({
      ID: c.dicom.orthancId || `mock-orthanc-${c.caseId.toLowerCase()}`,
      IsStable: true,
      MainDicomTags: {
        AccessionNumber: c.dicom.AccessionNumber,
        StudyDate: c.dicom.StudyDate.slice(0, 10).replace(/-/g, ''),
        StudyDescription: c.dicom.StudyDescription,
        StudyInstanceUID: c.dicom.StudyInstanceUID,
        ModalitiesInStudy: c.dicom.Modality
      },
      PatientMainDicomTags: {
        PatientBirthDate: c.dicom.PatientBirthDate.replace(/-/g, ''),
        PatientID: c.dicom.PatientID,
        PatientName: c.dicom.PatientName,
        PatientSex: c.dicom.PatientSex
      },
      Type: 'Study'
    }));

    return {
      source: 'DEMO_FALLBACK_FHIR_MOCK',
      orthancOnline: false,
      orthancUrl: orthancConfig.orthanc.url,
      fallbackReason: err.message,
      orthancStudiesCount: simulatedOrthancStudies.length,
      orthancStudies: simulatedOrthancStudies,
      fhirWorklist: cases
    };
  }
}

/**
 * Busca um paciente específico no Orthanc (GET /patients/{id}) ou nos recursos FHIR Patient locais
 */
async function getPatientByIdWithFallback(patientId) {
  try {
    const orthancPatient = await requestOrthanc(`/patients/${encodeURIComponent(patientId)}`);
    return {
      source: 'ORTHANC_LIVE',
      orthancOnline: true,
      orthancPatient
    };
  } catch (err) {
    const allCases = mockData.getAllHydratedCases();
    const matchingCases = allCases.filter(
      (c) =>
        c.fhir.Patient.id === patientId ||
        c.dicom.PatientID === patientId ||
        c.caseId === patientId
    );

    if (matchingCases.length === 0) {
      return null;
    }

    const primary = matchingCases[0];
    return {
      source: 'DEMO_FALLBACK_FHIR_MOCK',
      orthancOnline: false,
      fallbackReason: err.message,
      fhirPatient: primary.fhir.Patient,
      patientRecord: primary.patientRecord,
      studies: matchingCases.map((m) => ({
        caseId: m.caseId,
        dicom: m.dicom,
        workflow: m.workflow,
        fhirImagingStudy: m.fhir.ImagingStudy,
        fhirDiagnosticReport: m.fhir.DiagnosticReport
      }))
    };
  }
}

module.exports = {
  checkOrthancStatus,
  getStudiesWithFallback,
  getPatientByIdWithFallback,
  requestOrthanc
};
