import { BaseAgent } from './base-agent.js';
import { campaigns as googleCampaigns, adGroups, keywords as googleKeywords } from '../integrations/google-ads.js';
import { supabase } from '../integrations/supabase.js';
import config from '../config.js';
import logger from '../utils/logger.js';

export class GoogleAdsAgent extends BaseAgent {
  constructor() {
    super('googleAdsAgent');
  }

  async execute() {
    const launched = await this.launchApproved();
    const optimized = await this.optimizeActive();
    return { launched, optimized };
  }

  async launchApproved() {
    const { data: ready, error } = await supabase
      .from('campaigns')
      .select('*, campaign_assets(*)')
      .eq('platform', 'google_ads')
      .eq('status', 'approved')
      .is('google_campaign_id', null);

    if (error) throw error;
    if (!ready?.length) return 0;

    let launched = 0;
    for (const campaign of ready) {
      const approvedCopy = (campaign.campaign_assets || []).filter(
        (a) => a.type === 'copy' && a.approved
      );
      if (!approvedCopy.length) {
        logger.info({ campaign: campaign.id }, 'google-ads.skip.no_copy');
        continue;
      }

      try {
        const name = `${campaign.client_id}-${campaign.id.slice(0, 8)}`;
        const dailyBudgetMicros = (campaign.daily_budget_cents ?? 0) * 10000
          || config.agents.googleAdsAgent.dailyBudgetMicros;

        const created = await googleCampaigns.create({
          name,
          daily_budget_micros: dailyBudgetMicros,
          bid_strategy: config.agents.googleAdsAgent.bidStrategy,
        });

        const adGroup = await adGroups.create({
          campaignResourceName: created.resource_name,
          name: `${name}-adgroup`,
        });
        const adGroupResource = adGroup.results[0].resource_name;

        if (campaign.keywords?.length) {
          await googleKeywords.addToAdGroup(adGroupResource, campaign.keywords);
        }

        await supabase
          .from('campaigns')
          .update({
            google_campaign_id: created.id,
            status: 'launched_paused',
            launched_at: new Date().toISOString(),
          })
          .eq('id', campaign.id);

        launched++;
        logger.info({ campaign: campaign.id, googleId: created.id }, 'google-ads.launch.ok');
      } catch (err) {
        logger.error({ campaign: campaign.id, err: err.message }, 'google-ads.launch.fail');
      }
    }

    return launched;
  }

  async optimizeActive() {
    const { data: active, error } = await supabase
      .from('campaigns')
      .select('id, google_campaign_id, daily_budget_cents, metrics(date, cost_cents, conversions)')
      .eq('platform', 'google_ads')
      .eq('status', 'active')
      .not('google_campaign_id', 'is', null);

    if (error || !active?.length) return 0;

    let adjusted = 0;
    for (const campaign of active) {
      const recent = (campaign.metrics || [])
        .sort((a, b) => b.date.localeCompare(a.date))
        .slice(0, 3);
      if (recent.length < 3) continue;

      const totalCost = recent.reduce((s, m) => s + (m.cost_cents ?? 0), 0);
      const totalConv = recent.reduce((s, m) => s + (m.conversions ?? 0), 0);
      if (totalConv === 0 && totalCost > (campaign.daily_budget_cents ?? 0) * 2) {
        try {
          await googleCampaigns.pause(campaign.google_campaign_id);
          await supabase.from('campaigns').update({ status: 'paused' }).eq('id', campaign.id);
          adjusted++;
          logger.info({ campaign: campaign.id }, 'google-ads.auto-pause.no_conv');
        } catch (err) {
          logger.error({ campaign: campaign.id, err: err.message }, 'google-ads.pause.fail');
        }
      }
    }

    return adjusted;
  }
}
