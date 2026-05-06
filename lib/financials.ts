export interface FinancialRow {
  kode: string
  saldo_akhir: number
  debet: number
  kredit: number
  periode: string
}

export interface Financials {
  kasBank: number; piutangUsaha: number; piutangLain: number; piutangAfiliasi: number
  uangMukaBeli: number; persediaan: number; biayaDibayar: number; pajakDibayar: number
  asetTidakLancar: number; asetLancar: number; totalAset: number
  hutangUsaha: number; hutangLain: number; hutangAfil: number; liabLainnya: number
  liabJP: number; liabLancar: number; totalLiab: number; ekuitas: number
  penjBruto: number; diskon: number; penjNeto: number; hpp: number; labaKotor: number
  biayaJual: number; biayaKantor: number; totalOpex: number; ebit: number
  netLain: number; netIncome: number
  currentRatio: number; quickRatio: number; cashRatio: number; workingCap: number
  de: number; da: number; eqMult: number; ltDebt: number
  grossMgn: number; opMgn: number; netMgn: number; diskonRate: number; roa: number; roe: number
  dio: number; dso: number; dpo: number; ccc: number; invT: number; astT: number
  rpPiutang: number; rpHutang: number; rpNet: number; rpPct: number
}

const getBase = (kode: string) => { try { return parseInt(kode.split('.')[0]) } catch { return 0 } }
const inRange = (k: string, lo: number, hi: number) => { const b = getBase(k); return b >= lo && b <= hi }

function groupByRange(rows: FinancialRow[], lo: number, hi: number) {
  return rows.filter(r => inRange(r.kode, lo, hi)).reduce((s, r) => s + Number(r.saldo_akhir || 0), 0)
}

export function computeFinancials(rows: FinancialRow[]): Financials {
  const kasBank         = groupByRange(rows, 100, 119)
  const piutangUsaha    = groupByRange(rows, 120, 139)
  const piutangLain     = groupByRange(rows, 140, 149)
  const piutangAfiliasi = groupByRange(rows, 150, 159)
  const uangMukaBeli    = groupByRange(rows, 160, 169)
  const persediaan      = groupByRange(rows, 170, 179)
  const biayaDibayar    = groupByRange(rows, 180, 189)
  const pajakDibayar    = groupByRange(rows, 190, 199)
  const asetTetapRaw    = groupByRange(rows, 200, 299)
  const asetLancar      = kasBank + piutangUsaha + piutangLain + piutangAfiliasi + uangMukaBeli + persediaan + biayaDibayar + pajakDibayar
  const asetTidakLancar = asetTetapRaw
  const totalAset       = asetLancar + asetTidakLancar

  const hutangUsaha = Math.abs(groupByRange(rows, 300, 309))
  const hutangLain  = Math.abs(groupByRange(rows, 310, 319))
  const hutangAfil  = Math.abs(groupByRange(rows, 320, 329))
  const liabLainnya = Math.abs(groupByRange(rows, 330, 369))
  const liabJP      = Math.abs(groupByRange(rows, 370, 399))
  const liabLancar  = hutangUsaha + hutangLain + hutangAfil + liabLainnya
  const totalLiab   = liabLancar + liabJP

  const ekuitas    = Math.abs(groupByRange(rows, 400, 499))
  const penjBruto  = Math.abs(groupByRange(rows, 500, 509))
  const diskon     = groupByRange(rows, 510, 519)
  const penjNeto   = penjBruto - Math.abs(diskon)
  const hpp        = groupByRange(rows, 520, 529)
  const labaKotor  = penjNeto - hpp
  const biayaJual  = groupByRange(rows, 600, 699)
  const biayaKantor = groupByRange(rows, 700, 799)
  const totalOpex  = biayaJual + biayaKantor
  const ebit       = labaKotor - totalOpex
  const netLain    = -groupByRange(rows, 800, 899)
  const netIncome  = ebit + netLain

  const currentRatio = liabLancar > 0 ? asetLancar / liabLancar : 0
  const quickRatio   = liabLancar > 0 ? (asetLancar - persediaan - biayaDibayar) / liabLancar : 0
  const cashRatio    = liabLancar > 0 ? kasBank / liabLancar : 0
  const workingCap   = asetLancar - liabLancar
  const de    = ekuitas > 0 ? totalLiab / ekuitas : 0
  const da    = totalAset > 0 ? totalLiab / totalAset : 0
  const eqMult = ekuitas > 0 ? totalAset / ekuitas : 0
  const ltDebt = totalAset > 0 ? liabJP / totalAset : 0
  const grossMgn   = penjNeto > 0 ? (labaKotor / penjNeto) * 100 : 0
  const opMgn      = penjNeto > 0 ? (ebit / penjNeto) * 100 : 0
  const netMgn     = penjNeto > 0 ? (netIncome / penjNeto) * 100 : 0
  const diskonRate = penjBruto > 0 ? (Math.abs(diskon) / penjBruto) * 100 : 0
  const roa        = totalAset > 0 ? (netIncome / totalAset) * 100 : 0
  const roe        = ekuitas > 0 ? (netIncome / ekuitas) * 100 : 0
  const dio  = hpp > 0 ? (persediaan / hpp) * 30 : 0
  const dso  = penjNeto > 0 ? (piutangUsaha / penjNeto) * 30 : 0
  const dpo  = hpp > 0 ? (hutangUsaha / hpp) * 30 : 0
  const ccc  = dio + dso - dpo
  const invT = persediaan > 0 ? (hpp * 12) / persediaan : 0
  const astT = totalAset > 0 ? (penjNeto * 12) / totalAset : 0
  const rpPiutang = piutangLain + Math.abs(piutangAfiliasi)
  const rpHutang  = hutangAfil
  const rpNet     = rpPiutang - rpHutang
  const rpPct     = totalAset > 0 ? (rpPiutang / totalAset) * 100 : 0

  return {
    kasBank, piutangUsaha, piutangLain, piutangAfiliasi, uangMukaBeli,
    persediaan, biayaDibayar, pajakDibayar, asetTidakLancar, asetLancar, totalAset,
    hutangUsaha, hutangLain, hutangAfil, liabLainnya, liabJP, liabLancar, totalLiab, ekuitas,
    penjBruto, diskon, penjNeto, hpp, labaKotor, biayaJual, biayaKantor, totalOpex, ebit, netLain, netIncome,
    currentRatio, quickRatio, cashRatio, workingCap, de, da, eqMult, ltDebt,
    grossMgn, opMgn, netMgn, diskonRate, roa, roe, dio, dso, dpo, ccc, invT, astT,
    rpPiutang, rpHutang, rpNet, rpPct,
  }
}

export function healthScore(f: Financials): number {
  let score = 0, max = 0
  const add = (val: number, ok: number, warn: number) => {
    max += 20
    if (val >= ok) score += 20
    else if (val >= warn) score += 10
  }
  add(f.currentRatio, 1.5, 1.0)
  add(f.quickRatio, 1.0, 0.7)
  score += 20 - Math.min(20, f.de * 10); max += 20
  add(f.grossMgn, 30, 15)
  add(f.netMgn, 5, 0)
  return Math.round((score / max) * 100)
}

export const fmtRp = (n: number) => {
  if (!n || n === 0) return 'Rp 0'
  const s = n < 0 ? '-' : ''
  return s + 'Rp ' + Math.abs(Math.round(n)).toLocaleString('id-ID')
}
export const fmtM = (n: number) => (Math.round((n / 1e9) * 10) / 10).toLocaleString('id-ID') + 'M'
export const fmtRatio = (n: number, d = 2) => isNaN(n) || !isFinite(n) ? '—' : n.toFixed(d) + '×'
export const fmtPct = (n: number, d = 1) => isNaN(n) || !isFinite(n) ? '—' : n.toFixed(d) + '%'
export const fmtHari = (n: number) => isNaN(n) || !isFinite(n) ? '—' : Math.round(n) + ' hr'
