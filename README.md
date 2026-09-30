# 🏢 Rhema Imóveis • Cockpit de Pipelines & Telão Comercial 24h

Painel comercial e operacional de alta performance para exibição contínua em **Telão / TV da Sala de Vendas** e acompanhamento da Diretoria, com atualização automática em tempo real a cada **1 minuto** integrado diretamente à API do **Imoview**.

---

## 🚀 Funcionalidades Principais

- **4 Pipelines Completos de Ponta a Ponta**:
  1. 🟣 **Pré-Vendas (SDR)**: Entrada e Triagem, Em Contato, Qualificação, Agendamento.
  2. 🔵 **Vendas**: Visitas Agendadas, Aguardando Parecer (com alertas rígidos de SLA), Análise de Imóveis, Elaboração de Proposta.
  3. 🟡 **Negociação (Closer)**: Proposta Apresentada, Contraproposta, Aceite Formal.
  4. 🟢 **Pós-Venda (ADM & Financiamento)**: Levantamento de Certidões, Aprovação de Financiamento, Contrato & Escritura, Registro em Cartório, Entrega das Chaves 🔑.

- **Painel & Visualização Customizável (Presets Rápidos)**:
  - 📺 **Telão da Sala de Vendas**: Oculta pipelines burocráticos/pós-venda para foco 100% comercial no time.
  - 🏛️ **Visão Diretoria**: Exibe todas as etapas ponta a ponta (comercial + ADM).
  - 🔄 **Modo Carrossel / Auto-Loop TV**: Alterna automaticamente a cada 18s entre funil, VGV e radar de SLA.
  - 🎛️ **Pílulas Interativas**: Permite ligar/desligar qualquer pipeline individualmente.

- **Filtros Dinâmicos**:
  - Filtro por **Corretor** (Tatiana, Flávia, Roseli, Leniára, Luana, Elaine).
  - Filtro por **Período** (Hoje/24h, Últimos 7 dias, 15 dias, 30 dias, 90 dias, Todo o Período).

- **Alertas de Atendimento & SLA**:
  - Indicadores visuais imediatos para atendimentos demorados (1º contato > 15min, visitas sem parecer > 24h, etc.).
  - Diagnóstico individual em cada lead.

- **Gamificação & Ranking Comercial**:
  - Pódio dos corretores com VGV gerado, número de visitas, propostas e taxa de conversão.
  - Efeito sonoro suave e **chuva de confetes** ao celebrar fechamento de vendas.

- **Gráficos Animados com ApexCharts**:
  - Funil de Vendas com conversão por etapa.
  - VGV em tramitação por pipeline.
  - Radar de tempo real vs. SLA ideal Rhema.

---

## ⏱️ Integração Contínua com API Imoview (1 Minuto)

O backend em Node.js executa um worker de segundo plano que a cada **60 segundos**:
1. Valida e renova a sessão autenticada com a API do Imoview.
2. Consulta `/Usuario/App_RetornarDashboard` e `/Agenda/RetornarAtividades`.
3. Atualiza os indicadores e métricas em tempo real para os clientes conectados via `/api/pipeline`.
4. O frontend possui timer regressivo circular exibindo a contagem até o próximo ciclo.

---

## 🛠️ Como Executar Localmente

```bash
# Instalar dependências
npm install

# Iniciar servidor
npm start
```

Acesse em: `http://localhost:3210`

---

## 🐳 Deploy no Coolify (Docker)

Esta aplicação está configurada para deploy automatizado no Coolify via Dockerfile.

Variáveis de ambiente suportadas:
- `PORT`: Porta HTTP (padrão: `3210`)
- `IMOVIEW_CHAVE`: Chave da API do Imoview
- `IMOVIEW_EMAIL`: E-mail de autenticação do usuário
- `IMOVIEW_SENHA`: Senha de autenticação do usuário
- `SYNC_INTERVAL_SECONDS`: Intervalo de sincronização (padrão: `60`)
