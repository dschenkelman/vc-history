"use client"

import type React from "react"
import { useRef, useEffect, useState, useCallback } from "react"
import { subwayLines, subwayNodes } from "@/lib/vc-subway-data"
import type { SubwayNode } from "@/lib/vc-subway-data"
import { dateToX } from "@/lib/vc-subway-utils"

// Constants
const MIN_ZOOM = 0.05
const MAX_ZOOM = 50
const LINE_SPACING = 80
const LINE_WIDTH = 12
const NODE_RADIUS = 6
const FONT_SIZE = 11
const TOOLTIP_WIDTH = 300
const CONNECTION_CURVE = 30

// Helper functions
const parseDate = (dateStr: string): Date => new Date(dateStr)

const getTimelineRange = (): [Date, Date] => {
  let minDate = new Date()
  let maxDate = new Date(1900, 0, 1)

  subwayNodes.forEach((node) => {
    const nodeDate = parseDate(node.date)
    if (nodeDate < minDate) minDate = nodeDate
    if (nodeDate > maxDate) maxDate = nodeDate
  })

  minDate.setFullYear(minDate.getFullYear() - 2)
  maxDate = new Date(2025, 11, 31)

  return [minDate, maxDate]
}

const getNodeColor = (type: string): string => {
  switch (type) {
    case "firm_founding":
      return "#3b82f6"
    case "investment":
      return "#10b981"
    case "ipo":
      return "#8b5cf6"
    case "acquisition":
      return "#f59e0b"
    case "person_move":
      return "#ef4444"
    case "milestone":
      return "#6b7280"
    default:
      return "#6b7280"
  }
}

const getNodeSize = (importance: number): number => {
  switch (importance) {
    case 1:
      return NODE_RADIUS * 0.7
    case 2:
      return NODE_RADIUS
    case 3:
      return NODE_RADIUS * 1.4
    default:
      return NODE_RADIUS
  }
}

const drawCurvedLine = (
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  color: string,
) => {
  ctx.strokeStyle = color
  ctx.beginPath()
  ctx.moveTo(x1, y1)

  const midX = (x1 + x2) / 2
  const controlY = Math.abs(y2 - y1) > 100 ? (y1 + y2) / 2 : Math.min(y1, y2) - CONNECTION_CURVE

  ctx.quadraticCurveTo(midX, controlY, x2, y2)
  ctx.stroke()
}

export function VcSubwayTimeline() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const [dimensions, setDimensions] = useState({ width: 0, height: 0 })
  const [pan, setPan] = useState(0)
  const [panY, setPanY] = useState(0)
  const [zoom, setZoom] = useState(0.1)
  const [isInitialized, setIsInitialized] = useState(false)

  const [isPanning, setIsPanning] = useState(false)
  const [lastPanPoint, setLastPanPoint] = useState({ x: 0, y: 0 })

  const [hoveredNode, setHoveredNode] = useState<{ node: SubwayNode; x: number; y: number } | null>(null)
  const [clickedNode, setClickedNode] = useState<string | null>(null)

  const timelineRange = getTimelineRange()
  const timelineStart = timelineRange[0]
  const timelineEnd = timelineRange[1]

  // Initialize view to show full timeline
  useEffect(() => {
    if (dimensions.width > 0 && dimensions.height > 0 && !isInitialized) {
      const timelineWidthDays = (timelineEnd.getTime() - timelineStart.getTime()) / (1000 * 3600 * 24)
      const timelineHeight = subwayLines.length * LINE_SPACING + 160

      const zoomToFitX = (dimensions.width - 100) / timelineWidthDays
      const zoomToFitY = (dimensions.height - 100) / timelineHeight
      const fitZoom = Math.max(MIN_ZOOM, Math.min(zoomToFitX, zoomToFitY))

      const timelineWidth = timelineWidthDays * fitZoom
      const centerX = (dimensions.width - timelineWidth) / 2
      const centerY = (dimensions.height - timelineHeight) / 2

      setZoom(fitZoom)
      setPan(centerX)
      setPanY(Math.max(centerY, 50))
      setIsInitialized(true)
    }
  }, [dimensions.width, dimensions.height, isInitialized, timelineStart, timelineEnd])

  const calculateNodePositions = useCallback(() => {
    const nodePositions = new Map<string, { x: number; y: number }>()

    subwayLines.forEach((line, lineIndex) => {
      const y = 100 + lineIndex * LINE_SPACING + panY

      line.nodes.forEach((nodeId) => {
        const node = subwayNodes.find((n) => n.id === nodeId)
        if (node) {
          const x = dateToX(parseDate(node.date), timelineStart, pan, zoom)
          nodePositions.set(nodeId, { x, y })
        }
      })
    })

    return nodePositions
  }, [pan, panY, zoom, timelineStart])

  const checkLegendOverlap = useCallback(() => {
    const legendRect = {
      x: 20,
      y: dimensions.height - 160,
      width: 200,
      height: 140,
    }

    const nodePositions = calculateNodePositions()

    for (const [nodeId, pos] of nodePositions) {
      if (
        pos.x >= legendRect.x - 20 &&
        pos.x <= legendRect.x + legendRect.width + 20 &&
        pos.y >= legendRect.y - 20 &&
        pos.y <= legendRect.y + legendRect.height + 20
      ) {
        return true
      }
    }
    return false
  }, [dimensions.height, calculateNodePositions])

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const { width, height } = dimensions
    ctx.clearRect(0, 0, width, height)

    const nodePositions = calculateNodePositions()
    const currentViewStart = new Date(timelineStart.getTime() - (pan / zoom) * (1000 * 3600 * 24))
    const currentViewEnd = new Date(timelineStart.getTime() + ((width - pan) / zoom) * (1000 * 3600 * 24))

    // Draw title
    ctx.font = `bold ${Math.max(24, 32 * Math.min(zoom, 1))}px 'Inter', 'Segoe UI', system-ui, sans-serif`
    ctx.fillStyle = "white"
    ctx.textAlign = "center"
    ctx.fillText("History of Venture Capital", width / 2, 40)
    ctx.textAlign = "left"

    // Draw year grid
    const daysOnScreen = width / zoom
    const yearsOnScreen = daysOnScreen / 365
    let yearStep = 10
    if (yearsOnScreen < 5) yearStep = 1
    else if (yearsOnScreen < 20) yearStep = 2
    else if (yearsOnScreen < 50) yearStep = 5

    ctx.strokeStyle = "rgba(255, 255, 255, 0.1)"
    ctx.lineWidth = 1
    const yearFontSize = Math.max(10, Math.min(14, FONT_SIZE * zoom * 0.8))
    ctx.font = `${yearFontSize}px 'Inter', 'Segoe UI', system-ui, sans-serif`
    ctx.fillStyle = "rgba(255, 255, 255, 0.6)"

    for (let year = timelineStart.getFullYear(); year <= 2025; year += yearStep) {
      const date = new Date(year, 0, 1)
      const x = dateToX(date, timelineStart, pan, zoom)
      if (x > 0 && x < width) {
        ctx.beginPath()
        ctx.moveTo(x, 60)
        ctx.lineTo(x, height)
        ctx.stroke()
        ctx.fillText(year.toString(), x + 4, 80)
      }
    }

    // Draw subway lines
    subwayLines.forEach((line, lineIndex) => {
      const lineStartDate = parseDate(line.startDate)
      const lineEndDate = line.endDate ? parseDate(line.endDate) : new Date(2025, 6, 21)

      if (lineEndDate >= currentViewStart && lineStartDate <= currentViewEnd) {
        const y = 100 + lineIndex * LINE_SPACING + panY

        const lineStartX = dateToX(lineStartDate, timelineStart, pan, zoom)
        const lineEndX = Math.min(width, dateToX(lineEndDate, timelineStart, pan, zoom))

        if (lineEndX > lineStartX && lineStartX < width && lineEndX > 0) {
          const visibleStartX = Math.max(0, lineStartX)
          const visibleEndX = Math.min(width, lineEndX)

          // Draw line
          ctx.strokeStyle = line.color
          ctx.lineWidth = LINE_WIDTH
          ctx.lineCap = "round"
          ctx.beginPath()
          ctx.moveTo(visibleStartX, y)
          ctx.lineTo(visibleEndX, y)
          ctx.stroke()

          // Draw line name
          if (lineStartX < width && lineStartX > -100) {
            const labelX = Math.max(10, visibleStartX + 10)

            const fontSize = Math.max(11, Math.min(16, FONT_SIZE * zoom))
            ctx.font = `bold ${fontSize}px 'Inter', 'Segoe UI', system-ui, sans-serif`
            ctx.fillStyle = "white"
            ctx.textBaseline = "middle"
            ctx.fillText(line.name, labelX, y - 15)
            ctx.textBaseline = "alphabetic"
          }
        }
      }
    })

    // Draw subway line branches
    subwayLines.forEach((line, lineIndex) => {
      if (line.parentLineId) {
        const parentLine = subwayLines.find((l) => l.id === line.parentLineId)
        if (!parentLine) return

        const parentLineIndex = subwayLines.findIndex((l) => l.id === line.parentLineId)
        if (parentLineIndex === -1) return

        const branchStartDate = parseDate(line.startDate)

        if (branchStartDate >= currentViewStart && branchStartDate <= currentViewEnd) {
          const branchX = dateToX(branchStartDate, timelineStart, pan, zoom)

          if (branchX > 0 && branchX < width) {
            const parentY = 100 + parentLineIndex * LINE_SPACING + panY
            const childY = 100 + lineIndex * LINE_SPACING + panY

            const childLineStartX = dateToX(parseDate(line.startDate), timelineStart, pan, zoom)

            ctx.strokeStyle = line.color
            ctx.lineWidth = LINE_WIDTH * 0.6
            ctx.lineCap = "round"
            ctx.globalAlpha = 0.7

            ctx.setLineDash([4, 12])

            ctx.beginPath()
            ctx.moveTo(branchX, parentY)
            ctx.lineTo(childLineStartX, childY)
            ctx.stroke()

            ctx.setLineDash([])
            ctx.globalAlpha = 1
          }
        }
      }
    })

    // Draw connections between nodes
    ctx.globalAlpha = 0.4
    subwayNodes.forEach((node) => {
      const nodePos = nodePositions.get(node.id)
      if (!nodePos) return

      node.connections.forEach((connectionId) => {
        const connectionPos = nodePositions.get(connectionId)
        if (connectionPos && nodePos.x > 0 && nodePos.x < width && connectionPos.x > 0 && connectionPos.x < width) {
          let connectionColor = "rgba(255, 255, 255, 0.3)"
          let shouldHighlight = false

          if (clickedNode) {
            if (node.id === clickedNode && node.connections.includes(connectionId)) {
              connectionColor = "#fbbf24"
              shouldHighlight = true
            } else if (connectionId === clickedNode && node.connections.includes(clickedNode)) {
              connectionColor = "#fbbf24"
              shouldHighlight = true
            }
          }

          if (shouldHighlight) {
            ctx.globalAlpha = 0.9
            ctx.lineWidth = 3
          } else {
            ctx.globalAlpha = 0.4
            ctx.lineWidth = 2
          }

          drawCurvedLine(ctx, nodePos.x, nodePos.y, connectionPos.x, connectionPos.y, connectionColor)
        }
      })
    })
    ctx.globalAlpha = 1

    // Draw nodes
    subwayNodes.forEach((node) => {
      const pos = nodePositions.get(node.id)
      if (!pos || pos.x < -50 || pos.x > width + 50) return

      const radius = getNodeSize(node.importance)
      let color = getNodeColor(node.type)

      if (clickedNode) {
        const clickedNodeData = subwayNodes.find((n) => n.id === clickedNode)
        if (node.id === clickedNode) {
          color = "#fbbf24"
        } else if (clickedNodeData?.connections.includes(node.id) || node.connections.includes(clickedNode)) {
          color = "#60a5fa"
        } else {
          ctx.globalAlpha = 0.3
        }
      }

      ctx.shadowColor = "rgba(0, 0, 0, 0.3)"
      ctx.shadowBlur = 4
      ctx.shadowOffsetX = 2
      ctx.shadowOffsetY = 2

      ctx.beginPath()
      ctx.arc(pos.x, pos.y, radius, 0, 2 * Math.PI)
      ctx.fillStyle = color
      ctx.fill()
      ctx.strokeStyle = "white"
      ctx.lineWidth = 3
      ctx.stroke()

      ctx.shadowColor = "transparent"
      ctx.shadowBlur = 0
      ctx.shadowOffsetX = 0
      ctx.shadowOffsetY = 0

      if (zoom > 0.8 && node.importance >= 2) {
        ctx.fillStyle = "white"
        const nodeFontSize = Math.max(9, Math.min(13, (FONT_SIZE - 2) * zoom))
        ctx.font = `${nodeFontSize}px 'Inter', 'Segoe UI', system-ui, sans-serif`
        const textWidth = ctx.measureText(node.title).width
        ctx.fillText(node.title, pos.x - textWidth / 2, pos.y + radius + 15)
      }

      ctx.globalAlpha = 1
    })
  }, [dimensions, pan, panY, zoom, timelineStart, calculateNodePositions, clickedNode])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const resizeObserver = new ResizeObserver((entries) => {
      if (entries[0]) {
        const { width, height } = entries[0].contentRect
        setDimensions({ width, height })
        const canvas = canvasRef.current
        if (canvas) {
          canvas.width = width * window.devicePixelRatio
          canvas.height = height * window.devicePixelRatio
          const ctx = canvas.getContext("2d")
          ctx?.scale(window.devicePixelRatio, window.devicePixelRatio)
        }
      }
    })

    resizeObserver.observe(container)
    return () => resizeObserver.disconnect()
  }, [])

  useEffect(() => {
    draw()
  }, [draw])

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault()
    const { clientX } = e
    const canvasX = clientX - (containerRef.current?.getBoundingClientRect().left ?? 0)

    const zoomFactor = 1 - e.deltaY * 0.001
    const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom * zoomFactor))

    const panBeforeZoom = canvasX - pan
    const panAfterZoom = panBeforeZoom * (newZoom / zoom)
    const newPan = canvasX - panAfterZoom

    setZoom(newZoom)
    setPan(newPan)
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsPanning(true)
    setLastPanPoint({ x: e.clientX, y: e.clientY })
  }

  const handleMouseUp = () => {
    setIsPanning(false)
  }

  const handleMouseLeave = () => {
    setIsPanning(false)
    setHoveredNode(null)
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      const dx = e.clientX - lastPanPoint.x
      const dy = e.clientY - lastPanPoint.y

      setPan(pan + dx)
      setPanY(panY + dy)
      setLastPanPoint({ x: e.clientX, y: e.clientY })
    } else {
      const { clientX, clientY } = e
      const rect = containerRef.current?.getBoundingClientRect()
      if (!rect) return

      const mouseX = clientX - rect.left
      const mouseY = clientY - rect.top

      const nodePositions = calculateNodePositions()
      let foundNode = null

      for (const node of subwayNodes) {
        const pos = nodePositions.get(node.id)
        if (!pos) continue

        const distance = Math.sqrt((mouseX - pos.x) ** 2 + (mouseY - pos.y) ** 2)
        const radius = getNodeSize(node.importance)

        if (distance < radius + 5) {
          foundNode = { node, x: pos.x, y: pos.y }
          break
        }
      }

      setHoveredNode(foundNode)
    }
  }

  const handleClick = (e: React.MouseEvent) => {
    const { clientX, clientY } = e
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return

    const mouseX = clientX - rect.left
    const mouseY = clientY - rect.top

    const nodePositions = calculateNodePositions()
    let foundNode = null

    for (const node of subwayNodes) {
      const pos = nodePositions.get(node.id)
      if (!pos) continue

      const distance = Math.sqrt((mouseX - pos.x) ** 2 + (mouseY - pos.y) ** 2)
      const radius = getNodeSize(node.importance)

      if (distance < radius + 5) {
        foundNode = node.id
        break
      }
    }

    setClickedNode(foundNode)
  }

  const hasOverlap = checkLegendOverlap()

  return (
    <div
      ref={containerRef}
      className="w-full h-screen relative cursor-grab active:cursor-grabbing"
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
      onMouseMove={handleMouseMove}
      onClick={handleClick}
    >
      <canvas ref={canvasRef} className="absolute top-0 left-0 w-full h-full" />

      {hoveredNode && (
        <div
          className="absolute bg-slate-800 text-white rounded-lg shadow-xl p-4 text-sm pointer-events-none z-10 border border-slate-600"
          style={{
            width: TOOLTIP_WIDTH,
            left: Math.min(hoveredNode.x + 15, dimensions.width - TOOLTIP_WIDTH - 10),
            top: Math.max(10, hoveredNode.y - 60),
          }}
        >
          <div className="flex items-center gap-2 mb-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: getNodeColor(hoveredNode.node.type) }} />
            <p className="font-bold text-white">{hoveredNode.node.title}</p>
          </div>
          <p className="text-slate-300 text-xs mb-2">
            {parseDate(hoveredNode.node.date).toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
          <p className="text-slate-100 leading-relaxed">{hoveredNode.node.description}</p>
        </div>
      )}

      <div
        className={`absolute bottom-5 left-5 p-4 rounded-lg text-xs transition-all duration-200 ${
          hasOverlap ? "bg-slate-800/25" : "bg-slate-800/50"
        }`}
      >
        <p className="text-white font-bold mb-3">Legend</p>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-500"></div>
            <span className="text-slate-200">Firm Founding</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            <span className="text-slate-200">Investment</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-purple-500"></div>
            <span className="text-slate-200">IPO</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-orange-500"></div>
            <span className="text-slate-200">Acquisition</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <span className="text-slate-200">Person Move</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-gray-500"></div>
            <span className="text-slate-200">Milestone</span>
          </div>
        </div>
        <div className="mt-3 pt-3 border-t border-slate-600">
          <p className="text-slate-300 text-xs">
            • Mouse wheel: Zoom • Drag: Pan
            <br />• Click node: Show connections
          </p>
        </div>
      </div>

      {clickedNode && (
        <div className="absolute top-5 left-5 bg-slate-800/90 text-white p-3 rounded-lg text-xs">
          <p className="text-yellow-400 font-bold">{subwayNodes.find((n) => n.id === clickedNode)?.title}</p>
          <p className="text-blue-400">Connected nodes highlighted</p>
          <p className="text-slate-300">Click elsewhere to clear</p>
        </div>
      )}
    </div>
  )
}
