import React, { useState, useMemo, useCallback } from 'react';
import { useMsal } from '@azure/msal-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { loginRequest } from '../config/authConfig';
import sharePointService from '../services/sharePointService';

// Fallback sample data for demo/offline mode
const SAMPLE_PRODUCTS = [
  { id: 'P1C21A', name: 'Low VOC Adhesion Promoter', number: 'P1C21A', supplier: 'Sherwin Williams', category: 'Basecoat', type: 'automotive', sg: 0.96, vocLbsGal: 4.59, hapV: 0.133, dibasicEster: 0, ethylbenzene: 0, cumene: 0, chemicals: [{ name: 'Naphthalene', cas: '91-20-3', pct: 0.009, isHap: true }, { name: 'Toluene', cas: '108-88-3', pct: 0.007, isHap: true }] },
  { id: 'V66VM156', name: 'G56 Hardener', number: 'V66VM156', supplier: 'Sherwin Williams', category: 'Hardener', type: 'automotive', sg: 0.97, vocLbsGal: 3.80, hapV: 0.107, dibasicEster: 0, ethylbenzene: 0, cumene: 0, chemicals: [{ name: 'Methyl Isobutyl Ketone', cas: '108-10-1', pct: 0.013, isHap: true }] },
  { id: '4800LE7', name: 'Jet Black 600R', number: '4800LE7', supplier: 'Redspot', category: 'Basecoat', type: 'automotive', sg: 1.065, vocLbsGal: 4.56, hapV: 0, dibasicEster: 0, ethylbenzene: 0, cumene: 0, chemicals: [{ name: 'Butyl Acetate', cas: '123-86-4', pct: 0.375, isHap: false }] },
  { id: '85456', name: 'Acetone', number: '85456', supplier: 'Nexeo', category: 'Solvent', type: 'non-automotive', sg: 0.791, vocLbsGal: 0, hapV: 0, dibasicEster: 0, ethylbenzene: 0, cumene: 0, chemicals: [{ name: 'Acetone', cas: '67-64-1', pct: 0.975, isHap: false }] },
  { id: 'G50CLEAR', name: 'Econet Z Clear G50', number: 'G50CLEAR', supplier: 'PPG', category: 'Clearcoat', type: 'automotive', sg: 1.02, vocLbsGal: 4.20, hapV: 0.065, dibasicEster: 0.002, ethylbenzene: 0.001, cumene: 0.0003, chemicals: [{ name: 'Xylene', cas: '1330-20-7', pct: 0.008, isHap: true }] },
  { id: 'ARC29538C', name: 'Low Gloss Gray', number: 'ARC29538C', supplier: 'Redspot', category: 'Basecoat', type: 'non-automotive', sg: 1.108, vocLbsGal: 5.57, hapV: 2.351, dibasicEster: 0.01, ethylbenzene: 0.025, cumene: 0.005, chemicals: [{ name: 'Toluene', cas: '108-88-3', pct: 0.15, isHap: true }, { name: 'Ethyl Benzene', cas: '100-41-4', pct: 0.025, isHap: true }] },
];

const DEFAULT_EMISSION_UNITS = ['EU-Coating Line-01', 'EU-Coating Line-02', 'EU-Coating Line-03'];
const CATEGORIES = ['Basecoat', 'Hardener', 'Clearcoat', 'Solvent'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const generateSampleUsage = () => {
  const usage = [];
  const now = new Date();
  for (let i = 365; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    if (date.getDay() !== 0 && date.getDay() !== 6) {
      const numEntries = Math.floor(Math.random() * 8) + 3;
      for (let j = 0; j < numEntries; j++) {
        const product = SAMPLE_PRODUCTS[Math.floor(Math.random() * SAMPLE_PRODUCTS.length)];
        const eu = DEFAULT_EMISSION_UNITS[Math.floor(Math.random() * DEFAULT_EMISSION_UNITS.length)];
        const gallons = Math.round((Math.random() * 15 + 0.5) * 100) / 100;
        usage.push({
          id: `${date.toISOString()}-${j}`,
          date: date.toISOString().split('T')[0],
          productId: product.id,
          productName: product.name,
          category: product.category,
          type: product.type,
          emissionUnit: eu,
          gallons,
          vocLbs: gallons * product.vocLbsGal,
          hapLbs: gallons * product.hapV * product.sg * 8.34,
          cumene: gallons * product.cumene * product.sg * 8.34,
          dibasicEster: gallons * product.dibasicEster * product.sg * 8.34,
          ethylbenzene: gallons * product.ethylbenzene * product.sg * 8.34
        });
      }
    }
  }
  return usage;
};

const COLORS = { primary: '#0f172a', secondary: '#1e293b', accent: '#f97316', success: '#22c55e', warning: '#eab308', danger: '#ef4444', blue: '#3b82f6', purple: '#8b5cf6', cyan: '#06b6d4', pink: '#ec4899' };
const PIE_COLORS = [COLORS.accent, COLORS.blue, COLORS.success, COLORS.purple, COLORS.cyan, COLORS.pink];

export default function VOCTracker() {
  const { instance, accounts } = useMsal();
  const [dataSource, setDataSource] = useState('demo');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const [products, setProducts] = useState(SAMPLE_PRODUCTS);
  const [usageLog, setUsageLog] = useState(() => generateSampleUsage());
  const [emissionUnits, setEmissionUnits] = useState(DEFAULT_EMISSION_UNITS);
  
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [newUsage, setNewUsage] = useState({ productId: '', emissionUnit: DEFAULT_EMISSION_UNITS[0], gallons: '', date: new Date().toISOString().split('T')[0] });
  const [newProduct, setNewProduct] = useState({ id: '', name: '', number: '', supplier: '', category: 'Basecoat', type: 'automotive', sg: '', vocLbsGal: '', hapV: '', dibasicEster: '', ethylbenzene: '', cumene: '' });
  const [showProductModal, setShowProductModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);

  const getAccessToken = useCallback(async () => {
    if (accounts.length === 0) return null;
    try {
      const response = await instance.acquireTokenSilent({
        ...loginRequest,
        account: accounts[0],
      });
      return response.accessToken;
    } catch (error) {
      try {
        const response = await instance.acquireTokenPopup(loginRequest);
        return response.accessToken;
      } catch (popupError) {
        console.error('Token acquisition failed:', popupError);
        return null;
      }
    }
  }, [instance, accounts]);

  const loadSharePointData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const token = await getAccessToken();
      if (!token) throw new Error('Unable to acquire access token');
      sharePointService.setAccessToken(token);
      const [spProducts, spUsageLog, spEmissionUnits] = await Promise.all([
        sharePointService.getProducts(),
        sharePointService.getRollingYearData(),
        sharePointService.getEmissionUnits().catch(() => DEFAULT_EMISSION_UNITS),
      ]);
      setProducts(spProducts.length > 0 ? spProducts : SAMPLE_PRODUCTS);
      setUsageLog(spUsageLog.length > 0 ? spUsageLog : generateSampleUsage());
      setEmissionUnits(spEmissionUnits.length > 0 ? spEmissionUnits : DEFAULT_EMISSION_UNITS);
      setDataSource('sharepoint');
    } catch (err) {
      console.error('SharePoint load error:', err);
      setError(`Failed to load from SharePoint: ${err.message}. Using demo data.`);
      setDataSource('demo');
    } finally {
      setIsLoading(false);
    }
  }, [getAccessToken]);

  const handleLogout = () => {
    instance.logoutPopup();
  };

  const rollingYearData = useMemo(() => {
    const now = new Date();
    const oneYearAgo = new Date(now);
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    const filtered = usageLog.filter(u => new Date(u.date) >= oneYearAgo);
    return {
      gallons: filtered.reduce((s, u) => s + u.gallons, 0),
      vocTons: filtered.reduce((s, u) => s + u.vocLbs, 0) / 2000,
      hapTons: filtered.reduce((s, u) => s + u.hapLbs, 0) / 2000,
      cumeneTons: filtered.reduce((s, u) => s + u.cumene, 0) / 2000,
      dibasicEsterTons: filtered.reduce((s, u) => s + u.dibasicEster, 0) / 2000,
      ethylbenzeneTons: filtered.reduce((s, u) => s + u.ethylbenzene, 0) / 2000
    };
  }, [usageLog]);

  const monthlySummary = useMemo(() => {
    const startDate = new Date(selectedYear, selectedMonth, 1);
    const endDate = new Date(selectedYear, selectedMonth + 1, 0);
    const filtered = usageLog.filter(u => { const d = new Date(u.date); return d >= startDate && d <= endDate; });
    const byEU = {};
    emissionUnits.forEach(eu => {
      const euData = filtered.filter(u => u.emissionUnit === eu);
      byEU[eu] = { 
        gallons: euData.reduce((s, u) => s + u.gallons, 0), 
        vocLbs: euData.reduce((s, u) => s + u.vocLbs, 0), 
        hapLbs: euData.reduce((s, u) => s + u.hapLbs, 0), 
        cumene: euData.reduce((s, u) => s + u.cumene, 0), 
        dibasicEster: euData.reduce((s, u) => s + u.dibasicEster, 0), 
        ethylbenzene: euData.reduce((s, u) => s + u.ethylbenzene, 0) 
      };
    });
    return {
      total: { 
        gallons: filtered.reduce((s, u) => s + u.gallons, 0), 
        vocTons: filtered.reduce((s, u) => s + u.vocLbs, 0) / 2000, 
        hapTons: filtered.reduce((s, u) => s + u.hapLbs, 0) / 2000, 
        cumeneTons: filtered.reduce((s, u) => s + u.cumene, 0) / 2000, 
        dibasicEsterTons: filtered.reduce((s, u) => s + u.dibasicEster, 0) / 2000, 
        ethylbenzeneTons: filtered.reduce((s, u) => s + u.ethylbenzene, 0) / 2000 
      },
      byEU
    };
  }, [usageLog, selectedMonth, selectedYear, emissionUnits]);

  const dailyUsage = useMemo(() => {
    const startDate = new Date(selectedYear, selectedMonth, 1);
    const endDate = new Date(selectedYear, selectedMonth + 1, 0);
    const filtered = usageLog.filter(u => { const d = new Date(u.date); return d >= startDate && d <= endDate; });
    const byDay = {};
    filtered.forEach(u => {
      if (!byDay[u.date]) byDay[u.date] = { date: u.date, Basecoat: { automotive: 0, nonAutomotive: 0 }, Hardener: { automotive: 0, nonAutomotive: 0 }, Clearcoat: { automotive: 0, nonAutomotive: 0 }, Solvent: { automotive: 0, nonAutomotive: 0 } };
      const typeKey = u.type === 'automotive' ? 'automotive' : 'nonAutomotive';
      if (byDay[u.date][u.category]) byDay[u.date][u.category][typeKey] += u.gallons;
    });
    return Object.values(byDay).sort((a, b) => a.date.localeCompare(b.date));
  }, [usageLog, selectedMonth, selectedYear]);

  const materialContent = useMemo(() => products.map(p => ({ 
    id: p.id, 
    name: p.name, 
    category: p.category, 
    vocLbsGal: p.vocLbsGal, 
    hapLbsGal: p.hapV * p.sg * 8.34, 
    aggregateHap: p.hapV * 100, 
    cumene: p.cumene * p.sg * 8.34, 
    dibasicEster: p.dibasicEster * p.sg * 8.34, 
    ethylbenzene: p.ethylbenzene * p.sg * 8.34 
  })), [products]);

  const monthlyTrendData = useMemo(() => {
    const data = [];
    for (let i = 11; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const month = date.getMonth(), year = date.getFullYear();
      const startDate = new Date(year, month, 1), endDate = new Date(year, month + 1, 0);
      const filtered = usageLog.filter(u => { const d = new Date(u.date); return d >= startDate && d <= endDate; });
      data.push({ 
        month: `${MONTHS[month]} ${year}`, 
        gallons: Math.round(filtered.reduce((s, u) => s + u.gallons, 0)), 
        vocTons: parseFloat((filtered.reduce((s, u) => s + u.vocLbs, 0) / 2000).toFixed(3)), 
        hapTons: parseFloat((filtered.reduce((s, u) => s + u.hapLbs, 0) / 2000).toFixed(4)) 
      });
    }
    return data;
  }, [usageLog]);

  const categoryBreakdown = useMemo(() => {
    const startDate = new Date(selectedYear, selectedMonth, 1), endDate = new Date(selectedYear, selectedMonth + 1, 0);
    const filtered = usageLog.filter(u => { const d = new Date(u.date); return d >= startDate && d <= endDate; });
    return CATEGORIES.map(cat => ({ name: cat, gallons: filtered.filter(u => u.category === cat).reduce((s, u) => s + u.gallons, 0) }));
  }, [usageLog, selectedMonth, selectedYear]);

  const handleAddUsage = async () => {
    if (!newUsage.productId || !newUsage.gallons) return;
    const product = products.find(p => p.id === newUsage.productId);
    if (!product) return;
    const gallons = parseFloat(newUsage.gallons);
    
    if (dataSource === 'sharepoint') {
      setIsLoading(true);
      try {
        const token = await getAccessToken();
        sharePointService.setAccessToken(token);
        const entry = await sharePointService.addUsageEntry(newUsage, product);
        setUsageLog([...usageLog, entry]);
      } catch (err) {
        setError(`Failed to save: ${err.message}`);
      } finally {
        setIsLoading(false);
      }
    } else {
      const entry = {
        id: Date.now().toString(),
        date: newUsage.date,
        productId: product.id,
        productName: product.name,
        category: product.category,
        type: product.type,
        emissionUnit: newUsage.emissionUnit,
        gallons,
        vocLbs: gallons * product.vocLbsGal,
        hapLbs: gallons * product.hapV * product.sg * 8.34,
        cumene: gallons * product.cumene * product.sg * 8.34,
        dibasicEster: gallons * product.dibasicEster * product.sg * 8.34,
        ethylbenzene: gallons * product.ethylbenzene * product.sg * 8.34
      };
      setUsageLog([...usageLog, entry]);
    }
    setNewUsage({ ...newUsage, productId: '', gallons: '' });
  };

  const handleAddProduct = async () => {
    if (!newProduct.id || !newProduct.name) return;
    const product = {
      ...newProduct,
      sg: parseFloat(newProduct.sg) || 1,
      vocLbsGal: parseFloat(newProduct.vocLbsGal) || 0,
      hapV: parseFloat(newProduct.hapV) / 100 || 0,
      dibasicEster: parseFloat(newProduct.dibasicEster) / 100 || 0,
      ethylbenzene: parseFloat(newProduct.ethylbenzene) / 100 || 0,
      cumene: parseFloat(newProduct.cumene) / 100 || 0,
      chemicals: []
    };
    
    if (dataSource === 'sharepoint') {
      setIsLoading(true);
      try {
        const token = await getAccessToken();
        sharePointService.setAccessToken(token);
        await sharePointService.addProduct({
          ...newProduct,
          hapV: newProduct.hapV,
          dibasicEster: newProduct.dibasicEster,
          ethylbenzene: newProduct.ethylbenzene,
          cumene: newProduct.cumene,
        });
        setProducts([...products, product]);
      } catch (err) {
        setError(`Failed to save product: ${err.message}`);
      } finally {
        setIsLoading(false);
      }
    } else {
      setProducts([...products, product]);
    }
    setNewProduct({ id: '', name: '', number: '', supplier: '', category: 'Basecoat', type: 'automotive', sg: '', vocLbsGal: '', hapV: '', dibasicEster: '', ethylbenzene: '', cumene: '' });
    setShowProductModal(false);
  };

  const getCategoryColor = (cat) => cat === 'Basecoat' ? COLORS.accent : cat === 'Hardener' ? COLORS.blue : cat === 'Clearcoat' ? COLORS.success : COLORS.purple;

  const MetricCard = ({ title, value, unit, color, subtext }) => (
    <div style={{ background: `linear-gradient(135deg, ${color}15 0%, ${color}05 100%)`, borderLeft: `4px solid ${color}`, borderRadius: '12px', padding: '20px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
      <div style={{ fontSize: '12px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{title}</div>
      <div style={{ fontSize: '28px', fontWeight: '700', color: COLORS.primary, marginTop: '8px' }}>
        {typeof value === 'number' ? value.toLocaleString(undefined, { maximumFractionDigits: 4 }) : value}
        <span style={{ fontSize: '14px', fontWeight: '400', color: '#64748b', marginLeft: '4px' }}>{unit}</span>
      </div>
      {subtext && <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>{subtext}</div>}
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)', fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif" }}>
      {/* Header */}
      <header style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', color: 'white', padding: '20px 32px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.2)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', maxWidth: '1400px', margin: '0 auto' }}>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: '700', margin: 0, letterSpacing: '-0.025em' }}>
              <span style={{ color: COLORS.accent }}>VOC</span> Emissions Tracker
            </h1>
            <p style={{ fontSize: '13px', color: '#94a3b8', margin: '4px 0 0' }}>
              Automotive Coatings Environmental Management System
              <span style={{ marginLeft: '12px', padding: '2px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: '600', background: dataSource === 'sharepoint' ? '#22c55e30' : '#f9731630', color: dataSource === 'sharepoint' ? '#22c55e' : '#f97316' }}>
                {dataSource === 'sharepoint' ? '● SharePoint Connected' : '● Demo Mode'}
              </span>
            </p>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {['dashboard', 'usage', 'products', 'reports'].map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)} style={{ padding: '10px 20px', borderRadius: '8px', border: 'none', background: activeTab === tab ? COLORS.accent : 'transparent', color: activeTab === tab ? 'white' : '#94a3b8', fontWeight: '600', fontSize: '13px', cursor: 'pointer', textTransform: 'capitalize' }}>{tab}</button>
            ))}
            <div style={{ width: '1px', height: '24px', background: '#475569', margin: '0 8px' }} />
            {dataSource === 'demo' && (
              <button onClick={loadSharePointData} disabled={isLoading} style={{ padding: '10px 16px', borderRadius: '8px', border: '1px solid #475569', background: 'transparent', color: '#94a3b8', fontWeight: '600', fontSize: '12px', cursor: 'pointer' }}>
                {isLoading ? 'Connecting...' : 'Connect SharePoint'}
              </button>
            )}
            <button onClick={handleLogout} style={{ padding: '10px 16px', borderRadius: '8px', border: '1px solid #475569', background: 'transparent', color: '#94a3b8', fontWeight: '600', fontSize: '12px', cursor: 'pointer' }}>
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* Error Banner */}
      {error && (
        <div style={{ maxWidth: '1400px', margin: '16px auto 0', padding: '0 32px' }}>
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '12px 16px', color: '#dc2626', fontSize: '13px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            {error}
            <button onClick={() => setError(null)} style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: '18px' }}>×</button>
          </div>
        </div>
      )}

      {/* Loading Banner */}
      {isLoading && (
        <div style={{ maxWidth: '1400px', margin: '16px auto 0', padding: '0 32px' }}>
          <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px', padding: '12px 16px', color: '#2563eb', fontSize: '13px' }}>
            Loading data from SharePoint...
          </div>
        </div>
      )}

      {/* Main Content */}
      <main style={{ maxWidth: '1400px', margin: '0 auto', padding: '24px 32px' }}>
        
        {/* DASHBOARD TAB */}
        {activeTab === 'dashboard' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: '700', color: COLORS.primary, margin: 0 }}>Rolling 12-Month Summary</h2>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <select value={selectedMonth} onChange={e => setSelectedMonth(parseInt(e.target.value))} style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '14px' }}>
                  {MONTHS.map((m, i) => <option key={i} value={i}>{m}</option>)}
                </select>
                <select value={selectedYear} onChange={e => setSelectedYear(parseInt(e.target.value))} style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '14px' }}>
                  {[2023, 2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
            </div>

            {/* Rolling 12-Month Metrics */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '16px', marginBottom: '24px' }}>
              <MetricCard title="Total Usage" value={rollingYearData.gallons} unit="gal" color={COLORS.blue} subtext="Rolling 12 months" />
              <MetricCard title="VOC Emissions" value={rollingYearData.vocTons} unit="tons" color={COLORS.accent} subtext="Rolling 12 months" />
              <MetricCard title="Aggregate HAPs" value={rollingYearData.hapTons} unit="tons" color={COLORS.purple} subtext="Rolling 12 months" />
              <MetricCard title="Cumene" value={rollingYearData.cumeneTons} unit="tons" color={COLORS.cyan} subtext="CAS 98-82-8" />
              <MetricCard title="Dibasic Ester" value={rollingYearData.dibasicEsterTons} unit="tons" color={COLORS.success} subtext="DBE" />
              <MetricCard title="Ethylbenzene" value={rollingYearData.ethylbenzeneTons} unit="tons" color={COLORS.pink} subtext="CAS 100-41-4" />
            </div>

            {/* Monthly Summary */}
            <h3 style={{ fontSize: '16px', fontWeight: '600', color: COLORS.primary, marginBottom: '16px' }}>{MONTHS[selectedMonth]} {selectedYear} Summary</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '16px', marginBottom: '32px' }}>
              <MetricCard title="Monthly Usage" value={monthlySummary.total.gallons} unit="gal" color={COLORS.blue} />
              <MetricCard title="VOC Emissions" value={monthlySummary.total.vocTons} unit="tons" color={COLORS.accent} />
              <MetricCard title="HAPs" value={monthlySummary.total.hapTons} unit="tons" color={COLORS.purple} />
              <MetricCard title="Cumene" value={monthlySummary.total.cumeneTons} unit="tons" color={COLORS.cyan} />
              <MetricCard title="Dibasic Ester" value={monthlySummary.total.dibasicEsterTons} unit="tons" color={COLORS.success} />
              <MetricCard title="Ethylbenzene" value={monthlySummary.total.ethylbenzeneTons} unit="tons" color={COLORS.pink} />
            </div>

            {/* Charts */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px', marginBottom: '24px' }}>
              <div style={{ background: 'white', borderRadius: '16px', padding: '24px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                <h3 style={{ fontSize: '16px', fontWeight: '600', color: COLORS.primary, marginBottom: '16px' }}>12-Month Emissions Trend</h3>
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={monthlyTrendData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} tickLine={false} />
                    <YAxis yAxisId="left" tick={{ fontSize: 11 }} tickLine={false} />
                    <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} tickLine={false} />
                    <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }} />
                    <Legend />
                    <Line yAxisId="left" type="monotone" dataKey="gallons" name="Usage (gal)" stroke={COLORS.blue} strokeWidth={2} dot={false} />
                    <Line yAxisId="right" type="monotone" dataKey="vocTons" name="VOC (tons)" stroke={COLORS.accent} strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div style={{ background: 'white', borderRadius: '16px', padding: '24px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                <h3 style={{ fontSize: '16px', fontWeight: '600', color: COLORS.primary, marginBottom: '16px' }}>Usage by Category</h3>
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie data={categoryBreakdown} cx="50%" cy="50%" innerRadius={60} outerRadius={100} dataKey="gallons" nameKey="name" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                      {categoryBreakdown.map((entry, index) => (<Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />))}
                    </Pie>
                    <Tooltip formatter={(value) => `${value.toFixed(1)} gal`} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Emissions by Unit Table */}
            <div style={{ background: 'white', borderRadius: '16px', padding: '24px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '600', color: COLORS.primary, marginBottom: '16px' }}>Emissions by Unit - {MONTHS[selectedMonth]} {selectedYear}</h3>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ background: '#f8fafc' }}>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '600', color: '#475569', borderBottom: '2px solid #e2e8f0' }}>Emission Unit</th>
                    <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: '600', color: '#475569', borderBottom: '2px solid #e2e8f0' }}>Usage (gal)</th>
                    <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: '600', color: '#475569', borderBottom: '2px solid #e2e8f0' }}>VOC (lbs)</th>
                    <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: '600', color: '#475569', borderBottom: '2px solid #e2e8f0' }}>HAPs (lbs)</th>
                    <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: '600', color: '#475569', borderBottom: '2px solid #e2e8f0' }}>Cumene (lbs)</th>
                    <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: '600', color: '#475569', borderBottom: '2px solid #e2e8f0' }}>Dibasic Ester (lbs)</th>
                    <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: '600', color: '#475569', borderBottom: '2px solid #e2e8f0' }}>Ethylbenzene (lbs)</th>
                  </tr>
                </thead>
                <tbody>
                  {emissionUnits.map((eu, i) => (
                    <tr key={eu} style={{ background: i % 2 === 0 ? 'white' : '#fafafa' }}>
                      <td style={{ padding: '12px 16px', fontWeight: '500', color: COLORS.primary }}>{eu}</td>
                      <td style={{ padding: '12px 16px', textAlign: 'right' }}>{(monthlySummary.byEU[eu]?.gallons || 0).toFixed(2)}</td>
                      <td style={{ padding: '12px 16px', textAlign: 'right' }}>{(monthlySummary.byEU[eu]?.vocLbs || 0).toFixed(2)}</td>
                      <td style={{ padding: '12px 16px', textAlign: 'right' }}>{(monthlySummary.byEU[eu]?.hapLbs || 0).toFixed(4)}</td>
                      <td style={{ padding: '12px 16px', textAlign: 'right' }}>{(monthlySummary.byEU[eu]?.cumene || 0).toFixed(4)}</td>
                      <td style={{ padding: '12px 16px', textAlign: 'right' }}>{(monthlySummary.byEU[eu]?.dibasicEster || 0).toFixed(4)}</td>
                      <td style={{ padding: '12px 16px', textAlign: 'right' }}>{(monthlySummary.byEU[eu]?.ethylbenzene || 0).toFixed(4)}</td>
                    </tr>
                  ))}
                  <tr style={{ background: '#f1f5f9', fontWeight: '600' }}>
                    <td style={{ padding: '12px 16px' }}>FACILITY TOTAL</td>
                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>{monthlySummary.total.gallons.toFixed(2)}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>{(monthlySummary.total.vocTons * 2000).toFixed(2)}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>{(monthlySummary.total.hapTons * 2000).toFixed(4)}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>{(monthlySummary.total.cumeneTons * 2000).toFixed(4)}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>{(monthlySummary.total.dibasicEsterTons * 2000).toFixed(4)}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>{(monthlySummary.total.ethylbenzeneTons * 2000).toFixed(4)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* USAGE TAB */}
        {activeTab === 'usage' && (
          <div>
            <h2 style={{ fontSize: '20px', fontWeight: '700', color: COLORS.primary, margin: '0 0 24px' }}>Log Material Usage</h2>
            
            {/* Add Usage Form */}
            <div style={{ background: 'white', borderRadius: '16px', padding: '24px', marginBottom: '24px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '600', color: COLORS.primary, marginBottom: '16px' }}>Add New Usage Entry</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '16px', alignItems: 'end' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#64748b', marginBottom: '6px' }}>Date</label>
                  <input type="date" value={newUsage.date} onChange={e => setNewUsage({ ...newUsage, date: e.target.value })} style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '14px' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#64748b', marginBottom: '6px' }}>Product</label>
                  <select value={newUsage.productId} onChange={e => setNewUsage({ ...newUsage, productId: e.target.value })} style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '14px' }}>
                    <option value="">Select product...</option>
                    {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#64748b', marginBottom: '6px' }}>Emission Unit</label>
                  <select value={newUsage.emissionUnit} onChange={e => setNewUsage({ ...newUsage, emissionUnit: e.target.value })} style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '14px' }}>
                    {emissionUnits.map(eu => <option key={eu} value={eu}>{eu}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#64748b', marginBottom: '6px' }}>Gallons</label>
                  <input type="number" step="0.01" value={newUsage.gallons} onChange={e => setNewUsage({ ...newUsage, gallons: e.target.value })} placeholder="0.00" style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '14px' }} />
                </div>
                <button onClick={handleAddUsage} disabled={isLoading} style={{ padding: '10px 24px', background: COLORS.accent, color: 'white', border: 'none', borderRadius: '8px', fontWeight: '600', fontSize: '14px', cursor: 'pointer', opacity: isLoading ? 0.6 : 1 }}>
                  {isLoading ? 'Saving...' : 'Add Entry'}
                </button>
              </div>
            </div>

            {/* Daily Usage Chart */}
            <div style={{ background: 'white', borderRadius: '16px', padding: '24px', marginBottom: '24px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '600', color: COLORS.primary, marginBottom: '16px' }}>Daily Usage - {MONTHS[selectedMonth]} {selectedYear}</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={dailyUsage}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} />
                  <YAxis tick={{ fontSize: 11 }} tickLine={false} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="Basecoat.automotive" name="Basecoat (Auto)" stackId="basecoat" fill={COLORS.accent} />
                  <Bar dataKey="Basecoat.nonAutomotive" name="Basecoat (Non-Auto)" stackId="basecoat" fill={`${COLORS.accent}80`} />
                  <Bar dataKey="Hardener.automotive" name="Hardener (Auto)" stackId="hardener" fill={COLORS.blue} />
                  <Bar dataKey="Hardener.nonAutomotive" name="Hardener (Non-Auto)" stackId="hardener" fill={`${COLORS.blue}80`} />
                  <Bar dataKey="Clearcoat.automotive" name="Clearcoat (Auto)" stackId="clearcoat" fill={COLORS.success} />
                  <Bar dataKey="Clearcoat.nonAutomotive" name="Clearcoat (Non-Auto)" stackId="clearcoat" fill={`${COLORS.success}80`} />
                  <Bar dataKey="Solvent.automotive" name="Solvent (Auto)" stackId="solvent" fill={COLORS.purple} />
                  <Bar dataKey="Solvent.nonAutomotive" name="Solvent (Non-Auto)" stackId="solvent" fill={`${COLORS.purple}80`} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Recent Usage Table */}
            <div style={{ background: 'white', borderRadius: '16px', padding: '24px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '600', color: COLORS.primary, marginBottom: '16px' }}>Recent Usage Entries</h3>
              <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead style={{ position: 'sticky', top: 0, background: 'white' }}>
                    <tr style={{ background: '#f8fafc' }}>
                      <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '600', color: '#475569', borderBottom: '2px solid #e2e8f0' }}>Date</th>
                      <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '600', color: '#475569', borderBottom: '2px solid #e2e8f0' }}>Product</th>
                      <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '600', color: '#475569', borderBottom: '2px solid #e2e8f0' }}>Category</th>
                      <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '600', color: '#475569', borderBottom: '2px solid #e2e8f0' }}>Type</th>
                      <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '600', color: '#475569', borderBottom: '2px solid #e2e8f0' }}>EU</th>
                      <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: '600', color: '#475569', borderBottom: '2px solid #e2e8f0' }}>Gallons</th>
                      <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: '600', color: '#475569', borderBottom: '2px solid #e2e8f0' }}>VOC (lbs)</th>
                      <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: '600', color: '#475569', borderBottom: '2px solid #e2e8f0' }}>HAPs (lbs)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {usageLog.slice(-50).reverse().map((u, i) => (
                      <tr key={u.id} style={{ background: i % 2 === 0 ? 'white' : '#fafafa' }}>
                        <td style={{ padding: '10px 16px' }}>{u.date}</td>
                        <td style={{ padding: '10px 16px', fontWeight: '500' }}>{u.productName}</td>
                        <td style={{ padding: '10px 16px' }}>
                          <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: '600', background: `${getCategoryColor(u.category)}20`, color: getCategoryColor(u.category) }}>{u.category}</span>
                        </td>
                        <td style={{ padding: '10px 16px', fontSize: '12px', color: '#64748b' }}>{u.type}</td>
                        <td style={{ padding: '10px 16px', fontSize: '12px' }}>{u.emissionUnit.replace('EU-Coating Line-', 'Line ')}</td>
                        <td style={{ padding: '10px 16px', textAlign: 'right', fontWeight: '500' }}>{u.gallons.toFixed(2)}</td>
                        <td style={{ padding: '10px 16px', textAlign: 'right' }}>{u.vocLbs.toFixed(2)}</td>
                        <td style={{ padding: '10px 16px', textAlign: 'right' }}>{u.hapLbs.toFixed(4)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* PRODUCTS TAB */}
        {activeTab === 'products' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: '700', color: COLORS.primary, margin: 0 }}>Product Database</h2>
              <button onClick={() => setShowProductModal(true)} style={{ padding: '10px 20px', background: COLORS.accent, color: 'white', border: 'none', borderRadius: '8px', fontWeight: '600', fontSize: '14px', cursor: 'pointer' }}>+ Add Product</button>
            </div>

            {/* Product Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '16px' }}>
              {products.map(p => (
                <div key={p.id} onClick={() => setSelectedProduct(p)} style={{ background: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', cursor: 'pointer', border: '2px solid transparent', transition: 'all 0.2s' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                    <div>
                      <h3 style={{ fontSize: '15px', fontWeight: '600', color: COLORS.primary, margin: '0 0 4px' }}>{p.name}</h3>
                      <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>{p.number} • {p.supplier}</p>
                    </div>
                    <span style={{ padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: '600', background: `${getCategoryColor(p.category)}20`, color: getCategoryColor(p.category) }}>{p.category}</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginTop: '16px' }}>
                    <div>
                      <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '500' }}>VOC</div>
                      <div style={{ fontSize: '15px', fontWeight: '600', color: COLORS.primary }}>{p.vocLbsGal} <span style={{ fontSize: '11px', fontWeight: '400', color: '#64748b' }}>lb/gal</span></div>
                    </div>
                    <div>
                      <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '500' }}>HAPs</div>
                      <div style={{ fontSize: '15px', fontWeight: '600', color: COLORS.primary }}>{(p.hapV * p.sg * 8.34).toFixed(3)} <span style={{ fontSize: '11px', fontWeight: '400', color: '#64748b' }}>lb/gal</span></div>
                    </div>
                    <div>
                      <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '500' }}>SG</div>
                      <div style={{ fontSize: '15px', fontWeight: '600', color: COLORS.primary }}>{p.sg}</div>
                    </div>
                  </div>
                  <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #f1f5f9' }}>
                    <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: '600', background: p.type === 'automotive' ? '#dbeafe' : '#fef3c7', color: p.type === 'automotive' ? '#1e40af' : '#92400e' }}>
                      {p.type === 'automotive' ? 'AUTOMOTIVE' : 'NON-AUTOMOTIVE SPECIALTY'}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Product Detail Modal */}
            {selectedProduct && (
              <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setSelectedProduct(null)}>
                <div style={{ background: 'white', borderRadius: '16px', padding: '32px', maxWidth: '600px', width: '90%', maxHeight: '80vh', overflow: 'auto' }} onClick={e => e.stopPropagation()}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
                    <div>
                      <h2 style={{ fontSize: '20px', fontWeight: '700', color: COLORS.primary, margin: '0 0 4px' }}>{selectedProduct.name}</h2>
                      <p style={{ fontSize: '14px', color: '#64748b', margin: 0 }}>{selectedProduct.number} • {selectedProduct.supplier}</p>
                    </div>
                    <button onClick={() => setSelectedProduct(null)} style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#94a3b8' }}>×</button>
                  </div>
                  <h4 style={{ fontSize: '14px', fontWeight: '600', color: '#475569', marginBottom: '12px' }}>Environmental Data</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px', marginBottom: '24px' }}>
                    <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px' }}>
                      <div style={{ fontSize: '11px', color: '#64748b' }}>VOC Content</div>
                      <div style={{ fontSize: '18px', fontWeight: '600', color: COLORS.primary }}>{selectedProduct.vocLbsGal} lb/gal</div>
                    </div>
                    <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px' }}>
                      <div style={{ fontSize: '11px', color: '#64748b' }}>Aggregate HAPs</div>
                      <div style={{ fontSize: '18px', fontWeight: '600', color: COLORS.primary }}>{(selectedProduct.hapV * selectedProduct.sg * 8.34).toFixed(4)} lb/gal</div>
                    </div>
                    <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px' }}>
                      <div style={{ fontSize: '11px', color: '#64748b' }}>Cumene (CAS 98-82-8)</div>
                      <div style={{ fontSize: '18px', fontWeight: '600', color: COLORS.primary }}>{(selectedProduct.cumene * selectedProduct.sg * 8.34).toFixed(4)} lb/gal</div>
                    </div>
                    <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px' }}>
                      <div style={{ fontSize: '11px', color: '#64748b' }}>Ethylbenzene (CAS 100-41-4)</div>
                      <div style={{ fontSize: '18px', fontWeight: '600', color: COLORS.primary }}>{(selectedProduct.ethylbenzene * selectedProduct.sg * 8.34).toFixed(4)} lb/gal</div>
                    </div>
                  </div>
                  {selectedProduct.chemicals && selectedProduct.chemicals.length > 0 && (
                    <>
                      <h4 style={{ fontSize: '14px', fontWeight: '600', color: '#475569', marginBottom: '12px' }}>Chemical Composition</h4>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                        <thead>
                          <tr style={{ background: '#f8fafc' }}>
                            <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: '600', color: '#475569' }}>Chemical</th>
                            <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: '600', color: '#475569' }}>CAS</th>
                            <th style={{ padding: '10px 12px', textAlign: 'right', fontWeight: '600', color: '#475569' }}>Weight %</th>
                            <th style={{ padding: '10px 12px', textAlign: 'center', fontWeight: '600', color: '#475569' }}>HAP</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedProduct.chemicals.map((c, i) => (
                            <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                              <td style={{ padding: '10px 12px' }}>{c.name}</td>
                              <td style={{ padding: '10px 12px', fontFamily: 'monospace', fontSize: '12px' }}>{c.cas}</td>
                              <td style={{ padding: '10px 12px', textAlign: 'right' }}>{(c.pct * 100).toFixed(2)}%</td>
                              <td style={{ padding: '10px 12px', textAlign: 'center' }}>{c.isHap && <span style={{ color: COLORS.danger, fontWeight: '600' }}>●</span>}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Add Product Modal */}
            {showProductModal && (
              <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setShowProductModal(false)}>
                <div style={{ background: 'white', borderRadius: '16px', padding: '32px', maxWidth: '600px', width: '90%', maxHeight: '80vh', overflow: 'auto' }} onClick={e => e.stopPropagation()}>
                  <h2 style={{ fontSize: '20px', fontWeight: '700', color: COLORS.primary, marginBottom: '24px' }}>Add New Product</h2>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#64748b', marginBottom: '6px' }}>Product ID *</label>
                      <input type="text" value={newProduct.id} onChange={e => setNewProduct({ ...newProduct, id: e.target.value })} style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '14px' }} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#64748b', marginBottom: '6px' }}>Product Name *</label>
                      <input type="text" value={newProduct.name} onChange={e => setNewProduct({ ...newProduct, name: e.target.value })} style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '14px' }} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#64748b', marginBottom: '6px' }}>Supplier</label>
                      <input type="text" value={newProduct.supplier} onChange={e => setNewProduct({ ...newProduct, supplier: e.target.value })} style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '14px' }} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#64748b', marginBottom: '6px' }}>Category</label>
                      <select value={newProduct.category} onChange={e => setNewProduct({ ...newProduct, category: e.target.value })} style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '14px' }}>
                        {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#64748b', marginBottom: '6px' }}>Specific Gravity</label>
                      <input type="number" step="0.001" value={newProduct.sg} onChange={e => setNewProduct({ ...newProduct, sg: e.target.value })} placeholder="1.000" style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '14px' }} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#64748b', marginBottom: '6px' }}>VOC (lb/gal)</label>
                      <input type="number" step="0.01" value={newProduct.vocLbsGal} onChange={e => setNewProduct({ ...newProduct, vocLbsGal: e.target.value })} placeholder="0.00" style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '14px' }} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#64748b', marginBottom: '6px' }}>Aggregate HAPs (%)</label>
                      <input type="number" step="0.001" value={newProduct.hapV} onChange={e => setNewProduct({ ...newProduct, hapV: e.target.value })} placeholder="0.000" style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '14px' }} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#64748b', marginBottom: '6px' }}>Ethylbenzene (%)</label>
                      <input type="number" step="0.001" value={newProduct.ethylbenzene} onChange={e => setNewProduct({ ...newProduct, ethylbenzene: e.target.value })} placeholder="0.000" style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '14px' }} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#64748b', marginBottom: '6px' }}>Cumene (%)</label>
                      <input type="number" step="0.001" value={newProduct.cumene} onChange={e => setNewProduct({ ...newProduct, cumene: e.target.value })} placeholder="0.000" style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '14px' }} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#64748b', marginBottom: '6px' }}>Dibasic Ester (%)</label>
                      <input type="number" step="0.001" value={newProduct.dibasicEster} onChange={e => setNewProduct({ ...newProduct, dibasicEster: e.target.value })} placeholder="0.000" style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '14px' }} />
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '12px', marginTop: '24px', justifyContent: 'flex-end' }}>
                    <button onClick={() => setShowProductModal(false)} style={{ padding: '10px 20px', background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '8px', fontWeight: '600', fontSize: '14px', cursor: 'pointer' }}>Cancel</button>
                    <button onClick={handleAddProduct} disabled={isLoading} style={{ padding: '10px 20px', background: COLORS.accent, color: 'white', border: 'none', borderRadius: '8px', fontWeight: '600', fontSize: '14px', cursor: 'pointer', opacity: isLoading ? 0.6 : 1 }}>
                      {isLoading ? 'Saving...' : 'Add Product'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* REPORTS TAB */}
        {activeTab === 'reports' && (
          <div>
            <h2 style={{ fontSize: '20px', fontWeight: '700', color: COLORS.primary, margin: '0 0 24px' }}>Environmental Reports</h2>
            
            {/* Material Content Report */}
            <div style={{ background: 'white', borderRadius: '16px', padding: '24px', marginBottom: '24px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '600', color: COLORS.primary, marginBottom: '16px' }}>Material Content Report (lbs/gal)</h3>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ background: '#f8fafc' }}>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '600', color: '#475569', borderBottom: '2px solid #e2e8f0' }}>Product</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '600', color: '#475569', borderBottom: '2px solid #e2e8f0' }}>Category</th>
                    <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: '600', color: '#475569', borderBottom: '2px solid #e2e8f0' }}>VOC (lb/gal)</th>
                    <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: '600', color: '#475569', borderBottom: '2px solid #e2e8f0' }}>Agg. HAPs (lb/gal)</th>
                    <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: '600', color: '#475569', borderBottom: '2px solid #e2e8f0' }}>Cumene (lb/gal)</th>
                    <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: '600', color: '#475569', borderBottom: '2px solid #e2e8f0' }}>Dibasic Ester (lb/gal)</th>
                    <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: '600', color: '#475569', borderBottom: '2px solid #e2e8f0' }}>Ethylbenzene (lb/gal)</th>
                  </tr>
                </thead>
                <tbody>
                  {materialContent.map((p, i) => (
                    <tr key={p.id} style={{ background: i % 2 === 0 ? 'white' : '#fafafa' }}>
                      <td style={{ padding: '12px 16px', fontWeight: '500' }}>{p.name}</td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: '600', background: `${getCategoryColor(p.category)}20`, color: getCategoryColor(p.category) }}>{p.category}</span>
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right' }}>{p.vocLbsGal.toFixed(2)}</td>
                      <td style={{ padding: '12px 16px', textAlign: 'right' }}>{p.hapLbsGal.toFixed(4)}</td>
                      <td style={{ padding: '12px 16px', textAlign: 'right' }}>{p.cumene.toFixed(4)}</td>
                      <td style={{ padding: '12px 16px', textAlign: 'right' }}>{p.dibasicEster.toFixed(4)}</td>
                      <td style={{ padding: '12px 16px', textAlign: 'right' }}>{p.ethylbenzene.toFixed(4)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Month-End Summary */}
            <div style={{ background: 'white', borderRadius: '16px', padding: '24px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: '600', color: COLORS.primary, margin: 0 }}>Month-End Emissions Summary</h3>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <select value={selectedMonth} onChange={e => setSelectedMonth(parseInt(e.target.value))} style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '13px' }}>
                    {MONTHS.map((m, i) => <option key={i} value={i}>{m}</option>)}
                  </select>
                  <select value={selectedYear} onChange={e => setSelectedYear(parseInt(e.target.value))} style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '13px' }}>
                    {[2023, 2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                <div>
                  <h4 style={{ fontSize: '14px', fontWeight: '600', color: '#475569', marginBottom: '12px' }}>Monthly Totals</h4>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                    <tbody>
                      <tr style={{ borderBottom: '1px solid #f1f5f9' }}><td style={{ padding: '10px 0', fontWeight: '500' }}>Material Usage</td><td style={{ padding: '10px 0', textAlign: 'right' }}>{monthlySummary.total.gallons.toFixed(2)} gal</td></tr>
                      <tr style={{ borderBottom: '1px solid #f1f5f9' }}><td style={{ padding: '10px 0', fontWeight: '500' }}>VOC Emissions</td><td style={{ padding: '10px 0', textAlign: 'right' }}>{monthlySummary.total.vocTons.toFixed(4)} tons</td></tr>
                      <tr style={{ borderBottom: '1px solid #f1f5f9' }}><td style={{ padding: '10px 0', fontWeight: '500' }}>Aggregate HAPs</td><td style={{ padding: '10px 0', textAlign: 'right' }}>{monthlySummary.total.hapTons.toFixed(4)} tons</td></tr>
                      <tr style={{ borderBottom: '1px solid #f1f5f9' }}><td style={{ padding: '10px 0', fontWeight: '500' }}>Cumene</td><td style={{ padding: '10px 0', textAlign: 'right' }}>{monthlySummary.total.cumeneTons.toFixed(6)} tons</td></tr>
                      <tr style={{ borderBottom: '1px solid #f1f5f9' }}><td style={{ padding: '10px 0', fontWeight: '500' }}>Dibasic Ester</td><td style={{ padding: '10px 0', textAlign: 'right' }}>{monthlySummary.total.dibasicEsterTons.toFixed(6)} tons</td></tr>
                      <tr><td style={{ padding: '10px 0', fontWeight: '500' }}>Ethylbenzene</td><td style={{ padding: '10px 0', textAlign: 'right' }}>{monthlySummary.total.ethylbenzeneTons.toFixed(6)} tons</td></tr>
                    </tbody>
                  </table>
                </div>
                <div>
                  <h4 style={{ fontSize: '14px', fontWeight: '600', color: '#475569', marginBottom: '12px' }}>Rolling 12-Month Totals</h4>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                    <tbody>
                      <tr style={{ borderBottom: '1px solid #f1f5f9' }}><td style={{ padding: '10px 0', fontWeight: '500' }}>Material Usage</td><td style={{ padding: '10px 0', textAlign: 'right' }}>{rollingYearData.gallons.toFixed(2)} gal</td></tr>
                      <tr style={{ borderBottom: '1px solid #f1f5f9' }}><td style={{ padding: '10px 0', fontWeight: '500' }}>VOC Emissions</td><td style={{ padding: '10px 0', textAlign: 'right' }}>{rollingYearData.vocTons.toFixed(4)} tons</td></tr>
                      <tr style={{ borderBottom: '1px solid #f1f5f9' }}><td style={{ padding: '10px 0', fontWeight: '500' }}>Aggregate HAPs</td><td style={{ padding: '10px 0', textAlign: 'right' }}>{rollingYearData.hapTons.toFixed(4)} tons</td></tr>
                      <tr style={{ borderBottom: '1px solid #f1f5f9' }}><td style={{ padding: '10px 0', fontWeight: '500' }}>Cumene</td><td style={{ padding: '10px 0', textAlign: 'right' }}>{rollingYearData.cumeneTons.toFixed(6)} tons</td></tr>
                      <tr style={{ borderBottom: '1px solid #f1f5f9' }}><td style={{ padding: '10px 0', fontWeight: '500' }}>Dibasic Ester</td><td style={{ padding: '10px 0', textAlign: 'right' }}>{rollingYearData.dibasicEsterTons.toFixed(6)} tons</td></tr>
                      <tr><td style={{ padding: '10px 0', fontWeight: '500' }}>Ethylbenzene</td><td style={{ padding: '10px 0', textAlign: 'right' }}>{rollingYearData.ethylbenzeneTons.toFixed(6)} tons</td></tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer style={{ background: '#f8fafc', borderTop: '1px solid #e2e8f0', padding: '16px 32px', marginTop: '40px' }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <p style={{ fontSize: '12px', color: '#94a3b8', margin: 0 }}>VOC Emissions Tracker • Environmental Compliance Management System</p>
          <p style={{ fontSize: '12px', color: '#94a3b8', margin: 0 }}>Tracks: VOC, HAPs, Cumene (CAS 98-82-8), Dibasic Ester, Ethylbenzene (CAS 100-41-4)</p>
        </div>
      </footer>
    </div>
  );
}
