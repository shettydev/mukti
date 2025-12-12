#!/usr/bin/env bun
/**
 * Script to trigger a Dokploy deployment and poll for its status,
 * updating GitHub Deployment status along the way.
 *
 * Usage:
 *   bun scripts/deploy-dokploy.ts <application-id>
 *
 * Environment Variables required:
 *   DOKPLOY_API_URL
 *   DOKPLOY_API_KEY
 *   GITHUB_TOKEN
 *   GITHUB_REPOSITORY (automatically set by Actions)
 *   GITHUB_SHA (automatically set by Actions)
 */

const DOKPLOY_API_URL = process.env.DOKPLOY_API_URL;
const DOKPLOY_API_KEY = process.env.DOKPLOY_API_KEY;
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const REPO = process.env.GITHUB_REPOSITORY; // e.g., "owner/repo"
const SHA = process.env.GITHUB_SHA;

const APP_ID = process.argv[2];
const PROJECT_NAME = process.argv[3] || 'app';

if (!DOKPLOY_API_URL || !DOKPLOY_API_KEY || !APP_ID || !GITHUB_TOKEN || !REPO || !SHA) {
  console.error('Missing required environment variables or arguments.');
  console.error('Usage: bun scripts/deploy-dokploy.ts <application-id> <project-name>');
  console.error('Required ENV: DOKPLOY_API_URL, DOKPLOY_API_KEY, GITHUB_TOKEN');
  process.exit(1);
}

const headers = {
  Authorization: `Bearer ${DOKPLOY_API_KEY}`,
  'Content-Type': 'application/json',
  'x-api-key': DOKPLOY_API_KEY,
};

async function githubRequest(method: string, path: string, body?: any) {
  const response = await fetch(`https://api.github.com/repos/${REPO}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      Accept: 'application/vnd.github.ant-man-preview+json',
      'Content-Type': 'application/json',
      'User-Agent': 'bun-script',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    console.error(`GitHub API Error: ${response.status} ${response.statusText}`);
    console.error(await response.text());
    // Don't throw, just log, so deployment can continue even if status update fails
    return null;
  }
  return response.json();
}

async function createGitHubDeployment() {
  console.log('Creating GitHub Deployment...');
  return githubRequest('POST', '/deployments', {
    ref: SHA,
    environment: `production-${PROJECT_NAME}`,
    required_contexts: [], // Bypass status checks for the deployment itself
    auto_merge: false,
    description: `Deploying ${PROJECT_NAME} via Dokploy`,
  });
}

async function updateGitHubDeploymentStatus(
  deploymentId: number,
  state: 'pending' | 'in_progress' | 'success' | 'failure' | 'error',
  description?: string
) {
  console.log(`Updating GitHub Deployment status to: ${state}`);
  await githubRequest('POST', `/deployments/${deploymentId}/statuses`, {
    state,
    description,
    log_url: `${DOKPLOY_API_URL}/dashboard/project/application/${APP_ID}/deployments`, // Link to Dokploy dashboard if possible
  });
}

async function triggerDokployDeployment() {
  console.log('Triggering Dokploy deployment...');
  const res = await fetch(`${DOKPLOY_API_URL}/api/application.deploy`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ applicationId: APP_ID }),
  });

  if (!res.ok) {
    throw new Error(`Failed to trigger deployment: ${res.status} ${await res.text()}`);
  }
  console.log('Deployment triggered successfully.');
}

async function getLatestDeployment() {
  const res = await fetch(`${DOKPLOY_API_URL}/api/deployment.all?applicationId=${APP_ID}`, {
    method: 'GET',
    headers,
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch deployments: ${res.status} ${await res.text()}`);
  }

  const deployments: any[] = await res.json();
  // Sort by createdAt descending
  return deployments.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )[0];
}

async function pollDeploymentStatus(ghDeploymentId: number) {
  console.log('Waiting for deployment to appear in list...');
  // Give it a moment to appear
  await new Promise((r) => setTimeout(r, 5000));

  let deployment = await getLatestDeployment();
  if (!deployment) {
    throw new Error('No deployment found after triggering.');
  }

  console.log(`Tracking deployment ID: ${deployment.deploymentId}`);
  await updateGitHubDeploymentStatus(
    ghDeploymentId,
    'in_progress',
    'Deployment started in Dokploy'
  );

  const maxRetries = 60; // 5 minutes approx (60 * 5s)
  let retries = 0;

  while (retries < maxRetries) {
    deployment = await getLatestDeployment();
    const status = deployment.status; // 'running', 'done', 'error', 'queued'

    console.log(`Deployment status: ${status}`);

    if (status === 'done') {
      await updateGitHubDeploymentStatus(
        ghDeploymentId,
        'success',
        'Deployment completed successfully'
      );
      console.log('Deployment success!');
      return;
    } else if (status === 'error') {
      await updateGitHubDeploymentStatus(ghDeploymentId, 'failure', 'Deployment failed in Dokploy');
      throw new Error('Deployment failed.');
    }

    // Wait 5 seconds
    await new Promise((r) => setTimeout(r, 5000));
    retries++;
  }

  await updateGitHubDeploymentStatus(ghDeploymentId, 'failure', 'Deployment timed out');
  throw new Error('Deployment timed out.');
}

async function main() {
  let ghDeployment;
  try {
    ghDeployment = await createGitHubDeployment();
    if (!ghDeployment) {
      console.error('Failed to create GitHub deployment object. Exiting.');
      process.exit(1);
    }

    await triggerDokployDeployment();
    await pollDeploymentStatus(ghDeployment.id);
  } catch (error) {
    console.error(error);
    if (ghDeployment) {
      await updateGitHubDeploymentStatus(ghDeployment.id, 'failure', 'Script error occurred');
    }
    process.exit(1);
  }
}

main();
