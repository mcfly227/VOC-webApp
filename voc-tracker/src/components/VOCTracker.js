import React, { useState, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

// Product types mapping from PDS system: 1=Basecoat, 2=Hardener, 3=Solvent, 5=Clearcoat
const PRODUCT_TYPES = { 1: 'Basecoat', 2: 'Hardener', 3: 'Solvent', 5: 'Clearcoat' };
const EMISSION_UNITS = ['EU-CoatingLine-01', 'EU-CoatingLine-02', 'EU-CoatingLine-03'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Regulatory limits from PTI 183-15
const LIMITS = {
  vocEU1: 40, vocEU2: 40, vocEU3: 10, vocFGCoating: 89.9,
  dibasicEster: 2.9, ethylbenzene: 2.9, cumene: 1.4,
  aggregateHAPs: 8.9
};

// Sample products from the PDS system
const SAMPLE_PRODUCTS = [
  { id: 'G56B1105', name: 'Rivian Black Mountain', number: 'G56B1105', supplier: 'Sherwin Williams', type: 1, sg: 1.05, vocLbsGal: 3.55, hapW: 0.02, hapV: 0.09, dibasicEster: 0, ethylbenzene: 0, cumene: 0 },
  { id: '585W14J', name: 'Jet Black 600R', number: '585W14J', supplier: 'Redspot', type: 1, sg: 1.055, vocLbsGal: 0.085, hapW: 0, hapV: 0, dibasicEster: 0, ethylbenzene: 0, cumene: 0 },
  { id: '4800LE7', name: 'Jet Black 600R', number: '4800LE7', supplier: 'Redspot', type: 1, sg: 1.065, vocLbsGal: 4.56, hapW: 0, hapV: 0, dibasicEster: 0, ethylbenzene: 0, cumene: 0 },
  { id: 'SPU78534VA', name: 'Econet Z Clear G50S', number: 'SPU78534VA', supplier: 'PPG', type: 5, sg: 0.982, vocLbsGal: 4.95, hapW: 0.07, hapV: 0.24, dibasicEster: 0.001, ethylbenzene: 0.0005, cumene: 0.0002 },
  { id: 'V66VM156', name: 'G56 Hardener', number: 'V66VM156', supplier: 'Sherwin Williams', type: 2, sg: 0.97, vocLbsGal: 3.8, hapW: 0.02, hapV: 0.107, dibasicEster: 0, ethylbenzene: 0, cumene: 0 },
  { id: '85456', name: 'Acetone', number: '85456', supplier: 'Nexeo', type: 3, sg: 0.791, vocLbsGal: 0, hapW: 0, hapV: 0, dibasicEster: 0, ethylbenzene: 0, cumene: 0 },
  { id: 'P1C21A', name: 'Low VOC Adhesion Promoter', number: 'P1C21A', supplier: 'Sherwin Williams', type: 1, sg: 0.96, vocLbsGal: 4.59, hapW: 0, hapV: 0.133, dibasicEster: 0, ethylbenzene: 0, cumene: 0 },
  { id: 'SL10', name: 'Waterborne Urethane Hardener', number: 'SL10', supplier: 'Redspot', type: 2, sg: 1.016, vocLbsGal: 0.536, hapW: 0.004, hapV: 0.019, dibasicEster: 0, ethylbenzene: 0, cumene: 0 },
];

// Generate sample usage data
const generateSampleUsage = () => {
  const usage = [];
  const now = new Date();
  for (let i = 365; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    if (date.getDay() !== 0 && date.getDay() !== 6) {
      const numEntries = Math.floor(Math.random() * 6) + 2;
      for (let j = 0; j < numEntries; j++) {
        const product = SAMPLE_PRODUCTS[Math.floor(Math.random() * SAMPLE_PRODUCTS.length)];
        const eu = EMISSION_UNITS[Math.floor(Math.random() * EMISSION_UNITS.length)];
        const gallons = Math.round((Math.random() * 50 + 5) * 100) / 100;
        const partType = Math.random() > 0.3 ? 'Automotive' : 'Non-Automotive Specialty';
        usage.push({
          id: `${date.toISOString()}-${j}`,
          date: date.toISOString().split('T')[0],
          productId: product.id,
          productName: product.name,
          productNumber: product.number,
          productType: product.type,
          emissionUnit: eu,
          partType,
          gallons,
          vocLbs: gallons * product.vocLbsGal,
          hapLbs: gallons * product.hapV * product.sg * 8.34,
          dibasicEsterLbs: gallons * product.dibasicEster * product.sg * 8.34,
          ethylbenzeneLbs: gallons * product.ethylbenzene * product.sg * 8.34,
          cumeneLbs: gallons * product.cumene * product.sg * 8.34
        });
      }
    }
  }
  return usage;
};

const COLORS = { 
  primary: '#1e3a5f', accent: '#f97316', 
  success: '#22c55e', warning: '#eab308', danger: '#ef4444', 
  purple: '#8b5cf6', gray: '#64748b'
};

export default function VOCTracker() {
  const [products] = useState(SAMPLE_PRODUCTS);
  const [usageLog, setUsageLog] = useState(() => generateSampleUsage());
  const [activeTab, setActiveTab] = useState('aggregate-emissions');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [newUsage, setNewUsage] = useState({ productId: '', emissionUnit: EMISSION_UNITS[0], gallons: '', date: new Date().toISOString().split('T')[0], partType: 'Automotive' });

  // Calculate emissions by EU and time period (matching Aggregate Emissions Report structure)
  const aggregateEmissions = useMemo(() => {
    const results = [];
    const now = new Date();
    
    for (let monthOffset = 0; monthOffset < 60; monthOffset++) {
      const targetDate = new Date(now.getFullYear(), now.getMonth() - monthOffset, 1);
      const year = targetDate.getFullYear();
      const month = targetDate.getMonth();
      
      const startDate = new Date(year, month, 1);
      const endDate = new Date(year, month + 1, 0);
      
      // Filter monthly data
      const monthlyData = usageLog.filter(u => {
        const d = new Date(u.date);
        return d >= startDate && d <= endDate;
      });
      
      // Calculate rolling 12-month data
      const rolling12Start = new Date(year, month - 11, 1);
      const rolling12Data = usageLog.filter(u => {
        const d = new Date(u.date);
        return d >= rolling12Start && d <= endDate;
      });
      
      // By EU
      const byEU = {};
      EMISSION_UNITS.forEach(eu => {
        const euMonthly = monthlyData.filter(u => u.emissionUnit === eu);
        const euRolling = rolling12Data.filter(u => u.emissionUnit === eu);
        byEU[eu] = {
          vocMonthly: euMonthly.reduce((s, u) => s + u.vocLbs, 0) / 2000,
          vocRolling: euRolling.reduce((s, u) => s + u.vocLbs, 0) / 2000
        };
      });
      
      // FG-Coating totals
      const vocMonthlyTotal = monthlyData.reduce((s, u) => s + u.vocLbs, 0) / 2000;
      const vocRollingTotal = rolling12Data.reduce((s, u) => s + u.vocLbs, 0) / 2000;
      
      // CAS Specific (in lbs for Dibasic Ester and Ethylbenzene, tons for Cumene)
      const dibasicEsterMonthly = monthlyData.reduce((s, u) => s + u.dibasicEsterLbs, 0);
      const dibasicEsterRolling = rolling12Data.reduce((s, u) => s + u.dibasicEsterLbs, 0);
      const ethylbenzeneMonthly = monthlyData.reduce((s, u) => s + u.ethylbenzeneLbs, 0);
      const ethylbenzeneRolling = rolling12Data.reduce((s, u) => s + u.ethylbenzeneLbs, 0);
      const cumeneMonthly = monthlyData.reduce((s, u) => s + u.cumeneLbs, 0) / 2000;
      const cumeneRolling = rolling12Data.reduce((s, u) => s + u.cumeneLbs, 0) / 2000;
      
      // HAPs
      const hapMonthly = monthlyData.reduce((s, u) => s + u.hapLbs, 0) / 2000;
      const hapRolling = rolling12Data.reduce((s, u) => s + u.hapLbs, 0) / 2000;
      
      results.push({
        year, month, monthName: MONTHS[month],
        byEU,
        vocMonthlyTotal, vocRollingTotal,
        dibasicEsterMonthly, dibasicEsterRolling,
        ethylbenzeneMonthly, ethylbenzeneRolling,
        cumeneMonthly, cumeneRolling,
        hapMonthly, hapRolling
      });
    }
    return results;
  }, [usageLog]);

  // Aggregate Material Use (in gallons)
  const aggregateMaterialUse = useMemo(() => {
    const results = [];
    const now = new Date();
    
    for (let monthOffset = 0; monthOffset < 60; monthOffset++) {
      const targetDate = new Date(now.getFullYear(), now.getMonth() - monthOffset, 1);
      const year = targetDate.getFullYear();
      const month = targetDate.getMonth();
      
      const startDate = new Date(year, month, 1);
      const endDate = new Date(year, month + 1, 0);
      
      const monthlyData = usageLog.filter(u => {
        const d = new Date(u.date);
        return d >= startDate && d <= endDate;
      });
      
      const byEU = {};
      EMISSION_UNITS.forEach(eu => {
        byEU[eu] = monthlyData.filter(u => u.emissionUnit === eu).reduce((s, u) => s + u.gallons, 0);
      });
      
      const total = monthlyData.reduce((s, u) => s + u.gallons, 0);
      
      results.push({ year, month, monthName: MONTHS[month], byEU, total });
    }
    return results;
  }, [usageLog]);

  // Daily usage by EU (matching Daily Use sheets)
  const dailyUseByEU = useMemo(() => {
    const startDate = new Date(selectedYear, selectedMonth, 1);
    const endDate = new Date(selectedYear, selectedMonth + 1, 0);
    
    const filtered = usageLog.filter(u => {
      const d = new Date(u.date);
      return d >= startDate && d <= endDate;
    });
    
    const byEU = {};
    EMISSION_UNITS.forEach(eu => {
      byEU[eu] = filtered
        .filter(u => u.emissionUnit === eu)
        .map(u => ({
          date: u.date,
          coatingType: PRODUCT_TYPES[u.productType] || 'Unknown',
          prodNumber: u.productNumber,
          partType: u.partType,
          materialUse: u.gallons
        }))
        .sort((a, b) => a.date.localeCompare(b.date));
    });
    return byEU;
  }, [usageLog, selectedMonth, selectedYear]);

  // Material Content Report
  const materialContent = useMemo(() => {
    return products.map(p => ({
      productNumber: p.number,
      hapContent: p.hapV * p.sg * 8.34,
      vocContent: p.vocLbsGal,
      cumeneContent: p.cumene * p.sg * 8.34,
      dimethylAdipate: p.dibasicEster * p.sg * 8.34 * 0.4,
      dimethylGlutarate: p.dibasicEster * p.sg * 8.34 * 0.4,
      dimethylSuccinate: p.dibasicEster * p.sg * 8.34 * 0.2,
      ethylbenzeneContent: p.ethylbenzene * p.sg * 8.34
    }));
  }, [products]);

  // Handle add usage
  const handleAddUsage = () => {
    if (!newUsage.productId || !newUsage.gallons) return;
    const product = products.find(p => p.id === newUsage.productId);
    if (!product) return;
    const gallons = parseFloat(newUsage.gallons);
    const entry = {
      id: Date.now().toString(),
      date: newUsage.date,
      productId: product.id,
      productName: product.name,
      productNumber: product.number,
      productType: product.type,
      emissionUnit: newUsage.emissionUnit,
      partType: newUsage.partType,
      gallons,
      vocLbs: gallons * product.vocLbsGal,
      hapLbs: gallons * product.hapV * product.sg * 8.34,
      dibasicEsterLbs: gallons * product.dibasicEster * product.sg * 8.34,
      ethylbenzeneLbs: gallons * product.ethylbenzene * product.sg * 8.34,
      cumeneLbs: gallons * product.cumene * product.sg * 8.34
    };
    setUsageLog([...usageLog, entry]);
    setNewUsage({ ...newUsage, productId: '', gallons: '' });
  };

  // Get current month data for display
  const currentMonthIdx = aggregateEmissions.findIndex(e => e.year === selectedYear && e.month === selectedMonth);
  const currentEmissions = currentMonthIdx >= 0 ? aggregateEmissions[currentMonthIdx] : null;

  // Chart data for trend
  const trendData = aggregateEmissions.slice(0, 12).reverse().map(e => ({
    month: `${e.monthName} ${e.year}`,
    vocMonthly: e.vocMonthlyTotal,
    vocRolling: e.vocRollingTotal,
    hapMonthly: e.hapMonthly,
    hapRolling: e.hapRolling
  }));

  const LimitIndicator = ({ value, limit, label }) => {
    const pct = (value / limit) * 100;
    const color = pct > 90 ? COLORS.danger : pct > 75 ? COLORS.warning : COLORS.success;
    return (
      <div style={{ marginBottom: '8px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
          <span>{label}</span>
          <span style={{ color }}>{value.toFixed(4)} / {limit} TPY ({pct.toFixed(1)}%)</span>
        </div>
        <div style={{ background: '#e2e8f0', borderRadius: '4px', height: '8px', overflow: 'hidden' }}>
          <div style={{ width: `${Math.min(pct, 100)}%`, height: '100%', background: color, transition: 'width 0.3s' }} />
        </div>
      </div>
    );
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f1f5f9', fontFamily: "'Inter', -apple-system, sans-serif" }}>
      {/* Header */}
      <header style={{ background: 'linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%)', color: 'white', padding: '16px 24px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
        <div style={{ maxWidth: '1600px', margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h1 style={{ fontSize: '22px', fontWeight: '700', margin: 0 }}>
                <span style={{ color: COLORS.accent }}>PTI 183-15</span> Aggregate Emissions Tracker
              </h1>
              <p style={{ fontSize: '13px', color: '#94a3b8', margin: '4px 0 0' }}>EGLE Environmental Compliance Management System</p>
            </div>
            <div style={{ display: 'flex', gap: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '8px', padding: '4px' }}>
              {[
                { id: 'aggregate-emissions', label: '1. Aggregate Emissions' },
                { id: 'aggregate-material', label: '2. Material Use' },
                { id: 'daily-use', label: '3-6. Daily Use by EU' },
                { id: 'material-content', label: '7. Material Content' },
                { id: 'log-usage', label: 'Log Usage' }
              ].map(tab => (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                  style={{ padding: '8px 14px', borderRadius: '6px', border: 'none', background: activeTab === tab.id ? 'white' : 'transparent', color: activeTab === tab.id ? COLORS.primary : 'rgba(255,255,255,0.8)', fontWeight: '500', fontSize: '12px', cursor: 'pointer' }}>
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      {/* Date Selector */}
      <div style={{ background: 'white', borderBottom: '1px solid #e2e8f0', padding: '12px 24px' }}>
        <div style={{ maxWidth: '1600px', margin: '0 auto', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span style={{ fontSize: '13px', fontWeight: '600', color: COLORS.gray }}>Report Period:</span>
          <select value={selectedMonth} onChange={e => setSelectedMonth(parseInt(e.target.value))} style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '13px' }}>
            {MONTHS.map((m, i) => <option key={i} value={i}>{m}</option>)}
          </select>
          <select value={selectedYear} onChange={e => setSelectedYear(parseInt(e.target.value))} style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '13px' }}>
            {[2023, 2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      <main style={{ maxWidth: '1600px', margin: '0 auto', padding: '20px 24px' }}>
        {/* Tab 1: Aggregate Emissions Report */}
        {activeTab === 'aggregate-emissions' && currentEmissions && (
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: '700', color: COLORS.primary, margin: '0 0 20px' }}>1. Aggregate Emissions Report</h2>
            
            {/* Regulatory Limits Status */}
            <div style={{ background: 'white', borderRadius: '12px', padding: '20px', marginBottom: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
              <h3 style={{ fontSize: '14px', fontWeight: '600', color: COLORS.primary, marginBottom: '16px' }}>Rolling 12-Month vs. PTI Limits</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px' }}>
                <div>
                  <LimitIndicator value={currentEmissions.byEU['EU-CoatingLine-01']?.vocRolling || 0} limit={LIMITS.vocEU1} label="EU-CoatingLine-01 VOC" />
                  <LimitIndicator value={currentEmissions.byEU['EU-CoatingLine-02']?.vocRolling || 0} limit={LIMITS.vocEU2} label="EU-CoatingLine-02 VOC" />
                </div>
                <div>
                  <LimitIndicator value={currentEmissions.byEU['EU-CoatingLine-03']?.vocRolling || 0} limit={LIMITS.vocEU3} label="EU-CoatingLine-03 VOC" />
                  <LimitIndicator value={currentEmissions.vocRollingTotal} limit={LIMITS.vocFGCoating} label="FG-Coating Total VOC" />
                </div>
                <div>
                  <LimitIndicator value={currentEmissions.dibasicEsterRolling / 2000} limit={LIMITS.dibasicEster} label="Dibasic Ester (FG-Coating)" />
                  <LimitIndicator value={currentEmissions.ethylbenzeneRolling / 2000} limit={LIMITS.ethylbenzene} label="Ethylbenzene (FG-Coating)" />
                </div>
                <div>
                  <LimitIndicator value={currentEmissions.cumeneRolling} limit={LIMITS.cumene} label="Cumene (FG-Facility)" />
                  <LimitIndicator value={currentEmissions.hapRolling} limit={LIMITS.aggregateHAPs} label="Aggregate HAPs (FG-Facility)" />
                </div>
              </div>
            </div>

            {/* VOC Emissions Table */}
            <div style={{ background: 'white', borderRadius: '12px', padding: '20px', marginBottom: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
              <h3 style={{ fontSize: '14px', fontWeight: '600', color: COLORS.primary, marginBottom: '16px' }}>VOC Emissions (Tons)</h3>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc' }}>
                      <th style={{ padding: '10px', textAlign: 'left', borderBottom: '2px solid #e2e8f0', fontWeight: '600' }}>Year</th>
                      <th style={{ padding: '10px', textAlign: 'left', borderBottom: '2px solid #e2e8f0', fontWeight: '600' }}>Month</th>
                      <th colSpan={2} style={{ padding: '10px', textAlign: 'center', borderBottom: '2px solid #e2e8f0', fontWeight: '600', background: '#fef3c7' }}>EU-CoatingLine-01</th>
                      <th colSpan={2} style={{ padding: '10px', textAlign: 'center', borderBottom: '2px solid #e2e8f0', fontWeight: '600', background: '#dbeafe' }}>EU-CoatingLine-02</th>
                      <th colSpan={2} style={{ padding: '10px', textAlign: 'center', borderBottom: '2px solid #e2e8f0', fontWeight: '600', background: '#dcfce7' }}>EU-CoatingLine-03</th>
                      <th colSpan={2} style={{ padding: '10px', textAlign: 'center', borderBottom: '2px solid #e2e8f0', fontWeight: '600', background: '#f3e8ff' }}>FG-Coating</th>
                    </tr>
                    <tr style={{ background: '#f8fafc' }}>
                      <th style={{ padding: '6px 10px', borderBottom: '1px solid #e2e8f0' }}></th>
                      <th style={{ padding: '6px 10px', borderBottom: '1px solid #e2e8f0' }}></th>
                      <th style={{ padding: '6px 10px', textAlign: 'right', borderBottom: '1px solid #e2e8f0', fontSize: '10px' }}>Monthly</th>
                      <th style={{ padding: '6px 10px', textAlign: 'right', borderBottom: '1px solid #e2e8f0', fontSize: '10px' }}>12-Mo Rolling</th>
                      <th style={{ padding: '6px 10px', textAlign: 'right', borderBottom: '1px solid #e2e8f0', fontSize: '10px' }}>Monthly</th>
                      <th style={{ padding: '6px 10px', textAlign: 'right', borderBottom: '1px solid #e2e8f0', fontSize: '10px' }}>12-Mo Rolling</th>
                      <th style={{ padding: '6px 10px', textAlign: 'right', borderBottom: '1px solid #e2e8f0', fontSize: '10px' }}>Monthly</th>
                      <th style={{ padding: '6px 10px', textAlign: 'right', borderBottom: '1px solid #e2e8f0', fontSize: '10px' }}>12-Mo Rolling</th>
                      <th style={{ padding: '6px 10px', textAlign: 'right', borderBottom: '1px solid #e2e8f0', fontSize: '10px' }}>Monthly</th>
                      <th style={{ padding: '6px 10px', textAlign: 'right', borderBottom: '1px solid #e2e8f0', fontSize: '10px' }}>12-Mo Rolling</th>
                    </tr>
                  </thead>
                  <tbody>
                    {aggregateEmissions.slice(0, 24).map((row, i) => (
                      <tr key={i} style={{ background: row.year === selectedYear && row.month === selectedMonth ? '#fffbeb' : i % 2 === 0 ? 'white' : '#fafafa' }}>
                        <td style={{ padding: '8px 10px', fontWeight: '500' }}>{row.month === 0 ? row.year : ''}</td>
                        <td style={{ padding: '8px 10px' }}>{row.monthName}</td>
                        <td style={{ padding: '8px 10px', textAlign: 'right' }}>{row.byEU['EU-CoatingLine-01']?.vocMonthly.toFixed(4)}</td>
                        <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: '500' }}>{row.byEU['EU-CoatingLine-01']?.vocRolling.toFixed(4)}</td>
                        <td style={{ padding: '8px 10px', textAlign: 'right' }}>{row.byEU['EU-CoatingLine-02']?.vocMonthly.toFixed(4)}</td>
                        <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: '500' }}>{row.byEU['EU-CoatingLine-02']?.vocRolling.toFixed(4)}</td>
                        <td style={{ padding: '8px 10px', textAlign: 'right' }}>{row.byEU['EU-CoatingLine-03']?.vocMonthly.toFixed(4)}</td>
                        <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: '500' }}>{row.byEU['EU-CoatingLine-03']?.vocRolling.toFixed(4)}</td>
                        <td style={{ padding: '8px 10px', textAlign: 'right' }}>{row.vocMonthlyTotal.toFixed(4)}</td>
                        <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: '500' }}>{row.vocRollingTotal.toFixed(4)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* CAS Specific & HAPs Emissions */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
              <div style={{ background: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                <h3 style={{ fontSize: '14px', fontWeight: '600', color: COLORS.primary, marginBottom: '16px' }}>CAS Specific Emissions</h3>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc' }}>
                      <th style={{ padding: '10px', textAlign: 'left', borderBottom: '2px solid #e2e8f0' }}>Chemical</th>
                      <th style={{ padding: '10px', textAlign: 'left', borderBottom: '2px solid #e2e8f0' }}>CAS #</th>
                      <th style={{ padding: '10px', textAlign: 'right', borderBottom: '2px solid #e2e8f0' }}>Monthly</th>
                      <th style={{ padding: '10px', textAlign: 'right', borderBottom: '2px solid #e2e8f0' }}>12-Mo Rolling</th>
                      <th style={{ padding: '10px', textAlign: 'right', borderBottom: '2px solid #e2e8f0' }}>Limit</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td style={{ padding: '8px 10px' }}>Dibasic Ester</td>
                      <td style={{ padding: '8px 10px', fontFamily: 'monospace', fontSize: '11px' }}>627930, 119400, 106650</td>
                      <td style={{ padding: '8px 10px', textAlign: 'right' }}>{currentEmissions.dibasicEsterMonthly.toFixed(2)} lbs</td>
                      <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: '500' }}>{(currentEmissions.dibasicEsterRolling / 2000).toFixed(4)} tons</td>
                      <td style={{ padding: '8px 10px', textAlign: 'right' }}>2.9 TPY</td>
                    </tr>
                    <tr style={{ background: '#fafafa' }}>
                      <td style={{ padding: '8px 10px' }}>Ethylbenzene</td>
                      <td style={{ padding: '8px 10px', fontFamily: 'monospace', fontSize: '11px' }}>100-41-4</td>
                      <td style={{ padding: '8px 10px', textAlign: 'right' }}>{currentEmissions.ethylbenzeneMonthly.toFixed(2)} lbs</td>
                      <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: '500' }}>{(currentEmissions.ethylbenzeneRolling / 2000).toFixed(4)} tons</td>
                      <td style={{ padding: '8px 10px', textAlign: 'right' }}>2.9 TPY</td>
                    </tr>
                    <tr>
                      <td style={{ padding: '8px 10px' }}>Cumene</td>
                      <td style={{ padding: '8px 10px', fontFamily: 'monospace', fontSize: '11px' }}>98-82-8</td>
                      <td style={{ padding: '8px 10px', textAlign: 'right' }}>{currentEmissions.cumeneMonthly.toFixed(6)} tons</td>
                      <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: '500' }}>{currentEmissions.cumeneRolling.toFixed(6)} tons</td>
                      <td style={{ padding: '8px 10px', textAlign: 'right' }}>1.4 TPY</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div style={{ background: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                <h3 style={{ fontSize: '14px', fontWeight: '600', color: COLORS.primary, marginBottom: '16px' }}>HAPs Emissions (Tons)</h3>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc' }}>
                      <th style={{ padding: '10px', textAlign: 'left', borderBottom: '2px solid #e2e8f0' }}>Category</th>
                      <th style={{ padding: '10px', textAlign: 'right', borderBottom: '2px solid #e2e8f0' }}>Monthly</th>
                      <th style={{ padding: '10px', textAlign: 'right', borderBottom: '2px solid #e2e8f0' }}>12-Mo Rolling</th>
                      <th style={{ padding: '10px', textAlign: 'right', borderBottom: '2px solid #e2e8f0' }}>Limit</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td style={{ padding: '8px 10px', fontWeight: '500' }}>Aggregate HAPs (FG-Facility)</td>
                      <td style={{ padding: '8px 10px', textAlign: 'right' }}>{currentEmissions.hapMonthly.toFixed(6)}</td>
                      <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: '500' }}>{currentEmissions.hapRolling.toFixed(6)}</td>
                      <td style={{ padding: '8px 10px', textAlign: 'right' }}>8.9 TPY</td>
                    </tr>
                  </tbody>
                </table>
                <div style={{ marginTop: '20px' }}>
                  <h4 style={{ fontSize: '12px', fontWeight: '600', color: COLORS.gray, marginBottom: '12px' }}>12-Month Trend</h4>
                  <ResponsiveContainer width="100%" height={150}>
                    <LineChart data={trendData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="month" tick={{ fontSize: 9 }} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip />
                      <Line type="monotone" dataKey="vocRolling" name="VOC (12-mo)" stroke={COLORS.accent} strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="hapRolling" name="HAPs (12-mo)" stroke={COLORS.purple} strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Aggregate Material Use */}
        {activeTab === 'aggregate-material' && (
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: '700', color: COLORS.primary, margin: '0 0 20px' }}>2. Aggregate Material Use Report</h2>
            <div style={{ background: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
              <h3 style={{ fontSize: '14px', fontWeight: '600', color: COLORS.primary, marginBottom: '16px' }}>VOC Containing Material Use (Gallons)</h3>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc' }}>
                      <th style={{ padding: '10px', textAlign: 'left', borderBottom: '2px solid #e2e8f0' }}>Year</th>
                      <th style={{ padding: '10px', textAlign: 'left', borderBottom: '2px solid #e2e8f0' }}>Month</th>
                      <th style={{ padding: '10px', textAlign: 'right', borderBottom: '2px solid #e2e8f0', background: '#fef3c7' }}>EU-CoatingLine-01</th>
                      <th style={{ padding: '10px', textAlign: 'right', borderBottom: '2px solid #e2e8f0', background: '#dbeafe' }}>EU-CoatingLine-02</th>
                      <th style={{ padding: '10px', textAlign: 'right', borderBottom: '2px solid #e2e8f0', background: '#dcfce7' }}>EU-CoatingLine-03</th>
                      <th style={{ padding: '10px', textAlign: 'right', borderBottom: '2px solid #e2e8f0', background: '#f3e8ff' }}>FG-Facility Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {aggregateMaterialUse.slice(0, 24).map((row, i) => (
                      <tr key={i} style={{ background: row.year === selectedYear && row.month === selectedMonth ? '#fffbeb' : i % 2 === 0 ? 'white' : '#fafafa' }}>
                        <td style={{ padding: '8px 10px', fontWeight: '500' }}>{row.month === 0 ? row.year : ''}</td>
                        <td style={{ padding: '8px 10px' }}>{row.monthName}</td>
                        <td style={{ padding: '8px 10px', textAlign: 'right' }}>{row.byEU['EU-CoatingLine-01']?.toFixed(2)}</td>
                        <td style={{ padding: '8px 10px', textAlign: 'right' }}>{row.byEU['EU-CoatingLine-02']?.toFixed(2)}</td>
                        <td style={{ padding: '8px 10px', textAlign: 'right' }}>{row.byEU['EU-CoatingLine-03']?.toFixed(2)}</td>
                        <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: '500' }}>{row.total.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3-6: Daily Use by EU */}
        {activeTab === 'daily-use' && (
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: '700', color: COLORS.primary, margin: '0 0 20px' }}>4-6. Daily Use by Emission Unit - {MONTHS[selectedMonth]} {selectedYear}</h2>
            {EMISSION_UNITS.map(eu => (
              <div key={eu} style={{ background: 'white', borderRadius: '12px', padding: '20px', marginBottom: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                <h3 style={{ fontSize: '14px', fontWeight: '600', color: COLORS.primary, marginBottom: '16px' }}>{eu}</h3>
                <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                    <thead style={{ position: 'sticky', top: 0, background: 'white' }}>
                      <tr style={{ background: '#f8fafc' }}>
                        <th style={{ padding: '8px', textAlign: 'left', borderBottom: '2px solid #e2e8f0' }}>Date</th>
                        <th style={{ padding: '8px', textAlign: 'left', borderBottom: '2px solid #e2e8f0' }}>Coating Type</th>
                        <th style={{ padding: '8px', textAlign: 'left', borderBottom: '2px solid #e2e8f0' }}>Product Number</th>
                        <th style={{ padding: '8px', textAlign: 'left', borderBottom: '2px solid #e2e8f0' }}>Part Type</th>
                        <th style={{ padding: '8px', textAlign: 'right', borderBottom: '2px solid #e2e8f0' }}>Material Use (Gals)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dailyUseByEU[eu]?.map((row, i) => (
                        <tr key={i} style={{ background: i % 2 === 0 ? 'white' : '#fafafa' }}>
                          <td style={{ padding: '6px 8px' }}>{row.date}</td>
                          <td style={{ padding: '6px 8px' }}>{row.coatingType}</td>
                          <td style={{ padding: '6px 8px', fontFamily: 'monospace' }}>{row.prodNumber}</td>
                          <td style={{ padding: '6px 8px' }}><span style={{ padding: '2px 6px', borderRadius: '4px', fontSize: '10px', background: row.partType === 'Automotive' ? '#dbeafe' : '#fef3c7', color: row.partType === 'Automotive' ? '#1e40af' : '#92400e' }}>{row.partType}</span></td>
                          <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: '500' }}>{row.materialUse.toFixed(2)}</td>
                        </tr>
                      ))}
                      {(!dailyUseByEU[eu] || dailyUseByEU[eu].length === 0) && (
                        <tr><td colSpan={5} style={{ padding: '20px', textAlign: 'center', color: COLORS.gray }}>No usage data for this period</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Tab 7: Material Content Report */}
        {activeTab === 'material-content' && (
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: '700', color: COLORS.primary, margin: '0 0 20px' }}>7. Material Content Report (FG-Coating)</h2>
            <div style={{ background: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                <thead>
                  <tr style={{ background: '#f8fafc' }}>
                    <th style={{ padding: '10px', textAlign: 'left', borderBottom: '2px solid #e2e8f0' }}>Product Number</th>
                    <th style={{ padding: '10px', textAlign: 'right', borderBottom: '2px solid #e2e8f0' }}>HAP Content<br/><span style={{ fontSize: '10px', fontWeight: 'normal' }}>Lbs/gal</span></th>
                    <th style={{ padding: '10px', textAlign: 'right', borderBottom: '2px solid #e2e8f0' }}>VOC Content<br/><span style={{ fontSize: '10px', fontWeight: 'normal' }}>Lbs/gal</span></th>
                    <th style={{ padding: '10px', textAlign: 'right', borderBottom: '2px solid #e2e8f0' }}>Cumene<br/><span style={{ fontSize: '10px', fontWeight: 'normal' }}>98828 Lbs/gal</span></th>
                    <th style={{ padding: '10px', textAlign: 'right', borderBottom: '2px solid #e2e8f0' }}>Dimethyl Adipate<br/><span style={{ fontSize: '10px', fontWeight: 'normal' }}>627930 Lbs/gal</span></th>
                    <th style={{ padding: '10px', textAlign: 'right', borderBottom: '2px solid #e2e8f0' }}>Dimethyl Glutarate<br/><span style={{ fontSize: '10px', fontWeight: 'normal' }}>119400 Lbs/gal</span></th>
                    <th style={{ padding: '10px', textAlign: 'right', borderBottom: '2px solid #e2e8f0' }}>Dimethyl Succinate<br/><span style={{ fontSize: '10px', fontWeight: 'normal' }}>106650 Lbs/gal</span></th>
                    <th style={{ padding: '10px', textAlign: 'right', borderBottom: '2px solid #e2e8f0' }}>Ethylbenzene<br/><span style={{ fontSize: '10px', fontWeight: 'normal' }}>100414 Lbs/gal</span></th>
                  </tr>
                </thead>
                <tbody>
                  {materialContent.map((row, i) => (
                    <tr key={i} style={{ background: i % 2 === 0 ? 'white' : '#fafafa' }}>
                      <td style={{ padding: '8px 10px', fontFamily: 'monospace', fontWeight: '500' }}>{row.productNumber}</td>
                      <td style={{ padding: '8px 10px', textAlign: 'right' }}>{row.hapContent.toFixed(4)}</td>
                      <td style={{ padding: '8px 10px', textAlign: 'right' }}>{row.vocContent.toFixed(2)}</td>
                      <td style={{ padding: '8px 10px', textAlign: 'right' }}>{row.cumeneContent.toFixed(6)}</td>
                      <td style={{ padding: '8px 10px', textAlign: 'right' }}>{row.dimethylAdipate.toFixed(6)}</td>
                      <td style={{ padding: '8px 10px', textAlign: 'right' }}>{row.dimethylGlutarate.toFixed(6)}</td>
                      <td style={{ padding: '8px 10px', textAlign: 'right' }}>{row.dimethylSuccinate.toFixed(6)}</td>
                      <td style={{ padding: '8px 10px', textAlign: 'right' }}>{row.ethylbenzeneContent.toFixed(6)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Log Usage Tab */}
        {activeTab === 'log-usage' && (
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: '700', color: COLORS.primary, margin: '0 0 20px' }}>Log Material Usage</h2>
            <div style={{ background: 'white', borderRadius: '12px', padding: '20px', marginBottom: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
              <h3 style={{ fontSize: '14px', fontWeight: '600', color: COLORS.primary, marginBottom: '16px' }}>Add Usage Entry</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '16px', alignItems: 'end' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: COLORS.gray, marginBottom: '4px' }}>Date</label>
                  <input type="date" value={newUsage.date} onChange={e => setNewUsage({ ...newUsage, date: e.target.value })} style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '13px' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: COLORS.gray, marginBottom: '4px' }}>Product</label>
                  <select value={newUsage.productId} onChange={e => setNewUsage({ ...newUsage, productId: e.target.value })} style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '13px' }}>
                    <option value="">Select...</option>
                    {products.map(p => <option key={p.id} value={p.id}>{p.number} - {p.name}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: COLORS.gray, marginBottom: '4px' }}>Emission Unit</label>
                  <select value={newUsage.emissionUnit} onChange={e => setNewUsage({ ...newUsage, emissionUnit: e.target.value })} style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '13px' }}>
                    {EMISSION_UNITS.map(eu => <option key={eu} value={eu}>{eu}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: COLORS.gray, marginBottom: '4px' }}>Part Type</label>
                  <select value={newUsage.partType} onChange={e => setNewUsage({ ...newUsage, partType: e.target.value })} style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '13px' }}>
                    <option value="Automotive">Automotive</option>
                    <option value="Non-Automotive Specialty">Non-Automotive Specialty</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: COLORS.gray, marginBottom: '4px' }}>Gallons</label>
                  <input type="number" step="0.01" value={newUsage.gallons} onChange={e => setNewUsage({ ...newUsage, gallons: e.target.value })} placeholder="0.00" style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '13px' }} />
                </div>
                <button onClick={handleAddUsage} style={{ padding: '8px 20px', background: COLORS.accent, color: 'white', border: 'none', borderRadius: '6px', fontWeight: '600', fontSize: '13px', cursor: 'pointer' }}>Add Entry</button>
              </div>
            </div>

            {/* Recent Entries */}
            <div style={{ background: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
              <h3 style={{ fontSize: '14px', fontWeight: '600', color: COLORS.primary, marginBottom: '16px' }}>Recent Usage Entries</h3>
              <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                  <thead style={{ position: 'sticky', top: 0, background: 'white' }}>
                    <tr style={{ background: '#f8fafc' }}>
                      <th style={{ padding: '8px', textAlign: 'left', borderBottom: '2px solid #e2e8f0' }}>Date</th>
                      <th style={{ padding: '8px', textAlign: 'left', borderBottom: '2px solid #e2e8f0' }}>Product</th>
                      <th style={{ padding: '8px', textAlign: 'left', borderBottom: '2px solid #e2e8f0' }}>Type</th>
                      <th style={{ padding: '8px', textAlign: 'left', borderBottom: '2px solid #e2e8f0' }}>EU</th>
                      <th style={{ padding: '8px', textAlign: 'left', borderBottom: '2px solid #e2e8f0' }}>Part Type</th>
                      <th style={{ padding: '8px', textAlign: 'right', borderBottom: '2px solid #e2e8f0' }}>Gallons</th>
                      <th style={{ padding: '8px', textAlign: 'right', borderBottom: '2px solid #e2e8f0' }}>VOC (lbs)</th>
                      <th style={{ padding: '8px', textAlign: 'right', borderBottom: '2px solid #e2e8f0' }}>HAPs (lbs)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {usageLog.slice(-50).reverse().map((u, i) => (
                      <tr key={u.id} style={{ background: i % 2 === 0 ? 'white' : '#fafafa' }}>
                        <td style={{ padding: '6px 8px' }}>{u.date}</td>
                        <td style={{ padding: '6px 8px', fontWeight: '500' }}>{u.productNumber}</td>
                        <td style={{ padding: '6px 8px' }}><span style={{ padding: '2px 6px', borderRadius: '4px', fontSize: '10px', background: '#e2e8f0' }}>{PRODUCT_TYPES[u.productType]}</span></td>
                        <td style={{ padding: '6px 8px', fontSize: '10px' }}>{u.emissionUnit.replace('EU-CoatingLine-', 'EU-')}</td>
                        <td style={{ padding: '6px 8px' }}><span style={{ padding: '2px 6px', borderRadius: '4px', fontSize: '10px', background: u.partType === 'Automotive' ? '#dbeafe' : '#fef3c7' }}>{u.partType === 'Automotive' ? 'Auto' : 'Non-Auto'}</span></td>
                        <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: '500' }}>{u.gallons.toFixed(2)}</td>
                        <td style={{ padding: '6px 8px', textAlign: 'right' }}>{u.vocLbs.toFixed(2)}</td>
                        <td style={{ padding: '6px 8px', textAlign: 'right' }}>{u.hapLbs.toFixed(4)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer style={{ background: '#1e3a5f', color: 'white', padding: '16px 24px', marginTop: '40px' }}>
        <div style={{ maxWidth: '1600px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', color: '#94a3b8' }}>
          <span>PTI 183-15 Aggregate Emissions Tracker • EGLE Environmental Compliance</span>
          <span>Tracks: VOC, HAPs, Dibasic Ester (CAS 627930, 119400, 106650), Ethylbenzene (CAS 100-41-4), Cumene (CAS 98-82-8)</span>
        </div>
      </footer>
    </div>
  );
}
