import { parsedEnv } from "../env";
import { logger } from "../logger";
import { catalogueService } from "./catalogue.service";

export function startCatalogueScheduler() {
  if (parsedEnv.NODE_ENV === "test") return;

  const job = Bun.cron(parsedEnv.METAVAULT_CATALOGUE_REFRESH_CRON, async () => {
    const result = await catalogueService.refreshAll();
    if (!result.ok) {
      logger.warn(
        { error: result.error },
        "Scheduled catalogue refresh failed"
      );
    }
  });

  job.unref();
}
