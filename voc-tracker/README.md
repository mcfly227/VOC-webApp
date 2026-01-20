# VOC Emissions Tracker - Azure Static Web Apps Deployment

A React-based VOC emissions tracking application configured for deployment to Azure Static Web Apps with SharePoint integration for data storage.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Azure Static Web Apps                      │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │                   React Application                      │ │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐  │ │
│  │  │   MSAL.js   │  │  VOCTracker │  │  SharePoint     │  │ │
│  │  │   Auth      │  │  Component  │  │  Service        │  │ │
│  │  └──────┬──────┘  └──────┬──────┘  └────────┬────────┘  │ │
│  └─────────┼────────────────┼──────────────────┼───────────┘ │
└────────────┼────────────────┼──────────────────┼─────────────┘
             │                │                  │
             ▼                │                  ▼
┌────────────────────┐        │       ┌──────────────────────┐
│   Azure AD /       │        │       │   SharePoint Online  │
│   Entra ID         │        │       │   ┌────────────────┐ │
│                    │        │       │   │ VOC_Products   │ │
│   Authentication   │        │       │   │ VOC_UsageLog   │ │
│   & Authorization  │        │       │   │ VOC_EmissionU. │ │
└────────────────────┘        │       │   └────────────────┘ │
                              │       └──────────────────────┘
                              ▼
                    ┌──────────────────┐
                    │  Microsoft Graph │
                    │       API        │
                    └──────────────────┘
```

## Prerequisites

- Node.js 18+ and npm
- Azure subscription
- Microsoft 365 tenant with SharePoint Online
- Azure AD admin access (or request from admin)

## Quick Start

### 1. Clone and Install

```bash
cd voc-tracker
npm install
```

### 2. Configure Azure AD App Registration

1. Go to [Azure Portal](https://portal.azure.com) → Azure Active Directory → App registrations
2. Click **New registration**
3. Configure:
   - Name: `VOC Emissions Tracker`
   - Supported account types: `Accounts in this organizational directory only`
   - Redirect URI: `Single-page application (SPA)` → `http://localhost:3000`
4. After creation, note the **Application (client) ID** and **Directory (tenant) ID**
5. Go to **API permissions** → Add:
   - `Microsoft Graph` → `Delegated` → `User.Read`
   - `Microsoft Graph` → `Delegated` → `Sites.Read.All`
   - `Microsoft Graph` → `Delegated` → `Sites.ReadWrite.All`
6. Click **Grant admin consent** (requires admin)

### 3. Update Configuration

Edit `src/config/authConfig.js`:

```javascript
export const msalConfig = {
  auth: {
    clientId: "YOUR_CLIENT_ID_HERE",           // From step 2.4
    authority: "https://login.microsoftonline.com/YOUR_TENANT_ID_HERE",
    redirectUri: window.location.origin,
  },
  // ...
};

export const sharePointConfig = {
  siteUrl: "https://YOUR_TENANT.sharepoint.com/sites/YOUR_SITE",
  lists: {
    products: "VOC_Products",
    usageLog: "VOC_UsageLog",
    emissionUnits: "VOC_EmissionUnits",
  },
};
```

### 4. Create SharePoint Lists

Create these lists in your SharePoint site:

#### VOC_Products List

| Column Name | Type | Settings |
|-------------|------|----------|
| Title | Single line of text | Product ID |
| ProductName | Single line of text | Required |
| ProductNumber | Single line of text | |
| Supplier | Single line of text | |
| Category | Choice | Basecoat, Hardener, Clearcoat, Solvent |
| ProductType | Choice | automotive, non-automotive |
| SpecificGravity | Number | 3 decimal places |
| VOC_LbsGal | Number | 2 decimal places |
| HAP_Percent | Number | 4 decimal places |
| DibasicEster_Percent | Number | 4 decimal places |
| Ethylbenzene_Percent | Number | 4 decimal places |
| Cumene_Percent | Number | 4 decimal places |

#### VOC_UsageLog List

| Column Name | Type | Settings |
|-------------|------|----------|
| Title | Single line of text | Auto ID |
| UsageDate | Date and Time | Date Only |
| ProductID | Lookup | To VOC_Products |
| EmissionUnit | Choice | EU-Coating Line-01, EU-Coating Line-02, EU-Coating Line-03 |
| Gallons | Number | 2 decimal places |
| VOC_Lbs | Number | 2 decimal places |
| HAP_Lbs | Number | 4 decimal places |
| Cumene_Lbs | Number | 4 decimal places |
| DibasicEster_Lbs | Number | 4 decimal places |
| Ethylbenzene_Lbs | Number | 4 decimal places |
| Category | Single line of text | |
| ProductType | Single line of text | |

#### VOC_EmissionUnits List

| Column Name | Type | Settings |
|-------------|------|----------|
| Title | Single line of text | Unit ID |
| UnitName | Single line of text | |
| Description | Multiple lines of text | |
| IsActive | Yes/No | Default: Yes |

### 5. Run Locally

```bash
npm start
```

The app will open at `http://localhost:3000`. Sign in with your Microsoft account and click "Connect SharePoint" to load data.

## Deployment to Azure Static Web Apps

### Option A: GitHub Actions (Recommended)

1. Push code to GitHub repository

2. In Azure Portal, create a Static Web App:
   - Search for "Static Web Apps" → Create
   - Link to your GitHub repo
   - Build Details:
     - Build Preset: `React`
     - App location: `/`
     - Output location: `build`

3. Add production redirect URI in Azure AD:
   - Go to App Registration → Authentication
   - Add: `https://your-app-name.azurestaticapps.net`

4. GitHub Actions will auto-deploy on push to main

### Option B: Azure CLI

```bash
# Build the app
npm run build

# Install SWA CLI
npm install -g @azure/static-web-apps-cli

# Deploy
swa deploy ./build --env production
```

### Option C: VS Code Extension

1. Install "Azure Static Web Apps" extension
2. Right-click `build` folder → "Deploy to Static Web App"
3. Follow prompts

## Embedding Options

### Embed in SharePoint (Modern Page)

1. Build and deploy to Azure Static Web Apps
2. In SharePoint, edit a page → Add web part → "Embed"
3. Paste the URL of your deployed app

### Embed in Microsoft Teams

1. In Teams Admin Center, create a new app
2. Add a "Personal Tab" pointing to your app URL
3. Configure SSO settings to match your Azure AD app

### Embed in Power Apps (Portal)

1. Create a Power Apps Portal
2. Add an "IFrame" component
3. Set source to your deployed app URL

## Project Structure

```
voc-tracker/
├── public/
│   └── index.html           # HTML template
├── src/
│   ├── components/
│   │   └── VOCTracker.js    # Main application component
│   ├── config/
│   │   └── authConfig.js    # Azure AD & SharePoint config
│   ├── services/
│   │   └── sharePointService.js  # SharePoint API operations
│   ├── App.js               # Root component with MSAL
│   └── index.js             # Entry point
├── staticwebapp.config.json # Azure SWA routing config
└── package.json
```

## Features

- **Dashboard**: Rolling 12-month VOC/HAP summaries, trend charts
- **Usage Logging**: Record material usage by emission unit
- **Product Management**: Maintain coating products database
- **Reports**: Monthly/annual emissions reports by category and unit

## Troubleshooting

### "AADSTS50011: Reply URL mismatch"
Add the exact URL (including trailing slashes) to Azure AD App Registration → Authentication → Redirect URIs

### "Failed to get site" error
- Verify SharePoint URL in authConfig.js
- Ensure Sites.Read.All permission is granted
- Check that admin consent was granted

### "Access denied" to SharePoint lists
- Verify list names match exactly (case-sensitive)
- Ensure user has at least Read access to the SharePoint site

### Charts not rendering
- Clear browser cache
- Check browser console for recharts errors
- Ensure all dependencies installed: `npm install`

## Security Notes

- Never commit `authConfig.js` with real credentials to public repos
- Use environment variables for production deployments
- Consider Azure Key Vault for sensitive configuration
- Implement row-level security in SharePoint if needed

## License

Internal use only.
