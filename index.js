const { makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const qrcode = require('qrcode-terminal');
const { spawn } = require('child_process');
const path = require('path');

// === CONFIG ===
// EN: Project root for self-contained Grok agents/skills. PT: Raiz do projeto para agents/skills do Grok auto-contidos.
const BOT_DIR = __dirname; // Project root - Grok will prefer .grok/ here for agents/skills
const GROK_BIN = process.env.GROK_BIN || 'grok'; // Set to full path if grok CLI is not in PATH (e.g. /path/to/.grok/bin/grok)
const USE_WHATSAPP_AGENT = 'whatsapp-responder'; // our custom agent (will be found via project .grok/ or user ~/.grok/)
const AUTH_FOLDER = path.join(BOT_DIR, 'auth'); // Baileys auth state (multi-device, persistent)

// Helper: call Grok headless to generate a reply
async function generateReplyWithGrok(fromName, messageText, isGroup) {
  return new Promise((resolve, reject) => {
    const prompt = `
Você é um assistente de respostas para WhatsApp.
Use a skill "whatsapp-reply" e o agente "whatsapp-responder" (definidos localmente no projeto .grok/ ou em ~/.grok/).

Contexto:
- De: ${fromName || 'Desconhecido'}
- É grupo? ${isGroup ? 'Sim' : 'Não (chat particular)'}
- Mensagem recebida: ${messageText}

Gere uma resposta natural, curta e no tom certo para WhatsApp (português brasileiro casual quando apropriado).
Retorne APENAS o texto da resposta pronta para enviar, ou exatamente a palavra NO_REPLY se não for bom responder agora.
`.trim();

    const env = {
      ...process.env,
      GROK_AGENT: USE_WHATSAPP_AGENT, // force our custom agent
    };

    const grok = spawn(GROK_BIN, ['-p', prompt, '--yolo', '--no-auto-update'], {
      env,
      cwd: BOT_DIR,           // Important: makes Grok discover .grok/agents and .grok/skills inside this project first (higher priority than ~/.grok)
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let output = '';
    let errorOutput = '';

    grok.stdout.on('data', (data) => {
      output += data.toString();
    });

    grok.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });

    grok.on('close', (code) => {
      if (code !== 0) {
        console.error('Grok error:', errorOutput);
        // Fallback: simple echo or skip
        return resolve('NO_REPLY');
      }
      const reply = output.trim();
      console.log(`[Grok sugeriu]: ${reply}`);
      resolve(reply || 'NO_REPLY');
    });

    grok.on('error', (err) => {
      console.error('Failed to spawn Grok:', err);
      resolve('NO_REPLY');
    });
  });
}

// Main bot
async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState(AUTH_FOLDER);

  const sock = makeWASocket({
    auth: state,
    printQRInTerminal: false, // we handle QR ourselves
    // browser: ['Grok-WhatsApp-Bot', 'Chrome', '1.0.0'], // optional
  });

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      console.log('\n=== Escaneie o QR Code com seu WhatsApp ===\n');
      qrcode.generate(qr, { small: true });
    }

    if (connection === 'close') {
      const shouldReconnect = (lastDisconnect?.error)?.output?.statusCode !== DisconnectReason.loggedOut;
      console.log('Conexão fechada. Reconectando?', shouldReconnect);
      if (shouldReconnect) {
        startBot(); // reconnect
      } else {
        console.log('Logout detectado. Delete a pasta auth/ e rode novamente para novo QR.');
      }
    } else if (connection === 'open') {
      console.log('✅ Conectado ao WhatsApp! Bot ativo e escutando mensagens...');
    }
  });

  sock.ev.on('creds.update', saveCreds);

  // === LISTEN FOR MESSAGES ===
  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;

    for (const msg of messages) {
      if (!msg.message || msg.key.fromMe) continue; // ignore our own messages

      const from = msg.key.remoteJid; // phone or group id
      const isGroup = from.endsWith('@g.us');

      // Get sender name (better in groups)
      let fromName = msg.pushName || msg.key.participant || from.split('@')[0];

      // Extract text
      const text = msg.message.conversation ||
                   msg.message.extendedTextMessage?.text ||
                   msg.message.imageMessage?.caption ||
                   '[mensagem com mídia]';

      console.log(`\n📩 Nova mensagem de ${fromName} (${from}):`);
      console.log(`   "${text}"`);

      // === CALL GROK FOR SMART REPLY ===
      const suggestedReply = await generateReplyWithGrok(fromName, text, isGroup);

      if (suggestedReply && suggestedReply !== 'NO_REPLY' && suggestedReply.length > 0) {
        console.log(`   → Enviando resposta: "${suggestedReply}"`);

        try {
          await sock.sendMessage(from, { text: suggestedReply });
          console.log('   ✅ Resposta enviada!');
        } catch (sendErr) {
          console.error('Erro ao enviar:', sendErr);
        }
      } else {
        console.log('   → Decidiu não responder (NO_REPLY ou vazio).');
      }
    }
  });

  return sock;
}

// Start only if run directly (not when required as module for tests)
if (require.main === module) {
  console.log('Iniciando WhatsApp + Grok bot...');
  startBot().catch(console.error);
}

module.exports = { startBot, generateReplyWithGrok };
