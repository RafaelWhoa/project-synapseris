const cptacDataset = require('../services/cptacDatasetService');
const orthancConfig = require('../config/orthanc.config');

async function seedOrthancFromCptac() {
  const studies = cptacDataset.loadCptacDatasetFromCsv();
  console.log(`[SeedOrthanc] Encontrados ${studies.length} estudos no dataset CPTAC-CM.`);
  console.log(`[SeedOrthanc] Destino Orthanc PACS: ${orthancConfig.orthanc.url}`);

  // Seleciona 1 estudo representativo de cada modalidade (CT, MR e PT) para envio rápido inicial
  const sampleStudies = [
    studies.find((s) => s.primaryModality === 'CT'),
    studies.find((s) => s.primaryModality === 'MR'),
    studies.find((s) => s.primaryModality === 'PT')
  ].filter(Boolean);

  for (const st of sampleStudies) {
    console.log(`\n--> Enviando ${st.caseId} (${st.primaryModality} — ${st.studyDescription})...`);
    try {
      const res = await cptacDataset.uploadCptacStudyToOrthanc(st.caseId, {
        seriesIndex: 0,
        maxInstances: 45
      });
      console.log(
        `    ✔ Enviados ${res.uploadedInstances} cortes DICOM! Orthanc Study UUID: ${res.orthancStudyId}`
      );
      console.log(`    Stone WebViewer URL: ${res.viewerUrls.stoneWebViewer}`);
    } catch (err) {
      console.error(`    ✖ Falha ao enviar ${st.caseId}: ${err.message}`);
    }
  }
}

seedOrthancFromCptac();
