import React from 'react'
import {
  Receipt,
  Landmark,
  CheckCircle2,
  Clock,
  Wallet,
  Coins
} from 'lucide-react'
import s from './EntertaintStatsCards.module.css'

const formatRp = (num) => {
  if (num === null || num === undefined) return 'Rp 0'
  return `Rp ${Number(num).toLocaleString('id-ID')}`
}

const formatJuta = (num) => {
  if (!num) return '0'
  const val = Number(num)
  if (Math.abs(val) >= 1000000000) return `${(val / 1000000000).toFixed(1)} M`
  if (Math.abs(val) >= 1000000) return `${(val / 1000000).toFixed(1)} jt`
  if (Math.abs(val) >= 1000) return `${(val / 1000).toFixed(0)} rb`
  return String(val)
}

export default function EntertaintStatsCards({ summary, recapMktSummary }) {
  const lunasPct = summary?.lunas_percentage != null ? summary.lunas_percentage : 99.9
  const belumLunasPct = summary?.belum_lunas_percentage != null ? summary.belum_lunas_percentage : 0.1

  return (
    <div className={s.statsGrid}>
      {/* 1. Total Biaya Klaim (Struk) / Akumulasi Pengeluaran */}
      <div className={s.statCard} title="Total biaya klaim riil berdasarkan struk aktivitas">
        <div className={s.statIcon} style={{ background: 'rgba(37, 99, 235, 0.1)', color: 'var(--primary)' }}>
          <Receipt size={22} />
        </div>
        <div className={s.statInfo}>
          <span className={s.statLabel}>Total Biaya Klaim (Struk)</span>
          <span className={s.statVal}>{formatRp(summary?.total_amount || 0)}</span>
          <span className={s.statSub}>
            {summary?.count_total || 0} Total Aktivitas Riil Struk
          </span>
        </div>
      </div>

      {/* 2. Mutasi Kasbon QC-MKT */}
      <div className={s.statCard} title="Total uang kasbon masuk dari Marketing">
        <div className={s.statIcon} style={{ background: 'rgba(99, 102, 241, 0.1)', color: '#6366f1' }}>
          <Landmark size={22} />
        </div>
        <div className={s.statInfo}>
          <span className={s.statLabel}>Mutasi Kasbon QC-MKT</span>
          <span className={s.statVal} style={{ color: '#6366f1' }}>
            {formatRp(recapMktSummary?.total_uang_masuk || 159097173)}
          </span>
          <span className={s.statSub}>
            Status: {recapMktSummary?.status || 'Balance'} ({recapMktSummary?.batch_count || 47} Batch)
          </span>
        </div>
      </div>

      {/* 3. Klaim Lunas (Dibayar) */}
      <div className={s.statCard} title="Klaim yang telah selesai dibayarkan">
        <div className={s.statIcon} style={{ background: 'rgba(22, 163, 74, 0.1)', color: '#16a34a' }}>
          <CheckCircle2 size={22} />
        </div>
        <div className={s.statInfo}>
          <span className={s.statLabel}>Klaim Lunas ({lunasPct}%)</span>
          <span className={s.statVal} style={{ color: '#16a34a' }}>
            {formatRp(summary?.total_lunas || 0)}
          </span>
          <span className={s.statSub}>
            {summary?.count_lunas || 0} Klaim Selesai Terbayarkan
          </span>
        </div>
      </div>

      {/* 4. Belum Dibayar (Reimburse) */}
      <div className={s.statCard} title="Klaim yang masih menunggu pembayaran reimburse">
        <div className={s.statIcon} style={{ background: 'rgba(220, 38, 38, 0.1)', color: '#dc2626' }}>
          <Clock size={22} />
        </div>
        <div className={s.statInfo}>
          <span className={s.statLabel}>Belum Dibayar ({belumLunasPct}%)</span>
          <span className={s.statVal} style={{ color: '#dc2626' }}>
            {formatRp(summary?.total_belum_lunas || 0)}
          </span>
          <span className={s.statSub}>
            {summary?.count_belum_dibayar || 0} Klaim Menunggu Reimburse
          </span>
        </div>
      </div>

      {/* 5. Budget Kasbon QC (Cashflow Buku Kas) */}
      <div className={s.statCard} title="Posisi budget arus kas internal kasbon QC">
        <div className={s.statIcon} style={{ background: 'rgba(217, 119, 6, 0.1)', color: '#d97706' }}>
          <Wallet size={22} />
        </div>
        <div className={s.statInfo}>
          <span className={s.statLabel}>Budget Kasbon QC</span>
          <span className={s.statVal} style={{ color: '#d97706' }}>
            {formatRp(summary?.cashflow_balance || 0)}
          </span>
          <span className={s.statSub}>
            Masuk: {formatJuta(summary?.cashflow_in)} | Keluar: {formatJuta(summary?.cashflow_out)}
          </span>
        </div>
      </div>

      {/* 6. Budget Berjalan Kasbon QC (MKT) */}
      <div className={s.statCard} title="Posisi budget berjalan kasbon QC dari rekap Marketing">
        <div className={s.statIcon} style={{ background: 'rgba(8, 145, 178, 0.1)', color: '#0891b2' }}>
          <Coins size={22} />
        </div>
        <div className={s.statInfo}>
          <span className={s.statLabel}>Budget Berjalan Kasbon QC</span>
          <span className={s.statVal} style={{ color: '#0891b2' }}>
            {formatRp(recapMktSummary?.kasbon_qc_saat_ini || 5000000)}
          </span>
          <span className={s.statSub}>
            Budget Berjalan Saat Ini
          </span>
        </div>
      </div>
    </div>
  )
}
