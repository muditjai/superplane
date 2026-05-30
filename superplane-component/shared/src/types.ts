export interface EcsContainerSummary {
  name: string;
  image: string;
  lastStatus: string;
  healthStatus?: string;
}

export interface EcsTaskSummary {
  taskArn: string;
  taskDefinitionArn: string;
  lastStatus: string;
  startedAt?: string;
  containers: EcsContainerSummary[];
}

/** Output of list-ecs-tasks — input to deploy-to-gcp */
export interface MigrationServiceTarget {
  containerName: string;
  image: string;
  ecrRepository?: string;
  imageTag?: string;
  /** Suggested Cloud Run service name (kebab-case) */
  cloudRunServiceName: string;
}

export interface ListEcsTasksOutput {
  cluster: string;
  region: string;
  taskCount: number;
  tasks: EcsTaskSummary[];
  services: MigrationServiceTarget[];
}

export interface DeployToGcpInput {
  /** Full output from list-ecs-tasks, or pass services directly */
  listResult?: ListEcsTasksOutput;
  services?: MigrationServiceTarget[];
  gcpProjectId?: string;
  gcpRegion?: string;
  /** Skip gateway/nginx — deploy app microservices only */
  skipContainers?: string[];
}

export interface GcpDeploymentResult {
  containerName: string;
  cloudRunService: string;
  image: string;
  status: 'deployed' | 'failed' | 'skipped';
  message?: string;
  url?: string;
  revision?: string;
}

export interface DeployToGcpOutput {
  gcpProjectId: string;
  gcpRegion: string;
  deployments: GcpDeploymentResult[];
}

export interface CloudRunServiceStatus {
  name: string;
  uri?: string;
  latestRevision?: string;
  conditions?: Array<{ type: string; state: string; message?: string }>;
  traffic?: Array<{ revision: string; percent: number }>;
}

export interface GetCloudRunStatusInput {
  gcpProjectId?: string;
  gcpRegion?: string;
  /** If omitted, lists all services in the region */
  serviceNames?: string[];
}

export interface GetCloudRunStatusOutput {
  gcpProjectId: string;
  gcpRegion: string;
  services: CloudRunServiceStatus[];
}
