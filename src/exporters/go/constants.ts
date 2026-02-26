export const GO_BASE_IMPORT = "github.com/elastic/go-elasticsearch/v9";

export const UNSUPPORTED_APIS = new RegExp("^_internal.*$");

export const NUMERIC_TYPES = new Set([
  "integer",
  "long",
  "float",
  "double",
  "number",
  "uint",
  "short",
  "byte",
  "ulong",
]);

export const STRING_ALIAS_TYPES = new Set([
  "Id",
  "IndexName",
  "Name",
  "Field",
  "Routing",
  "NodeId",
  "ScrollId",
  "IndexAlias",
  "TaskId",
  "Namespace",
  "NodeName",
  "Percentage",
  "Duration",
  "DurationLarge",
  "TimeUnit",
  "EpochTime",
  "DateTime",
  "DateString",
  "DateMath",
  "MinimumShouldMatch",
  "VersionString",
  "PipelineName",
  "DataStreamName",
  "Ip",
  "Host",
  "Password",
  "Username",
  "Metadata",
  "Uri",
  "Uuid",
  "SequenceNumber",
  "ByteSize",
  "HumanReadableByteCount",
  "WaitForActiveShards",
  "Fuzziness",
  "MultiTermQueryRewrite",
  "GeoHash",
  "GeoTilePrecision",
  "Script",
  "ScriptLanguage",
]);

/**
 * Naming collision map kept in sync with duplicatesNameList in
 * elastic-client-generator-go/src/pkg/mapping/duplicates.go
 */
export const GO_TYPE_RENAMES: Record<string, Record<string, string>> = {
  "snapshot.repository_analyze": {
    NodeInfo: "SnapshotRepositoryAnalyzeNodeInfo",
  },
  "_types.query_dsl": {
    QueryContainer: "Query",
    FunctionScoreContainer: "FunctionScore",
    IntervalsContainer: "Intervals",
  },
  "_types.aggregations": {
    AggregationContainer: "Aggregations",
    BucketsQueryContainer: "BucketsQuery",
  },
  "_global.get_script_context": {
    Context: "GetScriptContext",
  },
  "_global.knn_search._types": {
    Query: "CoreKnnQuery",
  },
  "_global.mget": {
    Operation: "MgetOperation",
    ResponseItem: "MgetResponseItem",
  },
  "_global.msearch": {
    RequestItem: "MsearchRequestItem",
    ResponseItem: "MsearchResponseItem",
  },
  "_global.mtermvectors": {
    Operation: "MTermVectorsOperation",
  },
  "_global.reindex": {
    Destination: "ReindexDestination",
    Source: "ReindexSource",
  },
  "_global.termvectors": {
    Filter: "TermVectorsFilter",
    Token: "TermVectorsToken",
  },
  "cat.component_templates": {
    ComponentTemplate: "CatComponentTemplate",
  },
  "ccr._types": {
    ShardStats: "CcrShardStats",
  },
  "cluster._types": {
    ComponentTemplate: "ClusterComponentTemplate",
  },
  "cluster.stats": {
    IndexingPressure: "ClusterIndexingPressure",
    IndexingPressureMemory: "ClusterPressureMemory",
    RuntimeFieldTypes: "ClusterRuntimeFieldTypes",
  },
  "enrich._types": {
    Policy: "EnrichPolicy",
  },
  "features._types": {
    Feature: "Feature",
  },
  "ilm._types": {
    Policy: "IlmPolicy",
    Actions: "IlmActions",
  },
  "indices._types": {
    IndexingPressure: "IndicesIndexingPressure",
    IndexingPressureMemory: "IndicesIndexingPressureMemory",
  },
  "indices.field_usage_stats": {
    ShardsStats: "IndicesShardsStats",
  },
  "indices.modify_data_stream": {
    Action: "IndicesModifyAction",
  },
  "indices.stats": {
    ShardStats: "IndicesShardStats",
  },
  "indices.update_aliases": {
    Action: "IndicesAction",
  },
  "ingest._types": {
    Pipeline: "IngestPipeline",
  },
  "ingest.simulate": {
    Ingest: "SimulateIngest",
  },
  "ingest.get_geoip_database": {
    DatabaseConfigurationMetadata: "GeoipDatabaseConfigurationMetadata",
  },
  "ingest.get_ip_location_database": {
    DatabaseConfigurationMetadata: "IpLocationDatabaseConfigurationMetadata",
  },
  "logstash._types": {
    Pipeline: "LogstashPipeline",
  },
  "migration.get_feature_upgrade_status": {
    MigrationFeature: "GetMigrationFeature",
  },
  "migration.post_feature_upgrade": {
    MigrationFeature: "PostMigrationFeature",
  },
  "ml._types": {
    Datafeed: "MLDatafeed",
    Filter: "MLFilter",
  },
  "ml.evaluate_data_frame": {
    ResponseBody: "MLEvaluateDataFrameResponseBody",
  },
  "nodes._types": {
    Context: "NodesContext",
    IndexingPressure: "NodesIndexingPressure",
    IndexingPressureMemory: "NodesIndexingPressureMemory",
    Ingest: "NodesIngest",
  },
  "security._types": {
    Realm: "SecurityRealm",
    RoleMapping: "SecurityRoleMapping",
  },
  "security.authenticate": {
    Token: "AuthenticateToken",
  },
  "security.create_service_token": {
    Token: "ServiceToken",
  },
  "security.enroll_kibana": {
    Token: "KibanaToken",
  },
  "security.put_privileges": {
    Actions: "PrivilegesActions",
  },
  "slm._types": {
    Policy: "SLMPolicy",
  },
  "snapshot._types": {
    ShardsStats: "SnapshotShardsStats",
  },
  "transform._types": {
    Destination: "TransformDestination",
    Source: "TransformSource",
  },
  "watcher._types": {
    Action: "WatcherAction",
    Actions: "WatcherStatusActions",
    ConditionContainer: "WatcherCondition",
    InputContainer: "WatcherInput",
  },
  "xpack.info": {
    Feature: "XpackFeature",
    Features: "XpackFeatures",
  },
  "xpack.usage": {
    Datafeed: "XpackDatafeed",
    Query: "XpackQuery",
    Realm: "XpackRealm",
    RoleMapping: "XpackRoleMapping",
    RuntimeFieldTypes: "XpackRuntimeFieldTypes",
    Phase: "UsagePhase",
    Phases: "UsagePhases",
  },
};
