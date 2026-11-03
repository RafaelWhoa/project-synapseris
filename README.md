# SynapseRIS — Sistema Web de RIS Integrado ao Fluxo Orthanc PACS & HL7 FHIR R4

Aplicação web completa de **RIS (Radiology Information System)** integrada ao fluxo de **PACS (Orthanc)** na porta `8042`, inspirada em plataformas modernas de telerradiologia (**Astra PACS / MedDream**) e modelada segundo o padrão de interoperabilidade em saúde **HL7 FHIR R4** e tags **DICOM**.

---

## 🚀 Como Executar

A aplicação foi desenvolvida em **Node.js** utilizando módulos nativos de alta performance (zero dependências externas de compilação), pronta para execução imediata no WSL ou Windows:

```bash
# Iniciar o servidor em produção (porta padrão 3000)
npm start
# ou diretamente:
node src/server.js

# Executar suíte de verificação (DICOM, CPTAC-CM, Orthanc Proxy e HL7 FHIR R4)
npm test

# (Opcional) Alimentar o servidor Orthanc PACS (:8042) com estudos reais do dataset CPTAC-CM
npm run seed:orthanc
```

Acesse no navegador:
- **Aplicação SynapseRIS:** `http://localhost:3000`
- **Servidor Orthanc PACS:** `http://localhost:8042`

---

## 🖥️ Escopo e Telas Principais

1. **Autenticação & Perfis (`/`):**
   - Alternância imediata entre **"Administrador / Operador"** e **"Médico Radiologista"** na tela de login e na barra superior da aplicação.
2. **Dashboard Geral & Worklist — Visão Admin:**
   - **5 Cards de KPIs:** Total de Estudos, Não Atribuídos, Em Andamento, Laudos Finalizados e Casos Urgentes.
   - **Gráfico Donut SVG de Modalidades:** Distribuição proporcional de `CT`, `MR`, `CR`, `DX`, `US` e `PT` (PET-CT).
   - **Tabela Completa de Worklist:** Paciente (`PatientName`, `PatientID`, `PatientBirthDate`), `StudyDescription` + `AccessionNumber`, Hospital/Clínica de Origem, Modalidade, Prioridade (`Rotina`/`Urgente`), Data de Recebimento, Radiologista Responsável e Ações (**Atribuir**, **Visualizar**, **Histórico**).
3. **Worklist do Médico Radiologista:**
   - Filtros combinados por **Período**, **Modalidade**, **Status do Laudo** (`Rascunho`, `Aguardando Laudo`, `Finalizado`, `Não Atribuído`) e **Escopo de Atribuição**.
   - Botão de ação direta **"Laudar / Continuar"** que abre o Workspace Integrado.
4. **Workspace de Laudo — Tela Dividida / Split Screen (60% / 40%):**
   - **Lado Esquerdo (60% da largura):** Container preparado para carregar o DICOM Viewer do Orthanc (`http://localhost:8042/stone-webviewer/index.html?study=<StudyInstanceUID>`, OHIF Viewer ou Orthanc Explorer), acompanhado de um **Simulador Clínico DICOM Multi-Slice Interativo** (com controle de cortes/slices no scroll do mouse, presets de janela `W/L`, inversão e HUD DICOM) caso o Orthanc local esteja offline ou o estudo fictício não esteja armazenado no banco local do Orthanc.
   - **Lado Direito (40% da largura):** Cabeçalho demográfico completo, indicação clínica, alerta de alergias, seletor de **Templates de Laudo**, **Editor de Texto Rico** estruturado em *Técnica*, *Achados Radiológicos* e *Impressão Diagnóstica / Conclusão*, e botões **"Voltar para Lista"**, **"Salvar Rascunho"** e **"Finalizar Laudo / Assinar"**.

---

## 🔗 Integração Orthanc PACS & Endpoints HL7 FHIR R4

As variáveis de ambiente do Orthanc estão centralizadas em `.env` e [`src/config/orthanc.config.js`](src/config/orthanc.config.js):
- `ORTHANC_URL=http://localhost:8042`
- `ORTHANC_PORT=8042`
- `ORTHANC_DEFAULT_VIEWER=stone-webviewer`
- `ORTHANC_FALLBACK_VIEWER=explorer.html`

###Principais Endpoints da API:
- `GET /api/config` — Configuração do Orthanc, lista de médicos radiologistas (`Practitioner`) e templates de laudo.
- `GET /api/orthanc/status` — Verifica conectividade em tempo real com `http://localhost:8042/system`.
- `GET /studies` e `GET /api/orthanc/studies` — Proxy/serviço que consulta `GET /studies?expand` no Orthanc (sincronizando estudos reais automaticamente) ou retorna fallback 100% funcional com dados mockados FHIR/DICOM.
- `GET /patients/:id` e `GET /api/orthanc/patients/:id` — Proxy/serviço para `GET /patients/{id}` no Orthanc com fallback para o prontuário FHIR `Patient`.
- `GET /api/fhir/Bundle` — Retorna o `Bundle` HL7 FHIR R4 completo (`Patient`, `ServiceRequest`, `ImagingStudy`, `DiagnosticReport`).
- `GET /api/fhir/Patient` | `GET /api/fhir/ServiceRequest` | `GET /api/fhir/ImagingStudy` | `GET /api/fhir/DiagnosticReport` — Recursos FHIR R4 individuais.
