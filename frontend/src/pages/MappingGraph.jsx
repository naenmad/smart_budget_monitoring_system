import { useState, useEffect, useRef, useCallback } from 'react'
import { mappingApi } from '../api/mappingApi'
import { kategoriApi } from '../api/kategoriApi'
import { formatRp } from '../utils/format'
import { 
  Network, 
  Search, 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  X, 
  Loader2, 
  Layers, 
  FileText, 
  ArrowLeft, 
  Calendar, 
  Sparkles, 
  ChevronRight 
} from 'lucide-react'
import s from './MappingGraph.module.css'

const MONTH_OPTIONS = [
  { value: 'All', label: 'Semua Bulan (Peta Cluster 12 Bulan)' },
  { value: 'Jan', label: 'Januari' },
  { value: 'Feb', label: 'Februari' },
  { value: 'Mar', label: 'Maret' },
  { value: 'Apr', label: 'April' },
  { value: 'May', label: 'Mei' },
  { value: 'Jun', label: 'Juni' },
  { value: 'Jul', label: 'Juli' },
  { value: 'Aug', label: 'Agustus' },
  { value: 'Sep', label: 'September' },
  { value: 'Oct', label: 'Oktober' },
  { value: 'Nov', label: 'November' },
  { value: 'Dec', label: 'Desember' }
]

export default function MappingGraph() {
  const [loading, setLoading] = useState(true)
  const [rawData, setRawData] = useState({ nodes: [], links: [], metrics: {} })
  const [kategoris, setKategoris] = useState([])

  // Filters (Default: 'All' - Cluster 12 Bulan)
  const [periode, setPeriode] = useState('2026')
  const [month, setMonth] = useState('All')
  const [kategoriId, setKategoriId] = useState('')
  const [budgetStatus, setBudgetStatus] = useState('ALL')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedNode, setSelectedNode] = useState(null)

  // Canvas & Physics State (Refs for 60fps zero-lag performance)
  const canvasRef = useRef(null)
  const tooltipRef = useRef(null)
  const animFrameId = useRef(null)
  const simNodes = useRef([])
  const simLinks = useRef([])
  const hoveredNodeRef = useRef(null)
  const searchTermRef = useRef('')

  // Camera State
  const camera = useRef({ x: 0, y: 0, zoom: 0.85 })
  const isDraggingCanvas = useRef(false)
  const dragStart = useRef({ x: 0, y: 0 })
  const draggedNode = useRef(null)

  // Physics Simulation Controls
  const alphaRef = useRef(1.0)
  const needsRenderRef = useRef(true)

  // Keep searchTerm in ref for canvas renderer without triggering full component re-render
  useEffect(() => {
    searchTermRef.current = searchTerm
    needsRenderRef.current = true
  }, [searchTerm])

  // Load Kategori list
  useEffect(() => {
    kategoriApi.getAll().then(res => setKategoris(res.data || [])).catch(() => {})
  }, [])

  // Fetch graph data from backend
  async function fetchGraph() {
    // Reset selection state at the start of each fetch
    setSelectedNode(null)
    hoveredNodeRef.current = null
    if (tooltipRef.current) tooltipRef.current.style.display = 'none'

    setLoading(true)
    try {
      const params = {
        periode,
        month: month === 'All' ? '' : month,
        kategori_id: kategoriId || undefined,
        budget_status: budgetStatus
      }
      const res = await mappingApi.getGraphData(params)
      if (res.data?.success) {
        setRawData(res.data)
        initSimulation(res.data.nodes, res.data.links, month)
      }
    } catch (err) {
      console.error('Failed to load graph data:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchGraph()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [periode, month, kategoriId, budgetStatus])

  // Initialize Force Simulation Graph Layout
  function initSimulation(apiNodes, apiLinks, currentMonth) {
    const canvas = canvasRef.current
    const width = canvas && canvas.clientWidth > 0 ? canvas.clientWidth : 900
    const height = canvas && canvas.clientHeight > 0 ? canvas.clientHeight : 650

    // ─────────────────────────────────────────────────────────────
    // 1. MODE "SEMUA BULAN" (ALL) -> 12 CLUSTER BULAN INSTAN TANPA LAG
    // ─────────────────────────────────────────────────────────────
    if (currentMonth === 'All') {
      camera.current = { x: width / 2, y: height / 2, zoom: 0.95 }

      const centerNode = {
        id: 'center-year',
        type: 'center_year',
        label: `Tahun ${periode}`,
        sub: 'Master Budget',
        radius: 58,
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        fixed: true
      }

      const monthStats = {}
      MONTH_OPTIONS.filter(m => m.value !== 'All').forEach(m => {
        monthStats[m.value] = {
          key: m.value,
          label: m.label,
          planCount: 0,
          prCount: 0,
          pagu: 0,
          consumed: 0,
          overCount: 0
        }
      })

      // Fast Indexing
      const planMonthMap = {}
      apiNodes.forEach(n => {
        if (n.type === 'plan' && n.month && monthStats[n.month]) {
          planMonthMap[n.id] = n.month
          monthStats[n.month].planCount += 1
          monthStats[n.month].pagu += (n.pagu || 0)
          monthStats[n.month].consumed += (n.consumed || 0)
          if (n.status === 'OVER_PLAN') monthStats[n.month].overCount += 1
        }
      })

      apiNodes.forEach(n => {
        if (n.type === 'pr') {
          const mKey = planMonthMap[`plan-${n.planning_detail_id}`]
          if (mKey && monthStats[mKey]) {
            monthStats[mKey].prCount += 1
          }
        }
      })

      const monthList = Object.values(monthStats)
      const builtNodes = [centerNode]
      const builtLinks = []

      // Orbit distance 205px ensures 12 bubbles (radius 46) never overlap each other
      monthList.forEach((m, idx) => {
        const angle = (idx / monthList.length) * Math.PI * 2
        const dist = 205
        const isOver = m.overCount > 0 || (m.pagu > 0 && m.consumed > m.pagu)

        const monthNode = {
          id: `month-${m.key}`,
          type: 'month_cluster',
          monthKey: m.key,
          label: m.label,
          shortKey: m.key,
          planCount: m.planCount,
          prCount: m.prCount,
          pagu: m.pagu,
          consumed: m.consumed,
          status: isOver ? 'OVER_PLAN' : (m.planCount > 0 ? 'ON_PLAN' : 'EMPTY'),
          radius: 46,
          x: Math.cos(angle) * dist,
          y: Math.sin(angle) * dist,
          vx: 0,
          vy: 0,
          fixed: false
        }
        builtNodes.push(monthNode)

        builtLinks.push({
          source: 'center-year',
          target: monthNode.id,
          type: 'cluster_link',
          status: monthNode.status,
          distance: 180,
          strength: 0.15
        })
      })

      simNodes.current = builtNodes
      simLinks.current = builtLinks
      alphaRef.current = 0
      needsRenderRef.current = true
      return
    }

    // ─────────────────────────────────────────────────────────────
    // 2. MODE 1 BULAN SPESIFIK -> RINCIAN KATEGORI, PLAN, & PR (ANTI-COLLISION FIXED)
    // ─────────────────────────────────────────────────────────────
    camera.current = { x: width / 2, y: height / 2, zoom: 1.05 }

    const catBuckets = {}
    const nodeMap = {}

    // Find all categories
    apiNodes.forEach(n => {
      const cat = n.kategori_kode || 'GEN'
      if (!catBuckets[cat]) {
        catBuckets[cat] = {
          code: cat,
          catNode: {
            id: `cat-${cat}`,
            label: `Kategori ${cat}`,
            type: 'category',
            category: cat,
            radius: 46,
            x: 0,
            y: 0,
            vx: 0,
            vy: 0,
            fixed: false
          },
          planNodes: [],
          prNodes: [],
          poolNodes: []
        }
      }
    })

    // Index PRs connected to plans
    const planPrMap = {}
    apiLinks.forEach(l => {
      if (l.source.startsWith('plan-') || l.target.startsWith('plan-')) {
        const planId = l.source.startsWith('plan-') ? l.source : l.target
        const prId = l.source.startsWith('plan-') ? l.target : l.source
        if (!planPrMap[planId]) planPrMap[planId] = []
        planPrMap[planId].push(prId)
      }
    })

    // Sort nodes into category buckets
    apiNodes.forEach(n => {
      const cat = n.kategori_kode || 'GEN'
      const bucket = catBuckets[cat] || catBuckets['GEN']
      if (n.type === 'plan') {
        bucket.planNodes.push({
          ...n,
          radius: 34,
          vx: 0,
          vy: 0,
          fixed: false
        })
      } else if (n.type === 'pool_oop' || n.type === 'pool_unmapped') {
        bucket.poolNodes.push({
          ...n,
          radius: 36,
          vx: 0,
          vy: 0,
          fixed: false
        })
      } else if (n.type === 'pr') {
        bucket.prNodes.push({
          ...n,
          radius: 20,
          vx: 0,
          vy: 0,
          fixed: false
        })
      }
    })

    // Calculate fixed positions deterministically
    const catKeys = Object.keys(catBuckets)
    const catCount = catKeys.length || 1
    const builtNodes = []
    const builtLinks = []

    const orbitRadius = catCount === 1 ? 0 : Math.max(180, catCount * 75)

    catKeys.forEach((catKey, catIdx) => {
      const catAngle = (catIdx / catCount) * Math.PI * 2
      const bucket = catBuckets[catKey]
      const catX = catCount === 1 ? 0 : Math.cos(catAngle) * orbitRadius
      const catY = catCount === 1 ? 0 : Math.sin(catAngle) * orbitRadius

      bucket.catNode.x = catX
      bucket.catNode.y = catY
      builtNodes.push(bucket.catNode)
      nodeMap[bucket.catNode.id] = bucket.catNode

      // Place Plan Nodes in an arc/ring around their Category hub
      const totalPlans = bucket.planNodes.length
      bucket.planNodes.forEach((planNode, planIdx) => {
        const planAngle = catAngle + ((planIdx - (totalPlans - 1) / 2) * (Math.PI * 2 / Math.max(totalPlans, 3)))
        const planDist = 130
        planNode.x = catX + Math.cos(planAngle) * planDist
        planNode.y = catY + Math.sin(planAngle) * planDist
        builtNodes.push(planNode)
        nodeMap[planNode.id] = planNode

        builtLinks.push({
          source: bucket.catNode.id,
          target: planNode.id,
          type: 'cat_link',
          distance: 110,
          strength: 0.12
        })

        // Place PR Nodes around this Plan node
        const prIds = planPrMap[planNode.id] || []
        const attachedPrs = bucket.prNodes.filter(pr => prIds.includes(pr.id))
        const totalPrs = attachedPrs.length

        attachedPrs.forEach((prNode, prIdx) => {
          const prAngle = planAngle + ((prIdx - (totalPrs - 1) / 2) * 0.8)
          const prDist = 80
          prNode.x = planNode.x + Math.cos(prAngle) * prDist
          prNode.y = planNode.y + Math.sin(prAngle) * prDist
          builtNodes.push(prNode)
          nodeMap[prNode.id] = prNode

          builtLinks.push({
            source: planNode.id,
            target: prNode.id,
            type: 'pr_link',
            status: prNode.status,
            distance: 70,
            strength: 0.16
          })
        })
      })

      // Place pool nodes (OOP / Pending) if any
      bucket.poolNodes.forEach((poolNode, poolIdx) => {
        const poolAngle = catAngle + Math.PI + (poolIdx * 0.7)
        poolNode.x = catX + Math.cos(poolAngle) * 115
        poolNode.y = catY + Math.sin(poolAngle) * 115
        builtNodes.push(poolNode)
        nodeMap[poolNode.id] = poolNode
      })
    })

    // Add any remaining unconnected PR nodes
    apiNodes.forEach(n => {
      if (!nodeMap[n.id]) {
        const fallbackNode = {
          ...n,
          radius: 20,
          x: (Math.random() - 0.5) * 220,
          y: (Math.random() - 0.5) * 220,
          vx: 0,
          vy: 0,
          fixed: false
        }
        builtNodes.push(fallbackNode)
        nodeMap[n.id] = fallbackNode
      }
    })

    // ── Instant Anti-Collision Relaxation Pass (Guarantees NO overlapping bubbles) ──
    for (let iter = 0; iter < 18; iter++) {
      for (let i = 0; i < builtNodes.length; i++) {
        const n1 = builtNodes[i]
        for (let j = i + 1; j < builtNodes.length; j++) {
          const n2 = builtNodes[j]
          const dx = n2.x - n1.x
          const dy = n2.y - n1.y
          const dist = Math.hypot(dx, dy) || 0.1
          const minDist = n1.radius + n2.radius + 18 // minimum 18px gap
          if (dist < minDist) {
            const overlap = (minDist - dist) / 2
            const nx = (dx / dist) * overlap
            const ny = (dy / dist) * overlap
            n1.x -= nx
            n1.y -= ny
            n2.x += nx
            n2.y += ny
          }
        }
      }
    }

    simNodes.current = builtNodes
    simLinks.current = builtLinks
    alphaRef.current = 0 // Zero shifting physics
    needsRenderRef.current = true
  }

  // Fast Physics Simulation Step with Alpha Cooling
  const stepSimulation = useCallback(() => {
    if (alphaRef.current < 0.005) {
      return false
    }

    const nodes = simNodes.current
    const links = simLinks.current
    if (!nodes.length) return false

    const alpha = alphaRef.current

    // 1. Repulsion with cutoff
    const MAX_REP_DIST = 240
    const MAX_REP_DIST_SQ = MAX_REP_DIST * MAX_REP_DIST

    for (let i = 0; i < nodes.length; i++) {
      const n1 = nodes[i]
      for (let j = i + 1; j < nodes.length; j++) {
        const n2 = nodes[j]
        const dx = n2.x - n1.x
        if (dx > MAX_REP_DIST || dx < -MAX_REP_DIST) continue

        const dy = n2.y - n1.y
        if (dy > MAX_REP_DIST || dy < -MAX_REP_DIST) continue

        const distSq = dx * dx + dy * dy
        if (distSq > MAX_REP_DIST_SQ || distSq < 1) continue

        const dist = Math.sqrt(distSq)
        const minDist = n1.radius + n2.radius + 8
        const repForce = ((2800 / (distSq + 100)) + (dist < minDist ? (minDist - dist) * 0.3 : 0)) * alpha

        const fx = (dx / dist) * repForce
        const fy = (dy / dist) * repForce

        if (n1 !== draggedNode.current && !n1.fixed) {
          n1.vx -= fx
          n1.vy -= fy
        }
        if (n2 !== draggedNode.current && !n2.fixed) {
          n2.vx += fx
          n2.vy += fy
        }
      }
    }

    // 2. Spring Attraction along links
    const nodeMap = {}
    nodes.forEach(n => { nodeMap[n.id] = n })

    for (let i = 0; i < links.length; i++) {
      const l = links[i]
      const n1 = nodeMap[l.source]
      const n2 = nodeMap[l.target]
      if (!n1 || !n2) continue

      const dx = n2.x - n1.x
      const dy = n2.y - n1.y
      const dist = Math.sqrt(dx * dx + dy * dy) || 1
      const targetDist = l.distance || 80
      const force = (dist - targetDist) * (l.strength || 0.1) * alpha

      const fx = (dx / dist) * force
      const fy = (dy / dist) * force

      if (n1 !== draggedNode.current && !n1.fixed) {
        n1.vx += fx
        n1.vy += fy
      }
      if (n2 !== draggedNode.current && !n2.fixed) {
        n2.vx += fx
        n2.vy += fy
      }
    }

    // 3. Center Gravity & Damping
    const gravity = 0.012 * alpha
    const damping = 0.85

    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i]
      if (n === draggedNode.current || n.fixed) continue

      n.vx += -n.x * gravity
      n.vy += -n.y * gravity

      n.vx *= damping
      n.vy *= damping

      n.x += n.vx
      n.y += n.vy
    }

    alphaRef.current *= 0.88
    needsRenderRef.current = true
    return true
  }, [])

  // Auto-resize handler
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current
      if (canvas && canvas.clientWidth > 0) {
        if (camera.current.x === 0 && camera.current.y === 0) {
          camera.current.x = canvas.clientWidth / 2
          camera.current.y = canvas.clientHeight / 2
        }
        needsRenderRef.current = true
      }
    }
    window.addEventListener('resize', handleResize)
    const timer = setTimeout(handleResize, 100)
    return () => {
      window.removeEventListener('resize', handleResize)
      clearTimeout(timer)
    }
  }, [])

  // Pure Canvas Render
  const render = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const width = canvas.clientWidth
    const height = canvas.clientHeight

    if (width <= 0 || height <= 0) {
      needsRenderRef.current = true
      return
    }

    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
      canvas.width = width * dpr
      canvas.height = height * dpr
    }

    ctx.save()
    ctx.scale(dpr, dpr)
    ctx.clearRect(0, 0, width, height)

    // Center camera if zero
    if (camera.current.x === 0 && camera.current.y === 0) {
      camera.current.x = width / 2
      camera.current.y = height / 2
    }

    // Apply Camera Transform
    ctx.translate(camera.current.x, camera.current.y)
    ctx.scale(camera.current.zoom, camera.current.zoom)

    const nodes = simNodes.current
    const links = simLinks.current
    const hoveredNode = hoveredNodeRef.current
    const currentSearch = searchTermRef.current
    const zoom = camera.current.zoom

    const nodeMap = {}
    nodes.forEach(n => { nodeMap[n.id] = n })

    // Find connected neighbors of hovered node
    const connectedNodeIds = new Set()
    if (hoveredNode) {
      connectedNodeIds.add(hoveredNode.id)
      links.forEach(l => {
        if (l.source === hoveredNode.id) connectedNodeIds.add(l.target)
        if (l.target === hoveredNode.id) connectedNodeIds.add(l.source)
      })
    }

    // 1. Draw Links
    links.forEach(l => {
      const src = nodeMap[l.source]
      const tgt = nodeMap[l.target]
      if (!src || !tgt) return

      const isHovered = hoveredNode && (l.source === hoveredNode.id || l.target === hoveredNode.id)
      const isDimmed = hoveredNode && !isHovered

      ctx.beginPath()
      ctx.moveTo(src.x, src.y)
      ctx.lineTo(tgt.x, tgt.y)

      if (l.type === 'cluster_link') {
        ctx.strokeStyle = isHovered ? '#3b82f6' : (isDimmed ? 'rgba(59, 130, 246, 0.08)' : 'rgba(59, 130, 246, 0.35)')
        ctx.lineWidth = isHovered ? 2.5 : 1.5
        ctx.setLineDash([4, 4])
      } else if (l.type === 'cat_link') {
        ctx.strokeStyle = isHovered ? '#6366f1' : (isDimmed ? 'rgba(99, 102, 241, 0.08)' : 'rgba(99, 102, 241, 0.25)')
        ctx.lineWidth = isHovered ? 2.5 : 1.2
        ctx.setLineDash([4, 4])
      } else {
        ctx.setLineDash([])
        if (l.status === 'ON_PLAN') {
          ctx.strokeStyle = isHovered ? '#10b981' : (isDimmed ? 'rgba(16, 185, 129, 0.1)' : 'rgba(16, 185, 129, 0.4)')
        } else if (l.status === 'OVER_PLAN') {
          ctx.strokeStyle = isHovered ? '#ef4444' : (isDimmed ? 'rgba(239, 68, 68, 0.1)' : 'rgba(239, 68, 68, 0.4)')
        } else if (l.status === 'OOP') {
          ctx.strokeStyle = isHovered ? '#f97316' : (isDimmed ? 'rgba(249, 115, 22, 0.1)' : 'rgba(249, 115, 22, 0.4)')
        } else {
          ctx.strokeStyle = isHovered ? '#eab308' : (isDimmed ? 'rgba(234, 179, 8, 0.1)' : 'rgba(234, 179, 8, 0.4)')
        }
        ctx.lineWidth = isHovered ? 3.5 : 1.6
      }
      ctx.stroke()
      ctx.setLineDash([])
    })

    // 2. Draw Nodes
    nodes.forEach(n => {
      const isMatchSearch = currentSearch && n.label?.toLowerCase().includes(currentSearch.toLowerCase())
      const isHovered = hoveredNode && n.id === hoveredNode.id
      const isConnected = connectedNodeIds.has(n.id)
      const isDimmed = hoveredNode && !isConnected

      const r = n.radius

      ctx.save()
      ctx.globalAlpha = isDimmed ? 0.25 : 1.0

      ctx.beginPath()
      ctx.arc(n.x, n.y, r, 0, Math.PI * 2)

      if (n.type === 'center_year') {
        ctx.fillStyle = '#0f172a'
        ctx.fill()
        ctx.lineWidth = isHovered ? 4.5 : 3.5
        ctx.strokeStyle = '#3b82f6'
        ctx.stroke()
      } else if (n.type === 'month_cluster') {
        if (n.status === 'OVER_PLAN') {
          ctx.fillStyle = '#fef2f2'
          ctx.strokeStyle = '#ef4444'
        } else if (n.planCount > 0) {
          ctx.fillStyle = '#f0fdf4'
          ctx.strokeStyle = '#10b981'
        } else {
          ctx.fillStyle = '#f8fafc'
          ctx.strokeStyle = '#cbd5e1'
        }
        ctx.fill()
        ctx.lineWidth = isHovered ? 4 : 2.5
        ctx.stroke()

        // Progress ring around month bubble
        if (n.pagu > 0) {
          const pct = Math.min(1.0, (n.consumed || 0) / n.pagu)
          ctx.beginPath()
          ctx.arc(n.x, n.y, r + 4, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * pct))
          ctx.strokeStyle = n.status === 'OVER_PLAN' ? '#ef4444' : '#10b981'
          ctx.lineWidth = 3.5
          ctx.stroke()
        }

        // Highlight ring on hover
        if (isHovered || isMatchSearch) {
          ctx.beginPath()
          ctx.arc(n.x, n.y, r + 7, 0, Math.PI * 2)
          ctx.strokeStyle = isMatchSearch ? '#eab308' : '#2563eb'
          ctx.lineWidth = 2
          ctx.setLineDash([3, 3])
          ctx.stroke()
          ctx.setLineDash([])
        }
      } else if (n.type === 'category') {
        ctx.fillStyle = '#4f46e5'
        ctx.fill()
        ctx.lineWidth = isHovered ? 4 : 2.5
        ctx.strokeStyle = '#c7d2fe'
        ctx.stroke()
      } else if (n.type === 'plan') {
        if (n.status === 'OVER_PLAN') {
          ctx.fillStyle = '#fef2f2'
          ctx.strokeStyle = '#ef4444'
        } else if (n.status === 'ON_PLAN') {
          ctx.fillStyle = '#f0fdf4'
          ctx.strokeStyle = '#10b981'
        } else {
          ctx.fillStyle = '#f8fafc'
          ctx.strokeStyle = '#94a3b8'
        }
        ctx.fill()
        ctx.lineWidth = isHovered ? 3.5 : 2
        ctx.stroke()

        if (n.pagu > 0) {
          const pct = Math.min(1.0, (n.consumed || 0) / n.pagu)
          ctx.beginPath()
          ctx.arc(n.x, n.y, r + 4, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * pct))
          ctx.strokeStyle = n.status === 'OVER_PLAN' ? '#ef4444' : '#10b981'
          ctx.lineWidth = 3
          ctx.stroke()
        }
      } else if (n.type === 'pool_oop') {
        ctx.fillStyle = '#fff7ed'
        ctx.strokeStyle = '#f97316'
        ctx.fill()
        ctx.lineWidth = 3
        ctx.stroke()
      } else if (n.type === 'pool_unmapped') {
        ctx.fillStyle = '#fefce8'
        ctx.strokeStyle = '#eab308'
        ctx.fill()
        ctx.lineWidth = 3
        ctx.stroke()
      } else {
        // PR Node
        if (n.status === 'OVER_PLAN') ctx.fillStyle = '#ef4444'
        else if (n.status === 'ON_PLAN') ctx.fillStyle = '#10b981'
        else if (n.status === 'OOP') ctx.fillStyle = '#f97316'
        else ctx.fillStyle = '#eab308'

        ctx.fill()
        ctx.lineWidth = isHovered ? 3.5 : 1.8
        ctx.strokeStyle = '#ffffff'
        ctx.stroke()
      }

      ctx.restore()

      // Node Labels
      ctx.save()
      ctx.globalAlpha = isDimmed ? 0.25 : 1.0

      if (n.type === 'center_year') {
        ctx.font = 'bold 15px Inter, sans-serif'
        ctx.fillStyle = '#ffffff'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(n.label, n.x, n.y - 6)

        ctx.font = '600 11px Inter, sans-serif'
        ctx.fillStyle = '#94a3b8'
        ctx.fillText('12 Bulan', n.x, n.y + 11)
      } else if (n.type === 'month_cluster') {
        ctx.font = 'bold 13px Inter, sans-serif'
        ctx.fillStyle = n.status === 'OVER_PLAN' ? '#991b1b' : (n.planCount > 0 ? '#166534' : '#334155')
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(n.label, n.x, n.y - 6)

        ctx.font = '600 10.5px Inter, sans-serif'
        ctx.fillStyle = '#64748b'
        ctx.fillText(`${n.prCount} PR · ${n.planCount} Plan`, n.x, n.y + 9)

        if (isHovered) {
          ctx.font = 'bold 10px Inter, sans-serif'
          ctx.fillStyle = '#2563eb'
          ctx.fillText('Klik untuk Rincian', n.x, n.y + r + 14)
        }
      } else if (n.type === 'category') {
        ctx.font = 'bold 13px Inter, sans-serif'
        ctx.fillStyle = '#ffffff'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(n.category || 'CAT', n.x, n.y)
      } else if (n.type === 'plan') {
        ctx.font = 'bold 11px Inter, sans-serif'
        ctx.fillStyle = n.status === 'OVER_PLAN' ? '#991b1b' : (n.status === 'ON_PLAN' ? '#166534' : '#334155')
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(n.month || 'PLAN', n.x, n.y - 3)

        ctx.font = '500 9.5px Inter, sans-serif'
        ctx.fillStyle = '#64748b'
        const labelText = n.label.length > 15 ? n.label.substring(0, 13) + '...' : n.label
        ctx.fillText(labelText, n.x, n.y + r + 12)
      } else if (n.type === 'pr') {
        if (zoom > 0.7 || isHovered || isConnected) {
          ctx.font = '500 9px Inter, sans-serif'
          ctx.fillStyle = '#334155'
          ctx.textAlign = 'center'
          const labelText = n.label.length > 14 ? n.label.substring(0, 12) + '..' : n.label
          ctx.fillText(labelText, n.x, n.y + r + 10)
        }
      } else {
        ctx.font = 'bold 11px Inter, sans-serif'
        ctx.fillStyle = n.type === 'pool_oop' ? '#9a3412' : '#854d0e'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(n.type === 'pool_oop' ? 'OOP' : 'REVIEW', n.x, n.y)
      }

      ctx.restore()
    })

    ctx.restore()
  }, [])

  // Continuous decoupled animation loop
  useEffect(() => {
    let active = true
    function loop() {
      if (!active) return
      let isMoving = false
      if (alphaRef.current >= 0.005) {
        isMoving = stepSimulation()
      }
      if (isMoving || needsRenderRef.current) {
        render()
        needsRenderRef.current = false
      }
      animFrameId.current = requestAnimationFrame(loop)
    }
    animFrameId.current = requestAnimationFrame(loop)
    return () => {
      active = false
      cancelAnimationFrame(animFrameId.current)
    }
  }, [stepSimulation, render])

  // Coordinate Conversion
  const getCanvasCoords = (e) => {
    const canvas = canvasRef.current
    if (!canvas) return { rawX: 0, rawY: 0, worldX: 0, worldY: 0 }
    const rect = canvas.getBoundingClientRect()
    const clientX = e.clientX ?? e.touches?.[0]?.clientX ?? 0
    const clientY = e.clientY ?? e.touches?.[0]?.clientY ?? 0
    const rawX = clientX - rect.left
    const rawY = clientY - rect.top
    const worldX = (rawX - camera.current.x) / camera.current.zoom
    const worldY = (rawY - camera.current.y) / camera.current.zoom
    return { rawX, rawY, worldX, worldY }
  }

  // Find node under pointer
  const findNodeAt = (worldX, worldY) => {
    const nodes = simNodes.current
    for (let i = nodes.length - 1; i >= 0; i--) {
      const n = nodes[i]
      const dx = worldX - n.x
      const dy = worldY - n.y
      if (dx * dx + dy * dy <= (n.radius + 6) * (n.radius + 6)) {
        return n
      }
    }
    return null
  }

  // Fast Tooltip update directly into DOM (avoids 60+ React re-renders/sec)
  const updateTooltipDOM = (node, rawX, rawY) => {
    const tooltip = tooltipRef.current
    if (!tooltip) return
    if (!node) {
      tooltip.style.display = 'none'
      return
    }

    tooltip.style.display = 'block'
    tooltip.style.left = `${Math.min(window.innerWidth - 300, rawX + 16)}px`
    tooltip.style.top = `${Math.min(window.innerHeight - 180, rawY + 16)}px`

    if (node.type === 'center_year') {
      tooltip.innerHTML = `
        <div style="font-weight:700;font-size:13px;color:#3b82f6;">${node.label}</div>
        <div style="color:var(--text-muted);font-size:11px;margin-top:2px;">Peta Master Anggaran 12 Bulan</div>
      `
    } else if (node.type === 'month_cluster') {
      const isOver = node.status === 'OVER_PLAN'
      tooltip.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
          <strong style="color:var(--text-main);font-size:13px;">Bulan ${node.label} ${periode}</strong>
          <span style="font-size:10px;padding:2px 6px;border-radius:4px;background:${isOver ? '#fee2e2' : '#dcfce7'};color:${isOver ? '#b91c1c' : '#15803d'};font-weight:700;">
            ${isOver ? 'Over Budget' : 'On Plan'}
          </span>
        </div>
        <div style="font-size:11.5px;color:var(--text-muted);line-height:1.5;">
          <div>Dokumen PR: <strong>${node.prCount} Dokumen</strong></div>
          <div>Item Planning: <strong>${node.planCount} Item</strong></div>
          <div>Pagu Disetujui: <strong>${formatRp(node.pagu)}</strong></div>
          <div>Realisasi: <strong>${formatRp(node.consumed)}</strong></div>
        </div>
        <div style="margin-top:6px;padding-top:6px;border-top:1px solid var(--border-color);color:#2563eb;font-weight:700;font-size:11px;">
          Klik bubble untuk membuka rincian PR & Planning
        </div>
      `
    } else if (node.type === 'category') {
      tooltip.innerHTML = `
        <strong style="color:#6366f1;">${node.label}</strong>
        <div style="color:var(--text-muted);font-size:11px;">Hub Kategori Anggaran</div>
      `
    } else if (node.type === 'plan') {
      tooltip.innerHTML = `
        <div style="font-size:10px;text-transform:uppercase;color:#64748b;font-weight:700;">Item Planning (${node.month})</div>
        <strong style="color:var(--text-main);display:block;margin:2px 0 4px;">${node.label}</strong>
        <div style="font-size:11px;color:var(--text-muted);line-height:1.4;">
          <div>Pagu: ${formatRp(node.pagu)}</div>
          <div>Terpakai: ${formatRp(node.consumed)} (${node.consumption_pct}%)</div>
          <div>Sisa: ${formatRp(node.remaining)}</div>
        </div>
      `
    } else if (node.type === 'pr') {
      tooltip.innerHTML = `
        <div style="font-size:10px;text-transform:uppercase;color:#64748b;font-weight:700;">Purchase Requisition</div>
        <strong style="color:var(--text-main);display:block;margin:2px 0 2px;">${node.doc_num}</strong>
        <div style="font-size:11px;color:var(--text-muted);">
          <div>${node.description}</div>
          <div style="margin-top:2px;font-weight:700;color:var(--text-main);">Nominal: ${formatRp(node.amount)}</div>
        </div>
      `
    }
  }

  // Pointer Interaction Handlers
  const handleMouseDown = (e) => {
    const { rawX, rawY, worldX, worldY } = getCanvasCoords(e)
    const node = findNodeAt(worldX, worldY)

    if (node && !node.fixed) {
      draggedNode.current = node
      node.vx = 0
      node.vy = 0
      needsRenderRef.current = true
    } else {
      isDraggingCanvas.current = true
      dragStart.current = { x: rawX - camera.current.x, y: rawY - camera.current.y }
    }
  }

  const handleMouseMove = (e) => {
    const { rawX, rawY, worldX, worldY } = getCanvasCoords(e)

    if (draggedNode.current) {
      draggedNode.current.x = worldX
      draggedNode.current.y = worldY
      draggedNode.current.vx = 0
      draggedNode.current.vy = 0
      needsRenderRef.current = true
    } else if (isDraggingCanvas.current) {
      camera.current.x = rawX - dragStart.current.x
      camera.current.y = rawY - dragStart.current.y
      needsRenderRef.current = true
    } else {
      const node = findNodeAt(worldX, worldY)
      if (node !== hoveredNodeRef.current) {
        hoveredNodeRef.current = node
        needsRenderRef.current = true
      }
      updateTooltipDOM(node, rawX, rawY)
    }
  }

  const handleMouseUp = () => {
    draggedNode.current = null
    isDraggingCanvas.current = false
    needsRenderRef.current = true
  }

  const handleClick = (e) => {
    const { worldX, worldY } = getCanvasCoords(e)
    const node = findNodeAt(worldX, worldY)
    if (node) {
      setSelectedNode(node)
      needsRenderRef.current = true
    }
  }

  // Camera Zoom & Controls
  const handleWheel = (e) => {
    e.preventDefault()
    const { rawX, rawY } = getCanvasCoords(e)
    const zoomFactor = e.deltaY < 0 ? 1.12 : 0.89
    const newZoom = Math.max(0.25, Math.min(3.0, camera.current.zoom * zoomFactor))

    camera.current.x = rawX - (rawX - camera.current.x) * (newZoom / camera.current.zoom)
    camera.current.y = rawY - (rawY - camera.current.y) * (newZoom / camera.current.zoom)
    camera.current.zoom = newZoom
    needsRenderRef.current = true
  }

  const handleZoomIn = () => {
    camera.current.zoom = Math.min(3.0, camera.current.zoom * 1.25)
    needsRenderRef.current = true
  }

  const handleZoomOut = () => {
    camera.current.zoom = Math.max(0.25, camera.current.zoom * 0.8)
    needsRenderRef.current = true
  }

  const handleResetCamera = () => {
    const canvas = canvasRef.current
    const width = canvas ? canvas.clientWidth : 900
    const height = canvas ? canvas.clientHeight : 650
    camera.current = { x: width / 2, y: height / 2, zoom: month === 'All' ? 1.0 : 0.95 }
    needsRenderRef.current = true
  }

  const metrics = rawData.metrics || {}
  const isMonthDetail = month !== 'All'
  const activeMonthLabel = MONTH_OPTIONS.find(m => m.value === month)?.label || month

  return (
    <div className={s.page}>
      {/* ── Header ── */}
      <div className={s.header}>
        <div>
          <h2 className={s.title}>
            <Network size={24} color="var(--primary)" />
            <span>Graf Jaringan Keterhubungan Anggaran</span>
          </h2>
          <p className={s.subtitle}>
            {isMonthDetail 
              ? `Menampilkan rincian keterhubungan anggaran untuk ${activeMonthLabel} ${periode}` 
              : `Peta Navigasi 12 Cluster Bulan Tahun ${periode} — Klik bubble bulan untuk membuka rincian keterhubungan`}
          </p>
        </div>

        {isMonthDetail && (
          <button onClick={() => setMonth('All')} className={s.backBtn} title="Kembali ke Peta 12 Bulan">
            <ArrowLeft size={14} />
            <span>Kembali ke Peta 12 Bulan</span>
          </button>
        )}
      </div>

      {/* ── Filter & Control Bar ── */}
      <div className={s.controlBar}>
        <div className={s.searchWrap}>
          <input
            type="text"
            placeholder={isMonthDetail ? "Cari item planning, nomor PR, vendor..." : "Filter pencarian..."}
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className={s.searchInput}
          />
          <Search size={14} className={s.searchIcon} />
        </div>

        <select value={periode} onChange={e => setPeriode(e.target.value)} className={s.selectInput}>
          <option value="2026">Tahun 2026</option>
          <option value="2025">Tahun 2025</option>
          <option value="2024">Tahun 2024</option>
        </select>

        <select value={month} onChange={e => setMonth(e.target.value)} className={s.selectInput}>
          {MONTH_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>

        {isMonthDetail && (
          <>
            <select value={kategoriId} onChange={e => setKategoriId(e.target.value)} className={s.selectInput}>
              <option value="">Semua Kategori</option>
              {kategoris.map(k => (
                <option key={k.id} value={k.id}>{k.kode} - {k.nama}</option>
              ))}
            </select>

            <select value={budgetStatus} onChange={e => setBudgetStatus(e.target.value)} className={s.selectInput}>
              <option value="ALL">Semua Status Realisasi</option>
              <option value="ON_PLAN">On Plan (Sesuai Pagu)</option>
              <option value="OVER_PLAN">Over Budget (Melebihi Pagu)</option>
              <option value="OOP">OOP (Out of Plan)</option>
              <option value="NEED_MAPPING">Need Mapping (Review)</option>
            </select>
          </>
        )}
      </div>

      {/* ── Quick KPI Strip ── */}
      <div className={s.kpiStrip}>
        <div className={s.kpiCard}>
          <span className={s.kpiLabel}>Total Pagu Planning</span>
          <span className={s.kpiValue}>{formatRp(metrics.total_planned || 0)}</span>
        </div>
        <div className={s.kpiCard}>
          <span className={s.kpiLabel}>Terserap Sesuai Pagu</span>
          <span className={s.kpiValue} style={{ color: '#10b981' }}>{formatRp(metrics.total_consumed || 0)}</span>
        </div>
        <div className={s.kpiCard}>
          <span className={s.kpiLabel}>Over Budget PR</span>
          <span className={s.kpiValue} style={{ color: '#ef4444' }}>{metrics.over_plan_count || 0} PR</span>
        </div>
        <div className={s.kpiCard}>
          <span className={s.kpiLabel}>Out of Plan (OOP)</span>
          <span className={s.kpiValue} style={{ color: '#f97316' }}>{formatRp(metrics.total_oop || 0)}</span>
        </div>
        <div className={s.kpiCard}>
          <span className={s.kpiLabel}>Pending Review</span>
          <span className={s.kpiValue} style={{ color: '#eab308' }}>{metrics.unmapped_count || 0} PR</span>
        </div>
      </div>

      {/* ── Interactive Force-Directed Canvas ── */}
      <div className={s.canvasWrapper}>
        {loading && (
          <div style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(255,255,255,0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            zIndex: 30,
            color: 'var(--text-muted)'
          }}>
            <Loader2 size={24} className="animate-spin" color="var(--primary)" />
            <span>Membuat visualisasi graf keterhubungan...</span>
          </div>
        )}

        {/* Floating Controls */}
        <div className={s.canvasControls}>
          <button onClick={handleZoomIn} title="Perbesar (Zoom In)" className={s.ctrlBtn}>
            <ZoomIn size={16} />
          </button>
          <button onClick={handleZoomOut} title="Perkecil (Zoom Out)" className={s.ctrlBtn}>
            <ZoomOut size={16} />
          </button>
          <button onClick={handleResetCamera} title="Reset Posisi Kamera" className={s.ctrlBtn}>
            <RotateCcw size={16} />
          </button>
        </div>

        {/* Informational Guidance Badge */}
        {!isMonthDetail && (
          <div style={{
            position: 'absolute',
            top: 14,
            left: 14,
            background: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            padding: '8px 14px',
            borderRadius: '8px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
            fontSize: '12px',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            zIndex: 10
          }}>
            <Sparkles size={15} color="#2563eb" />
            <span>Mode Navigasi: <strong>Klik bubble bulan mana saja</strong> untuk membuka rincian keterhubungan di dalamnya.</span>
          </div>
        )}

        <canvas
          ref={canvasRef}
          className={s.canvas}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onClick={handleClick}
          onWheel={handleWheel}
        />

        {/* Direct DOM Tooltip */}
        <div ref={tooltipRef} className={s.tooltip} style={{ display: 'none' }} />

        {/* ── Slide-over Right Side Node Detail Inspector ── */}
        {selectedNode && (
          <div className={s.drawer}>
            <div className={s.drawerHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {selectedNode.type === 'month_cluster' && <Calendar size={18} color="var(--primary)" />}
                {selectedNode.type === 'plan' && <Layers size={18} color="#10b981" />}
                {selectedNode.type === 'pr' && <FileText size={18} color="#2563eb" />}
                {selectedNode.type === 'category' && <Layers size={18} color="#6366f1" />}
                <h3 className={s.drawerTitle}>
                  {selectedNode.type === 'month_cluster' && `Cluster Bulan ${selectedNode.label}`}
                  {selectedNode.type === 'plan' && 'Detail Planning Item'}
                  {selectedNode.type === 'pr' && 'Detail Purchase Requisition'}
                  {selectedNode.type === 'category' && selectedNode.label}
                  {selectedNode.type === 'pool_oop' && 'Out of Plan (OOP)'}
                  {selectedNode.type === 'pool_unmapped' && 'Pending Review Pool'}
                  {selectedNode.type === 'center_year' && selectedNode.label}
                </h3>
              </div>
              <button onClick={() => setSelectedNode(null)} className={s.drawerClose} title="Tutup Detail">
                <X size={16} />
              </button>
            </div>

            <div className={s.drawerBody}>
              {selectedNode.type === 'month_cluster' && (
                <div className={s.drawerSection}>
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Bulan Terpilih</div>
                    <div style={{ fontSize: 17, fontWeight: 800, color: 'var(--text-main)' }}>{selectedNode.label} {periode}</div>
                  </div>
                  <div className={s.drawerGrid}>
                    <div className={s.drawerItem}>
                      <span className={s.drawerLabel}>Dokumen PR</span>
                      <span className={s.drawerVal}>{selectedNode.prCount} Dokumen</span>
                    </div>
                    <div className={s.drawerItem}>
                      <span className={s.drawerLabel}>Item Planning</span>
                      <span className={s.drawerVal}>{selectedNode.planCount} Item</span>
                    </div>
                    <div className={s.drawerItem}>
                      <span className={s.drawerLabel}>Total Pagu</span>
                      <span className={s.drawerVal}>{formatRp(selectedNode.pagu)}</span>
                    </div>
                    <div className={s.drawerItem}>
                      <span className={s.drawerLabel}>Realisasi</span>
                      <span className={s.drawerVal} style={{ color: selectedNode.status === 'OVER_PLAN' ? '#ef4444' : '#10b981' }}>
                        {formatRp(selectedNode.consumed)}
                      </span>
                    </div>
                  </div>
                  <button 
                    onClick={() => {
                      setMonth(selectedNode.monthKey)
                      setSelectedNode(null)
                    }}
                    className={s.backBtn}
                    style={{ width: '100%', marginTop: 14, justifyContent: 'center' }}
                  >
                    <span>Buka Graf Rincian {selectedNode.label}</span>
                    <ChevronRight size={16} />
                  </button>
                </div>
              )}

              {selectedNode.type === 'category' && (
                <div className={s.drawerSection}>
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Kategori Anggaran</div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-main)' }}>{selectedNode.label}</div>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>
                    Hub kategori anggaran yang menghubungkan seluruh item planning dalam kelompok ini pada bulan {activeMonthLabel}.
                  </div>
                </div>
              )}

              {selectedNode.type === 'plan' && (
                <div className={s.drawerSection}>
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Nama Item Planning ({selectedNode.month})</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-main)' }}>{selectedNode.label}</div>
                    {selectedNode.remarks && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{selectedNode.remarks}</div>}
                  </div>
                  <div className={s.drawerGrid}>
                    <div className={s.drawerItem}>
                      <span className={s.drawerLabel}>Pagu Anggaran</span>
                      <span className={s.drawerVal}>{formatRp(selectedNode.pagu)}</span>
                    </div>
                    <div className={s.drawerItem}>
                      <span className={s.drawerLabel}>Total Terpakai</span>
                      <span className={s.drawerVal} style={{ color: selectedNode.status === 'OVER_PLAN' ? '#ef4444' : '#10b981' }}>
                        {formatRp(selectedNode.consumed)}
                      </span>
                    </div>
                    <div className={s.drawerItem}>
                      <span className={s.drawerLabel}>Sisa Saldo</span>
                      <span className={s.drawerVal}>{formatRp(selectedNode.remaining)}</span>
                    </div>
                    <div className={s.drawerItem}>
                      <span className={s.drawerLabel}>Persentase</span>
                      <span className={s.drawerVal}>{selectedNode.consumption_pct}%</span>
                    </div>
                  </div>
                </div>
              )}

              {selectedNode.type === 'pr' && (
                <div className={s.drawerSection}>
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Nomor PR Doc</div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-main)', fontFamily: 'JetBrains Mono' }}>
                      {selectedNode.doc_num}
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--text-main)', marginTop: 4 }}>{selectedNode.description}</div>
                  </div>
                  <div className={s.drawerGrid}>
                    <div className={s.drawerItem}>
                      <span className={s.drawerLabel}>Nominal PR</span>
                      <span className={s.drawerVal}>{formatRp(selectedNode.amount)}</span>
                    </div>
                    <div className={s.drawerItem}>
                      <span className={s.drawerLabel}>Vendor / Supplier</span>
                      <span className={s.drawerVal}>{selectedNode.supplier_name || '-'}</span>
                    </div>
                    <div className={s.drawerItem}>
                      <span className={s.drawerLabel}>Metode Mapping</span>
                      <span className={s.drawerVal}>{selectedNode.method || 'Manual'}</span>
                    </div>
                    <div className={s.drawerItem}>
                      <span className={s.drawerLabel}>Status Budget</span>
                      <span className={s.drawerVal} style={{ color: selectedNode.status === 'OVER_PLAN' ? '#ef4444' : '#10b981' }}>
                        {selectedNode.status || 'MAPPED'}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {selectedNode.type === 'center_year' && (
                <div className={s.drawerSection}>
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Pusat Anggaran</div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-main)' }}>Tahun Anggaran {periode}</div>
                  </div>
                  <div className={s.drawerGrid}>
                    <div className={s.drawerItem}>
                      <span className={s.drawerLabel}>Total Pagu</span>
                      <span className={s.drawerVal}>{formatRp(metrics.total_planned || 0)}</span>
                    </div>
                    <div className={s.drawerItem}>
                      <span className={s.drawerLabel}>Total Realisasi</span>
                      <span className={s.drawerVal} style={{ color: '#10b981' }}>{formatRp(metrics.total_consumed || 0)}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
