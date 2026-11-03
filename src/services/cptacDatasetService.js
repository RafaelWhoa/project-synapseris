const fs = require('node:fs');
const path = require('node:path');
const orthancConfig = require('../config/orthanc.config');

/**
 * Perfis demográficos clínicos enriquecidos para os 18 pacientes reais do consórcio CPTAC-CM (Cutaneous Melanoma)
 * Mantém o Subject ID oficial (ex: C3L-00275) como DICOM PatientID para 100% de compatibilidade com o Orthanc PACS.
 */
const CPTAC_SUBJECT_PROFILES = {
  'C3L-00275': {
    name: 'Carlos Eduardo Mendonça (C3L-00275)',
    family: 'Mendonça',
    given: ['Carlos', 'Eduardo'],
    gender: 'male',
    birthDate: '1958-04-14',
    cpf: '318.492.108-44',
    phone: '(11) 99124-8831',
    bloodType: 'O+',
    allergies: ['Dipirona Sódica'],
    originHospital: 'CPTAC Oncology Center — Unidade Paulista',
    priority: 'urgent',
    workflowStatus: 'awaiting',
    assignedRadiologistId: 'prac-rad-02',
    clinicalSummary: 'Paciente da coorte CPTAC-CM (Melanoma Cutâneo). Estadiamento toracoabdominopélvico tomográfico com contraste venoso multifásico (iDose 3).'
  },
  'C3L-00629': {
    name: 'Helena Cristina Prado (C3L-00629)',
    family: 'Prado',
    given: ['Helena', 'Cristina'],
    gender: 'female',
    birthDate: '1966-09-22',
    cpf: '402.918.773-19',
    phone: '(11) 98411-2090',
    bloodType: 'A+',
    allergies: ['Nega alergias medicamentosas'],
    originHospital: 'Instituto de Neuro-Oncologia — CPTAC-CM',
    priority: 'urgent',
    workflowStatus: 'draft',
    assignedRadiologistId: 'prac-rad-01',
    clinicalSummary: 'Coorte CPTAC-CM. Seguimento longitudinal multiparamétrico por RM de Encéfalo (T1 SPGR pós-contraste, FLAIR, T2 GRE e Difusão DWI/ADC) para rastreio secundário.'
  },
  'C3L-05554': {
    name: 'Roberto Magalhães Nogueira (C3L-05554)',
    family: 'Nogueira',
    given: ['Roberto', 'Magalhães'],
    gender: 'male',
    birthDate: '1952-12-03',
    cpf: '189.640.231-07',
    phone: '(21) 99740-1120',
    bloodType: 'B+',
    allergies: ['Penicilina'],
    originHospital: 'Centro Oncológico Santa Catarina — CPTAC',
    priority: 'urgent',
    workflowStatus: 'unassigned',
    assignedRadiologistId: null,
    clinicalSummary: 'Coorte CPTAC-CM. Tomografia multislice de Crânio, Tórax e Corpo Inteiro com reconstruções de janela óssea, pulmonar e parenquimatosa (1.0mm e 5.0mm).'
  },
  'C3L-06113': {
    name: 'Marcos Vinícius Alencar (C3L-06113)',
    family: 'Alencar',
    given: ['Marcos', 'Vinícius'],
    gender: 'male',
    birthDate: '1961-07-19',
    cpf: '512.309.841-20',
    phone: '(11) 98211-4501',
    bloodType: 'O-',
    allergies: ['Nega alergias'],
    originHospital: 'Hospital Sírio-Paulista — Oncologia Cabeça & Pescoço',
    priority: 'urgent',
    workflowStatus: 'awaiting',
    assignedRadiologistId: 'prac-rad-01',
    clinicalSummary: 'Coorte CPTAC-CM. TC Cervical, Laringe, Tórax e Abdome com contraste venoso e fase excretora de alta resolução (0.6mm / 0.75mm).'
  },
  'C3L-06435': {
    name: 'Fernanda Lúcia Guimarães (C3L-06435)',
    family: 'Guimarães',
    given: ['Fernanda', 'Lúcia'],
    gender: 'female',
    birthDate: '1971-03-11',
    cpf: '774.129.384-52',
    phone: '(11) 99201-7410',
    bloodType: 'A-',
    allergies: ['Sulfa'],
    originHospital: 'Centro Diagnóstico Avançado — CPTAC-CM',
    priority: 'routine',
    workflowStatus: 'final',
    assignedRadiologistId: 'prac-rad-02',
    clinicalSummary: 'Coorte CPTAC-CM. Protocolo Oncológico Completo (Crânio Sequencial + Tórax e Abdome fases Arterial Tardia, Venosa Portal, Excretora e MIP).'
  },
  'C3L-06715': {
    name: 'Jorge Luís Santana Medeiros (C3L-06715)',
    family: 'Medeiros',
    given: ['Jorge', 'Luís'],
    gender: 'male',
    birthDate: '1963-05-09',
    cpf: '115.729.603-88',
    phone: '(11) 97409-2215',
    bloodType: 'A+',
    allergies: ['Nega alergias'],
    originHospital: 'Hospital Geral São Lucas — Oncologia Clínica',
    priority: 'routine',
    workflowStatus: 'awaiting',
    assignedRadiologistId: 'prac-rad-02',
    clinicalSummary: 'Coorte CPTAC-CM. Estudo tomográfico de alta definição (0.5mm e 1.0mm) de Crânio, Parênquima Pulmonar e Abdome trifásico.'
  },
  'C3L-06933': {
    name: 'Patrícia Helena Meirelles (C3L-06933)',
    family: 'Meirelles',
    given: ['Patrícia', 'Helena'],
    gender: 'female',
    birthDate: '1974-10-12',
    cpf: '943.218.504-76',
    phone: '(11) 99812-6504',
    bloodType: 'O+',
    allergies: ['Nega alergias'],
    originHospital: 'Instituto Torácico Integrado — CPTAC-CM',
    priority: 'routine',
    workflowStatus: 'draft',
    assignedRadiologistId: 'prac-rad-02',
    clinicalSummary: 'Coorte CPTAC-CM. Tomografia Computadorizada de Tórax de Alta Resolução (0.75mm B60f/B30f) com projeções de intensidade máxima (MIP 12mm) para pesquisa de micronódulos.'
  },
  'C3N-02040': {
    name: 'Antônio Marcos Silveira Brito (C3N-02040)',
    family: 'Brito',
    given: ['Antônio', 'Marcos'],
    gender: 'male',
    birthDate: '1969-02-11',
    cpf: '094.281.665-30',
    phone: '(31) 98831-4209',
    bloodType: 'AB+',
    allergies: ['Nega alergias'],
    originHospital: 'Centro Oncológico Minas — CPTAC-CM',
    priority: 'routine',
    workflowStatus: 'unassigned',
    assignedRadiologistId: null,
    clinicalSummary: 'Coorte CPTAC-CM. Estudo tomográfico toracoabdominal multifásico (Fases Arterial, Venosa e Excretora de 1.0mm e 5.0mm).'
  },
  'C3N-02270': {
    name: 'Luciana Aparecida Monteiro (C3N-02270)',
    family: 'Monteiro',
    given: ['Luciana', 'Aparecida'],
    gender: 'female',
    birthDate: '1967-08-25',
    cpf: '247.551.809-63',
    phone: '(11) 98650-3318',
    bloodType: 'O+',
    allergies: ['Nega alergias'],
    originHospital: 'Hospital Sírio-Paulista — Unidade Bela Vista',
    priority: 'urgent',
    workflowStatus: 'awaiting',
    assignedRadiologistId: 'prac-rad-03',
    clinicalSummary: 'Coorte CPTAC-CM. TC de Tórax (LungCare 1.5mm), Abdome e Pelve com redução de artefatos metálicos (iMAR) e leitura oncológica MM.'
  },
  'C3N-02324': {
    name: 'Paulo Sérgio Cavalcanti Dias (C3N-02324)',
    family: 'Dias',
    given: ['Paulo', 'Sérgio'],
    gender: 'male',
    birthDate: '1955-08-30',
    cpf: '882.410.992-25',
    phone: '(11) 99511-0082',
    bloodType: 'B-',
    allergies: ['Nega alergias'],
    originHospital: 'Centro Diagnóstico Avançado — CPTAC-CM',
    priority: 'routine',
    workflowStatus: 'final',
    assignedRadiologistId: 'prac-rad-02',
    clinicalSummary: 'Coorte CPTAC-CM. TC de Tórax (Lung 3.0mm) e Corpo Inteiro com fases arterial, venosa e excretora.'
  },
  'C3N-02330': {
    name: 'Gustavo Henrique Azevedo Lima (C3N-02330)',
    family: 'Lima',
    given: ['Gustavo', 'Henrique'],
    gender: 'male',
    birthDate: '1976-07-08',
    cpf: '631.908.452-11',
    phone: '(19) 98144-6320',
    bloodType: 'A+',
    allergies: ['Nega alergias'],
    originHospital: 'Clínica Oncológica Campinas — CPTAC-CM',
    priority: 'routine',
    workflowStatus: 'unassigned',
    assignedRadiologistId: null,
    clinicalSummary: 'Coorte CPTAC-CM. Aquisição volumétrica multislice Philips de alta densidade (séries de 494 a 705 cortes axiais).'
  },
  'C3N-02633': {
    name: 'Camila Duarte Peixoto (C3N-02633)',
    family: 'Peixoto',
    given: ['Camila', 'Duarte'],
    gender: 'female',
    birthDate: '1979-01-17',
    cpf: '390.114.782-04',
    phone: '(21) 98230-4910',
    bloodType: 'O+',
    allergies: ['Nega alergias'],
    originHospital: 'Serviço de Medicina Nuclear & PET-CT — CPTAC-CM',
    priority: 'urgent',
    workflowStatus: 'final',
    assignedRadiologistId: 'prac-rad-04',
    clinicalSummary: 'Coorte CPTAC-CM. PET-CT Oncológico de Corpo Inteiro (PET WHOLEBODY LD90) com séries metabólicas corrigidas (PET WB 400) e TC de atenuação.'
  },
  'C3N-02679': {
    name: 'Renato Augusto Vasconcelos (C3N-02679)',
    family: 'Vasconcelos',
    given: ['Renato', 'Augusto'],
    gender: 'male',
    birthDate: '1960-11-04',
    cpf: '441.802.917-55',
    phone: '(11) 99103-4482',
    bloodType: 'A+',
    allergies: ['Nega alergias'],
    originHospital: 'Serviço de Medicina Nuclear & PET-CT — CPTAC-CM',
    priority: 'urgent',
    workflowStatus: 'draft',
    assignedRadiologistId: 'prac-rad-04',
    clinicalSummary: 'Coorte CPTAC-CM. PET-CT Corpo Inteiro Longo (PETWHOLEBODYLONGLD90) com 649 cortes metabólicos e fusão tomográfica.'
  },
  'C3N-03029': {
    name: 'Mariana Tavares Fontes (C3N-03029)',
    family: 'Fontes',
    given: ['Mariana', 'Tavares'],
    gender: 'female',
    birthDate: '1982-06-18',
    cpf: '519.832.004-91',
    phone: '(11) 97120-5592',
    bloodType: 'A-',
    allergies: ['Nega alergias'],
    originHospital: 'Instituto Oncológico — CPTAC-CM',
    priority: 'routine',
    workflowStatus: 'awaiting',
    assignedRadiologistId: 'prac-rad-03',
    clinicalSummary: 'Coorte CPTAC-CM. Tomografia Computadorizada de Pelve e Bacia Óssea (1.5mm e 3.0mm com reconstrução sagital MPR).'
  },
  'C3N-03460': {
    name: 'Eduardo Ribeiro Castanho (C3N-03460)',
    family: 'Castanho',
    given: ['Eduardo', 'Ribeiro'],
    gender: 'male',
    birthDate: '1957-09-14',
    cpf: '608.442.190-81',
    phone: '(11) 98340-1192',
    bloodType: 'O+',
    allergies: ['Nega alergias'],
    originHospital: 'Hospital Geral São Lucas — CPTAC-CM',
    priority: 'routine',
    workflowStatus: 'unassigned',
    assignedRadiologistId: null,
    clinicalSummary: 'Coorte CPTAC-CM. Estadiamento toracoabdominal com séries pulmonares (Lung 3.0 CE) e parenquimatosas arteriais/venosas.'
  },
  'C3N-03614': {
    name: 'Beatriz Helena Noronha (C3N-03614)',
    family: 'Noronha',
    given: ['Beatriz', 'Helena'],
    gender: 'female',
    birthDate: '1973-04-28',
    cpf: '719.204.553-09',
    phone: '(11) 99418-3029',
    bloodType: 'B+',
    allergies: ['Nega alergias'],
    originHospital: 'Hospital Sírio-Paulista — CPTAC-CM',
    priority: 'routine',
    workflowStatus: 'awaiting',
    assignedRadiologistId: 'prac-rad-02',
    clinicalSummary: 'Coorte CPTAC-CM. TC de Tórax e Abdome pré e pós-contraste (GE Medical Systems, série volumétrica de 1.051 cortes).'
  },
  'C3N-04293': {
    name: 'Sérgio Murilo Linhares (C3N-04293)',
    family: 'Linhares',
    given: ['Sérgio', 'Murilo'],
    gender: 'male',
    birthDate: '1964-12-21',
    cpf: '825.319.440-12',
    phone: '(21) 98712-9034',
    bloodType: 'O+',
    allergies: ['Nega alergias'],
    originHospital: 'Serviço de Medicina Nuclear & PET-CT — CPTAC-CM',
    priority: 'urgent',
    workflowStatus: 'awaiting',
    assignedRadiologistId: 'prac-rad-04',
    clinicalSummary: 'Coorte CPTAC-CM. PET-CT Corpo Inteiro (PETWHOLEBODYLD90) para avaliação de resposta metabólica sistêmica.'
  },
  'C3N-04294': {
    name: 'Cláudia Regina Mattos (C3N-04294)',
    family: 'Mattos',
    given: ['Cláudia', 'Regina'],
    gender: 'female',
    birthDate: '1968-05-03',
    cpf: '912.640.118-37',
    phone: '(11) 99602-7741',
    bloodType: 'A+',
    allergies: ['Nega alergias'],
    originHospital: 'Serviço de Medicina Nuclear & PET-CT — CPTAC-CM',
    priority: 'urgent',
    workflowStatus: 'unassigned',
    assignedRadiologistId: null,
    clinicalSummary: 'Coorte CPTAC-CM. PET-CT Corpo Inteiro Longo (PETWHOLEBODYLONGLD90) com séries PET WB 400 e CT WB 3.0mm.'
  }
};

/**
 * Converte data MM-DD-YYYY do CSV do TCIA para ISO 8601 (YYYY-MM-DDTHH:mm:ss-04:00)
 */
function parseTciaDateToIso(mmddyyyy) {
  if (!mmddyyyy || mmddyyyy === 'NA') {
    return '2026-11-02T08:00:00-04:00';
  }
  const parts = mmddyyyy.trim().split('-');
  if (parts.length === 3) {
    const [mm, dd, yyyy] = parts;
    return `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}T08:30:00-04:00`;
  }
  return '2026-11-02T08:00:00-04:00';
}

/**
 * Normaliza caminho relativo do metadata.csv (ex: .\CPTAC-CM\C3L-00275\...) para o caminho absoluto no SO atual
 */
function resolveSeriesAbsolutePath(relativeFileLocation) {
  const cleaned = (relativeFileLocation || '')
    .replace(/^\.[\\/]+/, '')
    .replace(/[\\/]+/g, path.sep);
  return path.join(orthancConfig.dataset.rootPath, cleaned);
}

/**
 * Lê e indexa todo o arquivo metadata.csv do dataset CPTAC-CM baixado
 */
let cachedDatasetStudies = null;

function loadCptacDatasetFromCsv() {
  if (cachedDatasetStudies) return cachedDatasetStudies;

  const csvPath = orthancConfig.dataset.metadataCsvPath;
  if (!fs.existsSync(csvPath)) {
    return [];
  }

  const content = fs.readFileSync(csvPath, 'utf-8');
  const lines = content.trim().split(/\r?\n/);
  if (lines.length <= 1) return [];

  const studiesMap = new Map();

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',');
    if (cols.length < 16) continue;

    const seriesUid = cols[0].trim();
    const collection = cols[1].trim();
    const subjectId = cols[4].trim();
    const studyUid = cols[5].trim();
    const rawStudyDesc = cols[6].trim();
    const studyDateStr = cols[7].trim();
    const seriesDesc = cols[8].trim();
    const manufacturer = cols[9].trim();
    const modality = cols[10].trim();
    const sopClassName = cols[11].trim();
    const numImages = Number(cols[13].trim()) || 1;
    const fileSizeStr = cols[14].trim();
    const relativeLocation = cols[15].trim();
    const absSeriesDir = resolveSeriesAbsolutePath(relativeLocation);

    if (!studiesMap.has(studyUid)) {
      studiesMap.set(studyUid, {
        subjectId,
        studyUid,
        collection,
        rawStudyDesc,
        studyDateStr,
        studyDateIso: parseTciaDateToIso(studyDateStr),
        manufacturer: manufacturer !== 'NA' && manufacturer !== 'null' ? manufacturer : 'SIEMENS / PHILIPS',
        modalitiesSet: new Set(),
        totalInstances: 0,
        series: []
      });
    }

    const st = studiesMap.get(studyUid);
    st.modalitiesSet.add(modality);
    st.totalInstances += numImages;

    // Extrai o número da série a partir do nome da pasta (ex: "203.000000-cap lw..." -> 203)
    const folderBase = path.basename(absSeriesDir);
    const numMatch = folderBase.match(/^(\d+)/);
    const seriesNumber = numMatch ? Number(numMatch[1]) : st.series.length + 1;

    st.series.push({
      uid: seriesUid,
      number: seriesNumber,
      modality,
      description: seriesDesc !== 'NA' ? seriesDesc : `Série ${seriesNumber} (${modality})`,
      instances: numImages,
      fileSize: fileSizeStr,
      sopClassName,
      absSeriesDir,
      relativeLocation
    });
  }

  // Ordena as séries de cada estudo colocando séries clínicas volumétricas primeiro (evitando que topogramas de 1 imagem fiquem na posição 0)
  const result = [];
  let idx = 1;

  for (const st of studiesMap.values()) {
    st.series.sort((a, b) => {
      const aIsScout = a.instances <= 3 ? 1 : 0;
      const bIsScout = b.instances <= 3 ? 1 : 0;
      if (aIsScout !== bIsScout) return aIsScout - bIsScout;
      return a.number - b.number;
    });

    // Determina modalidade principal do estudo (se tiver PT, é um exame híbrido PET-CT)
    let primaryModality = 'CT';
    if (st.modalitiesSet.has('PT') || st.rawStudyDesc.toUpperCase().includes('PET')) {
      primaryModality = 'PT';
    } else if (st.modalitiesSet.has('MR')) {
      primaryModality = 'MR';
    } else if (st.modalitiesSet.has('CT')) {
      primaryModality = 'CT';
    }

    // Formata descrição clínica amigável quando vier "NA" no TCIA
    let cleanStudyDesc = st.rawStudyDesc;
    if (!cleanStudyDesc || cleanStudyDesc === 'NA' || cleanStudyDesc === 'null') {
      const sampleSeriesNames = st.series
        .slice(0, 3)
        .map((s) => s.description)
        .join(' + ');
      cleanStudyDesc = `${primaryModality} ONCOLÓGICO MULTIFÁSICO (${sampleSeriesNames})`;
    }

    result.push({
      index: idx,
      caseId: `CPTAC-${String(idx).padStart(3, '0')}-${st.subjectId}`,
      subjectId: st.subjectId,
      studyUid: st.studyUid,
      accessionNumber: `CPTAC-${st.subjectId}-${String(idx).padStart(2, '0')}`,
      primaryModality,
      modalitiesInStudy: Array.from(st.modalitiesSet),
      studyDescription: `[CPTAC-CM] ${cleanStudyDesc}`,
      studyDateStr: st.studyDateStr,
      studyDateIso: st.studyDateIso,
      manufacturer: st.manufacturer,
      numberOfSeries: st.series.length,
      numberOfInstances: st.totalInstances,
      series: st.series
    });
    idx++;
  }

  cachedDatasetStudies = result;
  return result;
}

/**
 * Lista todos os arquivos .dcm reais de uma série no disco, ordenados numericamente (ex: 1-001.dcm, 1-002.dcm...)
 */
function listDcmFilesInSeriesDir(absSeriesDir) {
  if (!absSeriesDir || !fs.existsSync(absSeriesDir)) return [];
  try {
    const entries = fs.readdirSync(absSeriesDir);
    const dcmFiles = entries
      .filter((f) => f.toLowerCase().endsWith('.dcm'))
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }))
      .map((f) => path.join(absSeriesDir, f));
    return dcmFiles;
  } catch {
    return [];
  }
}

/**
 * Leitor binário nativo de arquivo DICOM Part 10 (.dcm)
 * Extrai Rows, Columns, BitsAllocated, RescaleSlope, RescaleIntercept, WindowCenter/Width e aplica janelamento
 * retornando um buffer de pixels de 8 bits (grayscale) pronto para renderização imediata no Canvas HTML5!
 */
function readAndWindowDicomSlice(dcmFilePath, customWindowWidth = null, customWindowLevel = null) {
  const buf = fs.readFileSync(dcmFilePath);
  const len = buf.length;

  // Defaults padrão para CT/MR/PET (512x512 ou 256x256)
  let rows = 512;
  let cols = 512;
  let bitsAllocated = 16;
  let pixelRepresentation = 1; // 1 = signed int16 (padrão CT HU), 0 = unsigned uint16
  let rescaleIntercept = 0;
  let rescaleSlope = 1;
  let defaultWC = null;
  let defaultWW = null;
  let pixelDataOffset = -1;

  // Verifica preâmbulo DICM no offset 128
  let offset = 0;
  if (len > 132 && buf.toString('ascii', 128, 132) === 'DICM') {
    offset = 132;
  }

  // Varre tags DICOM Explicit/Implicit VR Little Endian até encontrar (7FE0,0010) PixelData
  while (offset + 8 < len) {
    const group = buf.readUInt16LE(offset);
    const element = buf.readUInt16LE(offset + 2);

    // Tag (7FE0,0010) Pixel Data
    if (group === 0x7fe0 && element === 0x0010) {
      const vr = buf.toString('ascii', offset + 4, offset + 6);
      if (vr === 'OB' || vr === 'OW') {
        pixelDataOffset = offset + 12;
      } else {
        pixelDataOffset = offset + 8;
      }
      break;
    }

    // Heurística leve por tags conhecidas no cabeçalho (primeiros 8 KB)
    if (offset > 16384) break;

    const vr = buf.toString('ascii', offset + 4, offset + 6);
    const isExplicitVR = /^[A-Z]{2}$/.test(vr);
    let valueLength = 0;
    let valueOffset = 0;

    if (isExplicitVR) {
      if (['OB', 'OW', 'OF', 'SQ', 'UT', 'UN'].includes(vr)) {
        if (offset + 12 > len) break;
        valueLength = buf.readUInt32LE(offset + 8);
        valueOffset = offset + 12;
      } else {
        valueLength = buf.readUInt16LE(offset + 6);
        valueOffset = offset + 8;
      }
    } else {
      valueLength = buf.readUInt32LE(offset + 4);
      valueOffset = offset + 8;
    }

    if (valueLength === 0xffffffff || valueLength < 0 || valueOffset + valueLength > len) {
      offset += 2;
      continue;
    }

    if (group === 0x0028 && element === 0x0010 && valueLength === 2) {
      rows = buf.readUInt16LE(valueOffset);
    } else if (group === 0x0028 && element === 0x0011 && valueLength === 2) {
      cols = buf.readUInt16LE(valueOffset);
    } else if (group === 0x0028 && element === 0x0100 && valueLength === 2) {
      bitsAllocated = buf.readUInt16LE(valueOffset);
    } else if (group === 0x0028 && element === 0x0103 && valueLength === 2) {
      pixelRepresentation = buf.readUInt16LE(valueOffset);
    } else if (group === 0x0028 && element === 0x1050) {
      const str = buf.toString('ascii', valueOffset, valueOffset + valueLength).trim();
      const firstVal = parseFloat(str.split('\\')[0]);
      if (!Number.isNaN(firstVal)) defaultWC = firstVal;
    } else if (group === 0x0028 && element === 0x1051) {
      const str = buf.toString('ascii', valueOffset, valueOffset + valueLength).trim();
      const firstVal = parseFloat(str.split('\\')[0]);
      if (!Number.isNaN(firstVal)) defaultWW = firstVal;
    } else if (group === 0x0028 && element === 0x1052) {
      const str = buf.toString('ascii', valueOffset, valueOffset + valueLength).trim();
      const val = parseFloat(str);
      if (!Number.isNaN(val)) rescaleIntercept = val;
    } else if (group === 0x0028 && element === 0x1053) {
      const str = buf.toString('ascii', valueOffset, valueOffset + valueLength).trim();
      const val = parseFloat(str);
      if (!Number.isNaN(val)) rescaleSlope = val;
    }

    offset = valueOffset + valueLength;
  }

  // Se o parser de tags não achou o offset exato de (7FE0,0010), calcula pelo final do arquivo
  let expectedPixels = rows * cols;
  let expectedBytes = expectedPixels * (bitsAllocated / 8);

  if (pixelDataOffset < 0 || pixelDataOffset + expectedBytes > len) {
    // Tenta inferir dimensão pelo tamanho do arquivo (512x512x2 = 524288, 256x256x2 = 131072, 128x128x2 = 32768)
    if (len >= 524288 && len < 600000) {
      rows = 512;
      cols = 512;
    } else if (len >= 131072 && len < 200000) {
      rows = 256;
      cols = 256;
    } else if (len >= 32768 && len < 90000) {
      rows = 128;
      cols = 128;
    }
    expectedPixels = rows * cols;
    expectedBytes = expectedPixels * 2;
    pixelDataOffset = Math.max(0, len - expectedBytes);
  }

  // Primeiro passo: lê valores de pixel aplicando RescaleSlope e RescaleIntercept e encontra min/max
  const values = new Float32Array(expectedPixels);
  let minVal = Infinity;
  let maxVal = -Infinity;

  for (let i = 0; i < expectedPixels; i++) {
    const bytePos = pixelDataOffset + i * 2;
    if (bytePos + 1 >= len) break;
    const raw =
      pixelRepresentation === 1
        ? buf.readInt16LE(bytePos)
        : buf.readUInt16LE(bytePos);

    // Ignora padding circular extremo de tomógrafos (-2000 / -3024)
    const hu = raw * rescaleSlope + rescaleIntercept;
    values[i] = hu;
    if (hu > -1500 && hu < minVal) minVal = hu;
    if (hu > maxVal) maxVal = hu;
  }

  if (!Number.isFinite(minVal) || !Number.isFinite(maxVal) || maxVal <= minVal) {
    minVal = 0;
    maxVal = 1000;
  }

  // Define Janela (Window Width / Window Level)
  const ww = customWindowWidth !== null ? Number(customWindowWidth) : (defaultWW || (maxVal - minVal) || 1500);
  const wl = customWindowLevel !== null ? Number(customWindowLevel) : (defaultWC ?? ((maxVal + minVal) / 2));

  const low = wl - ww / 2;
  const high = wl + ww / 2;
  const range = Math.max(1, high - low);

  const gray8 = Buffer.alloc(expectedPixels);
  for (let i = 0; i < expectedPixels; i++) {
    const v = values[i];
    if (v <= low) {
      gray8[i] = 0;
    } else if (v >= high) {
      gray8[i] = 255;
    } else {
      gray8[i] = Math.round(((v - low) / range) * 255);
    }
  }

  return {
    rows,
    cols,
    bitsAllocated,
    rescaleIntercept,
    rescaleSlope,
    windowCenter: Math.round(wl),
    windowWidth: Math.round(ww),
    minVal: Math.round(minVal),
    maxVal: Math.round(maxVal),
    fileName: path.basename(dcmFilePath),
    pixelsBase64: gray8.toString('base64')
  };
}

/**
 * Envia os arquivos .dcm reais de um estudo/série do CPTAC-CM para o Orthanc PACS local (POST /instances)
 * @param {string} studyUidOrCaseId
 * @param {object} options - { seriesIndex: number | null, maxInstances: number }
 */
async function uploadCptacStudyToOrthanc(studyUidOrCaseId, options = {}) {
  const studies = loadCptacDatasetFromCsv();
  const targetStudy = studies.find(
    (s) => s.caseId === studyUidOrCaseId || s.studyUid === studyUidOrCaseId
  );

  if (!targetStudy) {
    throw new Error(`Estudo CPTAC-CM '${studyUidOrCaseId}' não encontrado no dataset.`);
  }

  const maxInstances = Number(options.maxInstances || 60);
  const seriesToUpload =
    options.seriesIndex !== undefined && options.seriesIndex !== null
      ? [targetStudy.series[Number(options.seriesIndex)]].filter(Boolean)
      : targetStudy.series.slice(0, 2); // Por padrão envia as 2 séries principais para ser rápido

  const filesToUpload = [];
  for (const s of seriesToUpload) {
    const dcmFiles = listDcmFilesInSeriesDir(s.absSeriesDir);
    if (dcmFiles.length <= maxInstances) {
      filesToUpload.push(...dcmFiles);
    } else {
      // Seleciona cortes igualmente espaçados caso a série tenha centenas de imagens
      const step = dcmFiles.length / maxInstances;
      for (let i = 0; i < maxInstances; i++) {
        filesToUpload.push(dcmFiles[Math.floor(i * step)]);
      }
    }
  }

  const headers = { 'Content-Type': 'application/dicom' };
  const { username, password, url } = orthancConfig.orthanc;
  if (username && password) {
    headers.Authorization = `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`;
  }

  let uploadedCount = 0;
  let orthancParentStudyId = null;
  let orthancParentPatientId = null;

  for (const filePath of filesToUpload) {
    const buffer = fs.readFileSync(filePath);
    const res = await fetch(`${url}/instances`, {
      method: 'POST',
      headers,
      body: buffer
    });

    if (res.ok) {
      uploadedCount++;
      const info = await res.json();
      if (info.ParentStudy) orthancParentStudyId = info.ParentStudy;
      if (info.ParentPatient) orthancParentPatientId = info.ParentPatient;
    }
  }

  return {
    success: uploadedCount > 0,
    caseId: targetStudy.caseId,
    subjectId: targetStudy.subjectId,
    studyInstanceUID: targetStudy.studyUid,
    uploadedInstances: uploadedCount,
    totalSelected: filesToUpload.length,
    orthancStudyId: orthancParentStudyId,
    orthancPatientId: orthancParentPatientId,
    viewerUrls: orthancConfig.buildViewerUrls(targetStudy.studyUid, orthancParentStudyId || '')
  };
}

module.exports = {
  CPTAC_SUBJECT_PROFILES,
  loadCptacDatasetFromCsv,
  listDcmFilesInSeriesDir,
  readAndWindowDicomSlice,
  uploadCptacStudyToOrthanc
};
