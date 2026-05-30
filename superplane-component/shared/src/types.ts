/** Container to migrate — step 1 output item / step 2 input item */
export interface MigrationServiceTarget {
  containerName: string;
  image: string;
  imageTag?: string;
  cloudRunServiceName: string;
}

/** Step 1 (list-ecs-tasks) output → step 2 (deploy-to-gcp) input */
export interface ListEcsTasksOutput {
  services: MigrationServiceTarget[];
}

export interface DeployToGcpInput {
  services?: MigrationServiceTarget[];
  gcpProjectId?: string;
  gcpRegion?: string;
  /** Skip gateway/nginx — deploy app microservices only */
  skipContainers?: string[];
}

/** Step 2 (deploy-to-gcp) output → step 3 (get-cloudrun-status) input */
export interface DeployToGcpOutput {
  gcpProjectId: string;
  gcpRegion: string;
  serviceNames: string[];
}

export interface CloudRunServiceStatus {
  name: string;
  uri?: string;
  latestRevision?: string;
  conditions?: Array<{ type: string; state: string; message?: string }>;
  traffic?: Array<{ revision: string; percent: number }>;
}

/** Step 3 (get-cloudrun-status) input (also accepts deploy output directly) */
export interface GetCloudRunStatusInput {
  gcpProjectId?: string;
  gcpRegion?: string;
  serviceNames?: string[];
}

/** Step 3 (get-cloudrun-status) output */
export interface GetCloudRunStatusOutput {
  gcpProjectId: string;
  gcpRegion: string;
  services: CloudRunServiceStatus[];
}
