// SharePoint Data Service
// Handles all CRUD operations with SharePoint lists via Microsoft Graph API

import { sharePointConfig } from '../config/authConfig';

class SharePointService {
  constructor() {
    this.accessToken = null;
    this.siteId = null;
  }

  // Set the access token from MSAL
  setAccessToken(token) {
    this.accessToken = token;
  }

  // Get headers for Graph API calls
  getHeaders() {
    return {
      'Authorization': `Bearer ${this.accessToken}`,
      'Content-Type': 'application/json',
    };
  }

  // Get the SharePoint site ID
  async getSiteId() {
    if (this.siteId) return this.siteId;

    const siteUrl = new URL(sharePointConfig.siteUrl);
    const sitePath = siteUrl.pathname;
    
    const response = await fetch(
      `https://graph.microsoft.com/v1.0/sites/${siteUrl.hostname}:${sitePath}`,
      { headers: this.getHeaders() }
    );
    
    if (!response.ok) {
      throw new Error(`Failed to get site: ${response.statusText}`);
    }
    
    const site = await response.json();
    this.siteId = site.id;
    return this.siteId;
  }

  // Get list ID by name
  async getListId(listName) {
    const siteId = await this.getSiteId();
    
    const response = await fetch(
      `https://graph.microsoft.com/v1.0/sites/${siteId}/lists?$filter=displayName eq '${listName}'`,
      { headers: this.getHeaders() }
    );
    
    if (!response.ok) {
      throw new Error(`Failed to get list: ${response.statusText}`);
    }
    
    const data = await response.json();
    if (data.value.length === 0) {
      throw new Error(`List '${listName}' not found`);
    }
    
    return data.value[0].id;
  }

  // ============================================================
  // PRODUCTS OPERATIONS
  // ============================================================

  async getProducts() {
    const siteId = await this.getSiteId();
    const listId = await this.getListId(sharePointConfig.lists.products);
    
    const response = await fetch(
      `https://graph.microsoft.com/v1.0/sites/${siteId}/lists/${listId}/items?$expand=fields&$top=500`,
      { headers: this.getHeaders() }
    );
    
    if (!response.ok) {
      throw new Error(`Failed to get products: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    // Transform SharePoint data to app format
    return data.value.map(item => ({
      id: item.fields.Title,
      name: item.fields.ProductName,
      number: item.fields.ProductNumber,
      supplier: item.fields.Supplier,
      category: item.fields.Category,
      type: item.fields.ProductType,
      sg: item.fields.SpecificGravity || 1,
      vocLbsGal: item.fields.VOC_LbsGal || 0,
      hapV: (item.fields.HAP_Percent || 0) / 100,
      dibasicEster: (item.fields.DibasicEster_Percent || 0) / 100,
      ethylbenzene: (item.fields.Ethylbenzene_Percent || 0) / 100,
      cumene: (item.fields.Cumene_Percent || 0) / 100,
      chemicals: [], // Would need a separate list for chemical composition
      _spItemId: item.id, // Keep SharePoint ID for updates
    }));
  }

  async addProduct(product) {
    const siteId = await this.getSiteId();
    const listId = await this.getListId(sharePointConfig.lists.products);
    
    const fields = {
      Title: product.id,
      ProductName: product.name,
      ProductNumber: product.number || product.id,
      Supplier: product.supplier,
      Category: product.category,
      ProductType: product.type,
      SpecificGravity: parseFloat(product.sg) || 1,
      VOC_LbsGal: parseFloat(product.vocLbsGal) || 0,
      HAP_Percent: parseFloat(product.hapV) || 0,
      DibasicEster_Percent: parseFloat(product.dibasicEster) || 0,
      Ethylbenzene_Percent: parseFloat(product.ethylbenzene) || 0,
      Cumene_Percent: parseFloat(product.cumene) || 0,
    };
    
    const response = await fetch(
      `https://graph.microsoft.com/v1.0/sites/${siteId}/lists/${listId}/items`,
      {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ fields }),
      }
    );
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Failed to add product: ${error.error?.message || response.statusText}`);
    }
    
    return await response.json();
  }

  // ============================================================
  // USAGE LOG OPERATIONS
  // ============================================================

  async getUsageLog(startDate = null, endDate = null) {
    const siteId = await this.getSiteId();
    const listId = await this.getListId(sharePointConfig.lists.usageLog);
    
    let filter = '';
    if (startDate && endDate) {
      filter = `&$filter=fields/UsageDate ge '${startDate}' and fields/UsageDate le '${endDate}'`;
    } else if (startDate) {
      filter = `&$filter=fields/UsageDate ge '${startDate}'`;
    }
    
    const response = await fetch(
      `https://graph.microsoft.com/v1.0/sites/${siteId}/lists/${listId}/items?$expand=fields&$top=5000${filter}&$orderby=fields/UsageDate desc`,
      { headers: this.getHeaders() }
    );
    
    if (!response.ok) {
      throw new Error(`Failed to get usage log: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    return data.value.map(item => ({
      id: item.id,
      date: item.fields.UsageDate?.split('T')[0],
      productId: item.fields.ProductIDLookupId, // Lookup field
      productName: item.fields.ProductID, // Display value
      emissionUnit: item.fields.EmissionUnit,
      gallons: item.fields.Gallons || 0,
      vocLbs: item.fields.VOC_Lbs || 0,
      hapLbs: item.fields.HAP_Lbs || 0,
      cumene: item.fields.Cumene_Lbs || 0,
      dibasicEster: item.fields.DibasicEster_Lbs || 0,
      ethylbenzene: item.fields.Ethylbenzene_Lbs || 0,
      category: item.fields.Category,
      type: item.fields.ProductType,
    }));
  }

  async addUsageEntry(entry, product) {
    const siteId = await this.getSiteId();
    const listId = await this.getListId(sharePointConfig.lists.usageLog);
    
    // Calculate emissions
    const gallons = parseFloat(entry.gallons);
    const vocLbs = gallons * product.vocLbsGal;
    const hapLbs = gallons * product.hapV * product.sg * 8.34;
    const cumeneLbs = gallons * product.cumene * product.sg * 8.34;
    const dibasicEsterLbs = gallons * product.dibasicEster * product.sg * 8.34;
    const ethylbenzeneLbs = gallons * product.ethylbenzene * product.sg * 8.34;
    
    const fields = {
      Title: `${entry.date}-${Date.now()}`,
      UsageDate: entry.date,
      ProductIDLookupId: product._spItemId, // SharePoint lookup
      EmissionUnit: entry.emissionUnit,
      Gallons: gallons,
      VOC_Lbs: vocLbs,
      HAP_Lbs: hapLbs,
      Cumene_Lbs: cumeneLbs,
      DibasicEster_Lbs: dibasicEsterLbs,
      Ethylbenzene_Lbs: ethylbenzeneLbs,
      Category: product.category,
      ProductType: product.type,
    };
    
    const response = await fetch(
      `https://graph.microsoft.com/v1.0/sites/${siteId}/lists/${listId}/items`,
      {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ fields }),
      }
    );
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Failed to add usage entry: ${error.error?.message || response.statusText}`);
    }
    
    const result = await response.json();
    
    // Return in app format
    return {
      id: result.id,
      date: entry.date,
      productId: product.id,
      productName: product.name,
      category: product.category,
      type: product.type,
      emissionUnit: entry.emissionUnit,
      gallons,
      vocLbs,
      hapLbs,
      cumene: cumeneLbs,
      dibasicEster: dibasicEsterLbs,
      ethylbenzene: ethylbenzeneLbs,
    };
  }

  // ============================================================
  // EMISSION UNITS OPERATIONS
  // ============================================================

  async getEmissionUnits() {
    const siteId = await this.getSiteId();
    const listId = await this.getListId(sharePointConfig.lists.emissionUnits);
    
    const response = await fetch(
      `https://graph.microsoft.com/v1.0/sites/${siteId}/lists/${listId}/items?$expand=fields&$filter=fields/IsActive eq true`,
      { headers: this.getHeaders() }
    );
    
    if (!response.ok) {
      throw new Error(`Failed to get emission units: ${response.statusText}`);
    }
    
    const data = await response.json();
    return data.value.map(item => item.fields.Title);
  }

  // ============================================================
  // BULK DATA OPERATIONS
  // ============================================================

  async getRollingYearData() {
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    const startDate = oneYearAgo.toISOString().split('T')[0];
    
    return this.getUsageLog(startDate);
  }

  async getMonthData(year, month) {
    const startDate = new Date(year, month, 1).toISOString().split('T')[0];
    const endDate = new Date(year, month + 1, 0).toISOString().split('T')[0];
    
    return this.getUsageLog(startDate, endDate);
  }
}

// Export singleton instance
export const sharePointService = new SharePointService();
export default sharePointService;
