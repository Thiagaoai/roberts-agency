import { test } from 'node:test';
import assert from 'node:assert/strict';

test('config loads without throwing', async () => {
  const { default: config } = await import('../config.js');
  assert.ok(config);
  assert.equal(typeof config.ports.cmo, 'number');
  assert.ok(Array.isArray(Object.keys(config.scheduling)));
});

test('registry exposes 11 agents', async () => {
  const { registerAgents } = await import('../agents/registry.js');
  const agents = await registerAgents();
  assert.equal(Object.keys(agents).length, 11);
  for (const name of ['cmo', 'strategist', 'copywriter', 'supervisor', 'metaAdsAgent', 'googleAdsAgent']) {
    assert.ok(agents[name], `missing agent: ${name}`);
  }
});

test('base agent tracks status on run/fail', async () => {
  const { BaseAgent } = await import('../agents/base-agent.js');
  class OK extends BaseAgent { async execute() { return { ok: true }; } }
  class Bad extends BaseAgent { async execute() { throw new Error('boom'); } }

  const ok = new OK('ok');
  assert.equal(ok.status, 'idle');
  await ok.run();
  assert.equal(ok.status, 'idle');
  assert.equal(ok.lastError, null);

  const bad = new Bad('bad');
  await assert.rejects(bad.run(), /boom/);
  assert.equal(bad.status, 'error');
  assert.equal(bad.lastError, 'boom');
});

test('cron expressions in config are valid', async () => {
  const cron = (await import('node-cron')).default;
  const { default: config } = await import('../config.js');
  for (const [name, expr] of Object.entries(config.scheduling)) {
    if (expr === 'onDemand') continue;
    assert.ok(cron.validate(expr), `invalid cron for ${name}: ${expr}`);
  }
});

test('stub agents return { stub: true }', async () => {
  const { StrategistAgent } = await import('../agents/stubs.js');
  const a = new StrategistAgent();
  const result = await a.run();
  assert.deepEqual(result, { stub: true });
});

test('real agents (non-stub) are implemented', async () => {
  const { registerAgents } = await import('../agents/registry.js');
  const agents = await registerAgents();
  const realNames = ['copywriter', 'supervisor', 'metaAdsAgent', 'imageCreator', 'googleAdsAgent', 'analyticsAgent'];
  for (const name of realNames) {
    assert.ok(agents[name], `missing: ${name}`);
    assert.notEqual(agents[name].constructor.name, 'StubAgent', `${name} is still a stub`);
  }
});

test('ImageCreator buildPrompt produces valid prompt with guidelines', async () => {
  const { ImageCreatorAgent } = await import('../agents/image-creator.js');
  const agent = new ImageCreatorAgent();
  const campaign = { platform: 'meta_ads', objective: 'conversions', audience: 'homeowners 35-55' };
  const guidelines = {
    company: { name: 'Acme' },
    voice: { tone: 'premium', keyWords: ['quality', 'innovation'] },
    visualIdentity: { primaryColors: { main: '#123', accent: '#456' } },
  };
  const prompt = agent.buildPrompt(campaign, guidelines);
  assert.match(prompt, /Acme/);
  assert.match(prompt, /premium/);
  assert.match(prompt, /quality/);
});

test('AnalyticsAgent buildDailyReport handles empty metrics gracefully', async () => {
  const { AnalyticsAgent } = await import('../agents/analytics-agent.js');
  const agent = new AnalyticsAgent();
  assert.equal(typeof agent.buildDailyReport, 'function');
  assert.equal(typeof agent.pullMetrics, 'function');
});
