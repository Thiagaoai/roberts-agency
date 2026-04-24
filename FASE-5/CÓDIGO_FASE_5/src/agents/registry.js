import { CopywriterAgent } from './copywriter.js';
import { SupervisorAgent } from './supervisor.js';
import { MetaAdsAgent } from './meta-ads-agent.js';
import { ImageCreatorAgent } from './image-creator.js';
import { GoogleAdsAgent } from './google-ads-agent.js';
import { AnalyticsAgent } from './analytics-agent.js';
import {
  StrategistAgent,
  VideoCreatorAgent,
  SeoAgent,
  DeveloperAgent,
  CmoAgent,
} from './stubs.js';

export async function registerAgents() {
  return {
    cmo: new CmoAgent(),
    strategist: new StrategistAgent(),
    copywriter: new CopywriterAgent(),
    imageCreator: new ImageCreatorAgent(),
    videoCreator: new VideoCreatorAgent(),
    googleAdsAgent: new GoogleAdsAgent(),
    metaAdsAgent: new MetaAdsAgent(),
    seoAgent: new SeoAgent(),
    analyticsAgent: new AnalyticsAgent(),
    supervisor: new SupervisorAgent(),
    developerAgent: new DeveloperAgent(),
  };
}
