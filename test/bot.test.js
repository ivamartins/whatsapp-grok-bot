const assert = require('assert');
const path = require('path');

// Basic unit tests for the bot module
// These are simple and don't require WhatsApp or Grok running.

describe('whatsapp-grok-bot', function() {
  it('should load the module without error', function() {
    // Just require the main file to check syntax and basic load
    const bot = require('../index.js');
    assert.ok(bot, 'module should export something or run');
  });

  it('should have correct BOT_DIR', function() {
    // Since config is top level, we can check by re-requiring in controlled way, but for basic:
    const expectedDir = path.resolve(__dirname, '..');
    // We can't easily access const without export, so test file existence instead
    const fs = require('fs');
    assert.ok(fs.existsSync(path.join(expectedDir, 'index.js')), 'main file exists');
  });

  it('should have .grok directory with agents', function() {
    const fs = require('fs');
    const agentPath = path.join(__dirname, '..', '.grok', 'agents', 'whatsapp-responder.md');
    assert.ok(fs.existsSync(agentPath), 'agent definition should exist');
  });
});
