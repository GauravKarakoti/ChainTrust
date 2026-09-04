import { useEffect, useRef, useCallback } from 'react'
import cytoscape from 'cytoscape'
import { getCytoscapeStyles, LAYOUT_CONFIG } from '../utils/graphStyles'

export default function GraphView({ elements, onNodeSelect, selectedNode, filter }) {
  const containerRef = useRef(null)
  const cyRef = useRef(null)

  const initCy = useCallback(() => {
    if (!containerRef.current) return;

    if (cyRef.current) {
      cyRef.current.destroy()
      cyRef.current = null 
    }

    const cy = cytoscape({
      container: containerRef.current,
      elements: elements || { nodes: [], edges: [] },
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

      cy.elements().addClass('dimmed')
      node.removeClass('dimmed')
      node.connectedEdges().removeClass('dimmed')
      node.connectedEdges().connectedNodes().removeClass('dimmed')
    })

    cy.on('tap', (evt) => {
      if (evt.target === cy) {
        cy.elements().removeClass('dimmed').removeClass('highlighted')
        onNodeSelect(null)
      }
    })

    cy.on('mouseover', 'node', (evt) => {
      evt.target.addClass('highlighted')
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
        cy.nodes().style('display', 'element')
      } else {
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
    <div className="relative w-full h-full bg-gta-hudBase rounded-[3rem] overflow-hidden border-4 border-gray-900 shadow-[0_0_20px_rgba(0,0,0,0.9)] font-hud">
      {/* Radar Grid Background */}
      <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'linear-gradient(#ffffff 1px, transparent 1px), linear-gradient(90deg, #ffffff 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

      <div ref={containerRef} className="w-full h-full relative z-10" />

      {/* Map Controls */}
      <div className="absolute top-6 right-6 flex flex-col gap-2 z-20">
        <button onClick={handleZoomIn} className="w-10 h-10 bg-black/80 hover:bg-white text-white hover:text-black border-2 border-gray-700 hover:border-black rounded-full transition-all text-xl font-bold flex items-center justify-center shadow-lg">+</button>
        <button onClick={handleZoomOut} className="w-10 h-10 bg-black/80 hover:bg-white text-white hover:text-black border-2 border-gray-700 hover:border-black rounded-full transition-all text-xl font-bold flex items-center justify-center shadow-lg">-</button>
        <button onClick={handleFit} className="w-10 h-10 bg-black/80 hover:bg-white text-white hover:text-black border-2 border-gray-700 hover:border-black rounded-full transition-all text-sm font-bold flex items-center justify-center shadow-lg uppercase">Fit</button>
      </div>

      {/* Radar Legend */}
      <div className="absolute bottom-6 left-6 bg-black/90 border-2 border-gray-800 p-3 z-20 rounded-md">
        <p className="text-[12px] text-white mb-2 font-gta tracking-widest" style={{ WebkitTextStroke: '0.5px black' }}>RADAR BLIPS</p>
        <div className="flex flex-col gap-2">
          {[
            { color: '#ff2a2a', label: 'Hostile Actor' },
            { color: '#f97316', label: 'Wanted Target' },
            { color: '#54b649', label: 'Safe Contact' },
            { color: '#ffffff', label: 'Player (Target)' },
          ].map(({ color, label }) => (
            <div key={label} className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full border border-black shadow-[0_0_5px_currentColor]" style={{ backgroundColor: color, color: color }} />
              <span className="text-[10px] text-gray-300 font-bold uppercase">{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Target Info */}
      <div className="absolute top-6 left-6 bg-black/90 border-2 border-gray-800 px-4 py-2 z-20 flex gap-4 rounded-md">
        <span className="text-xs text-gray-400 font-bold uppercase">
          Entities: <span className="text-gta-green">{elements.nodes.length}</span>
        </span>
        <span className="text-xs text-gray-400 font-bold uppercase">
          Links: <span className="text-gta-green">{elements.edges.length}</span>
        </span>
      </div>

      {!selectedNode && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
          <div className="bg-black/80 px-6 py-2 border-2 border-gray-800 rounded-sm">
            <p className="text-sm text-white font-bold uppercase tracking-widest">Select target to track</p>
          </div>
        </div>
      )}
    </div>
  )
}