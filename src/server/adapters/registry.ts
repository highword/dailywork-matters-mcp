import type { DataSourceAdapter, DateRange, NormalizedEvent } from '../../shared/types.js';
import { logger } from '../logger.js';

export class AdapterRegistry {
  private adapters: DataSourceAdapter[] = [];

  register(adapter: DataSourceAdapter): void {
    this.adapters.push(adapter);
    logger.info({ adapter: adapter.name }, 'Adapter registered');
  }

  async getAvailable(): Promise<DataSourceAdapter[]> {
    const checks = await Promise.all(
      this.adapters.map(async (a) => ({
        adapter: a,
        available: await a.isAvailable(),
      })),
    );
    return checks.filter((c) => c.available).map((c) => c.adapter);
  }

  async *gatherEvents(range: DateRange): AsyncGenerator<NormalizedEvent> {
    const available = await this.getAvailable();
    for (const adapter of available) {
      try {
        for await (const event of adapter.getEvents(range)) {
          yield event;
        }
      } catch (err) {
        logger.warn({ adapter: adapter.name, err }, 'Adapter failed, skipping');
      }
    }
  }
}
