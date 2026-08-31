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
      camera.current = { x: width / 2, y: height / 2, zoom: 0.88 }

      const centerNode = {
        id: 'center-year',
        type: 'center_year',
        label: `Tahun ${periode}`,
        sub: 'Master Budget 2026',
        radius: 46,
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

      monthList.forEach((m, idx) => {
        const angle = (idx / monthList.length) * Math.PI * 2
        const dist = 140
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
          radius: 36,
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
          distance: 120,
          strength: 0.15
        })
      })

      simNodes.current = builtNodes
      simLinks.current = builtLinks
      alphaRef.current = 0.6
      needsRenderRef.current = true
      return
    }

    // ─────────────────────────────────────────────────────────────
    // 2. MODE 1 BULAN SPESIFIK -> RINCIAN KATEGORI, PLAN, & PR
    // ─────────────────────────────────────────────────────────────
    const nodeCount = apiNodes ? apiNodes.length : 0
    const initialZoom = nodeCount > 60 ? 0.72 : 0.88
    camera.current = { x: width / 2, y: height / 2, zoom: initialZoom }

    const categoriesMap = {}
    const nodeMap = {}

    // Group categories
    apiNodes.forEach(n => {
      const cat = n.kategori_kode || 'GEN'
      if (!categoriesMap[cat] && cat !== 'UNKNOWN' && cat !== 'OOP' && cat !== 'PENDING') {
        categoriesMap[cat] = {
          id: `cat-${cat}`,
          label: `Kategori ${cat}`,
          type: 'category',
          category: cat,
          radius: 30,
          x: (Math.random() - 0.5) * 50,
          y: (Math.random() - 0.5) * 50,
          vx: 0,
          vy: 0,
          fixed: false
        }
      }
    })

    const builtNodes = Object.values(categoriesMap)
    const catKeys = Object.keys(categoriesMap)
    
    // Position categories in circle
    catKeys.forEach((catKey, idx) => {
      const angle = (idx / (catKeys.length || 1)) * Math.PI * 2
      categoriesMap[catKey].x = Math.cos(angle) * 150
      categoriesMap[catKey].y = Math.sin(angle) * 150
    })

    // Add nodes clustered near their categories
    apiNodes.forEach((n, i) => {
      const catObj = categoriesMap[n.kategori_kode]
      const baseCenterX = catObj ? catObj.x : 0
      const baseCenterY = catObj ? catObj.y : 0

      const angle = (i / (apiNodes.length || 1)) * Math.PI * 2
      const dist = n.type === 'plan' ? 55 + (i % 4) * 20 : 110 + (i % 6) * 22

      let radius = 15
      if (n.type === 'plan') radius = 22
      if (n.type === 'pool_oop' || n.type === 'pool_unmapped') radius = 26

      const nodeObj = {
        ...n,
        radius,
        x: baseCenterX + Math.cos(angle) * dist + (Math.random() - 0.5) * 20,
        y: baseCenterY + Math.sin(angle) * dist + (Math.random() - 0.5) * 20,
        vx: 0,
        vy: 0
      }
      builtNodes.push(nodeObj)
      nodeMap[n.id] = nodeObj
    })

    builtNodes.forEach(bn => {
      nodeMap[bn.id] = bn
    })

    const builtLinks = []

    // Connect Plan to Category
    builtNodes.forEach(n => {
      if (n.type === 'plan' && n.kategori_kode && categoriesMap[n.kategori_kode]) {
        builtLinks.push({
          source: categoriesMap[n.kategori_kode].id,
          target: n.id,
          type: 'cat_link',
          distance: 90,
          strength: 0.08
        })
      }
    })

    // Connect PR to Plan
    apiLinks.forEach(l => {
      if (nodeMap[l.source] && nodeMap[l.target]) {
        builtLinks.push({
          ...l,
          distance: 70,
          strength: 0.12
        })
      }
    })

    simNodes.current = builtNodes
    simLinks.current = builtLinks
    alphaRef.current = 1.0
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

    alphaRef.current *= 0.93
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
      ctx.globalAlpha = isDimmed ? 0.2 : 1.0

      if (isHovered || isMatchSearch) {
        ctx.shadowColor = isMatchSearch ? '#eab308' : '#3b82f6'
        ctx.shadowBlur = 16
      }

      ctx.beginPath()
      ctx.arc(n.x, n.y, r, 0, Math.PI * 2)

      if (n.type === 'center_year') {
        ctx.fillStyle = '#1e293b'
        ctx.fill()
        ctx.lineWidth = 3
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
        ctx.lineWidth = isHovered ? 3.5 : 2
        ctx.stroke()

        // Progress ring around month bubble
        if (n.pagu > 0) {
          const pct = Math.min(1.0, (n.consumed || 0) / n.pagu)
          ctx.beginPath()
          ctx.arc(n.x, n.y, r + 4, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * pct))
          ctx.strokeStyle = n.status === 'OVER_PLAN' ? '#ef4444' : '#10b981'
          ctx.lineWidth = 3
          ctx.stroke()
        }
      } else if (n.type === 'category') {
        ctx.fillStyle = '#6366f1'
        ctx.fill()
        ctx.lineWidth = 3
        ctx.strokeStyle = '#a5b4fc'
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
        ctx.lineWidth = isHovered ? 3 : 2
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
        ctx.lineWidth = 2.5
        ctx.stroke()
      } else if (n.type === 'pool_unmapped') {
        ctx.fillStyle = '#fefce8'
        ctx.strokeStyle = '#eab308'
        ctx.fill()
        ctx.lineWidth = 2.5
        ctx.stroke()
      } else {
        // PR Node
        if (n.status === 'OVER_PLAN') ctx.fillStyle = '#ef4444'
        else if (n.status === 'ON_PLAN') ctx.fillStyle = '#10b981'
        else if (n.status === 'OOP') ctx.fillStyle = '#f97316'
        else ctx.fillStyle = '#eab308'

        ctx.fill()
        ctx.lineWidth = isHovered ? 3 : 1.5
        ctx.strokeStyle = '#ffffff'
        ctx.stroke()
      }

      ctx.restore()

      // Node Labels
      ctx.save()
      ctx.globalAlpha = isDimmed ? 0.25 : 1.0

      if (n.type === 'center_year') {
        ctx.font = 'bold 13px Inter, sans-serif'
        ctx.fillStyle = '#ffffff'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(n.label, n.x, n.y - 4)

        ctx.font = '500 9px Inter, sans-serif'
        ctx.fillStyle = '#94a3b8'
        ctx.fillText('12 Cluster', n.x, n.y + 10)
      } else if (n.type === 'month_cluster') {
        ctx.font = 'bold 11px Inter, sans-serif'
        ctx.fillStyle = n.status === 'OVER_PLAN' ? '#991b1b' : (n.planCount > 0 ? '#166534' : '#475569')
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(n.label, n.x, n.y - 4)

        ctx.font = '600 9px Inter, sans-serif'
        ctx.fillStyle = '#64748b'
        ctx.fillText(`${n.prCount} PR · ${n.planCount} Plan`, n.x, n.y + 9)

        if (isHovered) {
          ctx.font = 'bold 9px Inter, sans-serif'
          ctx.fillStyle = '#2563eb'
          ctx.fillText('🔍 Klik Buka Bulan', n.x, n.y + r + 13)
        }
      } else if (n.type === 'category') {
        ctx.font = 'bold 11px Inter, sans-serif'
        ctx.fillStyle = '#ffffff'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(n.category || 'CAT', n.x, n.y)
      } else if (n.type === 'plan') {
        ctx.font = 'bold 10px Inter, sans-serif'
        ctx.fillStyle = n.status === 'OVER_PLAN' ? '#991b1b' : (n.status === 'ON_PLAN' ? '#166534' : '#475569')
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(n.month || 'PLAN', n.x, n.y - 2)

        ctx.font = '500 9px Inter, sans-serif'
        ctx.fillStyle = '#64748b'
        const labelText = n.label.length > 14 ? n.label.substring(0, 12) + '...' : n.label
        ctx.fillText(labelText, n.x, n.y + r + 11)
      } else if (n.type === 'pr') {
        if (zoom > 0.75 || isHovered || isConnected) {
          ctx.font = '500 8.5px Inter, sans-serif'
          ctx.fillStyle = '#334155'
          ctx.textAlign = 'center'
          const labelText = n.label.length > 13 ? n.label.substring(0, 11) + '..' : n.label
          ctx.fillText(labelText, n.x, n.y + r + 9)
        }
      } else {
        ctx.font = 'bold 9.5px Inter, sans-serif'
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
          👉 Klik bubble untuk membuka rincian PR & Planning
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
      alphaRef.current = Math.max(alphaRef.current, 0.3)
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
      alphaRef.current = Math.max(alphaRef.current, 0.3)
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
      if (node.type === 'month_cluster') {
        // DRILL-DOWN INTO CLICKED MONTH
        setMonth(node.monthKey)
        return
      }
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
    camera.current = { x: width / 2, y: height / 2, zoom: month === 'All' ? 0.88 : 0.8 }
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
              <option value="OVER_PLAN">Over Plan (Melebihi Pagu)</option>
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
            <span>💡 Mode Peta Ringkas: <strong>Klik bubble bulan mana saja</strong> untuk membuka rincian keterhubungan di dalamnya.</span>
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
      </div>

      {/* ── Slide-over Node Detail Inspector ── */}
      {selectedNode && (
        <div className={s.drawer}>
          <div className={s.drawerHeader}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {selectedNode.type === 'month_cluster' && <Calendar size={18} color="var(--primary)" />}
              {selectedNode.type === 'plan' && <Layers size={18} color="#10b981" />}
              {selectedNode.type === 'pr' && <FileText size={18} color="#2563eb" />}
              <h3 className={s.drawerTitle}>
                {selectedNode.type === 'month_cluster' && `Cluster Bulan ${selectedNode.label}`}
                {selectedNode.type === 'plan' && 'Detail Planning Item'}
                {selectedNode.type === 'pr' && 'Detail Purchase Requisition'}
                {selectedNode.type === 'category' && selectedNode.label}
              </h3>
            </div>
            <button onClick={() => setSelectedNode(null)} className={s.drawerClose}>
              <X size={16} />
            </button>
          </div>

          <div className={s.drawerBody}>
            {selectedNode.type === 'month_cluster' && (
              <div className={s.drawerSection}>
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Bulan Terpilih</div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-main)' }}>{selectedNode.label} {periode}</div>
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
                    <span className={s.drawerVal} style={{ color: '#10b981' }}>{formatRp(selectedNode.consumed)}</span>
                  </div>
                </div>
                <button 
                  onClick={() => {
                    setMonth(selectedNode.monthKey)
                    setSelectedNode(null)
                  }}
                  className={s.backBtn}
                  style={{ width: '100%', marginTop: 16, justifyContent: 'center' }}
                >
                  <span>Buka Graf Rincian {selectedNode.label}</span>
                  <ChevronRight size={16} />
                </button>
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
                    <span className={s.drawerLabel}>Vendor</span>
                    <span className={s.drawerVal}>{selectedNode.supplier_name}</span>
                  </div>
                  <div className={s.drawerItem}>
                    <span className={s.drawerLabel}>Metode Mapping</span>
                    <span className={s.drawerVal}>{selectedNode.method}</span>
                  </div>
                  <div className={s.drawerItem}>
                    <span className={s.drawerLabel}>Status</span>
                    <span className={s.drawerVal}>{selectedNode.status}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
