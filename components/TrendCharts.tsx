'use client'
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement,
  BarElement, Title, Tooltip, Legend, Filler,
} from 'chart.js'
import { Line, Bar } from 'react-chartjs-2'
import type { Financials } from '@/lib/financials'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, Filler)

interface PeriodeData {
  label: string
  financials: Financials
}

interface Props {
  data: PeriodeData[]
}

const BASE_OPTIONS = {
  responsive: true,
  maintainAspectRatio: false,
  animation: { duration: 600 },
  plugins: {
    legend: { position: 'bottom' as const, labels: { font: { family: 'Manrope', size: 11 }, padding: 16, usePointStyle: true, pointStyleWidth: 8 } },
    tooltip: { mode: 'index' as const, intersect: false, backgroundColor: '#fff', titleColor: '#18140F', bodyColor: '#45392E', borderColor: '#DDD5BC', borderWidth: 1, padding: 12, titleFont: { weight: 'bold' as const } },
  },
  scales: {
    x: { grid: { display: false }, ticks: { font: { family: 'Manrope', size: 11 }, color: '#7A6E62' } },
    y: { grid: { color: '#EEE8D8' }, ticks: { font: { family: 'Manrope', size: 11 }, color: '#7A6E62' } },
  },
}

function cardStyle(): React.CSSProperties {
  return { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: '22px 24px', boxShadow: 'var(--shadow)' }
}

function chartTitle(text: string) {
  return <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '.8px', marginBottom: 14 }}>{text}</div>
}

function fmtBillion(val: number) {
  return (val / 1_000_000_000).toFixed(1) + 'M'
}

export default function TrendCharts({ data }: Props) {
  if (!data || data.length < 2) {
    return (
      <div style={{ ...cardStyle(), textAlign: 'center', color: 'var(--text-3)', padding: '40px 24px', marginBottom: 28 }}>
        Pilih minimal 2 periode untuk melihat tren
      </div>
    )
  }

  const labels = data.map(d => d.label)
  const fin = data.map(d => d.financials)

  const profitData = {
    labels,
    datasets: [
      {
        label: 'Laba Kotor',
        data: fin.map(f => f.labaKotor / 1_000_000_000),
        backgroundColor: 'rgba(27,67,50,0.15)',
        borderColor: '#1B4332',
        borderWidth: 2,
        fill: true,
        tension: 0.4,
        pointBackgroundColor: '#1B4332',
        pointRadius: 4,
      },
      {
        label: 'EBIT',
        data: fin.map(f => f.ebit / 1_000_000_000),
        backgroundColor: 'rgba(45,106,79,0.1)',
        borderColor: '#2D6A4F',
        borderWidth: 2,
        fill: false,
        tension: 0.4,
        pointBackgroundColor: '#2D6A4F',
        pointRadius: 4,
      },
      {
        label: 'Laba Bersih',
        data: fin.map(f => f.netIncome / 1_000_000_000),
        backgroundColor: 'rgba(154,110,30,0.1)',
        borderColor: '#9A6E1E',
        borderWidth: 2,
        fill: false,
        tension: 0.4,
        pointBackgroundColor: '#9A6E1E',
        pointRadius: 4,
        borderDash: [4, 3],
      },
    ],
  }

  const liquidityData = {
    labels,
    datasets: [
      {
        label: 'Current Ratio',
        data: fin.map(f => f.currentRatio),
        borderColor: '#1B4332',
        backgroundColor: 'rgba(27,67,50,0.1)',
        borderWidth: 2,
        fill: false,
        tension: 0.4,
        pointBackgroundColor: '#1B4332',
        pointRadius: 4,
      },
      {
        label: 'Quick Ratio',
        data: fin.map(f => f.quickRatio),
        borderColor: '#2D6A4F',
        backgroundColor: 'transparent',
        borderWidth: 2,
        fill: false,
        tension: 0.4,
        pointBackgroundColor: '#2D6A4F',
        pointRadius: 4,
      },
      {
        label: 'Cash Ratio',
        data: fin.map(f => f.cashRatio),
        borderColor: '#9A6E1E',
        backgroundColor: 'transparent',
        borderWidth: 2,
        borderDash: [4, 3],
        fill: false,
        tension: 0.4,
        pointBackgroundColor: '#9A6E1E',
        pointRadius: 4,
      },
    ],
  }

  const marginData = {
    labels,
    datasets: [
      {
        label: 'Gross Margin %',
        data: fin.map(f => f.grossMgn),
        borderColor: '#1B4332',
        backgroundColor: 'rgba(27,67,50,0.12)',
        borderWidth: 2,
        fill: true,
        tension: 0.4,
        pointBackgroundColor: '#1B4332',
        pointRadius: 4,
      },
      {
        label: 'Operating Margin %',
        data: fin.map(f => f.opMgn),
        borderColor: '#2D6A4F',
        backgroundColor: 'transparent',
        borderWidth: 2,
        fill: false,
        tension: 0.4,
        pointBackgroundColor: '#2D6A4F',
        pointRadius: 4,
      },
      {
        label: 'Net Margin %',
        data: fin.map(f => f.netMgn),
        borderColor: '#9A6E1E',
        backgroundColor: 'transparent',
        borderWidth: 2,
        borderDash: [4, 3],
        fill: false,
        tension: 0.4,
        pointBackgroundColor: '#9A6E1E',
        pointRadius: 4,
      },
    ],
  }

  const strukturData = {
    labels,
    datasets: [
      {
        label: 'D/E Ratio',
        data: fin.map(f => f.de),
        backgroundColor: fin.map(f => f.de > 2 ? 'rgba(192,56,30,0.7)' : f.de > 1 ? 'rgba(154,110,30,0.7)' : 'rgba(27,67,50,0.7)'),
        borderRadius: 6,
        borderSkipped: false,
      },
    ],
  }

  const pctOpts = {
    ...BASE_OPTIONS,
    plugins: { ...BASE_OPTIONS.plugins },
    scales: {
      ...BASE_OPTIONS.scales,
      y: { ...BASE_OPTIONS.scales.y, ticks: { ...BASE_OPTIONS.scales.y.ticks, callback: (v: number | string) => v + '%' } },
    },
  }

  const ratioOpts = {
    ...BASE_OPTIONS,
    plugins: { ...BASE_OPTIONS.plugins },
    scales: {
      ...BASE_OPTIONS.scales,
      y: { ...BASE_OPTIONS.scales.y, ticks: { ...BASE_OPTIONS.scales.y.ticks, callback: (v: number | string) => v + '×' } },
    },
  }

  const rpOpts = {
    ...BASE_OPTIONS,
    plugins: { ...BASE_OPTIONS.plugins, legend: { display: false } },
    scales: {
      ...BASE_OPTIONS.scales,
      y: { ...BASE_OPTIONS.scales.y, ticks: { ...BASE_OPTIONS.scales.y.ticks, callback: (v: number | string) => v + '×' } },
    },
  }

  const miliardOpts = {
    ...BASE_OPTIONS,
    plugins: { ...BASE_OPTIONS.plugins },
    scales: {
      ...BASE_OPTIONS.scales,
      y: { ...BASE_OPTIONS.scales.y, ticks: { ...BASE_OPTIONS.scales.y.ticks, callback: (v: number | string) => fmtBillion(Number(v) * 1_000_000_000) } },
    },
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18, marginBottom: 28 }}>
      <div style={cardStyle()}>
        {chartTitle('Laba Kotor, EBIT & Laba Bersih (Miliar Rp)')}
        <div style={{ height: 240 }}>
          <Line data={profitData} options={miliardOpts} />
        </div>
      </div>

      <div style={cardStyle()}>
        {chartTitle('Rasio Likuiditas')}
        <div style={{ height: 240 }}>
          <Line data={liquidityData} options={ratioOpts} />
        </div>
      </div>

      <div style={cardStyle()}>
        {chartTitle('Margin Profitabilitas (%)')}
        <div style={{ height: 240 }}>
          <Line data={marginData} options={pctOpts} />
        </div>
      </div>

      <div style={cardStyle()}>
        {chartTitle('Debt-to-Equity Ratio')}
        <div style={{ height: 240 }}>
          <Bar data={strukturData} options={rpOpts} />
        </div>
      </div>
    </div>
  )
}
