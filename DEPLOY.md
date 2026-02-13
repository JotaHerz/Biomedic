# Deploying Biomedics to Vercel

This guide explains how to deploy your Biomedics application to Vercel.

## Prerequisites

- A [Vercel account](https://vercel.com/signup).
- Your project code pushed to a Git repository (GitHub, GitLab, or Bitbucket) OR the Vercel CLI installed.

## Deployment Steps

1.  **Import Project in Vercel**:
    - Go to your Vercel Dashboard.
    - Click **"Add New..."** -> **"Project"**.
    - Import your Git repository containing the Biomedics code.

2.  **Configure Project**:
    - **Framework Preset**: Vercel should automatically detect **Vite**. If not, select it manually.
    - **Root Directory**: Ensure this is set to `./` (or wherever your `package.json` is located).

3.  **Environment Variables (Critical)**:
    - Expand the **"Environment Variables"** section.
    - Add the following variable:
        - **Key**: `GEMINI_API_KEY`
        - **Value**: Your actual Gemini API key (starts with `AIza...`).

4.  **Deploy**:
    - Click **"Deploy"**.
    - Vercel will build your application.

## Troubleshooting

-   **API Keys**: If the AI features don't work, verify that you added the `GEMINI_API_KEY` correctly in the Vercel project settings and that the key is valid. Redeploy after changing environment variables.
-   **Routing**: The included `vercel.json` handles routing for Single Page Applications (SPA), so refreshing on a specific route should work correctly.
