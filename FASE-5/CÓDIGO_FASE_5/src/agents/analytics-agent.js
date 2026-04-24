import { BaseAgent } from './base-agent.js';
import { campaigns as googleCampaigns } from '../integrations/google-ads.js';
import { getInsights as getMetaInsights } from '../integrations/meta-ads.js';
import { supabase } from '../integrations/supabase.js';
import { notifyOperator } from '../telegram/bot.js';
import logger from '../utils/logger.js';

export class AnalyticsAgent extends BaseAgent {
  constructor() {
    super('analyticsAgent');
  }

  async execute() {
    const pulled = await this.pullMetrics();
    const report = await this.buildDailyReport();
    if (report) await notifyOperator(report, { parse_mode: 'Markdown' });
    return { pulled, reported: !!report };
  }

  async pullMetrics() {
    const { data: active, error } = await supabase
      .from('campaigns')
      .select('id, platform, google_campaign_id, meta_campaign_id')
      .in('status', ['active', 'launched_paused', 'paused'])
      .or('google_campaign_id.not.is.null,meta_campaign_id.not.is.null');

    if (error) throw error;
    if (!active?.length) return 0;

    let rows = 0;
    for (const campaign of active) {
      try {
        if (campaign.platform === 'meta_ads' && campaign.meta_campaign_id) {
          const insights = await getMetaInsights(campaign.meta_campaign_id, 'last_7d');
          for (const day of insights) {
            await supabase.from('metrics').upsert({
              campaign_id: campaign.id,
              date: day.date_start,
              impressions: Number(day.impressions) || 0,
              clicks: Number(day.clicks) || 0,
              cost_cents: Math.round(Number(day.spend) * 100) || 0,
              ctr: Number(day.ctr) ? Number(day.ctr) / 100 : null,
              conversions: Number(day.conversions) || 0,
            }, { onConflict: 'campaign_id,date' });
            rows++;
          }
        }

        if (campaign.platform === 'google_ads' && campaign.google_campaign_id) {
          const stream = await googleCampaigns.getMetrics(campaign.google_campaign_id, 'LAST_7_DAYS');
          const results = Array.isArray(stream)
            ? stream.flatMap((s) => s.results || [])
            : stream.results || [];
          for (const row of results) {
            const date = row.segments?.date;
            if (!date) continue;
            const metrics = row.metrics || {};
            await supabase.from('metrics').upsert({
              campaign_id: campaign.id,
              date,
              impressions: Number(metrics.impressions) || 0,
              clicks: Number(metrics.clicks) || 0,
              cost_cents: Math.round(Number(metrics.cost_micros ?? 0) / 10000),
              ctr: Number(metrics.ctr) || null,
              conversions: Number(metrics.conversions) || 0,
            }, { onConflict: 'campaign_id,date' });
            rows++;
          }
        }
      } catch (err) {
        logger.error({ campaign: campaign.id, err: err.message }, 'analytics.pull.fail');
      }
    }

    return rows;
  }

  async buildDailyReport() {
    const today = new Date().toISOString().slice(0, 10);
    const { data, error } = await supabase
      .from('metrics')
      .select('campaign_id, impressions, clicks, cost_cents, conversions, campaigns!inner(platform, client_id)')
      .eq('date', today);

    if (error || !data?.length) return null;

    const totals = data.reduce((acc, m) => {
      const p = m.campaigns.platform;
      if (!acc[p]) acc[p] = { impressions: 0, clicks: 0, cost: 0, conv: 0 };
      acc[p].impressions += m.impressions || 0;
      acc[p].clicks += m.clicks || 0;
      acc[p].cost += m.cost_cents || 0;
      acc[p].conv += m.conversions || 0;
      return acc;
    }, {});

    const clientId = data[0].campaigns.client_id;
    const lines = [`📊 *Relatório Diário · ${clientId} · ${today}*`, ''];
    for (const [platform, t] of Object.entries(totals)) {
      const ctr = t.impressions ? ((t.clicks / t.impressions) * 100).toFixed(2) : '—';
      const cpa = t.conv ? (t.cost / 100 / t.conv).toFixed(2) : '—';
      lines.push(`*${platform}*`);
      lines.push(`  Impressões: ${t.impressions.toLocaleString()}`);
      lines.push(`  Cliques: ${t.clicks} · CTR ${ctr}%`);
      lines.push(`  Gasto: $${(t.cost / 100).toFixed(2)}`);
      lines.push(`  Conversões: ${t.conv} · CPA $${cpa}`);
      lines.push('');
    }
    return lines.join('\n');
  }
}
