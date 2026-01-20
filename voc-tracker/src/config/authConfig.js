// Azure AD / Entra ID Configuration
// Replace these values with your Azure AD app registration details

export const msalConfig = {
  auth: {
    // Your Azure AD App Registration Client ID
    clientId: "YOUR_CLIENT_ID_HERE",
    
    // Your Azure AD Tenant ID or 'common' for multi-tenant
    authority: "https://login.microsoftonline.com/YOUR_TENANT_ID_HERE",
    
    // Redirect URI - must match what's configured in Azure AD
    redirectUri: window.location.origin,
    
    // Where to redirect after logout
    postLogoutRedirectUri: window.location.origin,
  },
  cache: {
    cacheLocation: "sessionStorage",
    storeAuthStateInCookie: false,
  },
};

// Scopes for Microsoft Graph API (SharePoint access)
export const loginRequest = {
  scopes: [
    "User.Read",
    "Sites.Read.All",
    "Sites.ReadWrite.All",
  ],
};

// SharePoint site configuration
export const sharePointConfig = {
  // Your SharePoint site URL
  siteUrl: "https://YOUR_TENANT.sharepoint.com/sites/YOUR_SITE",
  
  // List names in SharePoint
  lists: {
    products: "VOC_Products",
    usageLog: "VOC_UsageLog",
    emissionUnits: "VOC_EmissionUnits",
  },
};

/*
=============================================================================
AZURE AD APP REGISTRATION SETUP INSTRUCTIONS
=============================================================================

1. Go to Azure Portal > Azure Active Directory > App registrations
2. Click "New registration"
3. Enter a name (e.g., "VOC Emissions Tracker")
4. Select "Accounts in this organizational directory only"
5. Set Redirect URI:
   - Type: Single-page application (SPA)
   - URI: http://localhost:3000 (for dev) and your production URL
6. Click "Register"

After registration:
7. Copy the "Application (client) ID" - paste it above as clientId
8. Copy the "Directory (tenant) ID" - paste it above in authority URL
9. Go to "API permissions" and add:
   - Microsoft Graph > Delegated > User.Read
   - Microsoft Graph > Delegated > Sites.Read.All
   - Microsoft Graph > Delegated > Sites.ReadWrite.All
10. Click "Grant admin consent" (requires admin rights)

=============================================================================
SHAREPOINT LIST SETUP INSTRUCTIONS
=============================================================================

Create the following lists in your SharePoint site:

LIST 1: VOC_Products
Columns:
- Title (Single line text) - Product ID
- ProductName (Single line text)
- ProductNumber (Single line text)
- Supplier (Single line text)
- Category (Choice: Basecoat, Hardener, Clearcoat, Solvent)
- ProductType (Choice: automotive, non-automotive)
- SpecificGravity (Number, 3 decimal places)
- VOC_LbsGal (Number, 2 decimal places)
- HAP_Percent (Number, 4 decimal places)
- DibasicEster_Percent (Number, 4 decimal places)
- Ethylbenzene_Percent (Number, 4 decimal places)
- Cumene_Percent (Number, 4 decimal places)

LIST 2: VOC_UsageLog
Columns:
- Title (Single line text) - Auto-generated ID
- UsageDate (Date only)
- ProductID (Lookup to VOC_Products)
- EmissionUnit (Choice: EU-Coating Line-01, EU-Coating Line-02, EU-Coating Line-03)
- Gallons (Number, 2 decimal places)
- VOC_Lbs (Number, 2 decimal places) - Calculated
- HAP_Lbs (Number, 4 decimal places) - Calculated
- Cumene_Lbs (Number, 4 decimal places) - Calculated
- DibasicEster_Lbs (Number, 4 decimal places) - Calculated
- Ethylbenzene_Lbs (Number, 4 decimal places) - Calculated

LIST 3: VOC_EmissionUnits
Columns:
- Title (Single line text) - Unit ID (e.g., EU-Coating Line-01)
- UnitName (Single line text)
- Description (Multiple lines of text)
- IsActive (Yes/No)

=============================================================================
*/
