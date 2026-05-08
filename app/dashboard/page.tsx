'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { computeFinancials, healthScore, fmtRp, fmtPct, fmtRatio, fmtHari, fmtM, type Financials, type FinancialRow } from '@/lib/financials'
import dynamic from 'next/dynamic'

const TrendCharts = dynamic(() => import('@/components/TrendCharts'), { ssr: false })

interface PeriodeData {
  label: string
  rows: FinancialRow[]
  financials: Financials
}

const MONTHS = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des']

function periodLabel(p: string) {
  const y = p.slice(0,4), m = parseInt(p.slice(5,7))
  return `${MONTHS[m-1]} ${y}`
}

export default function DashboardPage() {
  const router = useRouter()
  const [user, setUser] = useState<{ email: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const [allData, setAllData] = useState<Record<string, FinancialRow[]>>({})
  const [availablePeriods, setAvailablePeriods] = useState<string[]>([])
  const [selectedPeriods, setSelectedPeriods] = useState<Set<string>>(new Set())
  const [filterOpen, setFilterOpen] = useState(false)
  const [activeData, setActiveData] = useState<PeriodeData[]>([])

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) { router.push('/'); return }
      setUser({ email: data.session.user.email ?? '' })
      fetchData()
    })
  }, [])

  async function fetchData() {
    setLoading(true)
    const allRows: FinancialRow[] = []
    let from = 0
    const pageSize = 1000
    while (true) {
      const { data, error } = await supabase
        .from('ringkasan-bukubesar-ddd')
        .select('kode,saldo_akhir,debet,kredit,periode_akhir')
        .range(from, from + pageSize - 1)
      if (error || !data || data.length === 0) break
      allRows.push(...data)
      if (data.length < pageSize) break
      from += pageSize
    }
    const grouped: Record<string, FinancialRow[]> = {}
    for (const r of allRows) {
      if (!grouped[r.periode_akhir]) grouped[r.periode_akhir] = []
      grouped[r.periode_akhir].push(r)
    }
    const periods = Object.keys(grouped).sort()
    const last6 = new Set(periods.slice(-6))
    setAllData(grouped)
    setAvailablePeriods(periods)
    setSelectedPeriods(last6)
    setLoading(false)
  }

  useEffect(() => {
    const sorted = [...selectedPeriods].sort()
    const data = sorted.map(p => ({
      label: periodLabel(p),
      rows: allData[p] ?? [],
      financials: computeFinancials(allData[p] ?? []),
    }))
    setActiveData(data)
  }, [selectedPeriods, allData])

  async function doLogout() {
    await supabase.auth.signOut()
    router.push('/')
  }

  const latest = activeData[activeData.length - 1]
  const f = latest?.financials
  const score = f ? healthScore(f) : 0

  if (loading) return (
    <div style={{ position: 'fixed', inset: 0, background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16, zIndex: 999 }}>
      <div style={{ width: 36, height: 36, border: '3px solid var(--border)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin .7s linear infinite' }} />
      <span style={{ fontSize: 14, color: 'var(--text-2)' }}>Memuat data...</span>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      {/* TOPBAR */}
      <div style={{
        background: 'var(--surface)', borderBottom: '1px solid var(--border)', padding: '0 28px',
        display: 'flex', alignItems: 'center', gap: 16, height: 64,
        position: 'sticky', top: 0, zIndex: 300,
        boxShadow: '0 1px 0 var(--border), 0 2px 12px rgba(26,22,18,0.04)',
      }}>
        <div style={{ fontFamily: 'var(--font-fraunces)', fontWeight: 700, fontSize: 19, color: 'var(--accent)', marginRight: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 8, height: 8, background: 'var(--accent)', borderRadius: '50%', display: 'inline-block' }} />
          DDD <span style={{ color: 'var(--text-3)', fontFamily: 'var(--font-manrope)', fontWeight: 400, fontSize: 13 }}>· Analisa Rasio Keuangan</span>
        </div>
        <button onClick={() => window.print()} style={{ padding: '8px 18px', borderRadius: 10, fontWeight: 600, cursor: 'pointer', border: '1.5px solid var(--border)', background: 'var(--surface)', color: 'var(--text-2)', fontSize: 13 }}>
          ⎙ Cetak
        </button>
        <div onClick={doLogout} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 14px', background: 'var(--surface-2)', borderRadius: 24, fontSize: 12, color: 'var(--text-2)', cursor: 'pointer' }}>
          <div style={{ width: 26, height: 26, background: 'linear-gradient(135deg,var(--accent),var(--accent-light))', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 11, fontWeight: 700 }}>
            {user?.email?.[0]?.toUpperCase() ?? '?'}
          </div>
          <span>{user?.email}</span>
          <span style={{ color: 'var(--border-strong)' }}>·</span>
          <span>Keluar</span>
        </div>
      </div>

      {/* FILTER BAR */}
      <div style={{
        background: 'var(--surface)', borderBottom: '1px solid var(--border)', padding: '10px 28px',
        display: 'flex', alignItems: 'center', gap: 12,
        position: 'sticky', top: 64, zIndex: 250,
      }}>
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setFilterOpen(!filterOpen)}
            style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '9px 18px',
              border: `1.5px solid ${filterOpen ? 'var(--accent)' : 'var(--border)'}`,
              borderRadius: 10, background: filterOpen ? 'var(--accent-soft)' : 'var(--surface)',
              cursor: 'pointer', fontWeight: 600, fontSize: 13,
              color: filterOpen ? 'var(--accent)' : 'var(--text-2)',
            }}
          >
            🗓 Filter Periode
            <span style={{ background: 'var(--accent)', color: 'white', borderRadius: 12, padding: '1px 8px', fontSize: 11, fontWeight: 700 }}>
              {selectedPeriods.size}
            </span>
            <span style={{ fontSize: 10, transition: 'transform .2s', transform: filterOpen ? 'rotate(180deg)' : 'none' }}>▼</span>
          </button>

          {filterOpen && (
            <div style={{
              position: 'absolute', top: 'calc(100% + 8px)', left: 0,
              background: 'var(--surface)', border: '1.5px solid var(--border)',
              borderRadius: 16, boxShadow: 'var(--shadow-lg)', minWidth: 290,
              zIndex: 9999, overflow: 'hidden',
            }}>
              <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', background: 'var(--surface-2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '.8px' }}>Pilih Periode</span>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button onClick={() => setSelectedPeriods(new Set(availablePeriods))} style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 700, cursor: 'pointer', background: 'none', border: 'none' }}>Semua</button>
                  <button onClick={() => setSelectedPeriods(new Set())} style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 700, cursor: 'pointer', background: 'none', border: 'none' }}>Reset</button>
                </div>
              </div>
              <div style={{ maxHeight: 300, overflowY: 'auto' }}>
                {availablePeriods.map(p => (
                  <label key={p} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 18px', cursor: 'pointer' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-2)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <input type="checkbox" checked={selectedPeriods.has(p)} onChange={e => {
                      const s = new Set(selectedPeriods)
                      e.target.checked ? s.add(p) : s.delete(p)
                      setSelectedPeriods(s)
                    }} style={{ width: 15, height: 15, accentColor: 'var(--accent)' }} />
                    <span style={{ fontSize: 13, fontWeight: 500 }}>{periodLabel(p)}</span>
                    <span style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'var(--font-jetbrains)', marginLeft: 'auto' }}>{p.slice(0,4)}</span>
                  </label>
                ))}
              </div>
              <button
                onClick={() => setFilterOpen(false)}
                style={{ width: '100%', padding: 13, background: 'linear-gradient(135deg,var(--accent),var(--accent-light))', color: 'white', border: 'none', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}
              >
                Terapkan Filter
              </button>
            </div>
          )}
        </div>
        <span style={{ fontSize: 13, color: 'var(--text-2)', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', flex: 1, minWidth: 0 }}>
          <strong>{activeData.map(d => d.label).join(' · ') || '—'}</strong>
        </span>
      </div>

      <div style={{ maxWidth: 1300, margin: '0 auto', padding: 28, position: 'relative', zIndex: 1 }}>
        {!f ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-3)' }}>Pilih periode untuk melihat data</div>
        ) : (
          <>
            {/* HERO */}
            <div style={{
              background: 'linear-gradient(135deg,#1B4332 0%,#2A5C45 50%,#1e3d2f 100%)',
              borderRadius: 22, padding: '36px 44px', marginBottom: 28,
              display: 'grid', gridTemplateColumns: '1fr auto', gap: 28, alignItems: 'center',
              position: 'relative', overflow: 'hidden',
              boxShadow: '0 4px 24px rgba(27,67,50,0.25)',
            }}>
              <div style={{ position: 'relative' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: 10 }}>PT. Dream Dare Discover</div>
                <div style={{ fontFamily: 'var(--font-fraunces)', fontSize: 24, color: 'white', fontWeight: 400, marginBottom: 6 }}>
                  Analisa Rasio Keuangan · {latest.label}
                </div>
                <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.65)' }}>
                  {activeData.length} periode dipilih
                </div>
              </div>
              <div style={{ textAlign: 'right', position: 'relative' }}>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', marginBottom: 6, letterSpacing: '.5px' }}>Skor Kesehatan Keuangan</div>
                <div style={{ fontFamily: 'var(--font-fraunces)', fontSize: 60, fontWeight: 700, color: 'white', lineHeight: 1 }}>{score}</div>
                <span style={{
                  display: 'inline-block', padding: '5px 14px', borderRadius: 24, fontSize: 12, fontWeight: 700, marginTop: 8,
                  ...(score >= 70 ? { background: 'rgba(127,255,196,0.15)', color: '#7fffc4', border: '1px solid rgba(127,255,196,0.25)' }
                    : score >= 45 ? { background: 'rgba(255,215,112,0.15)', color: '#ffd770', border: '1px solid rgba(255,215,112,0.25)' }
                    : { background: 'rgba(255,153,128,0.15)', color: '#ff9980', border: '1px solid rgba(255,153,128,0.25)' })
                }}>
                  {score >= 70 ? '● Sehat' : score >= 45 ? '● Perlu Perhatian' : '● Perlu Tindakan'}
                </span>
              </div>
            </div>

            {/* KPI STATS */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 18, marginBottom: 28 }}>
              {[
                { label: 'Penjualan Neto', val: fmtRp(f.penjNeto), sub: 'Periode berjalan' },
                { label: 'Laba Kotor', val: fmtRp(f.labaKotor), sub: `${fmtPct(f.grossMgn)} gross margin` },
                { label: 'Laba Operasional', val: fmtRp(f.ebit), sub: `${fmtPct(f.opMgn)} op. margin`, neg: f.ebit < 0 },
                { label: 'Laba Bersih', val: fmtRp(f.netIncome), sub: `${fmtPct(f.netMgn)} net margin`, neg: f.netIncome < 0 },
              ].map(item => (
                <div key={item.label} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: 22, boxShadow: 'var(--shadow)' }}>
                  <div style={{ fontSize: 11, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '.8px', marginBottom: 8, fontWeight: 700 }}>{item.label}</div>
                  <div style={{ fontFamily: 'var(--font-jetbrains)', fontSize: 18, fontWeight: 600, color: item.neg ? 'var(--negative)' : 'var(--text)' }}>{item.val}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 6 }}>{item.sub}</div>
                </div>
              ))}
            </div>

            {/* NERACA */}
            <SectionHeader title="Neraca Ringkas" tag="Balance Sheet" />
            <NeracaGrid f={f} />

            {/* RASIO */}
            <SectionHeader title="Analisa Rasio Keuangan" tag="6 Kategori" />
            <RatioGrid f={f} />

            {/* CHARTS */}
            <SectionHeader title="Tren Multi-Periode" tag={`${activeData.length} Periode`} />
            <TrendCharts data={activeData} />

            {/* RELATED PARTY */}
            <SectionHeader title="Eksposur Related-Party" tag="Due Diligence" />
            <RPCard f={f} />

            {/* REKOMENDASI */}
            <SectionHeader title="Rekomendasi Strategis" tag="Auto-generated" />
            <RekomendasiList f={f} periodeLabel={latest.label} />

            <div style={{ textAlign: 'center', color: 'var(--text-3)', fontSize: 12, padding: '24px 0 40px' }}>
              PT. Dream Dare Discover · Zuma Indonesia Group · Data: Supabase ringkasan-bukubesar-ddd
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function SectionHeader({ title, tag }: { title: string; tag: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '36px 0 18px' }}>
      <h2 style={{ fontFamily: 'var(--font-fraunces)', fontSize: 21, fontWeight: 600 }}>{title}</h2>
      <span style={{ padding: '4px 12px', background: 'var(--surface-2)', borderRadius: 24, fontSize: 11, color: 'var(--text-3)', fontWeight: 600, border: '1px solid var(--border)' }}>{tag}</span>
    </div>
  )
}

function NeracaGrid({ f }: { f: Financials }) {
  const totalEk = f.ekuitas + f.netIncome
  const totalCheck = f.totalLiab + totalEk
  const bar = (val: number, color: string, total: number) => {
    const pct = total > 0 ? Math.round((Math.abs(val) / total) * 100) : 0
    return <div style={{ height: 3, background: 'var(--surface-3)', borderRadius: 2, marginTop: 5, overflow: 'hidden' }}><div style={{ height: '100%', borderRadius: 2, background: color, width: `${pct}%`, transition: 'width .6s' }} /></div>
  }
  const asetRows = [
    { name: 'Kas & Bank', val: f.kasBank },
    { name: 'Piutang Usaha', val: f.piutangUsaha },
    { name: 'Piutang Lain-lain', val: f.piutangLain },
    { name: 'Uang Muka Pembelian', val: f.uangMukaBeli },
    { name: 'Persediaan', val: f.persediaan },
    { name: 'Biaya Dibayar Dimuka', val: f.biayaDibayar },
    { name: 'Pajak Dibayar Dimuka', val: f.pajakDibayar },
    { name: 'Aset Tetap (neto)', val: f.asetTidakLancar },
  ]
  const liabRows = [
    { name: 'Hutang Usaha', val: f.hutangUsaha, type: 'liab' },
    { name: 'Hutang Lain-lain', val: f.hutangLain, type: 'liab' },
    { name: 'Hutang Afiliasi', val: f.hutangAfil, type: 'liab' },
    { name: 'Hutang Lancar Lainnya', val: f.liabLainnya, type: 'liab' },
    { name: 'Hutang Jangka Panjang', val: f.liabJP, type: 'liab' },
    { name: 'Ekuitas (Modal & Saldo Awal)', val: f.ekuitas, type: 'ek' },
    { name: 'Laba/Rugi Berjalan', val: f.netIncome, type: 'ek', italic: true },
  ]
  const cardStyle = { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: 26, boxShadow: 'var(--shadow)' }
  const rowStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '9px 0', borderBottom: '1px solid var(--border)' }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18, marginBottom: 28 }}>
      <div style={cardStyle}>
        <h3 style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 18 }}>Aset</h3>
        {asetRows.map(r => (
          <div key={r.name} style={rowStyle}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, color: 'var(--text-2)' }}>{r.name}</div>
              {bar(r.val, 'var(--accent)', f.totalAset)}
            </div>
            <div style={{ textAlign: 'right', marginLeft: 16 }}>
              <div style={{ fontFamily: 'var(--font-jetbrains)', fontSize: 12 }}>{fmtRp(r.val)}</div>
              <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{f.totalAset > 0 ? fmtPct(r.val / f.totalAset * 100) : '—'}</div>
            </div>
          </div>
        ))}
        <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 14, marginTop: 4, borderTop: '2px solid var(--border-strong)', fontWeight: 700 }}>
          <span>Total Aset</span>
          <span style={{ fontFamily: 'var(--font-jetbrains)', fontSize: 14 }}>{fmtRp(f.totalAset)}</span>
        </div>
      </div>
      <div style={cardStyle}>
        <h3 style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 18 }}>Liabilitas & Ekuitas</h3>
        {liabRows.map(r => (
          <div key={r.name} style={rowStyle}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, color: 'var(--text-2)', fontStyle: r.italic ? 'italic' : 'normal' }}>{r.name}</div>
              {bar(r.val, r.type === 'ek' ? 'var(--gold)' : 'var(--negative)', totalCheck)}
            </div>
            <div style={{ textAlign: 'right', marginLeft: 16 }}>
              <div style={{ fontFamily: 'var(--font-jetbrains)', fontSize: 12, color: r.val < 0 ? 'var(--negative)' : 'var(--text)' }}>{fmtRp(r.val)}</div>
              <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{totalCheck > 0 ? fmtPct(Math.abs(r.val) / totalCheck * 100) : '—'}</div>
            </div>
          </div>
        ))}
        <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 14, marginTop: 4, borderTop: '2px solid var(--border-strong)', fontWeight: 700 }}>
          <span>Total Liab + Ekuitas</span>
          <span style={{ fontFamily: 'var(--font-jetbrains)', fontSize: 14 }}>{fmtRp(totalCheck)}</span>
        </div>
      </div>
    </div>
  )
}

function statusDot(val: number, ok: number, warn: number, reverse = false) {
  const good = reverse ? val <= ok : val >= ok
  const mid = reverse ? val <= warn : val >= warn
  const color = good ? 'var(--positive)' : mid ? 'var(--gold)' : 'var(--negative)'
  return <span style={{ display: 'inline-block', width: 7, height: 7, borderRadius: '50%', background: color, marginRight: 5, verticalAlign: 'middle' }} />
}

function RatioGrid({ f }: { f: Financials }) {
  const cards = [
    { title: 'Likuiditas', icon: '💧', items: [
      { name: 'Current Ratio', val: fmtRatio(f.currentRatio), dot: statusDot(f.currentRatio,1.5,1.0), desc: 'Ideal ≥ 1.5× | Aset Lancar / Liab Lancar' },
      { name: 'Quick Ratio', val: fmtRatio(f.quickRatio), dot: statusDot(f.quickRatio,1.0,0.7), desc: 'Ideal ≥ 1.0×' },
      { name: 'Cash Ratio', val: fmtRatio(f.cashRatio), dot: statusDot(f.cashRatio,0.2,0.1), desc: 'Ideal ≥ 0.2×' },
      { name: 'Working Capital', val: fmtRp(f.workingCap), dot: <span style={{ display:'inline-block',width:7,height:7,borderRadius:'50%',background:f.workingCap>=0?'var(--positive)':'var(--negative)',marginRight:5,verticalAlign:'middle'}} />, desc: 'Aset Lancar − Liab Lancar' },
    ]},
    { title: 'Solvensi', icon: '⚖️', items: [
      { name: 'Debt-to-Equity', val: fmtRatio(f.de), dot: statusDot(f.de,1.0,1.5,true), desc: 'Ideal < 1.0×' },
      { name: 'Debt-to-Asset', val: fmtPct(f.da*100), dot: statusDot(f.da*100,50,70,true), desc: 'Ideal < 50%' },
      { name: 'Equity Multiplier', val: fmtRatio(f.eqMult), dot: statusDot(f.eqMult,2,3,true), desc: 'Total Aset / Ekuitas' },
      { name: 'LT Debt Ratio', val: fmtPct(f.ltDebt*100), dot: statusDot(f.ltDebt*100,20,30,true), desc: 'Ideal < 20%' },
    ]},
    { title: 'Profitabilitas', icon: '📈', items: [
      { name: 'Gross Margin', val: fmtPct(f.grossMgn), dot: statusDot(f.grossMgn,45,30), desc: 'Laba Kotor / Revenue' },
      { name: 'Operating Margin', val: fmtPct(f.opMgn), dot: statusDot(f.opMgn,6,3), desc: 'EBIT / Revenue' },
      { name: 'Net Margin', val: fmtPct(f.netMgn), dot: statusDot(f.netMgn,5,2), desc: 'Laba Bersih / Revenue' },
      { name: 'ROA', val: fmtPct(f.roa), dot: statusDot(f.roa,1,0.3), desc: 'Net Income / Total Aset' },
      { name: 'ROE', val: fmtPct(f.roe), dot: statusDot(f.roe,2,0.5), desc: 'Net Income / Ekuitas' },
    ]},
    { title: 'Efisiensi', icon: '⚙️', items: [
      { name: 'DIO', val: fmtHari(f.dio), dot: statusDot(f.dio,120,180,true), desc: 'Days Inventory Outstanding' },
      { name: 'DSO', val: fmtHari(f.dso), dot: statusDot(f.dso,45,60,true), desc: 'Days Sales Outstanding' },
      { name: 'DPO', val: fmtHari(f.dpo), dot: statusDot(f.dpo,90,60), desc: 'Days Payable Outstanding' },
      { name: 'CCC', val: fmtHari(f.ccc), dot: <span style={{display:'inline-block',width:7,height:7,borderRadius:'50%',background:f.ccc<=0?'var(--positive)':'var(--gold)',marginRight:5,verticalAlign:'middle'}} />, desc: 'Cash Conversion Cycle' },
    ]},
    { title: 'Laba Rugi', icon: '📊', items: [
      { name: 'Penjualan Neto', val: fmtRp(f.penjNeto), dot: null, desc: '' },
      { name: 'HPP / COGS', val: fmtRp(f.hpp), dot: null, desc: '' },
      { name: 'Laba Kotor', val: fmtRp(f.labaKotor), dot: <span style={{display:'inline-block',width:7,height:7,borderRadius:'50%',background:f.labaKotor>=0?'var(--positive)':'var(--negative)',marginRight:5,verticalAlign:'middle'}} />, desc: '' },
      { name: 'Total Opex', val: fmtRp(f.totalOpex), dot: null, desc: '' },
      { name: 'EBIT', val: fmtRp(f.ebit), dot: <span style={{display:'inline-block',width:7,height:7,borderRadius:'50%',background:f.ebit>=0?'var(--positive)':'var(--negative)',marginRight:5,verticalAlign:'middle'}} />, desc: '' },
      { name: 'Laba Bersih', val: fmtRp(f.netIncome), dot: <span style={{display:'inline-block',width:7,height:7,borderRadius:'50%',background:f.netIncome>=0?'var(--positive)':'var(--negative)',marginRight:5,verticalAlign:'middle'}} />, desc: '' },
    ]},
    { title: 'Neraca Ringkas', icon: '📋', items: [
      { name: 'Total Aset', val: fmtRp(f.totalAset), dot: null, desc: '' },
      { name: 'Aset Lancar', val: fmtRp(f.asetLancar), dot: null, desc: fmtPct(f.totalAset > 0 ? f.asetLancar/f.totalAset*100 : 0) },
      { name: 'Total Liabilitas', val: fmtRp(f.totalLiab), dot: null, desc: '' },
      { name: 'Ekuitas', val: fmtRp(f.ekuitas), dot: null, desc: '' },
    ]},
  ]

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 18, marginBottom: 28 }}>
      {cards.map(card => (
        <div key={card.title} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: 22, boxShadow: 'var(--shadow)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: 1 }}>{card.title}</span>
            <span style={{ width: 34, height: 34, borderRadius: 10, background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>{card.icon}</span>
          </div>
          {card.items.map(item => (
            <div key={item.name} style={{ padding: '11px 0', borderBottom: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <span style={{ fontSize: 13 }}>{item.dot}{item.name}</span>
                <span style={{ fontFamily: 'var(--font-jetbrains)', fontSize: 14, fontWeight: 600 }}>{item.val}</span>
              </div>
              {item.desc && <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{item.desc}</div>}
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}

function RPCard({ f }: { f: Financials }) {
  const pct = f.totalAset > 0 ? (f.rpPiutang / f.totalAset) * 100 : 0
  const flagColor = pct > 5 ? 'var(--negative)' : pct > 2 ? 'var(--gold)' : 'var(--positive)'
  const flagBg = pct > 5 ? '#FDEBE7' : pct > 2 ? 'var(--gold-soft)' : 'var(--accent-soft)'
  const flagText = pct > 5 ? '⚠ RED FLAG > 5%' : pct > 2 ? '⚡ Perlu Monitor' : '✓ Normal'
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: 26, marginBottom: 28, boxShadow: 'var(--shadow)' }}>
      <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>Eksposur Related-Party vs Total Aset</h3>
      <p style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 18 }}>Piutang Lain-lain (140-149) + Piutang Afiliasi (150-159) + Hutang Afiliasi (320-329)</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16, marginBottom: 18 }}>
        {[
          { label: 'Piutang Lain-lain (140-149)', val: f.piutangLain },
          { label: 'Piutang Afiliasi (150-159)', val: Math.abs(f.piutangAfiliasi ?? 0) },
          { label: 'Hutang Afiliasi (320-329)', val: f.hutangAfil },
        ].map(item => (
          <div key={item.label} style={{ padding: 18, background: 'var(--surface-2)', borderRadius: 10, border: '1px solid var(--border)' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '.5px' }}>{item.label}</div>
            <div style={{ fontFamily: 'var(--font-jetbrains)', fontSize: 16, fontWeight: 600 }}>{fmtRp(item.val)}</div>
            <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 4 }}>{fmtPct(f.totalAset > 0 ? item.val/f.totalAset*100 : 0)} dari total aset</div>
          </div>
        ))}
      </div>
      <div style={{ padding: '12px 16px', background: 'var(--surface-2)', borderRadius: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: 12, color: 'var(--text-2)', marginBottom: 2 }}>Total Eksposur Related-Party</div>
          <div style={{ fontFamily: 'var(--font-jetbrains)', fontSize: 16, fontWeight: 700 }}>{fmtRp(f.rpPiutang)}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 12, color: 'var(--text-2)', marginBottom: 4 }}>{fmtPct(pct)} dari total aset</div>
          <span style={{ display: 'inline-block', padding: '4px 10px', borderRadius: 24, fontSize: 11, fontWeight: 700, background: flagBg, color: flagColor }}>{flagText}</span>
        </div>
      </div>
    </div>
  )
}

function RekomendasiList({ f, periodeLabel }: { f: Financials; periodeLabel: string }) {
  const recs: { prio: string; icon: string; title: string; rationale: string; actions: string[] }[] = []

  if (f.currentRatio < 1.0) recs.push({ prio: 'urgent', icon: '🚨', title: 'Current Ratio Kritis — Risiko Likuiditas', rationale: `Current ratio ${fmtRatio(f.currentRatio)} jauh di bawah 1.0×. Risiko gagal bayar kewajiban jangka pendek.`, actions: ['Percepat penagihan piutang usaha', 'Negosiasi ulang terms hutang usaha', 'Evaluasi fasilitas kredit modal kerja'] })
  if (f.de > 2) recs.push({ prio: 'urgent', icon: '⚠️', title: 'Leverage Sangat Tinggi', rationale: `D/E ratio ${fmtRatio(f.de)} — perusahaan sangat bergantung pada hutang.`, actions: ['Injeksi ekuitas dari pemegang saham', 'Konversi hutang jangka pendek ke jangka panjang', 'Tahan distribusi dividen untuk memperkuat ekuitas'] })
  if (f.grossMgn < 20) recs.push({ prio: 'urgent', icon: '📉', title: 'Gross Margin Sangat Rendah', rationale: `Gross margin ${fmtPct(f.grossMgn)} jauh di bawah benchmark fashion 45-60%.`, actions: ['Review struktur harga jual', 'Negosiasi harga beli supplier', 'Kurangi diskon berlebihan (diskon rate: ' + fmtPct(f.diskonRate) + ')'] })
  if (f.netIncome < 0) recs.push({ prio: 'urgent', icon: '🔴', title: 'Perusahaan Rugi Periode Ini', rationale: `Net income negatif ${fmtRp(f.netIncome)}. Perlu tindakan segera.`, actions: ['Identifikasi cost center paling boros', 'Review beban operasional yang dapat dipangkas', 'Fokus pada cabang/produk dengan margin tertinggi'] })
  if (f.dio > 180) recs.push({ prio: 'important', icon: '📦', title: 'Perputaran Persediaan Lambat', rationale: `DIO ${fmtHari(f.dio)} — persediaan stagnan terlalu lama.`, actions: ['Audit SKU slow-moving dan dead stock', 'Terapkan sistem reorder point yang ketat', 'Pertimbangkan diskon clearance untuk stok lama'] })
  if (f.dso > 60) recs.push({ prio: 'important', icon: '💰', title: 'Piutang Lama Tertagih', rationale: `DSO ${fmtHari(f.dso)} — piutang rata-rata baru tertagih setelah ${fmtHari(f.dso)}.`, actions: ['Terapkan kebijakan kredit yang lebih ketat', 'Kirim reminder tagihan otomatis', 'Pertimbangkan diskon early payment'] })
  if (recs.length === 0) recs.push({ prio: 'info', icon: '✅', title: 'Kondisi Keuangan Relatif Sehat', rationale: `Tidak ada red flag kritis pada periode ${periodeLabel}. Pertahankan kinerja ini.`, actions: ['Pantau terus rasio likuiditas minimal monthly', 'Benchmark dengan kompetitor untuk gross margin', 'Evaluasi efisiensi rantai pasok secara berkala'] })

  const prioStyle = { urgent: { bg: '#FDEBE7', border: '#F0BCAF' }, important: { bg: 'var(--gold-soft)', border: '#E5D5A0' }, info: { bg: 'var(--accent-soft)', border: '#B8D9C3' } }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 36 }}>
      {recs.map((rec, i) => {
        const s = prioStyle[rec.prio as keyof typeof prioStyle]
        return (
          <div key={i} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: '22px 26px', display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 18, boxShadow: 'var(--shadow)' }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, flexShrink: 0 }}>{rec.icon}</div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>{rec.title}</div>
              <div style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 14, lineHeight: 1.6 }}>{rec.rationale}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                {rec.actions.map((a, j) => (
                  <div key={j} style={{ display: 'flex', gap: 10, fontSize: 12, color: 'var(--text-2)' }}>
                    <span style={{ color: 'var(--accent)', fontWeight: 700, flexShrink: 0 }}>→</span>{a}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
