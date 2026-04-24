import { BaseAgent } from './base-agent.js';
import { generateImage } from '../integrations/openai.js';
import { uploadFromUrl } from '../integrations/cloudinary.js';
import { supabase } from '../integrations/supabase.js';
import { getBrandGuidelines } from '../utils/brand-guidelines.js';
import config from '../config.js';
import logger from '../utils/logger.js';

export class ImageCreatorAgent extends BaseAgent {
  constructor() {
    super('imageCreator');
  }

  async execute() {
    const { data: campaigns, error } = await supabase
      .from('campaigns')
      .select('id, client_id, platform, objective, audience, landing_url, campaign_assets(id, type, approved)')
      .in('status', ['draft', 'copy_pending', 'review_pending'])
      .limit(5);

    if (error) throw error;

    const needsImages = (campaigns || []).filter((c) => {
      const approvedCopy = (c.campaign_assets || []).some((a) => a.type === 'copy' && a.approved);
      const hasImage = (c.campaign_assets || []).some((a) => a.type === 'image');
      return approvedCopy && !hasImage;
    });

    if (!needsImages.length) {
      logger.info('[imageCreator] nothing to generate');
      return { generated: 0 };
    }

    const { maxGenerationsPerRun, size, quality } = config.agents.imageCreator;
    let totalUploaded = 0;

    for (const campaign of needsImages) {
      const guidelines = await getBrandGuidelines(campaign.client_id);
      const prompt = this.buildPrompt(campaign, guidelines);

      let urls;
      try {
        urls = await generateImage(prompt, { size, quality, count: maxGenerationsPerRun });
      } catch (err) {
        logger.error({ campaign: campaign.id, err: err.message }, 'imageCreator.generate.fail');
        continue;
      }

      for (const tempUrl of urls) {
        try {
          const uploaded = await uploadFromUrl(tempUrl, {
            folder: `marketing-squad/${campaign.client_id}/${campaign.platform}`,
            tags: [campaign.client_id, campaign.platform, 'dalle'],
          });

          await supabase.from('campaign_assets').insert({
            campaign_id: campaign.id,
            type: 'image',
            asset_url: uploaded.url,
            cloudinary_public_id: uploaded.publicId,
            content: { prompt, width: uploaded.width, height: uploaded.height },
            supervisor_score: null,
            approved: false,
          });

          totalUploaded++;
        } catch (err) {
          logger.error({ campaign: campaign.id, err: err.message }, 'imageCreator.upload.fail');
        }
      }
    }

    return { generated: totalUploaded, campaigns: needsImages.length };
  }

  buildPrompt(campaign, guidelines) {
    const brand = guidelines?.company?.name ?? 'the advertiser';
    const tone = guidelines?.voice?.tone ?? 'professional';
    const keywords = (guidelines?.voice?.keyWords ?? []).slice(0, 4).join(', ');
    const colors = Object.values(guidelines?.visualIdentity?.primaryColors ?? {}).slice(0, 3).join(' / ');
    const placement = campaign.platform === 'meta_ads' ? 'social feed advertisement, square composition' : 'landing page hero, editorial quality';

    return `Commercial advertising image for ${brand}. Objective: ${campaign.objective}. Audience: ${campaign.audience ?? 'broad'}. Style: ${tone}, premium, no text overlays. Themes: ${keywords}. Brand palette: ${colors || 'neutral modern'}. Format: ${placement}. Photorealistic, high detail, studio lighting.`;
  }
}
