import { useEffect, useRef, useCallback } from 'react'
import cytoscape from 'cytoscape'
import { getCytoscapeStyles, LAYOUT_CONFIG } from '../utils/graphStyles'

export default function GraphView({ elements, onNodeSelect, selectedNode, filter }) {
  const containerRef = useRef(null)
  const cyRef = useRef(null)

  const initCy = useCallback(() => {
    if (!containerRef.current) return

    if (cyRef.current) {
      cyRef.current.destroy()
      cyRef.current = null 
    }

    const cy = cytoscape({
      container: containerRef.current,
      elements: elements,
      style: getCytoscapeStyles(),
      layout: LAYOUT_CONFIG,
      userZoomingEnabled: true,
      userPanningEnabled: true,
      boxSelectionEnabled: false,
      minZoom: 0.3,
      maxZoom: 3,
    })

    cy.on('tap', 'node', (evt) => {
      const node = evt.target
      const data = node.data() 

      onNodeSelect({
        address: data.id,
        short: data.label || data.id,
        label: data.label || data.id,
        type: data.type || 'wallet',
        risk: data.risk || 'UNKNOWN'
      })

      // Highlight connected
      cy.elements().addClass('dimmed')
      node.removeClass('dimmed')
      node.connectedEdges().removeClass('dimmed')
      node.connectedEdges().connectedNodes().removeClass('dimmed')
    })

    // Background click — reset
    cy.on('tap', (evt) => {
      if (evt.target === cy) {
        cy.elements().removeClass('dimmed').removeClass('highlighted')
        onNodeSelect(null)
      }
    })

    // Hover tooltip
    cy.on('mouseover', 'node', (evt) => {
      const node = evt.target
      node.addClass('highlighted')
    })
    cy.on('mouseout', 'node', (evt) => {
      evt.target.removeClass('highlighted')
    })

    cyRef.current = cy
  }, [elements, onNodeSelect])

  useEffect(() => {
    initCy()
    return () => {
      if (cyRef.current) {
        cyRef.current.destroy()
        cyRef.current = null 
      }
    }
  }, [initCy])

  useEffect(() => {
    const cy = cyRef.current
    if (!cy || !selectedNode) return

    const node = cy.getElementById(selectedNode.address || selectedNode.short)
    if (node && node.length > 0) {
      cy.elements().addClass('dimmed')
      node.removeClass('dimmed')
      node.connectedEdges().removeClass('dimmed')
      node.connectedEdges().connectedNodes().removeClass('dimmed')
    }
  }, [selectedNode])

  useEffect(() => {
    const cy = cyRef.current
    if (!cy) return

    cy.batch(() => {
      if (filter === 'ALL') {
        // Show all nodes
        cy.nodes().style('display', 'element')
      } else {
        // Show only nodes matching the risk filter, hide others
        cy.nodes().forEach(node => {
          if (node.data('risk') === filter) {
            node.style('display', 'element')
          } else {
            node.style('display', 'none')
          }
        })
      }
    })
  }, [filter, elements])

  const handleZoomIn = () => cyRef.current?.zoom(cyRef.current.zoom() * 1.3)
  const handleZoomOut = () => cyRef.current?.zoom(cyRef.current.zoom() * 0.75)
  const handleFit = () => cyRef.current?.fit(undefined, 30)

  return (
    <div className="relative w-full h-full bg-dark-800 rounded-xl overflow-hidden border border-[#1e2847]">
      {/* Graph container */}
      <div ref={containerRef} className="w-full h-full" />

      {/* Controls */}
      <div className="absolute top-3 right-3 flex flex-col gap-1.5 z-10">
        <button onClick={handleZoomIn}
          className="w-8 h-8 bg-dark-700 hover:bg-dark-600 border border-[#1e2847] rounded-lg text-slate-400 hover:text-white transition-all flex items-center justify-center text-sm font-bold">+</button>
        <button onClick={handleZoomOut}
          className="w-8 h-8 bg-dark-700 hover:bg-dark-600 border border-[#1e2847] rounded-lg text-slate-400 hover:text-white transition-all flex items-center justify-center text-sm font-bold">-</button>
        <button onClick={handleFit}
          className="w-8 h-8 bg-dark-700 hover:bg-dark-600 border border-[#1e2847] rounded-lg text-slate-400 hover:text-white transition-all flex items-center justify-center text-xs">⊡</button>
      </div>

      {/* Legend */}
      <div className="absolute bottom-3 left-3 bg-dark-900/80 backdrop-blur-sm border border-[#1e2847] rounded-lg p-3 z-10">
        <p className="text-[10px] text-slate-500 mb-2 uppercase tracking-widest font-semibold">Legend</p>
        <div className="flex flex-col gap-1.5">
          {[
            { color: '#ef4444', label: 'Critical Risk' },
            { color: '#f97316', label: 'High Risk' },
            { color: '#22c55e', label: 'Safe' },
            { color: '#3b82f6', label: 'Target Wallet' },
          ].map(({ color, label }) => (
            <div key={label} className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full border-2 flex-shrink-0" style={{ borderColor: color, backgroundColor: color + '30' }} />
              <span className="text-[10px] text-slate-400">{label}</span>
            </div>
          ))}
          <div className="mt-1 pt-1.5 border-t border-[#1e2847] flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <div className="w-4 h-0.5 bg-blue-500" />
              <span className="text-[10px] text-slate-400">SENT_TO</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-0.5 bg-purple-500 border-dashed border-b" />
              <span className="text-[10px] text-slate-400">SWAPPED</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-0.5 bg-cyan-500" />
              <span className="text-[10px] text-slate-400">INTERACTED</span>
            </div>
          </div>
        </div>
      </div>

      {/* Node count badge */}
      <div className="absolute top-3 left-3 bg-dark-900/80 backdrop-blur-sm border border-[#1e2847] rounded-lg px-3 py-1.5 z-10 flex gap-3">
        <span className="text-[10px] text-slate-400">
          <span className="text-white font-semibold mono">{elements.nodes.length}</span> nodes
        </span>
        <span className="text-[10px] text-slate-400">
          <span className="text-white font-semibold mono">{elements.edges.length}</span> edges
        </span>
      </div>

      {/* Instructions */}
      {!selectedNode && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center opacity-40">
            <p className="text-sm text-slate-400">Click any node to inspect</p>
          </div>
        </div>
      )}
    </div>
  )
}