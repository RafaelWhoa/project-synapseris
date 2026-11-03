const fs = require('node:fs');
const path = require('node:path');

// Carrega variáveis do arquivo .env se existir
function loadEnvFile() {
  const envPath = path.resolve(__dirname, '../../.env');
  if (!fs.existsSync(envPath)) return;

  const content = fs.readFileSync(envPath, 'utf-8');
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eqIndex = line.indexOf('=');
    if (eqIndex === -1) continue;
    const key = line.slice(0, eqIndex).trim();
    const val = line.slice(eqIndex + 1).trim().replace(/^['"]|['"]$/g, '');
    if (process.env[key] === undefined) {
      process.env[key] = val;
    }
  }
}

loadEnvFile();

/**
 * Resolve o diretório do dataset CPTAC-CM automaticamente tanto no Linux (WSL) quanto via UNC no Windows
 */
function resolveCptacDatasetRoot() {
  const candidates = [
    process.env.CPTAC_DATASET_PATH,
    process.env.CPTAC_DATASET_UNC_PATH,
    '/home/rafaelwhoa/projects/Datasets/RISData/CPTAC-CM/manifest-1792597450509',
    '\\\\wsl.localhost\\Ubuntu\\home\\rafaelwhoa\\projects\\Datasets\\RISData\\CPTAC-CM\\manifest-1792597450509',
    path.resolve(__dirname, '../../../Datasets/RISData/CPTAC-CM/manifest-1792597450509')
  ].filter(Boolean);

  for (const candidate of candidates) {
    try {
      if (fs.existsSync(candidate) && fs.existsSync(path.join(candidate, 'metadata.csv'))) {
        return candidate;
      }
    } catch {
      // ignora candidato inacessível
    }
  }
  return candidates[0];
}

const ORTHANC_PORT = Number(process.env.ORTHANC_PORT || 8042);
const ORTHANC_URL = (process.env.ORTHANC_URL || `http://localhost:${ORTHANC_PORT}`).replace(/\/+$/, '');
const ORTHANC_DEFAULT_VIEWER = process.env.ORTHANC_DEFAULT_VIEWER || 'stone-webviewer';
const ORTHANC_FALLBACK_VIEWER = process.env.ORTHANC_FALLBACK_VIEWER || 'explorer.html';
const CPTAC_ROOT_PATH = resolveCptacDatasetRoot();

const orthancConfig = {
  server: {
    port: Number(process.env.PORT || 3000),
    host: process.env.HOST || '0.0.0.0'
  },
  dataset: {
    name: 'TCIA CPTAC-CM (Cutaneous Melanoma)',
    rootPath: CPTAC_ROOT_PATH,
    metadataCsvPath: path.join(CPTAC_ROOT_PATH, 'metadata.csv'),
    dicomBaseDir: path.join(CPTAC_ROOT_PATH, 'CPTAC-CM')
  },
  orthanc: {
    url: ORTHANC_URL,
    port: ORTHANC_PORT,
    defaultViewer: ORTHANC_DEFAULT_VIEWER,
    fallbackViewer: ORTHANC_FALLBACK_VIEWER,
    username: process.env.ORTHANC_USERNAME || 'orthanc',
    password: process.env.ORTHANC_PASSWORD || 'orthanc',
    timeoutMs: Number(process.env.ORTHANC_TIMEOUT_MS || 2500),
    endpoints: {
      system: '/system',
      studies: '/studies',
      patients: '/patients',
      series: '/series',
      instances: '/instances',
      toolsFind: '/tools/find'
    }
  },

  /**
   * Constrói as URLs para abertura do estudo nos visualizadores do Orthanc PACS
   * @param {string} studyInstanceUID - DICOM Tag (0020,000D) StudyInstanceUID
   * @param {string} [orthancStudyId] - UUID interno do estudo no Orthanc (se sincronizado)
   */
  buildViewerUrls(studyInstanceUID, orthancStudyId = '') {
    const encodedUid = encodeURIComponent(studyInstanceUID || '');
    const stoneUrl = `${ORTHANC_URL}/stone-webviewer/index.html?study=${encodedUid}`;
    const ohifUrl = `${ORTHANC_URL}/ohif/viewer?StudyInstanceUIDs=${encodedUid}`;
    const medDreamUrl = `${ORTHANC_URL}/meddream/?study=${encodedUid}`;
    const explorerUrl = orthancStudyId
      ? `${ORTHANC_URL}/app/explorer.html#study?uuid=${encodeURIComponent(orthancStudyId)}`
      : `${ORTHANC_URL}/app/explorer.html`;

    const viewerMap = {
      'stone-webviewer': stoneUrl,
      'ohif': ohifUrl,
      'meddream': medDreamUrl,
      'explorer.html': explorerUrl
    };

    return {
      defaultViewer: ORTHANC_DEFAULT_VIEWER,
      primaryUrl: viewerMap[ORTHANC_DEFAULT_VIEWER] || stoneUrl,
      stoneWebViewer: stoneUrl,
      ohifViewer: ohifUrl,
      medDreamViewer: medDreamUrl,
      orthancExplorer: explorerUrl,
      orthancBaseUrl: ORTHANC_URL
    };
  }
};

module.exports = orthancConfig;
