import axios from 'axios';
import config from '../config.js';
import logger from '../utils/logger.js';

const metaAPI = axios.create({
  baseURL: `https://graph.facebook.com/${config.meta.apiVersion}`,
  timeout: 10000,
});

export async function getInsights(campaignId, datePreset = 'last_7d') {
  try {
    const response = await metaAPI.get(`/${campaignId}/insights`, {
      params: {
        fields: 'impressions,clicks,spend,ctr,cpc,actions,conversions',
        date_preset: datePreset,
        time_increment: 1,
        access_token: config.meta.accessToken,
      },
    });
    return response.data.data || [];
  } catch (error) {
    logger.error('Failed to fetch Meta insights', error);
    throw error;
  }
}

export const campaigns = {
  create: async (campaignData) => {
    try {
      const response = await metaAPI.post(
        `/${config.meta.adAccountId}/campaigns`,
        {
          name: campaignData.name,
          objective: campaignData.objective || 'REACH',
          status: 'PAUSED',
          daily_budget: campaignData.daily_budget_cents,
          access_token: config.meta.accessToken,
        }
      );
      return response.data;
    } catch (error) {
      logger.error('Failed to create Meta campaign', error);
      throw error;
    }
  },

  getMetrics: async (campaignId) => {
    try {
      const response = await metaAPI.get(`/${campaignId}`, {
        params: {
          fields: 'name,status,daily_budget,spent,impressions,spend',
          access_token: config.meta.accessToken,
        },
      });
      return response.data;
    } catch (error) {
      logger.error('Failed to fetch Meta campaign metrics', error);
      throw error;
    }
  },

  updateBudget: async (campaignId, newBudget) => {
    try {
      const response = await metaAPI.post(`/${campaignId}`, {
        daily_budget: newBudget * 100, // Convert to cents
        access_token: config.meta.accessToken,
      });
      return response.data;
    } catch (error) {
      logger.error('Failed to update Meta campaign budget', error);
      throw error;
    }
  },

  pause: async (campaignId) => {
    try {
      const response = await metaAPI.post(`/${campaignId}`, {
        status: 'PAUSED',
        access_token: config.meta.accessToken,
      });
      return response.data;
    } catch (error) {
      logger.error('Failed to pause Meta campaign', error);
      throw error;
    }
  },
};

export const adSets = {
  create: async (adSetData) => {
    try {
      const response = await metaAPI.post(
        `/${config.meta.adAccountId}/adsets`,
        {
          name: adSetData.name,
          campaign_id: adSetData.campaignId,
          daily_budget: adSetData.dailyBudget * 100, // Convert to cents
          billing_event: 'IMPRESSIONS',
          optimization_goal: adSetData.optimizationGoal || 'REACH',
          status: 'PAUSED',
          targeting: adSetData.targeting || {},
          access_token: config.meta.accessToken,
        }
      );
      return response.data;
    } catch (error) {
      logger.error('Failed to create Meta ad set', error);
      throw error;
    }
  },

  launch: async (adSetId) => {
    try {
      const response = await metaAPI.post(`/${adSetId}`, {
        status: 'ACTIVE',
        access_token: config.meta.accessToken,
      });
      return response.data;
    } catch (error) {
      logger.error('Failed to launch Meta ad set', error);
      throw error;
    }
  },

  getMetrics: async (adSetId) => {
    try {
      const response = await metaAPI.get(`/${adSetId}/insights`, {
        params: {
          fields: 'impressions,spend,ctr,cpp,cpc,actions',
          access_token: config.meta.accessToken,
        },
      });
      return response.data.data;
    } catch (error) {
      logger.error('Failed to fetch Meta ad set metrics', error);
      throw error;
    }
  },
};

export const ads = {
  create: async (adData) => {
    try {
      const response = await metaAPI.post(
        `/${config.meta.adAccountId}/ads`,
        {
          name: adData.name,
          adset_id: adData.adSetId,
          creative: adData.creative,
          status: 'PAUSED',
          access_token: config.meta.accessToken,
        }
      );
      return response.data;
    } catch (error) {
      logger.error('Failed to create Meta ad', error);
      throw error;
    }
  },

  launch: async (adId) => {
    try {
      const response = await metaAPI.post(`/${adId}`, {
        status: 'ACTIVE',
        access_token: config.meta.accessToken,
      });
      return response.data;
    } catch (error) {
      logger.error('Failed to launch Meta ad', error);
      throw error;
    }
  },

  getPerformance: async (adId) => {
    try {
      const response = await metaAPI.get(`/${adId}/insights`, {
        params: {
          fields: 'impressions,spend,cpc,ctr,actions_breakdown,action_values',
          access_token: config.meta.accessToken,
        },
      });
      return response.data.data[0];
    } catch (error) {
      logger.error('Failed to fetch Meta ad performance', error);
      throw error;
    }
  },
};

export const pixel = {
  trackEvent: async (pixelId, eventData) => {
    try {
      const response = await metaAPI.post(`/${pixelId}/events`, {
        data: [
          {
            event_name: eventData.eventName,
            event_time: Math.floor(Date.now() / 1000),
            user_data: eventData.userData || {},
            custom_data: eventData.customData || {},
          },
        ],
        access_token: config.meta.accessToken,
      });
      return response.data;
    } catch (error) {
      logger.error('Failed to track pixel event', error);
      throw error;
    }
  },
};

export default metaAPI;
