// Import shared schemas
import { errorSchema, messageSchema, statusSchema, statusCodeSchema, successResponseSchema } from './sharedSchemas';

// Import all tool schemas
import { inventoryAggregationSchema } from './inventoryAggregationSchema';
import { healthCheckSchema } from './healthCheckSchema';
import { catalogObjectsSchema } from './catalogObjectsSchema';
import { objectDetailsSchema } from './objectDetailsSchema';
import { catalogTagsSchema } from './catalogTagsSchema';
import { catalogRulesSchema } from './catalogRulesSchema';
import { catalogCountSchema } from './catalogCountSchema';
import { lineageTreeSchema } from './lineageTreeSchema';
import { securityCasesSchema } from './securityCasesSchema';
import { securityTrendsSchema } from './securityTrendsSchema';
import { casesGroupByPolicySchema } from './casesGroupByPolicySchema';
import { dataCategoriesSchema } from './dataCategoriesSchema';
import { sensitivityConfigsSchema } from './sensitivityConfigsSchema';
import { sensitivityConfigByIdSchema } from './sensitivityConfigByIdSchema';
import { totalClassificationRatiosSchema } from './totalClassificationRatiosSchema';
import { classificationRatioByNameSchema } from './classificationRatioByNameSchema';
import { classificationRatioByIdSchema } from './classificationRatioByIdSchema';
import { policiesSchema } from './policiesSchema';
import { dashboardWidgetSchema } from './dashboardWidgetSchema';
import { aciDataManagerSchema } from './aciDataManagerSchema';
import { aciDataManagerPermissionsSchema } from './aciDataManagerPermissionsSchema';
import { aciGroupsSchema } from './aciGroupsSchema';
import { aciUsersSchema } from './aciUsersSchema';
import { locationsSchema } from './locationsSchema';
import { metadataQuickSearchSchema } from './metadataQuickSearchSchema';
import { metadataFullSearchSchema } from './metadataFullSearchSchema';
import { metadataObjectsSearchSchema } from './metadataObjectsSearchSchema';
import { metadataObjectsCountSchema } from './metadataObjectsCountSchema';

// Re-export shared schemas
export { errorSchema, messageSchema, statusSchema, statusCodeSchema, successResponseSchema } from './sharedSchemas';

// Re-export all tool schemas
export { inventoryAggregationSchema } from './inventoryAggregationSchema';
export { healthCheckSchema } from './healthCheckSchema';
export { catalogObjectsSchema } from './catalogObjectsSchema';
export { objectDetailsSchema } from './objectDetailsSchema';
export { catalogTagsSchema } from './catalogTagsSchema';
export { catalogRulesSchema } from './catalogRulesSchema';
export { catalogCountSchema } from './catalogCountSchema';
export { lineageTreeSchema } from './lineageTreeSchema';
export { securityCasesSchema } from './securityCasesSchema';
export { securityTrendsSchema } from './securityTrendsSchema';
export { casesGroupByPolicySchema } from './casesGroupByPolicySchema';
export { dataCategoriesSchema } from './dataCategoriesSchema';
export { sensitivityConfigsSchema } from './sensitivityConfigsSchema';
export { sensitivityConfigByIdSchema } from './sensitivityConfigByIdSchema';
export { totalClassificationRatiosSchema } from './totalClassificationRatiosSchema';
export { classificationRatioByNameSchema } from './classificationRatioByNameSchema';
export { classificationRatioByIdSchema } from './classificationRatioByIdSchema';
export { policiesSchema } from './policiesSchema';
export { dashboardWidgetSchema } from './dashboardWidgetSchema';
export { aciDataManagerSchema } from './aciDataManagerSchema';
export { aciDataManagerPermissionsSchema } from './aciDataManagerPermissionsSchema';
export { aciGroupsSchema } from './aciGroupsSchema';
export { aciUsersSchema } from './aciUsersSchema';
export { locationsSchema } from './locationsSchema';
export { metadataQuickSearchSchema } from './metadataQuickSearchSchema';
export { metadataFullSearchSchema } from './metadataFullSearchSchema';
export { metadataObjectsSearchSchema } from './metadataObjectsSearchSchema';
export { metadataObjectsCountSchema } from './metadataObjectsCountSchema';

// Export all schemas as an array for easy registration
export const allSchemas = [
  inventoryAggregationSchema,
  healthCheckSchema,
  catalogObjectsSchema,
  objectDetailsSchema,
  catalogTagsSchema,
  catalogRulesSchema,
  catalogCountSchema,
  lineageTreeSchema,
  securityCasesSchema,
  securityTrendsSchema,
  casesGroupByPolicySchema,
  dataCategoriesSchema,
  sensitivityConfigsSchema,
  sensitivityConfigByIdSchema,
  totalClassificationRatiosSchema,
  classificationRatioByNameSchema,
  classificationRatioByIdSchema,
  policiesSchema,
  dashboardWidgetSchema,
  aciDataManagerSchema,
  aciDataManagerPermissionsSchema,
  aciGroupsSchema,
  aciUsersSchema,
  locationsSchema,
  metadataQuickSearchSchema,
  metadataFullSearchSchema,
  metadataObjectsSearchSchema,
  metadataObjectsCountSchema,
]; 