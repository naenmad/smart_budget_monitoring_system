import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { mappingApi } from '../api/mappingApi'
import { kategoriApi } from '../api/kategoriApi'
import { formatRp } from '../utils/format'
import { 
  Network, 
  Search, 
  ZoomIn, 
  ZoomOut, 
  Maximize2, 
  Pause, 
  Play, 
  RotateCcw, 
  X, 
  Loader2, 
  Info,
  DollarSign,
  Layers,
  FileText
} from 'lucide-react'
import s from './MappingGraph.module.css'

const MONTHS = ['All', 'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agt', 'Sep', 'Okt', 'Nov', 'Des']

export default function MappingGraph() {
  const [loading, setLoading] = useState(true)
  const [rawData, setRawData] = useState({ nodes: [], links: [], metrics: {} })
  const [kategoris, setKategoris] = useState([])

  // Filters
  const [periode, setPeriode] = useState('2026')
  const [month, setMonth] = useState('Feb')
  const [kategoriId, setKategoriId] = useState('')
  const [budgetStatus, setBudgetStatus] = useState('ALL')
  const [searchTerm, setSearchTerm] = useState('')

  // Canvas & Physics State
  const canvasRef = useRef(null)
  const animFrameId = useRef(null)
  const simNodes = useRef([])
  const simLinks = useRef([])

  const [physicsRunning, setPhysicsRunning] = useState(true)
  const [hoveredNode, setHoveredNode] = useState(null)
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 })
  const [selectedNode, setSelectedNode] = useState(null)

  // Camera / Transform state (Pan & Zoom)
  const camera = useRef({ x: 0, y: 0, zoom: 1 })
  const isDraggingCanvas = useRef(false)
  const dragStart = useRef({ x: 0, y: 0 })
  const draggedNode = useRef(null)

  // Load Kategori options
  useEffect(() => {
    kategoriApi.getAll().then(res => setKategoris(res.data || [])).catch(() => {})
  }, [])

  // Fetch graph data from backend
  useEffect(() => {
    fetchGraph()
  }, [periode, month, kategoriId, budgetStatus])

  async function fetchGraph() {
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
        initSimulation(res.data.nodes, res.data.links)
      }
    } catch (err) {
      console.error('Failed to load graph data:', err)
    } finally {
      setLoading(false)
    }
  }

  // Initialize Force Simulation Graph Layout
  function initSimulation(apiNodes, apiLinks) {
    const canvas = canvasRef.current
    const width = canvas ? canvas.clientWidth : 900
    const height = canvas ? canvas.clientHeight : 650

    // Reset camera to center
    camera.current = { x: width / 2, y: height / 2, zoom: 0.85 }

    // 1. Build Category Hubs & Planning / PR Nodes
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
          radius: 34,
          x: (Math.random() - 0.5) * 200,
          y: (Math.random() - 0.5) * 150,
          vx: 0,
          vy: 0,
          fixed: false
        }
      }
    })

    const builtNodes = Object.values(categoriesMap)

    apiNodes.forEach((n, i) => {
      const angle = (i / apiNodes.length) * Math.PI * 2
      const dist = n.type === 'plan' ? 140 + Math.random() * 80 : 260 + Math.random() * 120

      let radius = 16
      if (n.type === 'plan') radius = 24
      if (n.type === 'pool_oop' || n.type === 'pool_unmapped') radius = 30

      const nodeObj = {
        ...n,
        radius,
        x: Math.cos(angle) * dist + (Math.random() - 0.5) * 40,
        y: Math.sin(angle) * dist + (Math.random() - 0.5) * 40,
        vx: (Math.random() - 0.5) * 2,
        vy: (Math.random() - 0.5) * 2
      }
      builtNodes.push(nodeObj)
      nodeMap[n.id] = nodeObj
    })

    // Index all nodes
    builtNodes.forEach(bn => {
      nodeMap[bn.id] = bn
    })

    // Build links including Category -> Plan links
    const builtLinks = []

    // Connect Plan to its Category
    builtNodes.forEach(n => {
      if (n.type === 'plan' && n.kategori_kode && categoriesMap[n.kategori_kode]) {
        builtLinks.push({
          source: categoriesMap[n.kategori_kode].id,
          target: n.id,
          type: 'cat_link',
          distance: 120,
          strength: 0.08
        })
      }
    })

    // Add API links (Plan -> PR)
    apiLinks.forEach(l => {
      if (nodeMap[l.source] && nodeMap[l.target]) {
        builtLinks.push({
          ...l,
          distance: 90,
          strength: 0.12
        })
      }
    })

    simNodes.current = builtNodes
    simLinks.current = builtLinks
  }

  // Physics Simulation Step (Spring forces, Coulomb repulsion, Gravity, Damping)
  const stepSimulation = useCallback(() => {
    const nodes = simNodes.current
    const links = simLinks.current
    if (!nodes.length) return

    // 1. Repulsion between all pairs of nodes (Coulomb's Law)
    for (let i = 0; i < nodes.length; i++) {
      const n1 = nodes[i]
      for (let j = i + 1; j < nodes.length; j++) {
        const n2 = nodes[j]
        const dx = n2.x - n1.x
        const dy = n2.y - n1.y
        const distSq = dx * dx + dy * dy || 1
        const dist = Math.sqrt(distSq)

        // Minimum distance to prevent overlapping
        const minDist = n1.radius + n2.radius + 15
        const repForce = (5000 / (distSq + 200)) + (dist < minDist ? (minDist - dist) * 0.4 : 0)

        const fx = (dx / dist) * repForce
        const fy = (dy / dist) * repForce

        if (n1 !== draggedNode.current) {
          n1.vx -= fx
          n1.vy -= fy
        }
        if (n2 !== draggedNode.current) {
          n2.vx += fx
          n2.vy += fy
        }
      }
    }

    // 2. Spring Attraction along links (Hooke's Law)
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
      const targetDist = l.distance || 100
      const force = (dist - targetDist) * (l.strength || 0.1)

      const fx = (dx / dist) * force
      const fy = (dy / dist) * force

      if (n1 !== draggedNode.current) {
        n1.vx += fx
        n1.vy += fy
      }
      if (n2 !== draggedNode.current) {
        n2.vx -= fx
        n2.vy -= fy
      }
    }

    // 3. Center Gravity & Damping
    const gravity = 0.015
    const damping = 0.82

    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i]
      if (n === draggedNode.current) continue

      n.vx += -n.x * gravity
      n.vy += -n.y * gravity

      n.vx *= damping
      n.vy *= damping

      n.x += n.vx
      n.y += n.vy
    }
  }, [])

  // Canvas Render Loop
  const render = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const width = canvas.clientWidth
    const height = canvas.clientHeight

    // Handle high DPI Retina displays
    const dpr = window.devicePixelRatio || 1
    if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
      canvas.width = width * dpr
      canvas.height = height * dpr
    }

    ctx.save()
    ctx.scale(dpr, dpr)
    ctx.clearRect(0, 0, width, height)

    // Apply Camera Transform
    ctx.translate(camera.current.x, camera.current.y)
    ctx.scale(camera.current.zoom, camera.current.zoom)

    // Draw background subtle grid
    const zoom = camera.current.zoom
    const gridSize = 40
    const startX = Math.floor((-camera.current.x / zoom) / gridSize) * gridSize
    const endX = startX + (width / zoom) + gridSize * 2
    const startY = Math.floor((-camera.current.y / zoom) / gridSize) * gridSize
    const endY = startY + (height / zoom) + gridSize * 2

    ctx.fillStyle = 'rgba(148, 163, 184, 0.12)'
    for (let x = startX; x <= endX; x += gridSize) {
      for (let y = startY; y <= endY; y += gridSize) {
        ctx.beginPath()
        ctx.arc(x, y, 1, 0, Math.PI * 2)
        ctx.fill()
      }
    }

    const nodes = simNodes.current
    const links = simLinks.current
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

      if (l.type === 'cat_link') {
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
      const isMatchSearch = searchTerm && n.label?.toLowerCase().includes(searchTerm.toLowerCase())
      const isHovered = hoveredNode && n.id === hoveredNode.id
      const isConnected = connectedNodeIds.has(n.id)
      const isDimmed = hoveredNode && !isConnected

      const r = n.radius

      ctx.save()
      ctx.globalAlpha = isDimmed ? 0.2 : 1.0

      // Outer glow for hovered or searched nodes
      if (isHovered || isMatchSearch) {
        ctx.shadowColor = isMatchSearch ? '#eab308' : '#3b82f6'
        ctx.shadowBlur = 18
      }

      // Draw Circle Node
      ctx.beginPath()
      ctx.arc(n.x, n.y, r, 0, Math.PI * 2)

      if (n.type === 'category') {
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

        // Progress ring on Planning nodes
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

      // Node Labels (Text)
      ctx.save()
      ctx.globalAlpha = isDimmed ? 0.25 : 1.0

      if (n.type === 'category') {
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

        // Below label
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
        // Pool nodes
        ctx.font = 'bold 9.5px Inter, sans-serif'
        ctx.fillStyle = n.type === 'pool_oop' ? '#9a3412' : '#854d0e'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(n.type === 'pool_oop' ? 'OOP' : 'REVIEW', n.x, n.y)
      }

      ctx.restore()
    })

    ctx.restore()
  }, [hoveredNode, searchTerm])

  // Animation Loop
  useEffect(() => {
    function loop() {
      if (physicsRunning) {
        stepSimulation()
      }
      render()
      animFrameId.current = requestAnimationFrame(loop)
    }
    animFrameId.current = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(animFrameId.current)
  }, [physicsRunning, stepSimulation, render])

  // Mouse to Canvas coordinate conversion
  const getCanvasCoords = (e) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    const clientX = e.clientX ?? e.touches?.[0]?.clientX ?? 0
    const clientY = e.clientY ?? e.touches?.[0]?.clientY ?? 0
    const rawX = clientX - rect.left
    const rawY = clientY - rect.top
    const worldX = (rawX - camera.current.x) / camera.current.zoom
    const worldY = (rawY - camera.current.y) / camera.current.zoom
    return { rawX, rawY, worldX, worldY }
  }

  // Find node under cursor
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

  // Drag & Pan handlers
  const handleMouseDown = (e) => {
    const { rawX, rawY, worldX, worldY } = getCanvasCoords(e)
    const node = findNodeAt(worldX, worldY)

    if (node) {
      draggedNode.current = node
      node.vx = 0
      node.vy = 0
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
    } else if (isDraggingCanvas.current) {
      camera.current.x = rawX - dragStart.current.x
      camera.current.y = rawY - dragStart.current.y
    } else {
      const node = findNodeAt(worldX, worldY)
      if (node !== hoveredNode) {
        setHoveredNode(node)
      }
      if (node) {
        setTooltipPos({ x: rawX, y: rawY })
      }
    }
  }

  const handleMouseUp = () => {
    draggedNode.current = null
    isDraggingCanvas.current = false
  }

  const handleClick = (e) => {
    const { worldX, worldY } = getCanvasCoords(e)
    const node = findNodeAt(worldX, worldY)
    if (node) {
      setSelectedNode(node)
    }
  }

  // Zoom with Wheel
  const handleWheel = (e) => {
    e.preventDefault()
    const { rawX, rawY } = getCanvasCoords(e)
    const zoomFactor = e.deltaY < 0 ? 1.12 : 0.89
    const newZoom = Math.max(0.25, Math.min(3.0, camera.current.zoom * zoomFactor))

    camera.current.x = rawX - (rawX - camera.current.x) * (newZoom / camera.current.zoom)
    camera.current.y = rawY - (rawY - camera.current.y) * (newZoom / camera.current.zoom)
    camera.current.zoom = newZoom
  }

  // Camera Controls
  const handleZoomIn = () => {
    camera.current.zoom = Math.min(3.0, camera.current.zoom * 1.25)
  }

  const handleZoomOut = () => {
    camera.current.zoom = Math.max(0.25, camera.current.zoom * 0.8)
  }

  const handleResetCamera = () => {
    const canvas = canvasRef.current
    if (canvas) {
      camera.current = { x: canvas.clientWidth / 2, y: canvas.clientHeight / 2, zoom: 0.85 }
    }
  }

  const metrics = rawData.metrics || {}

  return (
    <div className={s.page}>
      {/* ── Header ── */}
      <div className={s.header}>
        <div>
          <h2 className={s.title}>
            <Network size={24} color="var(--primary)" />
            Graf Jaringan Keterhubungan Anggaran (Force-Directed Graph)
          </h2>
          <p className={s.subtitle}>
            Visualisasi jaringan interaktif real-time: Drag node, zoom, pan, dan telusuri alur realisasi anggaran PR ke Planning
          </p>
        </div>
      </div>

      {/* ── Filter & Control Bar ── */}
      <div className={s.controlBar}>
        <div className={s.searchWrap}>
          <input
            type="text"
            placeholder="Cari item planning, nomor PR, vendor..."
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
          {MONTHS.map(m => (
            <option key={m} value={m}>{m === 'All' ? 'Semua Bulan' : `Bulan ${m}`}</option>
          ))}
        </select>

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
      </div>

      {/* ── KPI Metrics Strip ── */}
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
            <span>Membuat simulasi graf jaringan...</span>
          </div>
        )}

        {/* Floating Zoom & Simulation Controls */}
        <div className={s.floatingToolbar}>
          <button className={s.toolBtn} onClick={handleZoomIn} title="Perbesar (Zoom In)">
            <ZoomIn size={16} />
          </button>
          <button className={s.toolBtn} onClick={handleZoomOut} title="Perkecil (Zoom Out)">
            <ZoomOut size={16} />
          </button>
          <button className={s.toolBtn} onClick={handleResetCamera} title="Pusatkan Graf (Fit View)">
            <Maximize2 size={16} />
          </button>
          <button
            className={s.toolBtn}
            onClick={() => setPhysicsRunning(p => !p)}
            title={physicsRunning ? "Bekukan Simulasi Fisika" : "Jalankan Simulasi Fisika"}
          >
            {physicsRunning ? <Pause size={16} /> : <Play size={16} />}
          </button>
        </div>

        {/* Floating Legend */}
        <div className={s.floatingLegend}>
          <div className={s.legendItem}>
            <span className={`${s.legendDot} ${s.legendDotCategory}`} />
            <span>Hub Kategori</span>
          </div>
          <div className={s.legendItem}>
            <span className={`${s.legendDot} ${s.legendDotPlan}`} />
            <span>Pos Planning (Pagu)</span>
          </div>
          <div className={s.legendItem}>
            <span className={`${s.legendDot} ${s.legendDotPlan}`} style={{ background: '#10b981' }} />
            <span>PR On Plan</span>
          </div>
          <div className={s.legendItem}>
            <span className={`${s.legendDot} ${s.legendDotOverPlan}`} />
            <span>PR Over Plan</span>
          </div>
          <div className={s.legendItem}>
            <span className={`${s.legendDot} ${s.legendDotOop}`} />
            <span>PR Out of Plan</span>
          </div>
        </div>

        {/* Hover Tooltip */}
        {hoveredNode && (
          <div
            className={s.tooltipOverlay}
            style={{ left: `${tooltipPos.x}px`, top: `${tooltipPos.y}px` }}
          >
            <div className={s.tooltipTitle}>
              {hoveredNode.type === 'category' ? `Kategori: ${hoveredNode.category}` : hoveredNode.label}
            </div>
            {hoveredNode.type === 'plan' && (
              <div className={s.tooltipMeta}>
                <div>Bulan: <strong>{hoveredNode.month}</strong> · Kategori: <strong>{hoveredNode.kategori_kode}</strong></div>
                <div>Pagu: <strong>{formatRp(hoveredNode.pagu)}</strong></div>
                <div>Terserap: <strong>{formatRp(hoveredNode.consumed)}</strong> ({hoveredNode.consumption_pct}%)</div>
                <div>Status: <span style={{ color: hoveredNode.status === 'OVER_PLAN' ? '#ef4444' : '#10b981', fontWeight: 700 }}>{hoveredNode.status}</span></div>
              </div>
            )}
            {hoveredNode.type === 'pr' && (
              <div className={s.tooltipMeta}>
                <div>No PR: <strong>{hoveredNode.doc_num}</strong></div>
                <div>Total: <strong>{formatRp(hoveredNode.amount)}</strong></div>
                <div>Vendor: <strong>{hoveredNode.supplier_name}</strong></div>
                <div>Status: <span style={{ color: hoveredNode.status === 'OVER_PLAN' ? '#ef4444' : '#10b981', fontWeight: 700 }}>{hoveredNode.status}</span></div>
              </div>
            )}
            {hoveredNode.type === 'pool_oop' && (
              <div className={s.tooltipMeta}>
                <div>Pool Belanja Out of Plan</div>
                <div>Total Belanja: <strong>{formatRp(hoveredNode.consumed)}</strong></div>
              </div>
            )}
          </div>
        )}

        {/* HTML5 Canvas */}
        <canvas
          ref={canvasRef}
          className={s.graphCanvas}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onClick={handleClick}
          onWheel={handleWheel}
        />
      </div>

      {/* ── Node Inspection Drawer ── */}
      {selectedNode && (
        <div className={s.drawerOverlay} onClick={() => setSelectedNode(null)}>
          <div className={s.drawer} onClick={e => e.stopPropagation()}>
            <div className={s.drawerHeader}>
              <div>
                <h3 className={s.drawerTitle}>
                  {selectedNode.type === 'plan' ? 'Detail Pos Planning Budget' : (selectedNode.type === 'category' ? 'Hub Kategori Anggaran' : 'Detail Pengadaan PR/PO')}
                </h3>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>ID: {selectedNode.id}</span>
              </div>
              <button className={s.drawerCloseBtn} onClick={() => setSelectedNode(null)}>
                <X size={18} />
              </button>
            </div>

            {selectedNode.type === 'plan' && (
              <>
                <div className={s.drawerSection}>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{selectedNode.label}</div>
                  <div className={s.drawerRow}>
                    <span className={s.drawerRowLabel}>Kategori:</span>
                    <span className={s.drawerRowValue}>{selectedNode.kategori_kode} - {selectedNode.kategori_nama}</span>
                  </div>
                  <div className={s.drawerRow}>
                    <span className={s.drawerRowLabel}>Bulan Anggaran:</span>
                    <span className={s.drawerRowValue}>{selectedNode.month}</span>
                  </div>
                  <div className={s.drawerRow}>
                    <span className={s.drawerRowLabel}>Pagu Anggaran:</span>
                    <span className={s.drawerRowValue}>{formatRp(selectedNode.pagu)}</span>
                  </div>
                  <div className={s.drawerRow}>
                    <span className={s.drawerRowLabel}>Total Realisasi Terserap:</span>
                    <span className={s.drawerRowValue}>{formatRp(selectedNode.consumed)} ({selectedNode.consumption_pct}%)</span>
                  </div>
                  <div className={s.drawerRow}>
                    <span className={s.drawerRowLabel}>Sisa Anggaran:</span>
                    <span className={s.drawerRowValue} style={{ color: selectedNode.remaining > 0 ? '#10b981' : '#ef4444' }}>
                      {formatRp(selectedNode.remaining)}
                    </span>
                  </div>
                  {selectedNode.remarks && (
                    <div className={s.drawerRow}>
                      <span className={s.drawerRowLabel}>Catatan Remarks:</span>
                      <span className={s.drawerRowValue}>{selectedNode.remarks}</span>
                    </div>
                  )}
                </div>

                <div style={{ fontSize: 13, fontWeight: 700 }}>PR yang Terserap ke Pos Ini:</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {rawData.links
                    .filter(l => l.source === selectedNode.id)
                    .map((l, i) => {
                      const prNode = rawData.nodes.find(n => n.id === l.target)
                      return (
                        <div key={i} className={s.drawerSection}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontWeight: 700, fontFamily: 'monospace' }}>{prNode?.doc_num}</span>
                            <span style={{
                              fontSize: 10,
                              fontWeight: 700,
                              padding: '2px 6px',
                              borderRadius: 4,
                              background: l.status === 'OVER_PLAN' ? '#fee2e2' : '#dcfce7',
                              color: l.status === 'OVER_PLAN' ? '#991b1b' : '#166534'
                            }}>{l.status}</span>
                          </div>
                          <div>{prNode?.description}</div>
                          <div className={s.drawerRow}>
                            <span className={s.drawerRowLabel}>Vendor: {prNode?.supplier_name}</span>
                            <span className={s.drawerRowValue}>{formatRp(l.amount)}</span>
                          </div>
                        </div>
                      )
                    })}
                </div>
              </>
            )}

            {selectedNode.type === 'pr' && (
              <div className={s.drawerSection}>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{selectedNode.description}</div>
                <div className={s.drawerRow}>
                  <span className={s.drawerRowLabel}>Nomor Dokumen:</span>
                  <span className={s.drawerRowValue} style={{ fontFamily: 'monospace' }}>{selectedNode.doc_num}</span>
                </div>
                <div className={s.drawerRow}>
                  <span className={s.drawerRowLabel}>Kategori:</span>
                  <span className={s.drawerRowValue}>{selectedNode.kategori_kode} - {selectedNode.kategori_nama}</span>
                </div>
                <div className={s.drawerRow}>
                  <span className={s.drawerRowLabel}>Total Realisasi:</span>
                  <span className={s.drawerRowValue}>{formatRp(selectedNode.amount)}</span>
                </div>
                <div className={s.drawerRow}>
                  <span className={s.drawerRowLabel}>Vendor / Supplier:</span>
                  <span className={s.drawerRowValue}>{selectedNode.supplier_name}</span>
                </div>
                <div className={s.drawerRow}>
                  <span className={s.drawerRowLabel}>Metode Matching:</span>
                  <span className={s.drawerRowValue}>{selectedNode.method}</span>
                </div>
                <div className={s.drawerRow}>
                  <span className={s.drawerRowLabel}>Status Anggaran:</span>
                  <span style={{
                    fontSize: 10,
                    fontWeight: 700,
                    padding: '2px 6px',
                    borderRadius: 4,
                    background: selectedNode.status === 'OVER_PLAN' ? '#fee2e2' : '#dcfce7',
                    color: selectedNode.status === 'OVER_PLAN' ? '#991b1b' : '#166534'
                  }}>{selectedNode.status}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
