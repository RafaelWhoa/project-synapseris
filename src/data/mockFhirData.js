const orthancConfig = require('../config/orthanc.config');

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
    specialty: 'Radiologia Torácica e Cardiovascular',
    avatar: 'BA',
    email: 'beatriz.albuquerque@synapseris.med.br'
  },
  {
    id: 'prac-rad-03',
    resourceType: 'Practitioner',
    name: 'Dr. Marcelo Siqueira Campos',
    crm: 'CRM-RJ 119.830 / RQE 49.120',
    specialty: 'Sistema Musculoesquelético e Medicina Interna',
    avatar: 'MS',
    email: 'marcelo.siqueira@synapseris.med.br'
  },
  {
    id: 'prac-rad-04',
    resourceType: 'Practitioner',
    name: 'Dra. Carolina Mendes Faria',
    crm: 'CRM-MG 164.210 / RQE 71.095',
    specialty: 'Medicina Nuclear, PET-CT e Oncologia',
    avatar: 'CF',
    email: 'carolina.faria@synapseris.med.br'
  }
];

/**
 * Templates de Laudo Estruturados para o Editor Rico
 */
const REPORT_TEMPLATES = [
  {
    id: 'tpl-torax-normal',
    title: 'Tórax Normal (TC de Alta Resolução)',
    modality: 'CT',
    technique: 'Exame realizado em tomógrafo multislice através de aquisições volumétricas helicoidais do tórax sem a infusão endovenosa de meio de contraste iodado, com reconstruções multiplanares (MPR) nos planos axial, coronal e sagital com janelas para parênquima pulmonar e mediastino.',
    findings: 'Parênquima pulmonar com coeficientes de atenuação preservados, sem evidências de consolidações, nódulos suspeitos ou opacidades em vidro fosco.\nÁrvore traqueobrônquica pérvia, de calibre normal.\nCavidades pleurais livres, sem derrames ou espessamentos.\nEstruturas mediastinais e hilares de configuração anatômica, sem linfonodomegalias.\nÁrea cardíaca e vasos da base com dimensões conservadas.\nArcabouço ósseo torácico sem lesões focais.',
    conclusion: 'Tomografia computadorizada do tórax dentro dos limites da normalidade para a faixa etária.'
  },
  {
    id: 'tpl-cranio-sem-contraste',
    title: 'Crânio Sem Contraste (RM / TC Encéfalo)',
    modality: 'MR',
    technique: 'Exame realizado com sequências multiplanares ponderadas em T1, T2, FLAIR, Difusão (DWI/ADC) e susceptibilidade magnética (SWI), sem administração endovenosa de contraste paramagnético (gadolínio).',
    findings: 'Parênquima encefálico supra e infratentorial com morfologia e intensidade de sinal habituais.\nNão há restrição à difusão das moléculas de água sugestiva de evento isquêmico agudo.\nAusência de coleções extra-axiais, efeito expansivo ou desvio das estruturas da linha média.\nSistema ventricular supratentorial e quarto ventrículo de dimensões e morfologia preservadas.\nCisternas da base e sulcos corticais de amplitude compatível com a faixa etária.\nAusência de depósitos de hemossiderina ou calcificações patológicas na sequência SWI.',
    conclusion: 'Estudo do encéfalo sem alterações estruturais agudas significativas.'
  },
  {
    id: 'tpl-coluna-lombar',
    title: 'Coluna Lombar (RX / RM Lombossacra)',
    modality: 'CR',
    technique: 'Aquisições radiográficas digitais nas incidências anteroposterior (AP) e perfil da coluna lombossacra em ortostase.',
    findings: 'Alinhamento posterior dos corpos vertebrais lombares preservado no plano sagital.\nCorpos vertebrais com altura e densidade óssea mantidas, notando-se discretos osteófitos marginais anterolaterais em L4 e L5.\nEspaços discais intervertebrais de altura conservada, exceto por leve redução do espaço L4-L5.\nPedículos, processos transversos e espinhosos íntegros.\nArticulações sacroilíacas de aspecto habitual.',
    conclusion: 'Discretos sinais de espondilodiscopatia degenerativa incipiente em L4-L5, sem sinais de listese ou fraturas.'
  },
  {
    id: 'tpl-rx-torax-pa-perfil',
    title: 'Radiografia de Tórax PA e Perfil (CR / DX)',
    modality: 'DX',
    technique: 'Radiografias digitais do tórax obtidas nas incidências posteroanterior (PA) e perfil em inspiração profunda.',
    findings: 'Transparência pulmonar bilateral preservada, sem imagens de consolidações alveolares ou massas.\nSeios costofrênicos e cardiofrênicos livres e agudos.\nÍndice cardiotorácico dentro dos limites da normalidade.\nContornos mediastinais e hilos pulmonares de configuração anatômica.\nEstruturas ósseas da caixa torácica íntegras.',
    conclusion: 'Estudo radiográfico do tórax sem alterações pleuropulmonares agudas.'
  },
  {
    id: 'tpl-us-abdome-total',
    title: 'Ultrassonografia de Abdome Total (US)',
    modality: 'US',
    technique: 'Exame ultrassonográfico realizado em modo B e Doppler colorido com transdutor convexo multifrequencial.',
    findings: 'Fígado com dimensões normais, contornos regulares e ecotextura homogênea, sem lesões focais.\nVesícula biliar normodistendida, de paredes finas, anecoica, sem imagens calculosas no seu interior.\nVias biliares intra e extra-hepáticas de calibre preservado.\nPâncreas e baço de dimensões e ecogenicidade habituais.\nRins direito e esquerdo tópicos, com diferenciação corticomedular preservada, sem hidronefrose ou cálculos.\nAorta abdominal de calibre normal. Bexiga urinária com paredes regulares e conteúdo anecoico.',
    conclusion: 'Ultrassonografia de abdome total dentro dos limites da normalidade.'
  },
  {
    id: 'tpl-pet-ct-onco',
    title: 'PET-CT Oncológico Corpo Inteiro (18F-FDG)',
    modality: 'PT',
    technique: 'Aquisição tomográfica por emissão de pósitrons acoplada à tomografia computadorizada helicoidal da base do crânio à raiz das coxas, realizada 60 minutos após administração venosa de 18F-FDG (glicemia capilar pré-exame: 94 mg/dL).',
    findings: 'Biodistribuição fisiológica do radiofármaco no encéfalo, miocárdio, fígado, baço e trato geniturinário.\nCabeça e pescoço: sem áreas de hipermetabolismo glicolítico anômalo.\nTórax: ausência de nódulos pulmonares ou linfonodomegalias mediastinais hipermetabólicas.\nAbdome e pelve: órgãos parenquimatosos sem captações focais anômalas de FDG.\nEsqueleto: ausência de lesões ósseas líticas ou blásticas hipermetabólicas.',
    conclusion: 'Estudo de PET-CT com 18F-FDG sem evidências de doença metabolicamente ativa em atividade (Deauville 1).'
  }
];

/**
 * Codifica texto/HTML em Base64 para o campo HL7 FHIR DiagnosticReport.presentedForm
 */
function encodePresentedFormBase64(technique, findings, conclusion) {
  const html = `<div class="fhir-report">
  <h4>TÉCNICA</h4><p>${technique || ''}</p>
  <h4>ACHADOS RADIOLÓGICOS</h4><p>${(findings || '').replace(/\n/g, '<br/>')}</p>
  <h4>IMPRESSÃO DIAGNÓSTICA / CONCLUSÃO</h4><p><strong>${conclusion || ''}</strong></p>
</div>`;
  return Buffer.from(html, 'utf-8').toString('base64');
}

/**
 * Sementes de Dados (12 Pacientes + 14 Estudos variados com compatibilidade total DICOM + HL7 FHIR R4)
 */
const SEED_CASES = [
  {
    caseId: 'CASE-001',
    patient: {
      id: 'pat-1001',
      dicomPatientId: 'SYN-2026-00142',
      cpf: '318.492.108-44',
      name: 'Carlos Eduardo Mendonça',
      family: 'Mendonça',
      given: ['Carlos', 'Eduardo'],
      gender: 'male',
      birthDate: '1961-04-14',
      phone: '(11) 99124-8831',
      bloodType: 'O+',
      allergies: ['Dipirona Sódica'],
      clinicalSummary: 'Tabagista 35 anos-maço, dispneia progressiva há 3 semanas, tosse seca persistente e perda ponderal de 4 kg.',
      medicalHistory: [
        { date: '2025-08-12', type: 'RX Tórax PA/Perfil', summary: 'Espessamento brônquico difuso bilateral, sugerido controle por TC.' },
        { date: '2024-11-03', type: 'Espirometria', summary: 'Distúrbio ventilatório obstrutivo leve (VEF1 74%).' }
      ]
    },
    study: {
      studyInstanceUID: '1.2.840.113619.2.55.3.2831164352.781.1709100001.101',
      accessionNumber: 'ACC-2026-88401',
      modality: 'CT',
      modalityDisplay: 'Tomografia Computadorizada',
      studyDate: '2026-11-02T07:15:00-04:00',
      studyDescription: 'TC TÓRAX ALTA RESOLUÇÃO S/ CONTRASTE',
      originHospital: 'Hospital Sírio-Paulista — Unidade Bela Vista',
      priority: 'urgent',
      workflowStatus: 'unassigned', // unassigned | awaiting | draft | final
      assignedRadiologistId: null,
      numberOfSeries: 4,
      numberOfInstances: 412,
      clinicalIndication: 'Suspeita de nódulo pulmonar solitário em lobo superior direito / estadiamento inicial.',
      series: [
        { uid: '1.2.840.113619.2.55.3.2831164352.781.1709100001.101.1', number: 1, modality: 'CT', description: 'Scout Topograma AP/Perfil', instances: 2 },
        { uid: '1.2.840.113619.2.55.3.2831164352.781.1709100001.101.2', number: 2, modality: 'CT', description: 'Axial Parênquima Pulmonar 1.0mm', instances: 240 },
        { uid: '1.2.840.113619.2.55.3.2831164352.781.1709100001.101.3', number: 3, modality: 'CT', description: 'Axial Janela Mediastinal 2.5mm', instances: 96 },
        { uid: '1.2.840.113619.2.55.3.2831164352.781.1709100001.101.4', number: 4, modality: 'CT', description: 'MPR Coronal Pulmão', instances: 74 }
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
  },
  {
    caseId: 'CASE-002',
    patient: {
      id: 'pat-1002',
      dicomPatientId: 'SYN-2026-00189',
      cpf: '402.918.773-19',
      name: 'Helena Cristina Vasconcelos Prado',
      family: 'Prado',
      given: ['Helena', 'Cristina'],
      gender: 'female',
      birthDate: '1978-09-22',
      phone: '(11) 98411-2090',
      bloodType: 'A+',
      allergies: ['Nega alergias medicamentosas'],
      clinicalSummary: 'Cefaleia hemicraniana direita súbita acompanhada de parestesia transitória em membro superior esquerdo há 4 horas. Protocolo AVC.',
      medicalHistory: [
        { date: '2026-01-19', type: 'Doppler de Carótidas', summary: 'Ausência de placas ateromatosas hemodinamicamente significativas.' },
        { date: '2025-03-10', type: 'Consulta Neurologia', summary: 'Enxaqueca com aura visual esporádica em acompanhamento.' }
      ]
    },
    study: {
      studyInstanceUID: '1.2.840.113619.2.55.3.2831164352.781.1709100002.202',
      accessionNumber: 'ACC-2026-88402',
      modality: 'MR',
      modalityDisplay: 'Ressonância Magnética',
      studyDate: '2026-11-02T07:42:00-04:00',
      studyDescription: 'RM ENCÉFALO + DIFUSÃO + ANGIORM ARTERIAL',
      originHospital: 'Instituto Neurocor — Pronto Atendimento',
      priority: 'urgent',
      workflowStatus: 'draft',
      assignedRadiologistId: 'prac-rad-01',
      numberOfSeries: 6,
      numberOfInstances: 288,
      clinicalIndication: 'Déficit sensitivo focal agudo em MSE. Descartar isquemia aguda.',
      series: [
        { uid: '1.2.840.113619.2.55.3.2831164352.781.1709100002.202.1', number: 1, modality: 'MR', description: 'Axial DWI b1000 + Mapa ADC', instances: 48 },
        { uid: '1.2.840.113619.2.55.3.2831164352.781.1709100002.202.2', number: 2, modality: 'MR', description: 'Axial T2 FLAIR Dark-Fluid', instances: 44 },
        { uid: '1.2.840.113619.2.55.3.2831164352.781.1709100002.202.3', number: 3, modality: 'MR', description: 'Axial SWI Susceptibilidade', instances: 64 },
        { uid: '1.2.840.113619.2.55.3.2831164352.781.1709100002.202.4', number: 4, modality: 'MR', description: 'Sagital 3D T1 MPRAGE', instances: 132 }
      ],
      report: {
        status: 'partial',
        technique: 'Exame de Ressonância Magnética do Encéfalo realizado em equipamento de 3,0 Tesla com sequências multiplanares ponderadas em T1, T2, FLAIR, Difusão (DWI/ADC), SWI e Angio-RM arterial intracraniana pela técnica 3D-TOF.',
        findings: 'Foco puntiforme de restrição à difusão cortico-subcortical no giro pós-central direito medindo 4,5 mm, sem efeito de massa ou transformação hemorrágica no SWI.\nSistema ventricular centrado e de dimensões preservadas.\nPolígono de Willis pérvio ao estudo angiográfico 3D-TOF, sem aneurismas ou oclusões de grandes vasos.',
        conclusion: 'Pequeno foco isquêmico agudo/subagudo recente no giro pós-central direito, sem sinais de complicação hemorrágica.',
        updatedAt: '2026-11-02T08:15:00-04:00',
        signedAt: null
      }
    }
  },
  {
    caseId: 'CASE-003',
    patient: {
      id: 'pat-1003',
      dicomPatientId: 'SYN-2026-00204',
      cpf: '189.640.231-07',
      name: 'Roberto Magalhães Nogueira',
      family: 'Nogueira',
      given: ['Roberto', 'Magalhães'],
      gender: 'male',
      birthDate: '1954-12-03',
      phone: '(21) 99740-1120',
      bloodType: 'B+',
      allergies: ['Contraste Iodado (reação urticariforme leve em 2019)'],
      clinicalSummary: 'Antecedente de adenocarcinoma de cólon sigmoide operado em 2024. Reestadiamento oncológico anual por elevação discreta de CEA (6,8 ng/mL).',
      medicalHistory: [
        { date: '2025-10-15', type: 'TC Abdome Total', summary: 'Mudanças pós-cirúrgicas em cólon esquerdo; ausência de implantes secundários.' },
        { date: '2024-05-20', type: 'Retossigmoidectomia Videolaparoscópica', summary: 'Adenocarcinoma pT3N0M0, margens livres.' }
      ]
    },
    study: {
      studyInstanceUID: '1.2.840.113619.2.55.3.2831164352.781.1709100003.303',
      accessionNumber: 'ACC-2026-88403',
      modality: 'PT',
      modalityDisplay: 'PET-CT (Medicina Nuclear)',
      studyDate: '2026-11-01T15:30:00-04:00',
      studyDescription: 'PET-CT CORPO INTEIRO ONCOLÓGICO (18F-FDG)',
      originHospital: 'Centro Oncológico Santa Catarina',
      priority: 'routine',
      workflowStatus: 'final',
      assignedRadiologistId: 'prac-rad-04',
      numberOfSeries: 5,
      numberOfInstances: 620,
      clinicalIndication: 'Reestadiamento de neoplasia colorretal por elevação de marcador tumoral CEA.',
      series: [
        { uid: '1.2.840.113619.2.55.3.2831164352.781.1709100003.303.1', number: 1, modality: 'CT', description: 'CT Atenuação Corpo Inteiro Low-Dose', instances: 310 },
        { uid: '1.2.840.113619.2.55.3.2831164352.781.1709100003.303.2', number: 2, modality: 'PT', description: 'PET MAC 18F-FDG SUVbw', instances: 310 }
      ],
      report: {
        status: 'final',
        technique: 'Estudo de PET-CT dedicado da base do crânio ao terço médio das coxas após injeção venosa de 315 MBq de 18F-FDG.',
        findings: 'Fígado de dimensões normais apresentando lesão focal hipodensa no segmento VII medindo 1,6 cm com hipermetabolismo glicolítico acentuado (SUVmáx: 8,4).\nDemais segmentos hepáticos, pulmões, linfonodos retroperitoneais e esqueleto sem captações anômalas do radiofármaco.\nAnastomose colorretal sem espessamento parietal ou hipercaptação.',
        conclusion: 'Lesão focal hipermetabólica no segmento VII hepático (SUVmáx 8,4), compatível com implante secundário em atividade metabólica. Ausência de outros sítios de doença hipermetabólica.',
        updatedAt: '2026-11-01T17:50:00-04:00',
        signedAt: '2026-11-01T18:05:00-04:00'
      }
    }
  },
  {
    caseId: 'CASE-004',
    patient: {
      id: 'pat-1004',
      dicomPatientId: 'SYN-2026-00215',
      cpf: '519.832.004-91',
      name: 'Mariana Tavares Fontes',
      family: 'Fontes',
      given: ['Mariana', 'Tavares'],
      gender: 'female',
      birthDate: '1991-06-18',
      phone: '(11) 97120-5592',
      bloodType: 'A-',
      allergies: ['Nega alergias'],
      clinicalSummary: 'Lombalgia mecânica irradiada para face posterior da coxa esquerda há 2 meses após esforço físico em academia.',
      medicalHistory: [
        { date: '2023-09-04', type: 'Fisioterapia Motora', summary: 'Episódio prévio de contratura paravertebral lombar resolvido.' }
      ]
    },
    study: {
      studyInstanceUID: '1.2.840.113619.2.55.3.2831164352.781.1709100004.404',
      accessionNumber: 'ACC-2026-88404',
      modality: 'CR',
      modalityDisplay: 'Radiografia Computadorizada',
      studyDate: '2026-11-02T06:50:00-04:00',
      studyDescription: 'RX COLUNA LOMBOSSACRA AP + PERFIL + OBLÍQUAS',
      originHospital: 'Clínica Ortopédica VitaMove',
      priority: 'routine',
      workflowStatus: 'awaiting',
      assignedRadiologistId: 'prac-rad-03',
      numberOfSeries: 2,
      numberOfInstances: 4,
      clinicalIndication: 'Lombociatalgia subaguda à esquerda.',
      series: [
        { uid: '1.2.840.113619.2.55.3.2831164352.781.1709100004.404.1', number: 1, modality: 'CR', description: 'Incidência AP e Perfil Ortostático', instances: 2 },
        { uid: '1.2.840.113619.2.55.3.2831164352.781.1709100004.404.2', number: 2, modality: 'CR', description: 'Incidências Oblíquas D/E', instances: 2 }
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
  },
  {
    caseId: 'CASE-005',
    patient: {
      id: 'pat-1005',
      dicomPatientId: 'SYN-2026-00231',
      cpf: '094.281.665-30',
      name: 'Antônio Marcos Silveira Brito',
      family: 'Brito',
      given: ['Antônio', 'Marcos'],
      gender: 'male',
      birthDate: '1970-02-11',
      phone: '(31) 98831-4209',
      bloodType: 'AB+',
      allergies: ['Penicilina'],
      clinicalSummary: 'Dor intensa em hipocôndrio direito pós-prandial associada a náuseas há 24 horas. Sinal de Murphy duvidoso ao exame físico.',
      medicalHistory: [
        { date: '2025-05-12', type: 'Exames Laboratoriais', summary: 'Dislipidemia mista em uso de rosuvastatina 10mg.' }
      ]
    },
    study: {
      studyInstanceUID: '1.2.840.113619.2.55.3.2831164352.781.1709100005.505',
      accessionNumber: 'ACC-2026-88405',
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
      report: {
        status: 'registered',
        technique: '',
        findings: '',
        conclusion: '',
        updatedAt: null,
        signedAt: null
      }
    }
  },
  {
    caseId: 'CASE-006',
    patient: {
      id: 'pat-1006',
      dicomPatientId: 'SYN-2026-00248',
      cpf: '774.129.384-52',
      name: 'Fernanda Lúcia Guimarães Rocha',
      family: 'Rocha',
      given: ['Fernanda', 'Lúcia'],
      gender: 'female',
      birthDate: '1985-11-29',
      phone: '(11) 99201-7410',
      bloodType: 'O-',
      allergies: ['Nega alergias'],
      clinicalSummary: 'Avaliação admissional e controle pós-quadro gripal tratado ambulatorialmente há 14 dias.',
      medicalHistory: [
        { date: '2024-04-18', type: 'RX Tórax PA', summary: 'Exame radiográfico normal.' }
      ]
    },
    study: {
      studyInstanceUID: '1.2.840.113619.2.55.3.2831164352.781.1709100006.606',
      accessionNumber: 'ACC-2026-88406',
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
      clinicalIndication: 'Controle evolutivo de infecção respiratória alta.',
      series: [
        { uid: '1.2.840.113619.2.55.3.2831164352.781.1709100006.606.1', number: 1, modality: 'DX', description: 'Tórax PA e Perfil', instances: 2 }
      ],
      report: {
        status: 'final',
        technique: 'Radiografias digitais do tórax obtidas nas incidências posteroanterior (PA) e perfil em inspiração profunda.',
        findings: 'Transparência pulmonar bilateral preservada, sem imagens de consolidações alveolares ou derrames pleurais.\nSeios costofrênicos livres.\nÍndice cardiotorácico dentro dos limites da normalidade.\nArcabouço ósseo íntegro.',
        conclusion: 'Estudo radiográfico do tórax dentro dos limites da normalidade.',
        updatedAt: '2026-10-31T16:10:00-04:00',
        signedAt: '2026-10-31T16:15:00-04:00'
      }
    }
  },
  {
    caseId: 'CASE-007',
    patient: {
      id: 'pat-1007',
      dicomPatientId: 'SYN-2026-00263',
      cpf: '631.908.452-11',
      name: 'Gustavo Henrique Azevedo Lima',
      family: 'Lima',
      given: ['Gustavo', 'Henrique'],
      gender: 'male',
      birthDate: '1996-07-08',
      phone: '(19) 98144-6320',
      bloodType: 'A+',
      allergies: ['Nega alergias'],
      clinicalSummary: 'Entorse rotacional do joelho direito durante partida de futebol há 5 dias, com derrame articular moderado e teste de Lachman positivo.',
      medicalHistory: [
        { date: '2026-10-28', type: 'RX Joelho Direito AP/Perfil', summary: 'Ausência de traços de fratura aguda; aumento de partes moles suprapatelar.' }
      ]
    },
    study: {
      studyInstanceUID: '1.2.840.113619.2.55.3.2831164352.781.1709100007.707',
      accessionNumber: 'ACC-2026-88407',
      modality: 'MR',
      modalityDisplay: 'Ressonância Magnética',
      studyDate: '2026-11-01T11:10:00-04:00',
      studyDescription: 'RM JOELHO DIREITO S/ CONTRASTE',
      originHospital: 'Clínica Ortopédica VitaMove',
      priority: 'routine',
      workflowStatus: 'draft',
      assignedRadiologistId: 'prac-rad-03',
      numberOfSeries: 5,
      numberOfInstances: 160,
      clinicalIndication: 'Suspeita de lesão do ligamento cruzado anterior (LCA) e menisco medial.',
      series: [
        { uid: '1.2.840.113619.2.55.3.2831164352.781.1709100007.707.1', number: 1, modality: 'MR', description: 'Sagital DP Fat-Sat', instances: 32 },
        { uid: '1.2.840.113619.2.55.3.2831164352.781.1709100007.707.2', number: 2, modality: 'MR', description: 'Coronal DP Fat-Sat', instances: 32 },
        { uid: '1.2.840.113619.2.55.3.2831164352.781.1709100007.707.3', number: 3, modality: 'MR', description: 'Axial T2 Fat-Sat', instances: 32 },
        { uid: '1.2.840.113619.2.55.3.2831164352.781.1709100007.707.4', number: 4, modality: 'MR', description: 'Sagital Oblíquo T2 LCA', instances: 32 }
      ],
      report: {
        status: 'partial',
        technique: 'Exame realizado em aparelho de 1,5 Tesla nas ponderações T1 e Densidade de Prótons com supressão de gordura nos planos axial, coronal e sagital.',
        findings: 'Ruptura transfixante completa das fibras do terço médio do ligamento cruzado anterior (LCA), associada a contusão óssea trabecular (bone bruise) no côndilo femoral lateral e platô tibial posterolateral.\nCorno posterior do menisco medial apresentando traço linear hipersinal atingindo a superfície articular inferior.\nLigamento cruzado posterior e complexo colateral íntegros.\nDerrame articular moderado.',
        conclusion: 'Ruptura completa do ligamento cruzado anterior (LCA) associada a contusões ósseas típicas do mecanismo de pivot-shift e lesão longitudinal no corno posterior do menisco medial.',
        updatedAt: '2026-11-02T07:50:00-04:00',
        signedAt: null
      }
    }
  },
  {
    caseId: 'CASE-008',
    patient: {
      id: 'pat-1008',
      dicomPatientId: 'SYN-2026-00290',
      cpf: '247.551.809-63',
      name: 'Luciana Aparecida Monteiro',
      family: 'Monteiro',
      given: ['Luciana', 'Aparecida'],
      gender: 'female',
      birthDate: '1967-03-25',
      phone: '(11) 98650-3318',
      bloodType: 'O+',
      allergies: ['Sulfa'],
      clinicalSummary: 'Dor em fossa ilíaca esquerda há 48 horas, febre baixa (37,9°C) e leucocitose discreta (12.800/mm³).',
      medicalHistory: [
        { date: '2024-08-19', type: 'Colonoscopia', summary: 'Doença diverticular hipertônica dos cólons sem sinais inflamatórios.' }
      ]
    },
    study: {
      studyInstanceUID: '1.2.840.113619.2.55.3.2831164352.781.1709100008.808',
      accessionNumber: 'ACC-2026-88408',
      modality: 'CT',
      modalityDisplay: 'Tomografia Computadorizada',
      studyDate: '2026-11-02T05:40:00-04:00',
      studyDescription: 'TC ABDOME E PELVE C/ CONTRASTE VENOSO',
      originHospital: 'Hospital Sírio-Paulista — Unidade Bela Vista',
      priority: 'urgent',
      workflowStatus: 'awaiting',
      assignedRadiologistId: 'prac-rad-02',
      numberOfSeries: 4,
      numberOfInstances: 520,
      clinicalIndication: 'Suspeita de diverticulite aguda complicada / avaliar coleções.',
      series: [
        { uid: '1.2.840.113619.2.55.3.2831164352.781.1709100008.808.1', number: 1, modality: 'CT', description: 'Fase Sem Contraste', instances: 160 },
        { uid: '1.2.840.113619.2.55.3.2831164352.781.1709100008.808.2', number: 2, modality: 'CT', description: 'Fase Portal Venosa', instances: 180 },
        { uid: '1.2.840.113619.2.55.3.2831164352.781.1709100008.808.3', number: 3, modality: 'CT', description: 'MPR Coronal Portal', instances: 180 }
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
  },
  {
    caseId: 'CASE-009',
    patient: {
      id: 'pat-1009',
      dicomPatientId: 'SYN-2026-00305',
      cpf: '882.410.992-25',
      name: 'Paulo Sérgio Cavalcanti Dias',
      family: 'Dias',
      given: ['Paulo', 'Sérgio'],
      gender: 'male',
      birthDate: '1949-08-30',
      phone: '(11) 99511-0082',
      bloodType: 'B-',
      allergies: ['Nega alergias'],
      clinicalSummary: 'Queda da própria altura há 2 horas com trauma em região frontal e episódio fugaz de confusão mental. Em uso de anticoagulante oral (apixabana).',
      medicalHistory: [
        { date: '2025-11-11', type: 'Ecocardiograma Transtorácico', summary: 'Fibrilação atrial permanente com FEVE preservada (61%).' }
      ]
    },
    study: {
      studyInstanceUID: '1.2.840.113619.2.55.3.2831164352.781.1709100009.909',
      accessionNumber: 'ACC-2026-88409',
      modality: 'CT',
      modalityDisplay: 'Tomografia Computadorizada',
      studyDate: '2026-11-02T08:20:00-04:00',
      studyDescription: 'TC CRÂNIO SEM CONTRASTE (TRAUMA)',
      originHospital: 'Hospital Geral São Lucas — Emergência',
      priority: 'urgent',
      workflowStatus: 'unassigned',
      assignedRadiologistId: null,
      numberOfSeries: 3,
      numberOfInstances: 140,
      clinicalIndication: 'Traumatismo cranioencefálico (TCE) leve em paciente anticoagulado.',
      series: [
        { uid: '1.2.840.113619.2.55.3.2831164352.781.1709100009.909.1', number: 1, modality: 'CT', description: 'Axial Parênquima Encefálico', instances: 70 },
        { uid: '1.2.840.113619.2.55.3.2831164352.781.1709100009.909.2', number: 2, modality: 'CT', description: 'Axial Janela Óssea', instances: 70 }
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
  },
  {
    caseId: 'CASE-010',
    patient: {
      id: 'pat-1010',
      dicomPatientId: 'SYN-2026-00319',
      cpf: '390.114.782-04',
      name: 'Camila Duarte Peixoto',
      family: 'Peixoto',
      given: ['Camila', 'Duarte'],
      gender: 'female',
      birthDate: '1988-01-17',
      phone: '(21) 98230-4910',
      bloodType: 'O+',
      allergies: ['Nega alergias'],
      clinicalSummary: 'Nódulo tireoidiano palpável no lobo direito detectado em exame clínico de rotina. TSH e T4 livre normais.',
      medicalHistory: [
        { date: '2025-02-14', type: 'US Tireoide prévio', summary: 'Pequeno cisto coloide de 4 mm no lobo esquerdo (TI-RADS 2).' }
      ]
    },
    study: {
      studyInstanceUID: '1.2.840.113619.2.55.3.2831164352.781.1709100010.1010',
      accessionNumber: 'ACC-2026-88410',
      modality: 'US',
      modalityDisplay: 'Ultrassonografia',
      studyDate: '2026-10-30T10:00:00-04:00',
      studyDescription: 'US TIREOIDE COM DOPPLER COLORIDO (TI-RADS)',
      originHospital: 'Centro Diagnóstico Avançado Paulista',
      priority: 'routine',
      workflowStatus: 'final',
      assignedRadiologistId: 'prac-rad-01',
      numberOfSeries: 1,
      numberOfInstances: 18,
      clinicalIndication: 'Avaliação de nódulo tireoidiano palpável à direita — classificação ACR TI-RADS.',
      series: [
        { uid: '1.2.840.113619.2.55.3.2831164352.781.1709100010.1010.1', number: 1, modality: 'US', description: 'Tireoide e Região Cervical Modo B + Doppler', instances: 18 }
      ],
      report: {
        status: 'final',
        technique: 'Exame realizado com transdutor linear de alta frequência (12 MHz) associado ao estudo Doppler colorido.',
        findings: 'Tireoide tópica, de dimensões normais.\nNo terço médio do lobo direito observa-se nódulo sólido, isoecogênico, mais largo que alto, bem delimitado, sem microcalcificações, medindo 1,1 x 0,8 x 0,9 cm, com vascularização predominantemente periférica ao Doppler (Chammas II).\nLobo esquerdo apresentando diminuto cisto coloide de 0,4 cm.\nCadeias linfonodais cervicais sem linfonodomegalias atípicas.',
        conclusion: 'Nódulo sólido no lobo tireoidiano direito classificado como ACR TI-RADS 3 (baixo grau de suspeição). Cisto coloide no lobo esquerdo (ACR TI-RADS 1).',
        updatedAt: '2026-10-30T11:30:00-04:00',
        signedAt: '2026-10-30T11:40:00-04:00'
      }
    }
  },
  {
    caseId: 'CASE-011',
    patient: {
      id: 'pat-1011',
      dicomPatientId: 'SYN-2026-00342',
      cpf: '115.729.603-88',
      name: 'Jorge Luís Santana Medeiros',
      family: 'Medeiros',
      given: ['Jorge', 'Luís'],
      gender: 'male',
      birthDate: '1963-05-09',
      phone: '(11) 97409-2215',
      bloodType: 'A+',
      allergies: ['Nega alergias'],
      clinicalSummary: 'Dor no ombro direito aos movimentos de abdução acima de 90° e dor noturna há 4 meses.',
      medicalHistory: [
        { date: '2026-07-22', type: 'US Ombro Direito', summary: 'Tendinopatia do supraespinal com bursite subacromial-subdeltoidea.' }
      ]
    },
    study: {
      studyInstanceUID: '1.2.840.113619.2.55.3.2831164352.781.1709100011.1111',
      accessionNumber: 'ACC-2026-88411',
      modality: 'CR',
      modalityDisplay: 'Radiografia Computadorizada',
      studyDate: '2026-10-29T09:15:00-04:00',
      studyDescription: 'RX OMBRO DIREITO (AP VERDADEIRO + PERFIL ESCAPULAR + AXILAR)',
      originHospital: 'Clínica Ortopédica VitaMove',
      priority: 'routine',
      workflowStatus: 'final',
      assignedRadiologistId: 'prac-rad-03',
      numberOfSeries: 1,
      numberOfInstances: 3,
      clinicalIndication: 'Síndrome do impacto subacromial.',
      series: [
        { uid: '1.2.840.113619.2.55.3.2831164352.781.1709100011.1111.1', number: 1, modality: 'CR', description: 'Ombro Direito 3 Incidências', instances: 3 }
      ],
      report: {
        status: 'final',
        technique: 'Radiografias computadorizadas do ombro direito nas incidências AP verdadeiro, perfil escapular de Neer e axilar.',
        findings: 'Relações articulares glenoumeral e acromioclavicular preservadas.\nAcrômio tipo II de Bigliani com discreto entesófito subacromial anterior.\nEsclerose subcondral discreta na tuberosidade maior do úmero.\nAusência de calcificações projetadas nas partes moles periarticulares.',
        conclusion: 'Sinais radiográficos de impacto subacromial crônico com acrômio tipo II de Bigliani.',
        updatedAt: '2026-10-29T13:10:00-04:00',
        signedAt: '2026-10-29T13:20:00-04:00'
      }
    }
  },
  {
    caseId: 'CASE-012',
    patient: {
      id: 'pat-1012',
      dicomPatientId: 'SYN-2026-00377',
      cpf: '943.218.504-76',
      name: 'Patrícia Helena Borges Meirelles',
      family: 'Meirelles',
      given: ['Patrícia', 'Helena'],
      gender: 'female',
      birthDate: '1974-10-12',
      phone: '(11) 99812-6504',
      bloodType: 'O+',
      allergies: ['Contraste Gadolínio (náuseas leves)'],
      clinicalSummary: 'Dor torácica pleurítica súbita e taquicardia (FC 112 bpm) após viagem aérea internacional de 11 horas. D-dímero elevado (1.840 ng/mL).',
      medicalHistory: [
        { date: '2023-11-05', type: 'Doppler Venoso MMII', summary: 'Insuficiência venosa superficial leve bilateral, sem TVP.' }
      ]
    },
    study: {
      studyInstanceUID: '1.2.840.113619.2.55.3.2831164352.781.1709100012.1212',
      accessionNumber: 'ACC-2026-88412',
      modality: 'CT',
      modalityDisplay: 'Tomografia Computadorizada',
      studyDate: '2026-11-02T08:30:00-04:00',
      studyDescription: 'ANGIOTC DE ARTÉRIAS PULMONARES (PROTOCOLO TEP)',
      originHospital: 'Instituto Neurocor — Pronto Atendimento',
      priority: 'urgent',
      workflowStatus: 'awaiting',
      assignedRadiologistId: 'prac-rad-02',
      numberOfSeries: 3,
      numberOfInstances: 380,
      clinicalIndication: 'Suspeita clínica de Tromboembolismo Pulmonar Agudo (TEP).',
      series: [
        { uid: '1.2.840.113619.2.55.3.2831164352.781.1709100012.1212.1', number: 1, modality: 'CT', description: 'AngioTC Artérias Pulmonares 0.625mm', instances: 280 },
        { uid: '1.2.840.113619.2.55.3.2831164352.781.1709100012.1212.2', number: 2, modality: 'CT', description: 'MIP Coronal Vascular', instances: 100 }
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
  }
];

/**
 * Converte um item semente nos 4 recursos HL7 FHIR R4 correspondentes + visão consolidada DICOM/RIS
 */
function buildFhirResourcesFromCase(item) {
  const { patient, study } = item;
  const radiologist = RADIOLOGISTS.find((r) => r.id === study.assignedRadiologistId) || null;

  // 1. Recurso HL7 FHIR R4: Patient
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
    telecom: [
      { system: 'phone', value: patient.phone, use: 'mobile' }
    ],
    gender: patient.gender,
    birthDate: patient.birthDate,
    extension: [
      { url: 'http://synapseris.local/fhir/StructureDefinition/blood-type', valueString: patient.bloodType },
      { url: 'http://synapseris.local/fhir/StructureDefinition/allergies', valueString: patient.allergies.join(', ') },
      { url: 'http://synapseris.local/fhir/StructureDefinition/clinical-summary', valueString: patient.clinicalSummary }
    ]
  };

  // 2. Recurso HL7 FHIR R4: ServiceRequest (Pedido médico / item da Worklist)
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
    priority: study.priority, // routine | urgent
    category: [
      {
        coding: [
          {
            system: 'http://snomed.info/sct',
            code: '363679005',
            display: 'Imaging'
          }
        ]
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
    reasonCode: [
      { text: study.clinicalIndication }
    ]
  };

  // 3. Recurso HL7 FHIR R4: ImagingStudy (Metadados DICOM do estudo e séries)
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
    basedOn: [
      { reference: `ServiceRequest/sr-${item.caseId.toLowerCase()}` }
    ],
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
      numberOfInstances: s.instances
    }))
  };

  // 4. Recurso HL7 FHIR R4: DiagnosticReport (Laudo Radiológico)
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
    basedOn: [
      { reference: `ServiceRequest/sr-${item.caseId.toLowerCase()}` }
    ],
    status: fhirReportStatusMap[study.workflowStatus] || 'registered',
    category: [
      {
        coding: [
          {
            system: 'http://terminology.hl7.org/CodeSystem/v2-0074',
            code: 'RAD',
            display: 'Radiology'
          }
        ]
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
    imagingStudy: [
      { reference: `ImagingStudy/img-${item.caseId.toLowerCase()}` }
    ],
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
    // Campos padrão DICOM explícitos conforme especificação
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
    // Metadados operacionais do RIS
    workflow: {
      status: study.workflowStatus, // unassigned | awaiting | draft | final
      priority: study.priority,     // routine | urgent
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
    // Prontuário / Histórico Clínico do Paciente
    patientRecord: {
      cpf: patient.cpf,
      phone: patient.phone,
      bloodType: patient.bloodType,
      allergies: patient.allergies,
      clinicalSummary: patient.clinicalSummary,
      medicalHistory: patient.medicalHistory
    },
    // URLs de integração com o Orthanc PACS Viewer
    viewerUrls,
    // Recursos HL7 FHIR R4 nativos
    fhir: {
      Patient: fhirPatient,
      ServiceRequest: fhirServiceRequest,
      ImagingStudy: fhirImagingStudy,
      DiagnosticReport: fhirDiagnosticReport
    }
  };
}

// Estado em memória inicializado a partir das sementes
const stateStore = {
  cases: SEED_CASES.map((c) => structuredClone(c))
};

function getAllHydratedCases() {
  return stateStore.cases.map(buildFhirResourcesFromCase);
}

function getHydratedCaseById(caseIdOrUid) {
  const found = stateStore.cases.find(
    (c) =>
      c.caseId === caseIdOrUid ||
      c.study.studyInstanceUID === caseIdOrUid ||
      c.study.accessionNumber === caseIdOrUid
  );
  return found ? buildFhirResourcesFromCase(found) : null;
}

function assignRadiologistToCase(caseId, radiologistId) {
  const target = stateStore.cases.find((c) => c.caseId === caseId);
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
  const target = stateStore.cases.find((c) => c.caseId === caseId);
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
  const target = stateStore.cases.find((c) => c.caseId === caseId);
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

/**
 * Permite incorporar/sincronizar estudos reais vindos do Orthanc PACS local na Worklist FHIR
 */
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

    // Formata data DICOM YYYYMMDD -> YYYY-MM-DD
    const rawBirth = patientTags.PatientBirthDate || '19800101';
    const formattedBirth =
      rawBirth.length === 8
        ? `${rawBirth.slice(0, 4)}-${rawBirth.slice(4, 6)}-${rawBirth.slice(6, 8)}`
        : '1980-01-01';

    const rawStudyDate = mainTags.StudyDate || '20261102';
    const formattedStudyDate =
      rawStudyDate.length === 8
        ? `${rawStudyDate.slice(0, 4)}-${rawStudyDate.slice(4, 6)}-${rawStudyDate.slice(6, 8)}T08:00:00-04:00`
        : new Date().toISOString();

    const cleanName = (patientTags.PatientName || 'PACIENTE ORTHANC PACS').replace(/\^+/g, ' ').trim();
    const modality = orthStudy.Modality || mainTags.ModalitiesInStudy || 'CT';
    const newIndex = stateStore.cases.length + 1;
    const caseId = `CASE-ORTH-${String(newIndex).padStart(3, '0')}`;

    stateStore.cases.unshift({
      caseId,
      patient: {
        id: `pat-orth-${orthStudy.ParentPatient || newIndex}`,
        dicomPatientId: patientTags.PatientID || `ORTH-${newIndex}`,
        cpf: 'Sincronizado via DICOM PACS',
        name: cleanName,
        family: cleanName.split(' ').slice(-1)[0] || 'Orthanc',
        given: cleanName.split(' ').slice(0, -1),
        gender: patientTags.PatientSex === 'F' ? 'female' : 'male',
        birthDate: formattedBirth,
        phone: 'Via PACS Orthanc',
        bloodType: 'N/I',
        allergies: ['Verificar prontuário hospitalar'],
        clinicalSummary: `Estudo recebido diretamente do servidor Orthanc PACS local (ID Orthanc: ${orthStudy.ID}).`,
        medicalHistory: [
          {
            date: formattedStudyDate.slice(0, 10),
            type: 'Recebimento DICOM C-STORE',
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
        originHospital: mainTags.InstitutionName || 'Orthanc PACS Local (Porta 8042)',
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

/**
 * Gera um HL7 FHIR R4 Bundle contendo todos os recursos ativos (Patient, ServiceRequest, ImagingStudy, DiagnosticReport)
 */
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
    id: 'synapseris-fhir-r4-worklist-bundle',
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
  getHydratedCaseById,
  assignRadiologistToCase,
  saveReportDraft,
  finalizeReport,
  upsertOrthancStudiesIntoStore,
  buildFhirBundle
};
