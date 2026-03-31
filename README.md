# Health Tracker App Deployment to Netlify

This application is ready to be deployed to Netlify.

## Deployment Steps

1.  **Connect to GitHub/GitLab/Bitbucket:**
    -   Push your code to a repository.
    -   In the Netlify dashboard, click **"Add new site"** and select **"Import an existing project"**.
    -   Connect your repository.

2.  **Configure Build Settings:**
    -   **Build Command:** `npm run build`
    -   **Publish Directory:** `dist`
    -   Netlify should detect these automatically from the `netlify.toml` file.

3.  **Set Environment Variables:**
    -   Go to **Site settings > Environment variables**.
    -   Add the following variable:
        -   `GEMINI_API_KEY`: Your Google Gemini API key.

4.  **Firebase Configuration:**
    -   The application currently uses `firebase-applet-config.json` for Firebase configuration.
    -   Ensure this file is committed to your repository if you want to use the same Firebase project.
    -   Alternatively, you can modify `src/firebase.ts` to use environment variables for better security.

## Features Included for Netlify

-   **`netlify.toml`**: Configures the build command and publish directory.
-   **`public/_redirects`**: Handles Single Page Application (SPA) routing, ensuring that all requests are redirected to `index.html` so React Router can handle them.
-   **Vite Configuration**: Already set up to inject `GEMINI_API_KEY` into the build.

## Local Development

To run the app locally:

```bash
npm install
npm run dev
```
