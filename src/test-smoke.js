const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const mockData = require('./data/mockFhirData');
const orthancService = require('./services/orthancService');
const orthancConfig = require('./config/orthanc.config');

async function runSmokeTests() {
  console.log('[SmokeTest] Iniciando validação da arquitetura SynapseRIS...');

  // 1. Verifica arquivos estáticos do Frontend
  const indexHtmlPath = path.resolve(__dirname, '../public/index.html');
  const cssPath = path.resolve(__dirname, '../public/css/styles.css');
  const jsPath = path.resolve(__dirname, '../public/js/app.js');
  assert.ok(fs.existsSync(indexHtmlPath), 'public/index.html deve existir');
  assert.ok(fs.existsSync(cssPath), 'public/css/styles.css deve existir');
  assert.ok(fs.existsSync(jsPath), 'public/js/app.js deve existir');

  // 2. Verifica configuração centralizada do Orthanc PACS
  assert.strictEqual(orthancConfig.orthanc.port, 8042, 'Porta padrão do Orthanc deve ser 8042');
  assert.ok(orthancConfig.orthanc.url.includes('8042'), 'ORTHANC_URL deve apontar para porta 8042');
  const viewerUrls = orthancConfig.buildViewerUrls('1.2.840.113619.2.55.3.101');
  assert.ok(
    viewerUrls.stoneWebViewer.includes('/stone-webviewer/index.html?study=1.2.840.113619.2.55.3.101'),
    'URL do Stone WebViewer deve conter o StudyInstanceUID'
  );

  // 3. Verifica Mock Data (>= 10 pacientes/casos + tags DICOM obrigatórias)
  const cases = mockData.getAllHydratedCases();
  assert.ok(cases.length >= 10, `Deve conter ao menos 10 pacientes/estudos (atual: ${cases.length})`);

  const requiredDicomFields = [
    'PatientID',
    'PatientName',
    'PatientBirthDate',
    'StudyInstanceUID',
    'AccessionNumber',
    'Modality',
    'StudyDate',
    'StudyDescription'
  ];

  for (const c of cases) {
    for (const field of requiredDicomFields) {
      assert.ok(c.dicom[field], `Campo DICOM obrigatório '${field}' ausente no caso ${c.caseId}`);
    }
    // 4. Verifica conformidade com os 4 recursos HL7 FHIR R4
    assert.strictEqual(c.fhir.Patient.resourceType, 'Patient');
    assert.ok(Array.isArray(c.fhir.Patient.name) && c.fhir.Patient.name.length > 0);
    assert.ok(Array.isArray(c.fhir.Patient.identifier) && c.fhir.Patient.identifier.length > 0);
    assert.ok(c.fhir.Patient.birthDate);
    assert.ok(c.fhir.Patient.gender);

    assert.strictEqual(c.fhir.ServiceRequest.resourceType, 'ServiceRequest');
    assert.ok(c.fhir.ServiceRequest.status);
    assert.strictEqual(c.fhir.ServiceRequest.intent, 'order');
    assert.ok(c.fhir.ServiceRequest.code);
    assert.ok(c.fhir.ServiceRequest.subject);

    assert.strictEqual(c.fhir.ImagingStudy.resourceType, 'ImagingStudy');
    assert.ok(Array.isArray(c.fhir.ImagingStudy.modality));
    assert.ok(Array.isArray(c.fhir.ImagingStudy.series) && c.fhir.ImagingStudy.series.length > 0);

    assert.strictEqual(c.fhir.DiagnosticReport.resourceType, 'DiagnosticReport');
    assert.ok(Array.isArray(c.fhir.DiagnosticReport.presentedForm));
  }

  // 5. Testa fluxo de atribuição, rascunho e finalização de laudo (status: final)
  const assigned = mockData.assignRadiologistToCase('CASE-001', 'prac-rad-02');
  assert.strictEqual(assigned.workflow.assignedRadiologist.id, 'prac-rad-02');

  const draft = mockData.saveReportDraft('CASE-001', {
    technique: 'TC Multislice sem contraste.',
    findings: 'Parênquima pulmonar preservado.',
    conclusion: 'Exame dentro da normalidade.',
    radiologistId: 'prac-rad-02'
  });
  assert.strictEqual(draft.workflow.status, 'draft');
  assert.strictEqual(draft.fhir.DiagnosticReport.status, 'preliminary');

  const finalized = mockData.finalizeReport('CASE-001', {
    technique: 'TC Multislice sem contraste.',
    findings: 'Parênquima pulmonar preservado.',
    conclusion: 'Exame normal.',
    radiologistId: 'prac-rad-02'
  });
  assert.strictEqual(finalized.workflow.status, 'final');
  assert.strictEqual(finalized.fhir.DiagnosticReport.status, 'final');
  assert.strictEqual(finalized.fhir.DiagnosticReport.conclusion, 'Exame normal.');

  // 6. Testa camada de serviço Orthanc com fallback resiliente
  const studiesResult = await orthancService.getStudiesWithFallback();
  assert.ok(Array.isArray(studiesResult.fhirWorklist) && studiesResult.fhirWorklist.length >= 10);

  const patientResult = await orthancService.getPatientByIdWithFallback('pat-1001');
  assert.ok(patientResult, 'Consulta de paciente por ID deve funcionar via Orthanc ou fallback FHIR');

  // 7. Testa Bundle HL7 FHIR R4 completo
  const bundle = mockData.buildFhirBundle();
  assert.strictEqual(bundle.resourceType, 'Bundle');
  assert.ok(bundle.total >= 48, `Bundle FHIR deve ter ao menos 48 recursos (atual: ${bundle.total})`);

  console.log('[SmokeTest] ✔ Todos os testes de UI, DICOM, Orthanc PACS e HL7 FHIR R4 passaram com sucesso!');
}

runSmokeTests().catch((err) => {
  console.error('[SmokeTest] Erro:', err);
  process.exit(1);
});
