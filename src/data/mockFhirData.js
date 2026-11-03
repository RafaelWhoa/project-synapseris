const orthancConfig = require('../config/orthanc.config');
const cptacDataset = require('../services/cptacDatasetService');

/**
 * Lista de Médicos Radiologistas cadastrados no RIS (FHIR Practitioner)
 */
const RADIOLOGISTS = [
  {
    id: 'prac-rad-01',
    resourceType: 'Practitioner',
    name: 'Dr. Henrique Vasconcelos',
    crm: 'CRM-SP 148.920 / RQE 62.110',
    specialty: 'Neurorradiologia e Cabeça & Pescoço',
    avatar: 'HV',
    email: 'henrique.vasconcelos@synapseris.med.br'
  },
  {
    id: 'prac-rad-02',
    resourceType: 'Practitioner',
    name: 'Dra. Beatriz Albuquerque',
    crm: 'CRM-SP 172.405 / RQE 78.340',
    specialty: 'Radiologia Torácica e Medicina Interna (TC/RM)',
    avatar: 'BA',
    email: 'beatriz.albuquerque@synapseris.med.br'
  },
  {
    id: 'prac-rad-03',
    resourceType: 'Practitioner',
    name: 'Dr. Marcelo Siqueira Campos',
    crm: 'CRM-RJ 119.830 / RQE 49.120',
    specialty: 'Sistema Musculoesquelético e Abdome/Pelve',
    avatar: 'MS',
    email: 'marcelo.siqueira@synapseris.med.br'
  },
  {
    id: 'prac-rad-04',
    resourceType: 'Practitioner',
    name: 'Dra. Carolina Mendes Faria',
    crm: 'CRM-MG 164.210 / RQE 71.095',
    specialty: 'Medicina Nuclear, PET-CT e Oncologia (CPTAC)',
    avatar: 'CF',
    email: 'carolina.faria@synapseris.med.br'
  }
];

/**
 * Templates de Laudo Estruturados para o Editor Rico (incluindo protocolos CPTAC-CM)
 */
const REPORT_TEMPLATES = [
  {
    id: 'tpl-cptac-ct-cap',
    title: '[CPTAC-CM] TC Tórax, Abdome e Pelve c/ Contraste (Estadiamento)',
    modality: 'CT',
    technique: 'Exame realizado em tomógrafo multislice através de aquisições volumétricas helicoidais do tórax, abdome e pelve antes e após a infusão endovenosa de meio de contraste iodado (fases arterial, portal e de equilíbrio/excretora), com reconstruções multiplanares (MPR) axiais, coronais e sagitais (iDose 3 / 1.0mm e 5.0mm).',
    findings: 'TÓRAX:\nParênquima pulmonar com coeficientes de atenuação preservados, sem nódulos secundários ou derrames pleurais.\nMediastino centrado, sem linfonodomegalias axilares, mediastinais ou hilares.\n\nABDOME E PELVE:\nFígado de dimensões e contornos normais, parênquima homogêneo nas fases arterial, portal e tardia, sem lesões focais suspeitas.\nBaço, pâncreas, adrenais e rins sem alterações tomográficas.\nAusência de linfonodomegalias retroperitoneais, mesentéricas ou ilíacas.\nAusência de líquido livre na cavidade peritoneal.\n\nESTRUTURAS ÓSSEAS:\nAusência de lesões ósseas líticas ou blásticas agressivas.',
    conclusion: 'Estadiamento tomográfico toracoabdominopélvico (Protocolo CPTAC-CM) sem evidências de doença metastática visceral ou linfonodal em atividade.'
  },
  {
    id: 'tpl-cptac-mr-brain',
    title: '[CPTAC-CM] RM de Encéfalo c/ Contraste (Pesquisa Secundária)',
    modality: 'MR',
    technique: 'Exame realizado em equipamento de Ressonância Magnética com sequências multiplanares ponderadas em T1 SE, T2 FSE, FLAIR, T2* GRE, Difusão (DWI/ADC/eADC) e sequências volumétricas 3D-SPGR/TFE T1 após administração venosa de contraste paramagnético (gadolínio).',
    findings: 'Parênquima encefálico supra e infratentorial com morfologia e intensidade de sinal preservadas.\nAusência de lesões nodulares com realce anelar ou parenquimatoso anômalo pelo gadolínio sugestivas de implantes secundários.\nNão há restrição à difusão das moléculas de água (DWI/ADC) ou focos de susceptibilidade magnética (T2* GRE) sugestivos de depósitos de melanina/hemossiderina.\nSistema ventricular centrado e de dimensões normais.\nCisternas da base e sulcos corticais livres.',
    conclusion: 'Ressonância Magnética do Encéfalo (Protocolo Neuro-Oncológico CPTAC-CM) sem evidências de lesões secundárias intracranianas.'
  },
  {
    id: 'tpl-pet-ct-onco',
    title: '[CPTAC-CM] PET-CT Oncológico Corpo Inteiro (18F-FDG)',
    modality: 'PT',
    technique: 'Aquisição tomográfica por emissão de pósitrons (PET WB) acoplada à tomografia computadorizada helicoidal de baixa dose para correção de atenuação e localização anatômica (CT WB 3.0mm B30f/B70f), realizada após administração venosa de 18F-FDG.',
    findings: 'Biodistribuição fisiológica do radiofármaco no encéfalo, anel linfático de Waldeyer, miocárdio, fígado, baço e trato urinário.\nCabeça e pescoço: sem linfonodomegalias hipermetabólicas cervicais.\nTórax: campos pleuropulmonares e cadeias mediastinais sem captação anômala de 18F-FDG.\nAbdome e pelve: fígado, adrenais e cadeias linfonodais retroperitoneais/ilíacas/inguinais sem focos hipermetabólicos.\nEsqueleto e partes moles: ausência de lesões cutâneas, subcutâneas ou ósseas hipermetabólicas.',
    conclusion: 'Estudo de PET-CT com 18F-FDG (Protocolo CPTAC-CM) sem evidências de neoplasia metabolicamente ativa.'
  },
  {
    id: 'tpl-torax-normal',
    title: 'Tórax Normal (TC de Alta Resolução)',
    modality: 'CT',
    technique: 'Aquisições volumétricas helicoidais do tórax de alta resolução (0.75mm B60f/B30f) e reconstruções MIP axiais de 12mm.',
    findings: 'Parênquima pulmonar com coeficientes de atenuação preservados, sem evidências de consolidações, nódulos suspeitos ou opacidades em vidro fosco.\nÁrvore traqueobrônquica pérvia, de calibre normal.\nCavidades pleurais livres.\nEstruturas mediastinais e hilares de configuração anatômica.',
    conclusion: 'Tomografia computadorizada do tórax dentro dos limites da normalidade.'
  },
  {
    id: 'tpl-coluna-lombar',
    title: 'Coluna Lombar (RX / CR Lombossacra)',
    modality: 'CR',
    technique: 'Aquisições radiográficas digitais nas incidências anteroposterior (AP) e perfil da coluna lombossacra em ortostase.',
    findings: 'Alinhamento posterior dos corpos vertebrais lombares preservado no plano sagital.\nCorpos vertebrais com altura e densidade óssea mantidas.\nEspaços discais intervertebrais de altura conservada.\nPedículos e articulações sacroilíacas íntegros.',
    conclusion: 'Estudo radiográfico da coluna lombossacra sem alterações agudas.'
  },
  {
    id: 'tpl-rx-torax-pa-perfil',
    title: 'Radiografia de Tórax PA e Perfil (DX)',
    modality: 'DX',
    technique: 'Radiografias digitais do tórax obtidas nas incidências posteroanterior (PA) e perfil em inspiração profunda.',
    findings: 'Transparência pulmonar bilateral preservada.\nSeios costofrênicos livres.\nÍndice cardiotorácico normal.',
    conclusion: 'Estudo radiográfico do tórax dentro dos limites da normalidade.'
  },
  {
    id: 'tpl-us-abdome-total',
    title: 'Ultrassonografia de Abdome Total (US)',
    modality: 'US',
    technique: 'Exame ultrassonográfico realizado em modo B e Doppler colorido com transdutor convexo multifrequencial.',
    findings: 'Fígado, vesícula biliar, vias biliares, pâncreas, baço e rins com dimensões, contornos e ecogenicidade preservados.',
    conclusion: 'Ultrassonografia de abdome total dentro dos limites da normalidade.'
  }
];

/**
 * Converte os estudos reais do dataset CPTAC-CM (metadata.csv) em casos da Worklist RIS + HL7 FHIR R4
 */
function buildCasesFromCptacDataset() {
  const cptacStudies = cptacDataset.loadCptacDatasetFromCsv();
  const generatedCases = [];

  // Rastreia múltiplos estudos do mesmo paciente (ex: C3L-00629 possui 5 exames de RM em datas diferentes!)
  const studiesBySubject = new Map();
  for (const st of cptacStudies) {
    if (!studiesBySubject.has(st.subjectId)) {
      studiesBySubject.set(st.subjectId, []);
    }
    studiesBySubject.get(st.subjectId).push(st);
  }

  for (const st of cptacStudies) {
    const profile = cptacDataset.CPTAC_SUBJECT_PROFILES[st.subjectId] || {
      name: `Paciente CPTAC-CM (${st.subjectId})`,
      family: st.subjectId,
      given: ['Paciente', 'CPTAC'],
      gender: 'male',
      birthDate: '1965-05-15',
      cpf: 'Coorte TCIA CPTAC-CM',
      phone: '(11) 99000-0000',
      bloodType: 'O+',
      allergies: ['Nega alergias'],
      originHospital: 'CPTAC Oncology Consortium Center',
      priority: 'routine',
      workflowStatus: 'awaiting',
      assignedRadiologistId: 'prac-rad-02',
      clinicalSummary: `Estudo clínico real da coleção CPTAC-CM (Subject ID: ${st.subjectId}).`
    };

    const siblingStudies = studiesBySubject.get(st.subjectId) || [];
    const medicalHistory = siblingStudies.map((sib) => ({
      date: sib.studyDateIso.slice(0, 10),
      type: `${sib.primaryModality} — ${sib.studyDescription}`,
      summary: `StudyUID: ${sib.studyUid} (${sib.numberOfSeries} séries, ${sib.numberOfInstances} imagens DICOM em disco).`
    }));

    // Define laudo pré-populado caso o estudo esteja em rascunho ou finalizado
    let reportObj = {
      status: 'registered',
      technique: '',
      findings: '',
      conclusion: '',
      updatedAt: null,
      signedAt: null
    };

    if (profile.workflowStatus === 'draft') {
      const tpl =
        st.primaryModality === 'MR'
          ? REPORT_TEMPLATES[1]
          : st.primaryModality === 'PT'
            ? REPORT_TEMPLATES[2]
            : REPORT_TEMPLATES[0];
      reportObj = {
        status: 'partial',
        technique: tpl.technique,
        findings: tpl.findings,
        conclusion: `[Rascunho em revisão] ${tpl.conclusion}`,
        updatedAt: '2026-11-02T08:15:00-04:00',
        signedAt: null
      };
    } else if (profile.workflowStatus === 'final') {
      const tpl =
        st.primaryModality === 'PT'
          ? REPORT_TEMPLATES[2]
          : REPORT_TEMPLATES[0];
      reportObj = {
        status: 'final',
        technique: tpl.technique,
        findings: tpl.findings,
        conclusion: tpl.conclusion,
        updatedAt: '2026-11-01T17:40:00-04:00',
        signedAt: '2026-11-01T18:00:00-04:00'
      };
    }

    generatedCases.push({
      caseId: st.caseId,
      isRealCptacDataset: true,
      patient: {
        id: `pat-cptac-${st.subjectId.toLowerCase()}`,
        dicomPatientId: st.subjectId,
        cpf: profile.cpf,
        name: profile.name,
        family: profile.family,
        given: profile.given,
        gender: profile.gender,
        birthDate: profile.birthDate,
        phone: profile.phone,
        bloodType: profile.bloodType,
        allergies: profile.allergies,
        clinicalSummary: profile.clinicalSummary,
        medicalHistory
      },
      study: {
        studyInstanceUID: st.studyUid,
        accessionNumber: st.accessionNumber,
        modality: st.primaryModality,
        modalityDisplay:
          st.primaryModality === 'PT'
            ? 'PET-CT (Positron Emission Tomography + CT)'
            : st.primaryModality === 'MR'
              ? 'Ressonância Magnética (MR)'
              : 'Tomografia Computadorizada (CT)',
        studyDate: st.studyDateIso,
        studyDescription: st.studyDescription,
        originHospital: profile.originHospital,
        priority: profile.priority,
        workflowStatus: profile.workflowStatus,
        assignedRadiologistId: profile.assignedRadiologistId,
        numberOfSeries: st.numberOfSeries,
        numberOfInstances: st.numberOfInstances,
        clinicalIndication: `${profile.clinicalSummary} (${st.numberOfSeries} séries / ${st.numberOfInstances} cortes DICOM reais disponíveis localmente).`,
        series: st.series,
        report: reportObj
      }
    });
  }

  return generatedCases;
}

/**
 * 3 Estudos complementares (CR, DX, US) para que o gráfico Donut do Dashboard contemple todas as 6 modalidades radiológicas
 */
const COMPLEMENTARY_MODALITY_CASES = [
  {
    caseId: 'COMP-CR-001',
    isRealCptacDataset: false,
    patient: {
      id: 'pat-comp-cr1',
      dicomPatientId: 'SYN-CR-00215',
      cpf: '519.832.004-91',
      name: 'Mariana Tavares Fontes',
      family: 'Fontes',
      given: ['Mariana', 'Tavares'],
      gender: 'female',
      birthDate: '1991-06-18',
      phone: '(11) 97120-5592',
      bloodType: 'A-',
      allergies: ['Nega alergias'],
      clinicalSummary: 'Lombalgia mecânica irradiada para face posterior da coxa esquerda.',
      medicalHistory: [
        { date: '2025-09-04', type: 'Fisioterapia Motora', summary: 'Contratura paravertebral lombar.' }
      ]
    },
    study: {
      studyInstanceUID: '1.2.840.113619.2.55.3.2831164352.781.1709100004.404',
      accessionNumber: 'ACC-2026-CR01',
      modality: 'CR',
      modalityDisplay: 'Radiografia Computadorizada',
      studyDate: '2026-11-02T06:50:00-04:00',
      studyDescription: 'RX COLUNA LOMBOSSACRA AP + PERFIL',
      originHospital: 'Clínica Ortopédica VitaMove',
      priority: 'routine',
      workflowStatus: 'awaiting',
      assignedRadiologistId: 'prac-rad-03',
      numberOfSeries: 2,
      numberOfInstances: 4,
      clinicalIndication: 'Lombociatalgia subaguda à esquerda.',
      series: [
        { uid: '1.2.840.113619.2.55.3.2831164352.781.1709100004.404.1', number: 1, modality: 'CR', description: 'Incidência AP e Perfil Ortostático', instances: 2 }
      ],
      report: { status: 'registered', technique: '', findings: '', conclusion: '', updatedAt: null, signedAt: null }
    }
  },
  {
    caseId: 'COMP-DX-002',
    isRealCptacDataset: false,
    patient: {
      id: 'pat-comp-dx2',
      dicomPatientId: 'SYN-DX-00248',
      cpf: '774.129.384-52',
      name: 'Fernanda Lúcia Rocha',
      family: 'Rocha',
      given: ['Fernanda', 'Lúcia'],
      gender: 'female',
      birthDate: '1985-11-29',
      phone: '(11) 99201-7410',
      bloodType: 'O-',
      allergies: ['Nega alergias'],
      clinicalSummary: 'Avaliação torácica pré-operatória de rotina.',
      medicalHistory: [
        { date: '2025-04-18', type: 'RX Tórax PA', summary: 'Exame radiográfico normal.' }
      ]
    },
    study: {
      studyInstanceUID: '1.2.840.113619.2.55.3.2831164352.781.1709100006.606',
      accessionNumber: 'ACC-2026-DX02',
      modality: 'DX',
      modalityDisplay: 'Radiografia Digital Direta',
      studyDate: '2026-10-31T14:20:00-04:00',
      studyDescription: 'RX TÓRAX PA E PERFIL DIGITAL',
      originHospital: 'Centro Diagnóstico Avançado Paulista',
      priority: 'routine',
      workflowStatus: 'final',
      assignedRadiologistId: 'prac-rad-02',
      numberOfSeries: 1,
      numberOfInstances: 2,
      clinicalIndication: 'Controle pré-operatório.',
      series: [
        { uid: '1.2.840.113619.2.55.3.2831164352.781.1709100006.606.1', number: 1, modality: 'DX', description: 'Tórax PA e Perfil', instances: 2 }
      ],
      report: {
        status: 'final',
        technique: REPORT_TEMPLATES[5].technique,
        findings: REPORT_TEMPLATES[5].findings,
        conclusion: REPORT_TEMPLATES[5].conclusion,
        updatedAt: '2026-10-31T16:10:00-04:00',
        signedAt: '2026-10-31T16:15:00-04:00'
      }
    }
  },
  {
    caseId: 'COMP-US-003',
    isRealCptacDataset: false,
    patient: {
      id: 'pat-comp-us3',
      dicomPatientId: 'SYN-US-00319',
      cpf: '390.114.782-04',
      name: 'Camila Duarte Peixoto (US)',
      family: 'Peixoto',
      given: ['Camila', 'Duarte'],
      gender: 'female',
      birthDate: '1988-01-17',
      phone: '(21) 98230-4910',
      bloodType: 'O+',
      allergies: ['Nega alergias'],
      clinicalSummary: 'Dor em hipocôndrio direito pós-prandial.',
      medicalHistory: [
        { date: '2025-02-14', type: 'US Abdome prévio', summary: 'Sem alterações significativas.' }
      ]
    },
    study: {
      studyInstanceUID: '1.2.840.113619.2.55.3.2831164352.781.1709100005.505',
      accessionNumber: 'ACC-2026-US03',
      modality: 'US',
      modalityDisplay: 'Ultrassonografia',
      studyDate: '2026-11-02T08:05:00-04:00',
      studyDescription: 'US ABDOME TOTAL COM DOPPLER HEPÁTICO',
      originHospital: 'Hospital Geral São Lucas — Emergência',
      priority: 'urgent',
      workflowStatus: 'unassigned',
      assignedRadiologistId: null,
      numberOfSeries: 1,
      numberOfInstances: 28,
      clinicalIndication: 'Suspeita de colecistite aguda litiásica.',
      series: [
        { uid: '1.2.840.113619.2.55.3.2831164352.781.1709100005.505.1', number: 1, modality: 'US', description: 'Varredura Abdominal Modo B + Color Doppler', instances: 28 }
      ],
      report: { status: 'registered', technique: '', findings: '', conclusion: '', updatedAt: null, signedAt: null }
    }
  }
];

function encodePresentedFormBase64(technique, findings, conclusion) {
  const html = `<div class="fhir-report">
  <h4>TÉCNICA</h4><p>${technique || ''}</p>
  <h4>ACHADOS RADIOLÓGICOS</h4><p>${(findings || '').replace(/\n/g, '<br/>')}</p>
  <h4>IMPRESSÃO DIAGNÓSTICA / CONCLUSÃO</h4><p><strong>${conclusion || ''}</strong></p>
</div>`;
  return Buffer.from(html, 'utf-8').toString('base64');
}

function buildFhirResourcesFromCase(item) {
  const { patient, study } = item;
  const radiologist = RADIOLOGISTS.find((r) => r.id === study.assignedRadiologistId) || null;

  const fhirPatient = {
    resourceType: 'Patient',
    id: patient.id,
    meta: {
      profile: ['http://hl7.org/fhir/StructureDefinition/Patient']
    },
    identifier: [
      {
        use: 'official',
        system: 'urn:dicom:patient-id',
        type: { coding: [{ system: 'http://terminology.hl7.org/CodeSystem/v2-0203', code: 'MR', display: 'Medical Record Number (DICOM PatientID)' }] },
        value: patient.dicomPatientId
      },
      {
        use: 'secondary',
        system: 'http://rnds.saude.gov.br/fhir/r4/NamingSystem/cpf',
        value: patient.cpf
      }
    ],
    active: true,
    name: [
      {
        use: 'official',
        text: patient.name,
        family: patient.family,
        given: patient.given
      }
    ],
    telecom: [{ system: 'phone', value: patient.phone, use: 'mobile' }],
    gender: patient.gender,
    birthDate: patient.birthDate,
    extension: [
      { url: 'http://synapseris.local/fhir/StructureDefinition/blood-type', valueString: patient.bloodType },
      { url: 'http://synapseris.local/fhir/StructureDefinition/allergies', valueString: patient.allergies.join(', ') },
      { url: 'http://synapseris.local/fhir/StructureDefinition/clinical-summary', valueString: patient.clinicalSummary }
    ]
  };

  const serviceRequestStatus = study.workflowStatus === 'final' ? 'completed' : 'active';
  const fhirServiceRequest = {
    resourceType: 'ServiceRequest',
    id: `sr-${item.caseId.toLowerCase()}`,
    meta: {
      profile: ['http://hl7.org/fhir/StructureDefinition/ServiceRequest']
    },
    identifier: [
      {
        type: { coding: [{ system: 'http://terminology.hl7.org/CodeSystem/v2-0203', code: 'ACSN', display: 'Accession ID' }] },
        system: 'urn:dicom:accession-number',
        value: study.accessionNumber
      }
    ],
    status: serviceRequestStatus,
    intent: 'order',
    priority: study.priority,
    category: [
      {
        coding: [{ system: 'http://snomed.info/sct', code: '363679005', display: 'Imaging' }]
      }
    ],
    code: {
      coding: [
        {
          system: 'http://dicom.nema.org/resources/ontology/DCM',
          code: study.modality,
          display: study.studyDescription
        }
      ],
      text: study.studyDescription
    },
    subject: {
      reference: `Patient/${patient.id}`,
      display: patient.name
    },
    authoredOn: study.studyDate,
    requester: {
      display: study.originHospital
    },
    performer: radiologist
      ? [{ reference: `Practitioner/${radiologist.id}`, display: radiologist.name }]
      : [],
    reasonCode: [{ text: study.clinicalIndication }]
  };

  const fhirImagingStudy = {
    resourceType: 'ImagingStudy',
    id: `img-${item.caseId.toLowerCase()}`,
    meta: {
      profile: ['http://hl7.org/fhir/StructureDefinition/ImagingStudy']
    },
    identifier: [
      {
        system: 'urn:dicom:uid',
        value: `urn:oid:${study.studyInstanceUID}`
      },
      {
        type: { coding: [{ system: 'http://terminology.hl7.org/CodeSystem/v2-0203', code: 'ACSN' }] },
        value: study.accessionNumber
      }
    ],
    status: 'available',
    modality: [
      {
        system: 'http://dicom.nema.org/resources/ontology/DCM',
        code: study.modality,
        display: study.modalityDisplay
      }
    ],
    subject: {
      reference: `Patient/${patient.id}`,
      display: patient.name
    },
    started: study.studyDate,
    basedOn: [{ reference: `ServiceRequest/sr-${item.caseId.toLowerCase()}` }],
    numberOfSeries: study.numberOfSeries,
    numberOfInstances: study.numberOfInstances,
    description: study.studyDescription,
    series: study.series.map((s) => ({
      uid: s.uid,
      number: s.number,
      modality: {
        system: 'http://dicom.nema.org/resources/ontology/DCM',
        code: s.modality
      },
      description: s.description,
      numberOfInstances: s.instances,
      fileSize: s.fileSize || null,
      hasLocalDicomFiles: Boolean(s.absSeriesDir)
    }))
  };

  const fhirReportStatusMap = {
    unassigned: 'registered',
    awaiting: 'registered',
    draft: 'preliminary',
    final: 'final'
  };
  const fhirDiagnosticReport = {
    resourceType: 'DiagnosticReport',
    id: `dr-${item.caseId.toLowerCase()}`,
    meta: {
      profile: ['http://hl7.org/fhir/StructureDefinition/DiagnosticReport']
    },
    basedOn: [{ reference: `ServiceRequest/sr-${item.caseId.toLowerCase()}` }],
    status: fhirReportStatusMap[study.workflowStatus] || 'registered',
    category: [
      {
        coding: [{ system: 'http://terminology.hl7.org/CodeSystem/v2-0074', code: 'RAD', display: 'Radiology' }]
      }
    ],
    code: {
      coding: [
        {
          system: 'http://dicom.nema.org/resources/ontology/DCM',
          code: study.modality,
          display: study.studyDescription
        }
      ],
      text: study.studyDescription
    },
    subject: {
      reference: `Patient/${patient.id}`,
      display: patient.name
    },
    effectiveDateTime: study.studyDate,
    issued: study.report.signedAt || study.report.updatedAt || study.studyDate,
    performer: radiologist
      ? [{ reference: `Practitioner/${radiologist.id}`, display: `${radiologist.name} (${radiologist.crm})` }]
      : [],
    resultsInterpreter: radiologist
      ? [{ reference: `Practitioner/${radiologist.id}`, display: `${radiologist.name} (${radiologist.crm})` }]
      : [],
    imagingStudy: [{ reference: `ImagingStudy/img-${item.caseId.toLowerCase()}` }],
    conclusion: study.report.conclusion || '',
    presentedForm: [
      {
        contentType: 'text/html; charset=utf-8',
        language: 'pt-BR',
        title: `Laudo Radiológico — ${study.accessionNumber}`,
        data: encodePresentedFormBase64(
          study.report.technique,
          study.report.findings,
          study.report.conclusion
        )
      }
    ]
  };

  const viewerUrls = orthancConfig.buildViewerUrls(study.studyInstanceUID, study.orthancId || '');

  return {
    caseId: item.caseId,
    isRealCptacDataset: Boolean(item.isRealCptacDataset),
    dicom: {
      PatientID: patient.dicomPatientId,
      PatientName: patient.name,
      PatientBirthDate: patient.birthDate,
      PatientSex: patient.gender === 'male' ? 'M' : 'F',
      StudyInstanceUID: study.studyInstanceUID,
      AccessionNumber: study.accessionNumber,
      Modality: study.modality,
      StudyDate: study.studyDate,
      StudyDescription: study.studyDescription,
      orthancId: study.orthancId || null
    },
    workflow: {
      status: study.workflowStatus,
      priority: study.priority,
      originHospital: study.originHospital,
      receivedAt: study.studyDate,
      assignedRadiologist: radiologist,
      clinicalIndication: study.clinicalIndication,
      reportSections: {
        technique: study.report.technique,
        findings: study.report.findings,
        conclusion: study.report.conclusion,
        updatedAt: study.report.updatedAt,
        signedAt: study.report.signedAt
      }
    },
    patientRecord: {
      cpf: patient.cpf,
      phone: patient.phone,
      bloodType: patient.bloodType,
      allergies: patient.allergies,
      clinicalSummary: patient.clinicalSummary,
      medicalHistory: patient.medicalHistory
    },
    viewerUrls,
    fhir: {
      Patient: fhirPatient,
      ServiceRequest: fhirServiceRequest,
      ImagingStudy: fhirImagingStudy,
      DiagnosticReport: fhirDiagnosticReport
    }
  };
}

// Inicializa o estado com os 24 estudos reais do CPTAC-CM + 3 estudos complementares (CR, DX, US)
const initialCptacCases = buildCasesFromCptacDataset();
const stateStore = {
  cases: [...initialCptacCases, ...COMPLEMENTARY_MODALITY_CASES.map((c) => structuredClone(c))]
};

function getAllHydratedCases() {
  return stateStore.cases.map(buildFhirResourcesFromCase);
}

function getRawCaseById(caseIdOrUid) {
  return stateStore.cases.find(
    (c) =>
      c.caseId === caseIdOrUid ||
      c.study.studyInstanceUID === caseIdOrUid ||
      c.study.accessionNumber === caseIdOrUid
  );
}

function getHydratedCaseById(caseIdOrUid) {
  const found = getRawCaseById(caseIdOrUid);
  return found ? buildFhirResourcesFromCase(found) : null;
}

function assignRadiologistToCase(caseId, radiologistId) {
  const target = getRawCaseById(caseId);
  if (!target) return null;

  target.study.assignedRadiologistId = radiologistId || null;
  if (radiologistId && target.study.workflowStatus === 'unassigned') {
    target.study.workflowStatus = 'awaiting';
  } else if (!radiologistId && target.study.workflowStatus === 'awaiting') {
    target.study.workflowStatus = 'unassigned';
  }
  return buildFhirResourcesFromCase(target);
}

function saveReportDraft(caseId, { technique, findings, conclusion, radiologistId }) {
  const target = getRawCaseById(caseId);
  if (!target) return null;

  if (radiologistId) {
    target.study.assignedRadiologistId = radiologistId;
  }
  target.study.workflowStatus = 'draft';
  target.study.report.status = 'partial';
  target.study.report.technique = technique ?? target.study.report.technique;
  target.study.report.findings = findings ?? target.study.report.findings;
  target.study.report.conclusion = conclusion ?? target.study.report.conclusion;
  target.study.report.updatedAt = new Date().toISOString();

  return buildFhirResourcesFromCase(target);
}

function finalizeReport(caseId, { technique, findings, conclusion, radiologistId }) {
  const target = getRawCaseById(caseId);
  if (!target) return null;

  if (radiologistId) {
    target.study.assignedRadiologistId = radiologistId;
  }
  const now = new Date().toISOString();
  target.study.workflowStatus = 'final';
  target.study.report.status = 'final';
  target.study.report.technique = technique ?? target.study.report.technique;
  target.study.report.findings = findings ?? target.study.report.findings;
  target.study.report.conclusion = conclusion ?? target.study.report.conclusion;
  target.study.report.updatedAt = now;
  target.study.report.signedAt = now;

  return buildFhirResourcesFromCase(target);
}

function linkOrthancStudyId(caseIdOrStudyUid, orthancStudyId) {
  const target = getRawCaseById(caseIdOrStudyUid);
  if (!target) return null;
  target.study.orthancId = orthancStudyId;
  return buildFhirResourcesFromCase(target);
}

function upsertOrthancStudiesIntoStore(orthancStudies = []) {
  let added = 0;
  let linked = 0;

  for (const orthStudy of orthancStudies) {
    const mainTags = orthStudy.MainDicomTags || {};
    const patientTags = orthStudy.PatientMainDicomTags || {};
    const studyUid = mainTags.StudyInstanceUID;
    if (!studyUid) continue;

    const existing = stateStore.cases.find((c) => c.study.studyInstanceUID === studyUid);
    if (existing) {
      existing.study.orthancId = orthStudy.ID;
      linked++;
      continue;
    }

    const rawBirth = patientTags.PatientBirthDate || '19700101';
    const formattedBirth =
      rawBirth.length === 8
        ? `${rawBirth.slice(0, 4)}-${rawBirth.slice(4, 6)}-${rawBirth.slice(6, 8)}`
        : '1970-01-01';

    const rawStudyDate = mainTags.StudyDate || '20261102';
    const formattedStudyDate =
      rawStudyDate.length === 8
        ? `${rawStudyDate.slice(0, 4)}-${rawStudyDate.slice(4, 6)}-${rawStudyDate.slice(6, 8)}T08:00:00-04:00`
        : new Date().toISOString();

    const cleanName = (patientTags.PatientName || patientTags.PatientID || 'PACIENTE ORTHANC PACS')
      .replace(/\^+/g, ' ')
      .trim();
    const modality = orthStudy.Modality || mainTags.ModalitiesInStudy || 'CT';
    const newIndex = stateStore.cases.length + 1;
    const caseId = `ORTH-${String(newIndex).padStart(3, '0')}`;

    stateStore.cases.unshift({
      caseId,
      isRealCptacDataset: false,
      patient: {
        id: `pat-orth-${orthStudy.ParentPatient || newIndex}`,
        dicomPatientId: patientTags.PatientID || `ORTH-${newIndex}`,
        cpf: 'Sincronizado via Orthanc PACS',
        name: cleanName,
        family: cleanName.split(' ').slice(-1)[0] || 'Orthanc',
        given: cleanName.split(' ').slice(0, -1),
        gender: patientTags.PatientSex === 'F' ? 'female' : 'male',
        birthDate: formattedBirth,
        phone: 'Via PACS Orthanc',
        bloodType: 'N/I',
        allergies: ['Verificar prontuário hospitalar'],
        clinicalSummary: `Estudo recebido diretamente do servidor Orthanc PACS local (UUID: ${orthStudy.ID}).`,
        medicalHistory: [
          {
            date: formattedStudyDate.slice(0, 10),
            type: 'Recebimento DICOM Orthanc',
            summary: `Estudo sincronizado do Orthanc (${orthStudy.Series ? orthStudy.Series.length : 1} séries).`
          }
        ]
      },
      study: {
        orthancId: orthStudy.ID,
        studyInstanceUID: studyUid,
        accessionNumber: mainTags.AccessionNumber || `ACC-ORTH-${1000 + newIndex}`,
        modality: ['CT', 'MR', 'CR', 'DX', 'US', 'PT'].includes(modality) ? modality : 'CT',
        modalityDisplay: `Estudo DICOM (${modality})`,
        studyDate: formattedStudyDate,
        studyDescription: mainTags.StudyDescription || 'ESTUDO DICOM SINCRONIZADO DO ORTHANC PACS',
        originHospital: mainTags.InstitutionName || 'Orthanc PACS Local (:8042)',
        priority: 'urgent',
        workflowStatus: 'unassigned',
        assignedRadiologistId: null,
        numberOfSeries: Array.isArray(orthStudy.Series) ? orthStudy.Series.length : 1,
        numberOfInstances: 1,
        clinicalIndication: 'Exame importado em tempo real da instância Orthanc PACS.',
        series: [
          {
            uid: `${studyUid}.1`,
            number: 1,
            modality,
            description: mainTags.StudyDescription || 'Série Principal Orthanc',
            instances: 1
          }
        ],
        report: {
          status: 'registered',
          technique: '',
          findings: '',
          conclusion: '',
          updatedAt: null,
          signedAt: null
        }
      }
    });
    added++;
  }

  return { added, linked, total: stateStore.cases.length };
}

function buildFhirBundle() {
  const cases = getAllHydratedCases();
  const entries = [];
  const seenPatients = new Set();

  for (const c of cases) {
    if (!seenPatients.has(c.fhir.Patient.id)) {
      seenPatients.add(c.fhir.Patient.id);
      entries.push({
        fullUrl: `urn:uuid:${c.fhir.Patient.id}`,
        resource: c.fhir.Patient
      });
    }
    entries.push({
      fullUrl: `urn:uuid:${c.fhir.ServiceRequest.id}`,
      resource: c.fhir.ServiceRequest
    });
    entries.push({
      fullUrl: `urn:uuid:${c.fhir.ImagingStudy.id}`,
      resource: c.fhir.ImagingStudy
    });
    entries.push({
      fullUrl: `urn:uuid:${c.fhir.DiagnosticReport.id}`,
      resource: c.fhir.DiagnosticReport
    });
  }

  return {
    resourceType: 'Bundle',
    id: 'synapseris-cptac-cm-fhir-r4-bundle',
    meta: {
      lastUpdated: new Date().toISOString()
    },
    type: 'collection',
    total: entries.length,
    entry: entries
  };
}

module.exports = {
  RADIOLOGISTS,
  REPORT_TEMPLATES,
  getAllHydratedCases,
  getRawCaseById,
  getHydratedCaseById,
  assignRadiologistToCase,
  saveReportDraft,
  finalizeReport,
  linkOrthancStudyId,
  upsertOrthancStudiesIntoStore,
  buildFhirBundle
};
