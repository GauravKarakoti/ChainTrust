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

    const baseStyles = getCytoscapeStyles()
    const extendedStyles = [
      ...baseStyles,
      {
        selector: 'node[risk = "RATE_LIMITED"]',
        style: {
          'background-color': '#eab308',
          'border-color': '#ca8a04',
          'border-width': 2,
          'text-outline-color': '#000000'
        }
      },
      {
        selector: 'node[risk = "UNKNOWN"]',
        style: {
          'background-color': '#5b21b6', // Spooky purple instead of gray
          'border-color': '#4c1d95',
          'border-width': 2
        }
      }
    ]

    const cy = cytoscape({
      container: containerRef.current,
      elements: elements || { nodes: [], edges: [] },
      style: extendedStyles,
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
        risk: data.risk || 'UNKNOWN',
        threatSource: data.threatSource || 'Static Scan'
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

  const hasRateLimitedNodes = elements.nodes.some(n => n.data?.risk === 'RATE_LIMITED')

  return (
    <div className="relative w-full h-full bg-obsidian border-4 border-black font-pixel">
      <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ backgroundImage: 'linear-gradient(#FF7518 2px, transparent 2px), linear-gradient(90deg, #FF7518 2px, transparent 2px)', backgroundSize: '64px 64px' }} />
      <div ref={containerRef} className="w-full h-full relative z-10" />

      {hasRateLimitedNodes && (
        <div className="absolute top-16 left-6 z-20 bg-black border-4 border-pumpkin text-pumpkin text-[16px] px-3 py-2 flex items-center gap-2 shadow-block">
          <span className="inline-block w-3 h-3 border-2 border-black bg-pumpkin animate-pulse" />
          <span>Server lag (Code 666). Some chunks missing.</span>
        </div>
      )}

      <div className="absolute top-6 right-6 flex flex-col gap-2 z-20">
        <button onClick={handleZoomIn} className="w-12 h-12 bg-black hover:bg-pumpkin text-white hover:text-black border-4 border-black transition-all text-2xl flex items-center justify-center shadow-block">+</button>
        <button onClick={handleZoomOut} className="w-12 h-12 bg-black hover:bg-pumpkin text-white hover:text-black border-4 border-black transition-all text-2xl flex items-center justify-center shadow-block">-</button>
        <button onClick={handleFit} className="w-12 h-12 bg-black hover:bg-pumpkin text-white hover:text-black border-4 border-black transition-all text-[14px] flex items-center justify-center shadow-block uppercase">FIT</button>
      </div>

      <div className="absolute bottom-6 left-6 bg-black border-4 border-black p-3 z-20 shadow-block">
        <p className="text-[16px] text-pumpkin mb-2 font-block drop-shadow-[2px_2px_0_rgba(0,0,0,1)]">NETHER MAP</p>
        <div className="flex flex-col gap-2">
          {[
            { color: '#8A0303', label: 'Demonic Entity' },
            { color: '#FF7518', label: 'Cursed Target' },
            { color: '#eab308', label: 'Hexed (Missing Chunks)' },
            { color: '#39FF14', label: 'Innocent Mortal' },
            { color: '#ffffff', label: 'Spawn (Target)' },
          ].map(({ color, border, label }) => (
            <div key={label} className="flex items-center gap-3">
              <div className="w-4 h-4 border-2 shadow-block-sm" style={{ backgroundColor: color, borderColor: border }} />
              <span className="text-[16px] text-white uppercase">{label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="absolute top-6 left-6 bg-black border-4 border-black px-4 py-2 z-20 flex gap-4 shadow-block">
        <span className="text-[16px] text-cobblestone uppercase">
          Souls: <span className="text-pumpkin">{elements.nodes.length}</span>
        </span>
        <span className="text-[16px] text-cobblestone uppercase">
          Leashes: <span className="text-pumpkin">{elements.edges.length}</span>
        </span>
      </div>

      {!selectedNode && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
          <div className="bg-black px-6 py-4 border-4 border-pumpkin shadow-block">
            <p className="text-xl text-pumpkin font-block drop-shadow-[2px_2px_0_rgba(0,0,0,1)] uppercase">Select soul to hunt</p>
          </div>
        </div>
      )}
    </div>
  )
}