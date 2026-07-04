# WhatsApp + Grok Bot

Bot que escuta mensagens do WhatsApp e usa Grok (com seus agents e skills customizados) para gerar respostas inteligentes automaticamente.

## Arquitetura: Onde ficam os arquivos? O bot é auto-contido? Como conecta com o "coração" da LLM?

Esta é a pergunta mais importante para aplicações reais:

**Sim, o projeto do bot é 100% auto-contido na pasta dele.**

- Todo o código da aplicação (conexão WhatsApp via Baileys, loop de mensagens, lógica de quando chamar o cérebro, envio de respostas) fica aqui:
  - `~/whatsapp-grok-bot/index.js`
  - `package.json`, `node_modules/`, `README.md`, `.grok/` etc.
- Você pode zipar a pasta, colocar no git, copiar para um servidor, fazer deploy com Docker, etc. É um entregável normal de aplicação Node.js.

**Porém: a "inteligência" (o cérebro LLM + seus custom agents/skills) NÃO está embutida dentro do bot.**

- O bot **não** contém o modelo Grok dentro dele.
- O bot **chama externamente** o Grok CLI instalado na máquina (`grok -p "..." --yolo` via `child_process.spawn`).
- O Grok que é chamado carrega:
  - Seus agents customizados (ex: `whatsapp-responder`) 
  - Suas skills (ex: `whatsapp-reply`)
  - Config geral

**Onde vivem os "cérebros" customizados?**

- No Grok (a ferramenta LLM), as customizações ficam em pastas como `~/.grok/agents/`, `~/.grok/skills/`, `~/.grok/config.toml`.
- **Para tornar o bot realmente portável e entregável**, eu coloquei cópias dentro do projeto:
  - `~/whatsapp-grok-bot/.grok/agents/whatsapp-responder.md`
  - `~/whatsapp-grok-bot/.grok/skills/whatsapp-reply/SKILL.md`
- No código do bot, toda chamada ao Grok é feita com `cwd: BOT_DIR` (diretório do projeto). Isso faz o Grok descobrir primeiro as definições locais em `.grok/` do projeto (prioridade mais alta que `~/.grok/` do usuário).
- Resultado: o "cérebro" viaja junto com o código do app. Quando alguém clona o repositório e roda o bot, as regras de resposta já estão lá.

**Como o bot conecta com o "coração da LLM"?**

No `index.js`:

```js
const grok = spawn(GROK_BIN, ['-p', prompt, '--yolo', ...], {
  env: { ...process.env, GROK_AGENT: 'whatsapp-responder' },
  cwd: BOT_DIR,   // <--- chave para descobrir .grok/ local do projeto
  stdio: ['ignore', 'pipe', 'pipe']
});
```

- Cada mensagem recebida → o bot spawna um processo Grok headless.
- Grok roda, usa o agent + skill (do .grok/ do projeto ou ~/.grok/), gera a resposta e morre.
- O bot pega a saída e manda no WhatsApp.

Isso é **diferente** de uma aplicação tradicional monolítica onde "tudo" (incluindo o modelo) fica dentro da pasta e é rodado no servidor.

**Padrões reais para apps com Grok / LLMs:**

1. **Como está aqui (recomendado para começar)**: Sua app (pasta auto-contida) + chama o Grok CLI local/headless ou Agent Mode. Ótimo para dev, protótipos, servidores internos onde Grok já está instalado.

2. **Mais "enterprise / independente"**: 
   - Rode `grok agent serve` como um serviço separado (sidecar).
   - Sua app conversa com ele via HTTP/ACP (mais eficiente, mantém contexto).
   - Ou chame diretamente a API da xAI na nuvem (com API key) — aí o bot não depende mais do CLI Grok instalado. Você só porta a lógica do prompt/agent/skill para o código ou para o prompt enviado via API.

3. **MCP**: Para dar ferramentas externas ao cérebro (GitHub, DBs, etc.) sem mudar o bot.

**Resumo prático:**
- A **aplicação** (WhatsApp + lógica) = pasta `whatsapp-grok-bot/` (auto-contida, entregável, roda em servidor).
- O **cérebro inteligente customizado** = arquivos em `.grok/` (dentro do projeto ou ~/.grok/).
- A **conexão** = spawn do binário `grok` (ou chamada HTTP para agent serve, ou API remota).
- Não é "tudo dentro da pasta da LLM". O .grok é só a config/ customizações do Grok tool. Sua app vive em qualquer lugar.

## Como deixar sempre ativo?

### Opção 1: PM2 (recomendada para Linux)
```bash
npm install -g pm2

cd ~/whatsapp-grok-bot
pm2 start npm --name "whatsapp-grok-bot" -- start

pm2 save
pm2 startup   # siga as instruções para iniciar no boot
```

Ver logs:
```bash
pm2 logs whatsapp-grok-bot
pm2 restart whatsapp-grok-bot
```

### Opção 2: systemd (mais robusto)
Crie `/etc/systemd/system/whatsapp-grok-bot.service`:

```ini
[Unit]
Description=WhatsApp Grok Bot
After=network.target

[Service]
Type=simple
User=youruser
WorkingDirectory=/home/youruser/whatsapp-grok-bot
ExecStart=/usr/bin/node /home/youruser/whatsapp-grok-bot/index.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production
Environment=PATH=/home/youruser/.grok/bin:/usr/local/bin:/usr/bin:/bin
# O bot já controla o cwd interno ao chamar o Grok, então as definições em .grok/ do projeto são usadas automaticamente.

[Install]
WantedBy=multi-user.target
```

Depois:
```bash
sudo systemctl daemon-reload
sudo systemctl enable whatsapp-grok-bot
sudo systemctl start whatsapp-grok-bot
sudo journalctl -u whatsapp-grok-bot -f
```

### Opção 3 (rápida para teste): nohup ou tmux
```bash
cd ~/whatsapp-grok-bot
nohup npm start > bot.log 2>&1 &
```

## Primeiro uso

1. cd ~/whatsapp-grok-bot
2. npm start
3. Escaneie o QR Code que aparece com o WhatsApp do celular (WhatsApp > Dispositivos conectados).
4. O bot vai logar "Conectado ao WhatsApp!" e começar a escutar.

A pasta `auth/` guarda a sessão (não precisa escanear de novo depois de reiniciar).

## Running the tests / Executando os testes

**Português:**

```bash
npm test
```

(Se os node_modules não estiverem presentes: `npm install` primeiro.)

Testes usam Mocha + assert. Verificam carregamento do módulo sem iniciar o bot real (guard `require.main`), estrutura do projeto e presença dos agents/skills. Rápidos e não requerem WhatsApp nem Grok rodando.

**English:**

```bash
npm test
```

(Run `npm install` first if node_modules are missing.)

Tests use Mocha. They verify safe module loading (without auto-starting the real bot thanks to a `require.main` guard), project structure, and that agents/skills are present. Fast and require neither a WhatsApp connection nor the Grok CLI.

## Personalização (cérebro)

- As definições do cérebro (agent + skill) estão **dentro do projeto** em:
  - `.grok/agents/whatsapp-responder.md`
  - `.grok/skills/whatsapp-reply/SKILL.md`
- Isso torna o bot auto-contido: clone o repo → as regras de resposta já vêm junto.
- O código do bot força `cwd` para a raiz do projeto ao chamar o Grok, para que ele prefira as definições locais em `.grok/`.
- Você também pode ter versões globais em `~/.grok/`, mas as do projeto têm prioridade quando o bot roda.

- No `index.js` você pode mudar o prompt, adicionar contexto (últimas mensagens), filtrar contatos/grupos, etc.

## Como usar o agente/skill manualmente (sem o bot)

No Grok TUI ou headless:
- Peça: "gere reply pro whatsapp: 'E aí, blz?' de João"
- Ou use o agente diretamente: `GROK_AGENT=whatsapp-responder grok -p "Responda essa msg do zap de Maria: 'Pode me ajudar com o orçamento?'"`

## Avisos importantes

- **Risco de ban**: Automação de WhatsApp viola os termos em alguns casos. Use em conta secundária. Baileys é multi-device (mais seguro que emuladores), mas ainda assim use com responsabilidade.
- Não envie spam.
- Teste bastante antes de deixar rodando em produção.
- Para grupos grandes, adicione lógica para só responder quando mencionado (@bot) ou em chats específicos.

## Melhorias avançadas

- Usar `grok agent serve` + HTTP em vez de spawn por mensagem (mais eficiente, contexto persistente).
- Guardar histórico de conversas por contato e passar como contexto pro Grok.
- Adicionar delay aleatório + "digitando..." antes de responder.
- Filtrar por contatos permitidos.
- Usar Grok via MCP ou API se disponível no futuro.

Boa sorte! Se precisar de ajustes no bot, skill ou agent, me avise.
---
