# OpenRouter React Chat

A beautiful ReactJS chat application using Bootstrap to interact with OpenRouter models.

## Features
- Modern Bootstrap UI
- Model selection (DeepSeek R1T Chimera Free, OpenRouter Auto)
- Code block formatting and copy button
- Responsive and mobile-friendly

## Usage
1. Install dependencies:
   ```
   npm install
   ```
2. Start the app:
   ```
   npm start
   ```
3. The app runs on `http://localhost:3000` by default.

## Deployment
This project is configured for automatic deployment to Cloudflare Pages via GitHub Actions.

### Setup
1. Create a Cloudflare Pages project connected to this GitHub repository.
2. In your GitHub repository settings, add the following secrets:
   - `CLOUDFLARE_API_TOKEN`: Your Cloudflare API token with Pages edit permissions.
   - `CLOUDFLARE_ACCOUNT_ID`: Your Cloudflare account ID.
3. Update the `projectName` in `.github/workflows/deploy.yml` to match your Cloudflare Pages project name.
4. Push changes to the `main` branch to trigger deployment.

## API
- The app expects the backend chat API at `http://localhost:3000/chat`.
- You can change the endpoint in `src/App.js` if needed.

## Customization
- Edit `src/App.js` for UI or logic changes.
- Uses Bootstrap 5 for styling.

---
