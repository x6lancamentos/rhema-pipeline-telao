const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const express = require('express');

const API_BASE = 'https://api.imoview.com.br';

function getApiKey() {
  if (process.env.IMOVIEW_CHAVE && process.env.IMOVIEW_CHAVE.trim()) {
    return process.env.IMOVIEW_CHAVE.trim();
  }
  const localKey = path.join(__dirname, 'api_key.json');
  if (fs.existsSync(localKey)) {
    const raw = fs.readFileSync(localKey, 'utf8').trim();
    return raw.startsWith('"') ? JSON.parse(raw) : raw;
  }
  const parentKey = path.join(__dirname, '..', 'api_key.json');
  if (fs.existsSync(parentKey)) {
    const raw = fs.readFileSync(parentKey, 'utf8').trim();
    return raw.startsWith('"') ? JSON.parse(raw) : raw;
  }
  return '11f9e237496a809fd4f1a803e05d6a8e';
}

const API_KEY = getApiKey();
const IMOVIEW_EMAIL = process.env.IMOVIEW_EMAIL || 'brunno@rhemaimobiliaria.com.br';
const IMOVIEW_SENHA = process.env.IMOVIEW_SENHA || '12345678';
const SYNC_INTERVAL_SECONDS = parseInt(process.env.SYNC_INTERVAL_SECONDS || '60', 10);
const PORT = process.env.PORT || 3210;

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Estado da Sessão Imoview
const session = {
  codigoUsuario: null,
  codigoacesso: null,
  nomeusuario: null,
  ultimoLogin: null,
  erro: null
};

// Estado dos Dados em Tempo Real
let liveState = {
  lastSync: null,
  nextSyncExpected: null,
  syncCount: 0,
  syncStatus: 'iniciando',
  dashboardMetrics: null,
  agendaAtividades: [],
  erroSync: null
};

// Autenticação com a API do Imoview
async function loginImoview() {
  try {
    const senhaMd5 = crypto.createHash('md5').update(IMOVIEW_SENHA).digest('hex');
    const url = new URL('/Usuario/App_ValidarAcesso', API_BASE);
    url.searchParams.set('email', IMOVIEW_EMAIL);
    url.searchParams.set('senha', senhaMd5);

    const res = await fetch(url.toString(), {
      headers: { chave: API_KEY },
      signal: AbortSignal.timeout(15000)
    });
    const body = await res.json();

    if (res.ok && body.codigoacesso) {
      session.codigoUsuario = body.codigousuario;
      session.codigoacesso = body.codigoacesso;
      session.nomeusuario = body.nomeusuario;
      session.ultimoLogin = new Date().toISOString();
      session.erro = null;
      console.log(`[Imoview Auth] ✅ Logado como ${body.nomeusuario} (ID=${body.codigousuario})`);
      return true;
    } else {
      session.erro = body.mensagem || 'Falha na autenticação';
      console.error('[Imoview Auth] ❌ Falha:', session.erro);
      return false;
    }
  } catch (err) {
    session.erro = err.message;
    console.error('[Imoview Auth] ❌ Erro de conexão:', err.message);
    return false;
  }
}

// Sincronização periódica com a API do Imoview (a cada 1 minuto)
async function syncWithImoview() {
  const syncStartTime = new Date();
  try {
    if (!session.codigoacesso) {
      const ok = await loginImoview();
      if (!ok) {
        liveState.syncStatus = 'erro_autenticacao';
        liveState.erroSync = session.erro;
        return;
      }
    }

    // 1. Consulta Indicadores Operacionais
    const dashUrl = new URL('/Usuario/App_RetornarDashboard', API_BASE);
    dashUrl.searchParams.set('codigoUsuario', session.codigoUsuario);
    const dashRes = await fetch(dashUrl.toString(), {
      headers: { chave: API_KEY, codigoacesso: session.codigoacesso },
      signal: AbortSignal.timeout(15000)
    });

    if (dashRes.status === 401 || dashRes.status === 403) {
      console.log('[Imoview Sync] ⚠️ Sessão expirada, reautenticando...');
      await loginImoview();
      return;
    }

    const dashBody = await dashRes.json();
    liveState.dashboardMetrics = dashBody;

    // 2. Consulta Atividades de Agenda
    try {
      const agendaUrl = new URL('/Agenda/RetornarAtividades', API_BASE);
      agendaUrl.searchParams.set('codigoUsuario', session.codigoUsuario);
      const agendaRes = await fetch(agendaUrl.toString(), {
        headers: { chave: API_KEY, codigoacesso: session.codigoacesso },
        signal: AbortSignal.timeout(15000)
      });
      if (agendaRes.ok) {
        const agendaBody = await agendaRes.json();
        liveState.agendaAtividades = Array.isArray(agendaBody) ? agendaBody : [];
      }
    } catch (e) {
      console.warn('[Imoview Sync] Aviso ao buscar agenda:', e.message);
    }

    liveState.lastSync = syncStartTime.toISOString();
    liveState.nextSyncExpected = new Date(Date.now() + SYNC_INTERVAL_SECONDS * 1000).toISOString();
    liveState.syncCount++;
    liveState.syncStatus = 'sucesso';
    liveState.erroSync = null;

    console.log(`[Imoview Sync #${liveState.syncCount}] ⏱️ ${syncStartTime.toLocaleTimeString('pt-BR')} - Atendimentos Venda: ${dashBody.quantidade_atendimentos_em_andamento_venda || 0} | Atividades Hoje: ${dashBody.quantidade_atividades_dia || 0} | Vencidas: ${dashBody.quantidade_atividades_vencidas || 0}`);
  } catch (err) {
    liveState.syncStatus = 'erro_sincronizacao';
    liveState.erroSync = err.message;
    console.error('[Imoview Sync] ❌ Erro durante sincronização:', err.message);
  }
}

// Inicializa o agendador de 1 minuto (60 segundos)
setInterval(syncWithImoview, SYNC_INTERVAL_SECONDS * 1000);

// Endpoint de Status & Diagnóstico
app.get('/api/status', (req, res) => {
  res.json({
    status: 'online',
    servico: 'Rhema Pipeline Telão',
    apiConectada: !!session.codigoacesso,
    usuarioLogado: session.nomeusuario,
    ultimoLogin: session.ultimoLogin,
    syncIntervalSeconds: SYNC_INTERVAL_SECONDS,
    liveState: {
      lastSync: liveState.lastSync,
      nextSyncExpected: liveState.nextSyncExpected,
      syncCount: liveState.syncCount,
      syncStatus: liveState.syncStatus,
      erroSync: liveState.erroSync
    }
  });
});

// Endpoint com os Dados de Pipeline e Métricas Imoview Consolidadas
app.get('/api/pipeline', (req, res) => {
  res.json({
    atualizadoEm: liveState.lastSync || new Date().toISOString(),
    syncStatus: liveState.syncStatus,
    intervaloSegundos: SYNC_INTERVAL_SECONDS,
    usuarioResponsavel: session.nomeusuario || 'Rhema Imóveis',
    imoviewLive: liveState.dashboardMetrics || {},
    agendaHoje: liveState.agendaAtividades || []
  });
});

// Disparo Manual de Sincronização
app.post('/api/sync', async (req, res) => {
  await syncWithImoview();
  res.json({
    mensagem: 'Sincronização executada com sucesso',
    liveState
  });
});

// Health check para Docker / Coolify
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', uptime: process.uptime() });
});

// Fallback para página principal
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Inicia servidor e dispara primeira sincronização
loginImoview().then(() => syncWithImoview()).finally(() => {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`======================================================`);
    console.log(`  🚀 RHEMA PIPELINE TELÃO OPERACIONAL`);
    console.log(`  Porta: ${PORT}`);
    console.log(`  Auto-Refresh Imoview: A cada ${SYNC_INTERVAL_SECONDS} segundos (1 minuto)`);
    console.log(`  Acesse: http://localhost:${PORT}`);
    console.log(`======================================================`);
  });
});
