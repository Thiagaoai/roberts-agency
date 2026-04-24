import { BaseAgent } from './base-agent.js';
import logger from '../utils/logger.js';

class StubAgent extends BaseAgent {
  async execute() {
    logger.info({ agent: this.name }, 'agent.stub.noop');
    return { stub: true };
  }
}

export class StrategistAgent extends StubAgent { constructor() { super('strategist'); } }
export class VideoCreatorAgent extends StubAgent { constructor() { super('videoCreator'); } }
export class SeoAgent extends StubAgent { constructor() { super('seoAgent'); } }
export class DeveloperAgent extends StubAgent { constructor() { super('developerAgent'); } }
export class CmoAgent extends StubAgent { constructor() { super('cmo'); } }
