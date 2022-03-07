import * as appInsights from "applicationinsights";
import appsConfig from "../config";

appInsights
  .setup(appsConfig.logging.application_insights_key)
  .setAutoDependencyCorrelation(true)
  .setAutoCollectRequests(true)
  .setAutoCollectPerformance(true, true)
  .setAutoCollectExceptions(true)
  .setAutoCollectDependencies(true)
  .setAutoCollectConsole(true, true)
  .setUseDiskRetryCaching(true)
  .setSendLiveMetrics(true)
  .setDistributedTracingMode(appInsights.DistributedTracingModes.AI);

const appInsightsClient = appInsights.defaultClient;

appInsightsClient.context.tags[appInsightsClient.context.keys.cloudRole] =
  appsConfig.logging.application_insights_role;

appInsights.start();

export { appInsights, appInsightsClient };
