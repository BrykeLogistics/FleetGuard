'use client'
import { useRef, useState, useEffect } from 'react'

const SHOTS = [
  { id: 'front',        label: 'Front',              icon: '⬆', desc: 'Stand 15–20 ft away, centered on the front' },
  { id: 'rear',         label: 'Rear',               icon: '⬇', desc: 'Stand 15–20 ft away, centered on the rear' },
  { id: 'driver',       label: 'Driver side',        icon: '⬅', desc: 'Stand back far enough to see the full length' },
  { id: 'passenger',    label: 'Passenger side',     icon: '➡', desc: 'Stand back far enough to see the full length' },
  { id: 'front-left',   label: 'Front-left corner',  icon: '↖', desc: '45° angle from the front-left corner' },
  { id: 'front-right',  label: 'Front-right corner', icon: '↗', desc: '45° angle from the front-right corner' },
  { id: 'rear-left',    label: 'Rear-left corner',   icon: '↙', desc: '45° angle from the rear-left corner' },
  { id: 'rear-right',   label: 'Rear-right corner',  icon: '↘', desc: '45° angle from the rear-right corner' },
]

type StencilPath = { d: string; style?: any }
type StencilDef = { viewBox: string; paths: StencilPath[] }
type StencilSet = Record<string, StencilDef>

// ── SPRINTER VAN stencils ──────────────────────────────────────────
const STENCILS_SPRINTER: StencilSet = {
  front: { viewBox:'0 0 400 300', paths:[
    { d:'M100 80 L300 80 L310 240 L90 240 Z', style:{ fill:'none', stroke:'rgba(255,255,255,0.9)', strokeWidth:2.5, strokeDasharray:'10 6' } },
    { d:'M115 90 L285 90 L285 160 L115 160 Z', style:{ fill:'rgba(255,255,255,0.08)', stroke:'rgba(255,255,255,0.6)', strokeWidth:1.5, strokeDasharray:'6 4' } },
    { d:'M102 185 L148 185 L148 210 L102 210 Z', style:{ fill:'rgba(255,255,255,0.06)', stroke:'rgba(255,255,255,0.5)', strokeWidth:1.5, strokeDasharray:'5 4' } },
    { d:'M252 185 L298 185 L298 210 L252 210 Z', style:{ fill:'rgba(255,255,255,0.06)', stroke:'rgba(255,255,255,0.5)', strokeWidth:1.5, strokeDasharray:'5 4' } },
    { d:'M115 165 L285 165 L285 175 L115 175 Z', style:{ fill:'rgba(255,255,255,0.05)', stroke:'rgba(255,255,255,0.3)', strokeWidth:1 } },
    { d:'M110 228 A22 22 0 1 1 110.1 228 Z', style:{ fill:'none', stroke:'rgba(255,255,255,0.6)', strokeWidth:2, strokeDasharray:'5 3' } },
    { d:'M290 228 A22 22 0 1 1 290.1 228 Z', style:{ fill:'none', stroke:'rgba(255,255,255,0.6)', strokeWidth:2, strokeDasharray:'5 3' } },
  ]},
  rear: { viewBox:'0 0 400 300', paths:[
    { d:'M90 70 L310 70 L310 240 L90 240 Z', style:{ fill:'none', stroke:'rgba(255,255,255,0.9)', strokeWidth:2.5, strokeDasharray:'10 6' } },
    { d:'M95 75 L200 75 L200 235 L95 235 Z', style:{ fill:'rgba(255,255,255,0.05)', stroke:'rgba(255,255,255,0.5)', strokeWidth:1.5, strokeDasharray:'6 4' } },
    { d:'M205 75 L305 75 L305 235 L205 235 Z', style:{ fill:'rgba(255,255,255,0.05)', stroke:'rgba(255,255,255,0.5)', strokeWidth:1.5, strokeDasharray:'6 4' } },
    { d:'M200 75 L200 235', style:{ fill:'none', stroke:'rgba(255,255,255,0.3)', strokeWidth:1, strokeDasharray:'4 3' } },
    { d:'M165 148 L182 148 L182 158 L165 158 Z', style:{ fill:'rgba(255,255,255,0.1)', stroke:'rgba(255,255,255,0.5)', strokeWidth:1 } },
    { d:'M218 148 L235 148 L235 158 L218 158 Z', style:{ fill:'rgba(255,255,255,0.1)', stroke:'rgba(255,255,255,0.5)', strokeWidth:1 } },
    { d:'M92 78 L108 78 L108 118 L92 118 Z', style:{ fill:'rgba(255,255,255,0.06)', stroke:'rgba(255,255,255,0.5)', strokeWidth:1.2, strokeDasharray:'4 3' } },
    { d:'M292 78 L308 78 L308 118 L292 118 Z', style:{ fill:'rgba(255,255,255,0.06)', stroke:'rgba(255,255,255,0.5)', strokeWidth:1.2, strokeDasharray:'4 3' } },
    { d:'M110 228 A22 22 0 1 1 110.1 228 Z', style:{ fill:'none', stroke:'rgba(255,255,255,0.6)', strokeWidth:2, strokeDasharray:'5 3' } },
    { d:'M290 228 A22 22 0 1 1 290.1 228 Z', style:{ fill:'none', stroke:'rgba(255,255,255,0.6)', strokeWidth:2, strokeDasharray:'5 3' } },
  ]},
  driver: { viewBox:'0 0 400 300', paths:[
    { d:'M20 80 L380 80 L380 250 L20 250 Z', style:{ fill:'none', stroke:'rgba(255,255,255,0.9)', strokeWidth:2.5, strokeDasharray:'10 6' } },
    { d:'M20 80 L120 80 L120 250 L20 250 Z', style:{ fill:'rgba(255,255,255,0.04)', stroke:'rgba(255,255,255,0.35)', strokeWidth:1, strokeDasharray:'5 4' } },
    { d:'M26 88 L114 88 L114 165 L26 165 Z', style:{ fill:'rgba(255,255,255,0.07)', stroke:'rgba(255,255,255,0.55)', strokeWidth:1.5, strokeDasharray:'5 3' } },
    { d:'M120 80 L380 80 L380 250 L120 250 Z', style:{ fill:'rgba(255,255,255,0.03)', stroke:'rgba(255,255,255,0.3)', strokeWidth:1, strokeDasharray:'6 5' } },
    { d:'M155 160 L230 160 L230 230 L155 230 Z', style:{ fill:'rgba(255,255,255,0.04)', stroke:'rgba(255,255,255,0.3)', strokeWidth:1, strokeDasharray:'5 3' } },
    { d:'M60 238 A26 26 0 1 1 60.1 238 Z', style:{ fill:'none', stroke:'rgba(255,255,255,0.6)', strokeWidth:2, strokeDasharray:'6 3' } },
    { d:'M320 238 A26 26 0 1 1 320.1 238 Z', style:{ fill:'none', stroke:'rgba(255,255,255,0.6)', strokeWidth:2, strokeDasharray:'6 3' } },
    { d:'M14 108 L26 108 L26 128 L14 128 Z', style:{ fill:'rgba(255,255,255,0.08)', stroke:'rgba(255,255,255,0.5)', strokeWidth:1.2 } },
  ]},
  passenger: { viewBox:'0 0 400 300', paths:[
    { d:'M20 80 L380 80 L380 250 L20 250 Z', style:{ fill:'none', stroke:'rgba(255,255,255,0.9)', strokeWidth:2.5, strokeDasharray:'10 6' } },
    { d:'M280 80 L380 80 L380 250 L280 250 Z', style:{ fill:'rgba(255,255,255,0.04)', stroke:'rgba(255,255,255,0.35)', strokeWidth:1, strokeDasharray:'5 4' } },
    { d:'M286 88 L374 88 L374 165 L286 165 Z', style:{ fill:'rgba(255,255,255,0.07)', stroke:'rgba(255,255,255,0.55)', strokeWidth:1.5, strokeDasharray:'5 3' } },
    { d:'M20 80 L280 80 L280 250 L20 250 Z', style:{ fill:'rgba(255,255,255,0.03)', stroke:'rgba(255,255,255,0.3)', strokeWidth:1, strokeDasharray:'6 5' } },
    { d:'M155 160 L230 160 L230 230 L155 230 Z', style:{ fill:'rgba(255,255,255,0.04)', stroke:'rgba(255,255,255,0.3)', strokeWidth:1, strokeDasharray:'5 3' } },
    { d:'M80 238 A26 26 0 1 1 80.1 238 Z', style:{ fill:'none', stroke:'rgba(255,255,255,0.6)', strokeWidth:2, strokeDasharray:'6 3' } },
    { d:'M340 238 A26 26 0 1 1 340.1 238 Z', style:{ fill:'none', stroke:'rgba(255,255,255,0.6)', strokeWidth:2, strokeDasharray:'6 3' } },
    { d:'M374 108 L386 108 L386 128 L374 128 Z', style:{ fill:'rgba(255,255,255,0.08)', stroke:'rgba(255,255,255,0.5)', strokeWidth:1.2 } },
  ]},
  'front-left': { viewBox:'0 0 400 300', paths:[
    { d:'M60 75 L310 75 L345 110 L345 250 L60 250 Z', style:{ fill:'none', stroke:'rgba(255,255,255,0.9)', strokeWidth:2.5, strokeDasharray:'10 6' } },
    { d:'M60 75 L170 75 L170 250 L60 250 Z', style:{ fill:'rgba(255,255,255,0.04)', stroke:'rgba(255,255,255,0.3)', strokeWidth:1, strokeDasharray:'5 4' } },
    { d:'M65 83 L162 83 L162 160 L65 160 Z', style:{ fill:'rgba(255,255,255,0.07)', stroke:'rgba(255,255,255,0.5)', strokeWidth:1.5, strokeDasharray:'5 3' } },
    { d:'M170 75 L310 75 L345 110 L345 250 L170 250 Z', style:{ fill:'rgba(255,255,255,0.03)', stroke:'rgba(255,255,255,0.25)', strokeWidth:1, strokeDasharray:'6 5' } },
    { d:'M100 238 A24 24 0 1 1 100.1 238 Z', style:{ fill:'none', stroke:'rgba(255,255,255,0.6)', strokeWidth:2, strokeDasharray:'5 3' } },
    { d:'M300 238 A24 24 0 1 1 300.1 238 Z', style:{ fill:'none', stroke:'rgba(255,255,255,0.5)', strokeWidth:1.5, strokeDasharray:'5 3' } },
    { d:'M52 105 L66 105 L66 125 L52 125 Z', style:{ fill:'rgba(255,255,255,0.08)', stroke:'rgba(255,255,255,0.45)', strokeWidth:1.2 } },
  ]},
  'front-right': { viewBox:'0 0 400 300', paths:[
    { d:'M55 110 L90 75 L340 75 L340 250 L55 250 Z', style:{ fill:'none', stroke:'rgba(255,255,255,0.9)', strokeWidth:2.5, strokeDasharray:'10 6' } },
    { d:'M230 75 L340 75 L340 250 L230 250 Z', style:{ fill:'rgba(255,255,255,0.04)', stroke:'rgba(255,255,255,0.3)', strokeWidth:1, strokeDasharray:'5 4' } },
    { d:'M238 83 L335 83 L335 160 L238 160 Z', style:{ fill:'rgba(255,255,255,0.07)', stroke:'rgba(255,255,255,0.5)', strokeWidth:1.5, strokeDasharray:'5 3' } },
    { d:'M55 110 L230 75 L230 250 L55 250 Z', style:{ fill:'rgba(255,255,255,0.03)', stroke:'rgba(255,255,255,0.25)', strokeWidth:1, strokeDasharray:'6 5' } },
    { d:'M100 238 A24 24 0 1 1 100.1 238 Z', style:{ fill:'none', stroke:'rgba(255,255,255,0.5)', strokeWidth:1.5, strokeDasharray:'5 3' } },
    { d:'M300 238 A24 24 0 1 1 300.1 238 Z', style:{ fill:'none', stroke:'rgba(255,255,255,0.6)', strokeWidth:2, strokeDasharray:'5 3' } },
    { d:'M334 105 L348 105 L348 125 L334 125 Z', style:{ fill:'rgba(255,255,255,0.08)', stroke:'rgba(255,255,255,0.45)', strokeWidth:1.2 } },
  ]},
  'rear-left': { viewBox:'0 0 400 300', paths:[
    { d:'M55 75 L345 75 L345 110 L290 250 L55 250 Z', style:{ fill:'none', stroke:'rgba(255,255,255,0.9)', strokeWidth:2.5, strokeDasharray:'10 6' } },
    { d:'M285 75 L345 75 L345 110 L285 250 L225 250 L225 75 Z', style:{ fill:'rgba(255,255,255,0.04)', stroke:'rgba(255,255,255,0.35)', strokeWidth:1.2, strokeDasharray:'5 4' } },
    { d:'M55 75 L225 75 L225 250 L55 250 Z', style:{ fill:'rgba(255,255,255,0.03)', stroke:'rgba(255,255,255,0.2)', strokeWidth:1, strokeDasharray:'6 5' } },
    { d:'M90 238 A24 24 0 1 1 90.1 238 Z', style:{ fill:'none', stroke:'rgba(255,255,255,0.5)', strokeWidth:1.5, strokeDasharray:'5 3' } },
    { d:'M285 238 A24 24 0 1 1 285.1 238 Z', style:{ fill:'none', stroke:'rgba(255,255,255,0.6)', strokeWidth:2, strokeDasharray:'5 3' } },
    { d:'M272 80 L284 80 L284 118 L272 118 Z', style:{ fill:'rgba(255,255,255,0.06)', stroke:'rgba(255,255,255,0.45)', strokeWidth:1.2 } },
  ]},
  'rear-right': { viewBox:'0 0 400 300', paths:[
    { d:'M55 110 L110 75 L345 75 L345 250 L55 250 Z', style:{ fill:'none', stroke:'rgba(255,255,255,0.9)', strokeWidth:2.5, strokeDasharray:'10 6' } },
    { d:'M55 110 L115 75 L175 75 L175 250 L55 250 Z', style:{ fill:'rgba(255,255,255,0.04)', stroke:'rgba(255,255,255,0.35)', strokeWidth:1.2, strokeDasharray:'5 4' } },
    { d:'M175 75 L345 75 L345 250 L175 250 Z', style:{ fill:'rgba(255,255,255,0.03)', stroke:'rgba(255,255,255,0.2)', strokeWidth:1, strokeDasharray:'6 5' } },
    { d:'M115 238 A24 24 0 1 1 115.1 238 Z', style:{ fill:'none', stroke:'rgba(255,255,255,0.6)', strokeWidth:2, strokeDasharray:'5 3' } },
    { d:'M310 238 A24 24 0 1 1 310.1 238 Z', style:{ fill:'none', stroke:'rgba(255,255,255,0.5)', strokeWidth:1.5, strokeDasharray:'5 3' } },
    { d:'M116 80 L128 80 L128 118 L116 118 Z', style:{ fill:'rgba(255,255,255,0.06)', stroke:'rgba(255,255,255,0.45)', strokeWidth:1.2 } },
  ]},
}

// ── STEP VAN stencils ──────────────────────────────────────────────
const STENCILS_STEPVAN: StencilSet = {
  front: { viewBox:'0 0 400 300', paths:[
    { d:'M60 55 L340 55 L340 250 L60 250 Z', style:{ fill:'none', stroke:'rgba(255,255,255,0.9)', strokeWidth:2.5, strokeDasharray:'10 6' } },
    { d:'M75 65 L325 65 L325 155 L75 155 Z', style:{ fill:'rgba(255,255,255,0.08)', stroke:'rgba(255,255,255,0.6)', strokeWidth:1.5, strokeDasharray:'6 4' } },
    { d:'M68 168 L130 168 L130 205 L68 205 Z', style:{ fill:'rgba(255,255,255,0.06)', stroke:'rgba(255,255,255,0.5)', strokeWidth:1.5, strokeDasharray:'5 4' } },
    { d:'M270 168 L332 168 L332 205 L270 205 Z', style:{ fill:'rgba(255,255,255,0.06)', stroke:'rgba(255,255,255,0.5)', strokeWidth:1.5, strokeDasharray:'5 4' } },
    { d:'M60 218 L340 218 L340 235 L60 235 Z', style:{ fill:'rgba(255,255,255,0.04)', stroke:'rgba(255,255,255,0.3)', strokeWidth:1 } },
    { d:'M88 242 A22 22 0 1 1 88.1 242 Z', style:{ fill:'none', stroke:'rgba(255,255,255,0.6)', strokeWidth:2, strokeDasharray:'5 3' } },
    { d:'M312 242 A22 22 0 1 1 312.1 242 Z', style:{ fill:'none', stroke:'rgba(255,255,255,0.6)', strokeWidth:2, strokeDasharray:'5 3' } },
    { d:'M155 200 L245 200 L245 230 L155 230 Z', style:{ fill:'rgba(255,255,255,0.05)', stroke:'rgba(255,255,255,0.35)', strokeWidth:1, strokeDasharray:'4 3' } },
  ]},
  rear: { viewBox:'0 0 400 300', paths:[
    { d:'M55 45 L345 45 L345 260 L55 260 Z', style:{ fill:'none', stroke:'rgba(255,255,255,0.9)', strokeWidth:2.5, strokeDasharray:'10 6' } },
    { d:'M60 50 L198 50 L198 255 L60 255 Z', style:{ fill:'rgba(255,255,255,0.05)', stroke:'rgba(255,255,255,0.5)', strokeWidth:1.5, strokeDasharray:'6 4' } },
    { d:'M202 50 L340 50 L340 255 L202 255 Z', style:{ fill:'rgba(255,255,255,0.05)', stroke:'rgba(255,255,255,0.5)', strokeWidth:1.5, strokeDasharray:'6 4' } },
    { d:'M200 50 L200 255', style:{ fill:'none', stroke:'rgba(255,255,255,0.35)', strokeWidth:1.5, strokeDasharray:'4 3' } },
    { d:'M162 150 L182 150 L182 162 L162 162 Z', style:{ fill:'rgba(255,255,255,0.1)', stroke:'rgba(255,255,255,0.5)', strokeWidth:1 } },
    { d:'M218 150 L238 150 L238 162 L218 162 Z', style:{ fill:'rgba(255,255,255,0.1)', stroke:'rgba(255,255,255,0.5)', strokeWidth:1 } },
    { d:'M57 52 L78 52 L78 108 L57 108 Z', style:{ fill:'rgba(255,255,255,0.06)', stroke:'rgba(255,255,255,0.5)', strokeWidth:1.5, strokeDasharray:'5 3' } },
    { d:'M322 52 L343 52 L343 108 L322 108 Z', style:{ fill:'rgba(255,255,255,0.06)', stroke:'rgba(255,255,255,0.5)', strokeWidth:1.5, strokeDasharray:'5 3' } },
    { d:'M55 248 L345 248 L345 262 L55 262 Z', style:{ fill:'rgba(255,255,255,0.05)', stroke:'rgba(255,255,255,0.3)', strokeWidth:1 } },
    { d:'M82 268 A20 20 0 1 1 82.1 268 Z', style:{ fill:'none', stroke:'rgba(255,255,255,0.5)', strokeWidth:1.5, strokeDasharray:'5 3' } },
    { d:'M318 268 A20 20 0 1 1 318.1 268 Z', style:{ fill:'none', stroke:'rgba(255,255,255,0.5)', strokeWidth:1.5, strokeDasharray:'5 3' } },
  ]},
  driver: { viewBox:'0 0 400 300', paths:[
    { d:'M15 55 L385 55 L385 260 L15 260 Z', style:{ fill:'none', stroke:'rgba(255,255,255,0.9)', strokeWidth:2.5, strokeDasharray:'10 6' } },
    { d:'M15 55 L100 55 L100 260 L15 260 Z', style:{ fill:'rgba(255,255,255,0.04)', stroke:'rgba(255,255,255,0.3)', strokeWidth:1, strokeDasharray:'5 4' } },
    { d:'M20 62 L95 62 L95 155 L20 155 Z', style:{ fill:'rgba(255,255,255,0.07)', stroke:'rgba(255,255,255,0.5)', strokeWidth:1.5, strokeDasharray:'5 3' } },
    { d:'M20 158 L95 158 L95 230 L20 230 Z', style:{ fill:'rgba(255,255,255,0.04)', stroke:'rgba(255,255,255,0.35)', strokeWidth:1.2, strokeDasharray:'5 4' } },
    { d:'M55 192 L85 192 L85 202 L55 202 Z', style:{ fill:'rgba(255,255,255,0.1)', stroke:'rgba(255,255,255,0.5)', strokeWidth:1 } },
    { d:'M100 55 L385 55 L385 260 L100 260 Z', style:{ fill:'rgba(255,255,255,0.03)', stroke:'rgba(255,255,255,0.25)', strokeWidth:1, strokeDasharray:'6 5' } },
    { d:'M60 250 A34 34 0 1 1 60.1 250 Z', style:{ fill:'none', stroke:'rgba(255,255,255,0.6)', strokeWidth:2, strokeDasharray:'6 3' } },
    { d:'M305 250 A34 34 0 1 1 305.1 250 Z', style:{ fill:'none', stroke:'rgba(255,255,255,0.6)', strokeWidth:2, strokeDasharray:'6 3' } },
    { d:'M322 250 A28 28 0 1 1 322.1 250 Z', style:{ fill:'none', stroke:'rgba(255,255,255,0.4)', strokeWidth:1.5, strokeDasharray:'5 3' } },
    { d:'M8 92 L20 92 L20 115 L8 115 Z', style:{ fill:'rgba(255,255,255,0.08)', stroke:'rgba(255,255,255,0.45)', strokeWidth:1.2 } },
  ]},
  passenger: { viewBox:'0 0 400 300', paths:[
    { d:'M15 55 L385 55 L385 260 L15 260 Z', style:{ fill:'none', stroke:'rgba(255,255,255,0.9)', strokeWidth:2.5, strokeDasharray:'10 6' } },
    { d:'M300 55 L385 55 L385 260 L300 260 Z', style:{ fill:'rgba(255,255,255,0.04)', stroke:'rgba(255,255,255,0.3)', strokeWidth:1, strokeDasharray:'5 4' } },
    { d:'M305 62 L380 62 L380 155 L305 155 Z', style:{ fill:'rgba(255,255,255,0.07)', stroke:'rgba(255,255,255,0.5)', strokeWidth:1.5, strokeDasharray:'5 3' } },
    { d:'M305 158 L380 158 L380 230 L305 230 Z', style:{ fill:'rgba(255,255,255,0.04)', stroke:'rgba(255,255,255,0.35)', strokeWidth:1.2, strokeDasharray:'5 4' } },
    { d:'M315 192 L345 192 L345 202 L315 202 Z', style:{ fill:'rgba(255,255,255,0.1)', stroke:'rgba(255,255,255,0.5)', strokeWidth:1 } },
    { d:'M15 55 L300 55 L300 260 L15 260 Z', style:{ fill:'rgba(255,255,255,0.03)', stroke:'rgba(255,255,255,0.25)', strokeWidth:1, strokeDasharray:'6 5' } },
    { d:'M95 250 A34 34 0 1 1 95.1 250 Z', style:{ fill:'none', stroke:'rgba(255,255,255,0.6)', strokeWidth:2, strokeDasharray:'6 3' } },
    { d:'M338 250 A34 34 0 1 1 338.1 250 Z', style:{ fill:'none', stroke:'rgba(255,255,255,0.6)', strokeWidth:2, strokeDasharray:'6 3' } },
    { d:'M355 250 A28 28 0 1 1 355.1 250 Z', style:{ fill:'none', stroke:'rgba(255,255,255,0.4)', strokeWidth:1.5, strokeDasharray:'5 3' } },
    { d:'M380 92 L392 92 L392 115 L380 115 Z', style:{ fill:'rgba(255,255,255,0.08)', stroke:'rgba(255,255,255,0.45)', strokeWidth:1.2 } },
  ]},
  'front-left': { viewBox:'0 0 400 300', paths:[
    { d:'M50 50 L320 50 L360 90 L360 260 L50 260 Z', style:{ fill:'none', stroke:'rgba(255,255,255,0.9)', strokeWidth:2.5, strokeDasharray:'10 6' } },
    { d:'M50 50 L160 50 L160 260 L50 260 Z', style:{ fill:'rgba(255,255,255,0.04)', stroke:'rgba(255,255,255,0.3)', strokeWidth:1, strokeDasharray:'5 4' } },
    { d:'M55 58 L154 58 L154 155 L55 155 Z', style:{ fill:'rgba(255,255,255,0.07)', stroke:'rgba(255,255,255,0.5)', strokeWidth:1.5, strokeDasharray:'5 3' } },
    { d:'M160 50 L320 50 L360 90 L360 260 L160 260 Z', style:{ fill:'rgba(255,255,255,0.03)', stroke:'rgba(255,255,255,0.22)', strokeWidth:1, strokeDasharray:'6 5' } },
    { d:'M90 250 A30 30 0 1 1 90.1 250 Z', style:{ fill:'none', stroke:'rgba(255,255,255,0.6)', strokeWidth:2, strokeDasharray:'5 3' } },
    { d:'M310 250 A30 30 0 1 1 310.1 250 Z', style:{ fill:'none', stroke:'rgba(255,255,255,0.5)', strokeWidth:1.5, strokeDasharray:'5 3' } },
    { d:'M42 88 L56 88 L56 110 L42 110 Z', style:{ fill:'rgba(255,255,255,0.08)', stroke:'rgba(255,255,255,0.45)', strokeWidth:1.2 } },
  ]},
  'front-right': { viewBox:'0 0 400 300', paths:[
    { d:'M40 90 L80 50 L350 50 L350 260 L40 260 Z', style:{ fill:'none', stroke:'rgba(255,255,255,0.9)', strokeWidth:2.5, strokeDasharray:'10 6' } },
    { d:'M240 50 L350 50 L350 260 L240 260 Z', style:{ fill:'rgba(255,255,255,0.04)', stroke:'rgba(255,255,255,0.3)', strokeWidth:1, strokeDasharray:'5 4' } },
    { d:'M246 58 L345 58 L345 155 L246 155 Z', style:{ fill:'rgba(255,255,255,0.07)', stroke:'rgba(255,255,255,0.5)', strokeWidth:1.5, strokeDasharray:'5 3' } },
    { d:'M40 90 L240 50 L240 260 L40 260 Z', style:{ fill:'rgba(255,255,255,0.03)', stroke:'rgba(255,255,255,0.22)', strokeWidth:1, strokeDasharray:'6 5' } },
    { d:'M90 250 A30 30 0 1 1 90.1 250 Z', style:{ fill:'none', stroke:'rgba(255,255,255,0.5)', strokeWidth:1.5, strokeDasharray:'5 3' } },
    { d:'M310 250 A30 30 0 1 1 310.1 250 Z', style:{ fill:'none', stroke:'rgba(255,255,255,0.6)', strokeWidth:2, strokeDasharray:'5 3' } },
    { d:'M344 88 L358 88 L358 110 L344 110 Z', style:{ fill:'rgba(255,255,255,0.08)', stroke:'rgba(255,255,255,0.45)', strokeWidth:1.2 } },
  ]},
  'rear-left': { viewBox:'0 0 400 300', paths:[
    { d:'M45 50 L355 50 L355 95 L295 260 L45 260 Z', style:{ fill:'none', stroke:'rgba(255,255,255,0.9)', strokeWidth:2.5, strokeDasharray:'10 6' } },
    { d:'M290 50 L355 50 L355 95 L290 260 L230 260 L230 50 Z', style:{ fill:'rgba(255,255,255,0.04)', stroke:'rgba(255,255,255,0.38)', strokeWidth:1.2, strokeDasharray:'5 4' } },
    { d:'M45 50 L230 50 L230 260 L45 260 Z', style:{ fill:'rgba(255,255,255,0.03)', stroke:'rgba(255,255,255,0.2)', strokeWidth:1, strokeDasharray:'6 5' } },
    { d:'M80 250 A28 28 0 1 1 80.1 250 Z', style:{ fill:'none', stroke:'rgba(255,255,255,0.5)', strokeWidth:1.5, strokeDasharray:'5 3' } },
    { d:'M290 250 A28 28 0 1 1 290.1 250 Z', style:{ fill:'none', stroke:'rgba(255,255,255,0.6)', strokeWidth:2, strokeDasharray:'5 3' } },
    { d:'M275 55 L288 55 L288 98 L275 98 Z', style:{ fill:'rgba(255,255,255,0.06)', stroke:'rgba(255,255,255,0.45)', strokeWidth:1.2 } },
  ]},
  'rear-right': { viewBox:'0 0 400 300', paths:[
    { d:'M45 95 L105 50 L355 50 L355 260 L45 260 Z', style:{ fill:'none', stroke:'rgba(255,255,255,0.9)', strokeWidth:2.5, strokeDasharray:'10 6' } },
    { d:'M45 95 L108 50 L170 50 L170 260 L45 260 Z', style:{ fill:'rgba(255,255,255,0.04)', stroke:'rgba(255,255,255,0.38)', strokeWidth:1.2, strokeDasharray:'5 4' } },
    { d:'M170 50 L355 50 L355 260 L170 260 Z', style:{ fill:'rgba(255,255,255,0.03)', stroke:'rgba(255,255,255,0.2)', strokeWidth:1, strokeDasharray:'6 5' } },
    { d:'M110 250 A28 28 0 1 1 110.1 250 Z', style:{ fill:'none', stroke:'rgba(255,255,255,0.6)', strokeWidth:2, strokeDasharray:'5 3' } },
    { d:'M315 250 A28 28 0 1 1 315.1 250 Z', style:{ fill:'none', stroke:'rgba(255,255,255,0.5)', strokeWidth:1.5, strokeDasharray:'5 3' } },
    { d:'M112 55 L125 55 L125 98 L112 98 Z', style:{ fill:'rgba(255,255,255,0.06)', stroke:'rgba(255,255,255,0.45)', strokeWidth:1.2 } },
  ]},
}

// ── BOX TRUCK stencils ─────────────────────────────────────────────
const STENCILS_BOXTRUCK: StencilSet = {
  front: { viewBox:'0 0 400 300', paths:[
    { d:'M70 50 L330 50 L330 260 L70 260 Z', style:{ fill:'none', stroke:'rgba(255,255,255,0.9)', strokeWidth:2.5, strokeDasharray:'10 6' } },
    { d:'M85 62 L315 62 L315 150 L85 150 Z', style:{ fill:'rgba(255,255,255,0.08)', stroke:'rgba(255,255,255,0.6)', strokeWidth:1.5, strokeDasharray:'6 4' } },
    { d:'M75 162 L145 162 L145 210 L75 210 Z', style:{ fill:'rgba(255,255,255,0.06)', stroke:'rgba(255,255,255,0.5)', strokeWidth:1.5, strokeDasharray:'5 4' } },
    { d:'M255 162 L325 162 L325 210 L255 210 Z', style:{ fill:'rgba(255,255,255,0.06)', stroke:'rgba(255,255,255,0.5)', strokeWidth:1.5, strokeDasharray:'5 4' } },
    { d:'M70 225 L330 225 L330 242 L70 242 Z', style:{ fill:'rgba(255,255,255,0.04)', stroke:'rgba(255,255,255,0.3)', strokeWidth:1 } },
    { d:'M100 252 A24 24 0 1 1 100.1 252 Z', style:{ fill:'none', stroke:'rgba(255,255,255,0.6)', strokeWidth:2, strokeDasharray:'5 3' } },
    { d:'M300 252 A24 24 0 1 1 300.1 252 Z', style:{ fill:'none', stroke:'rgba(255,255,255,0.6)', strokeWidth:2, strokeDasharray:'5 3' } },
  ]},
  rear: { viewBox:'0 0 400 300', paths:[
    { d:'M50 40 L350 40 L350 265 L50 265 Z', style:{ fill:'none', stroke:'rgba(255,255,255,0.9)', strokeWidth:2.5, strokeDasharray:'10 6' } },
    { d:'M55 45 L198 45 L198 258 L55 258 Z', style:{ fill:'rgba(255,255,255,0.05)', stroke:'rgba(255,255,255,0.5)', strokeWidth:1.5, strokeDasharray:'6 4' } },
    { d:'M202 45 L345 45 L345 258 L202 258 Z', style:{ fill:'rgba(255,255,255,0.05)', stroke:'rgba(255,255,255,0.5)', strokeWidth:1.5, strokeDasharray:'6 4' } },
    { d:'M200 45 L200 258', style:{ fill:'none', stroke:'rgba(255,255,255,0.4)', strokeWidth:1.5, strokeDasharray:'4 3' } },
    { d:'M160 148 L182 148 L182 162 L160 162 Z', style:{ fill:'rgba(255,255,255,0.1)', stroke:'rgba(255,255,255,0.5)', strokeWidth:1 } },
    { d:'M218 148 L240 148 L240 162 L218 162 Z', style:{ fill:'rgba(255,255,255,0.1)', stroke:'rgba(255,255,255,0.5)', strokeWidth:1 } },
    { d:'M52 48 L76 48 L76 110 L52 110 Z', style:{ fill:'rgba(255,255,255,0.06)', stroke:'rgba(255,255,255,0.5)', strokeWidth:1.5, strokeDasharray:'5 3' } },
    { d:'M324 48 L348 48 L348 110 L324 110 Z', style:{ fill:'rgba(255,255,255,0.06)', stroke:'rgba(255,255,255,0.5)', strokeWidth:1.5, strokeDasharray:'5 3' } },
    { d:'M50 255 L350 255 L350 268 L50 268 Z', style:{ fill:'rgba(255,255,255,0.04)', stroke:'rgba(255,255,255,0.3)', strokeWidth:1 } },
    { d:'M80 275 A22 22 0 1 1 80.1 275 Z', style:{ fill:'none', stroke:'rgba(255,255,255,0.5)', strokeWidth:1.5, strokeDasharray:'4 3' } },
    { d:'M95 275 A18 18 0 1 1 95.1 275 Z', style:{ fill:'none', stroke:'rgba(255,255,255,0.3)', strokeWidth:1, strokeDasharray:'4 3' } },
    { d:'M305 275 A22 22 0 1 1 305.1 275 Z', style:{ fill:'none', stroke:'rgba(255,255,255,0.5)', strokeWidth:1.5, strokeDasharray:'4 3' } },
    { d:'M320 275 A18 18 0 1 1 320.1 275 Z', style:{ fill:'none', stroke:'rgba(255,255,255,0.3)', strokeWidth:1, strokeDasharray:'4 3' } },
  ]},
  driver: { viewBox:'0 0 400 300', paths:[
    { d:'M10 60 L390 60 L390 265 L10 265 Z', style:{ fill:'none', stroke:'rgba(255,255,255,0.9)', strokeWidth:2.5, strokeDasharray:'10 6' } },
    { d:'M10 60 L115 60 L115 265 L10 265 Z', style:{ fill:'rgba(255,255,255,0.04)', stroke:'rgba(255,255,255,0.3)', strokeWidth:1, strokeDasharray:'5 4' } },
    { d:'M15 68 L110 68 L110 158 L15 158 Z', style:{ fill:'rgba(255,255,255,0.07)', stroke:'rgba(255,255,255,0.5)', strokeWidth:1.5, strokeDasharray:'5 3' } },
    { d:'M15 162 L110 162 L110 235 L15 235 Z', style:{ fill:'rgba(255,255,255,0.04)', stroke:'rgba(255,255,255,0.35)', strokeWidth:1.2, strokeDasharray:'5 4' } },
    { d:'M50 196 L85 196 L85 207 L50 207 Z', style:{ fill:'rgba(255,255,255,0.1)', stroke:'rgba(255,255,255,0.5)', strokeWidth:1 } },
    { d:'M115 60 L390 60 L390 265 L115 265 Z', style:{ fill:'rgba(255,255,255,0.03)', stroke:'rgba(255,255,255,0.22)', strokeWidth:1, strokeDasharray:'6 5' } },
    { d:'M65 255 A36 36 0 1 1 65.1 255 Z', style:{ fill:'none', stroke:'rgba(255,255,255,0.6)', strokeWidth:2, strokeDasharray:'6 3' } },
    { d:'M310 255 A36 36 0 1 1 310.1 255 Z', style:{ fill:'none', stroke:'rgba(255,255,255,0.6)', strokeWidth:2, strokeDasharray:'6 3' } },
    { d:'M330 255 A30 30 0 1 1 330.1 255 Z', style:{ fill:'none', stroke:'rgba(255,255,255,0.4)', strokeWidth:1.5, strokeDasharray:'5 3' } },
    { d:'M3 96 L15 96 L15 120 L3 120 Z', style:{ fill:'rgba(255,255,255,0.08)', stroke:'rgba(255,255,255,0.45)', strokeWidth:1.2 } },
  ]},
  passenger: { viewBox:'0 0 400 300', paths:[
    { d:'M10 60 L390 60 L390 265 L10 265 Z', style:{ fill:'none', stroke:'rgba(255,255,255,0.9)', strokeWidth:2.5, strokeDasharray:'10 6' } },
    { d:'M285 60 L390 60 L390 265 L285 265 Z', style:{ fill:'rgba(255,255,255,0.04)', stroke:'rgba(255,255,255,0.3)', strokeWidth:1, strokeDasharray:'5 4' } },
    { d:'M290 68 L385 68 L385 158 L290 158 Z', style:{ fill:'rgba(255,255,255,0.07)', stroke:'rgba(255,255,255,0.5)', strokeWidth:1.5, strokeDasharray:'5 3' } },
    { d:'M290 162 L385 162 L385 235 L290 235 Z', style:{ fill:'rgba(255,255,255,0.04)', stroke:'rgba(255,255,255,0.35)', strokeWidth:1.2, strokeDasharray:'5 4' } },
    { d:'M315 196 L350 196 L350 207 L315 207 Z', style:{ fill:'rgba(255,255,255,0.1)', stroke:'rgba(255,255,255,0.5)', strokeWidth:1 } },
    { d:'M10 60 L285 60 L285 265 L10 265 Z', style:{ fill:'rgba(255,255,255,0.03)', stroke:'rgba(255,255,255,0.22)', strokeWidth:1, strokeDasharray:'6 5' } },
    { d:'M70 255 A36 36 0 1 1 70.1 255 Z', style:{ fill:'none', stroke:'rgba(255,255,255,0.6)', strokeWidth:2, strokeDasharray:'6 3' } },
    { d:'M330 255 A36 36 0 1 1 330.1 255 Z', style:{ fill:'none', stroke:'rgba(255,255,255,0.6)', strokeWidth:2, strokeDasharray:'6 3' } },
    { d:'M350 255 A30 30 0 1 1 350.1 255 Z', style:{ fill:'none', stroke:'rgba(255,255,255,0.4)', strokeWidth:1.5, strokeDasharray:'5 3' } },
    { d:'M385 96 L397 96 L397 120 L385 120 Z', style:{ fill:'rgba(255,255,255,0.08)', stroke:'rgba(255,255,255,0.45)', strokeWidth:1.2 } },
  ]},
  'front-left': { viewBox:'0 0 400 300', paths:[
    { d:'M40 55 L330 55 L370 95 L370 265 L40 265 Z', style:{ fill:'none', stroke:'rgba(255,255,255,0.9)', strokeWidth:2.5, strokeDasharray:'10 6' } },
    { d:'M40 55 L155 55 L155 265 L40 265 Z', style:{ fill:'rgba(255,255,255,0.04)', stroke:'rgba(255,255,255,0.28)', strokeWidth:1, strokeDasharray:'5 4' } },
    { d:'M45 62 L148 62 L148 158 L45 158 Z', style:{ fill:'rgba(255,255,255,0.07)', stroke:'rgba(255,255,255,0.5)', strokeWidth:1.5, strokeDasharray:'5 3' } },
    { d:'M155 55 L330 55 L370 95 L370 265 L155 265 Z', style:{ fill:'rgba(255,255,255,0.03)', stroke:'rgba(255,255,255,0.2)', strokeWidth:1, strokeDasharray:'6 5' } },
    { d:'M82 255 A32 32 0 1 1 82.1 255 Z', style:{ fill:'none', stroke:'rgba(255,255,255,0.6)', strokeWidth:2, strokeDasharray:'5 3' } },
    { d:'M318 255 A32 32 0 1 1 318.1 255 Z', style:{ fill:'none', stroke:'rgba(255,255,255,0.5)', strokeWidth:1.5, strokeDasharray:'5 3' } },
    { d:'M335 255 A26 26 0 1 1 335.1 255 Z', style:{ fill:'none', stroke:'rgba(255,255,255,0.3)', strokeWidth:1, strokeDasharray:'4 3' } },
    { d:'M32 92 L46 92 L46 115 L32 115 Z', style:{ fill:'rgba(255,255,255,0.08)', stroke:'rgba(255,255,255,0.45)', strokeWidth:1.2 } },
  ]},
  'front-right': { viewBox:'0 0 400 300', paths:[
    { d:'M30 95 L70 55 L360 55 L360 265 L30 265 Z', style:{ fill:'none', stroke:'rgba(255,255,255,0.9)', strokeWidth:2.5, strokeDasharray:'10 6' } },
    { d:'M245 55 L360 55 L360 265 L245 265 Z', style:{ fill:'rgba(255,255,255,0.04)', stroke:'rgba(255,255,255,0.28)', strokeWidth:1, strokeDasharray:'5 4' } },
    { d:'M252 62 L355 62 L355 158 L252 158 Z', style:{ fill:'rgba(255,255,255,0.07)', stroke:'rgba(255,255,255,0.5)', strokeWidth:1.5, strokeDasharray:'5 3' } },
    { d:'M30 95 L245 55 L245 265 L30 265 Z', style:{ fill:'rgba(255,255,255,0.03)', stroke:'rgba(255,255,255,0.2)', strokeWidth:1, strokeDasharray:'6 5' } },
    { d:'M82 255 A32 32 0 1 1 82.1 255 Z', style:{ fill:'none', stroke:'rgba(255,255,255,0.5)', strokeWidth:1.5, strokeDasharray:'5 3' } },
    { d:'M95 255 A26 26 0 1 1 95.1 255 Z', style:{ fill:'none', stroke:'rgba(255,255,255,0.3)', strokeWidth:1, strokeDasharray:'4 3' } },
    { d:'M318 255 A32 32 0 1 1 318.1 255 Z', style:{ fill:'none', stroke:'rgba(255,255,255,0.6)', strokeWidth:2, strokeDasharray:'5 3' } },
    { d:'M354 92 L368 92 L368 115 L354 115 Z', style:{ fill:'rgba(255,255,255,0.08)', stroke:'rgba(255,255,255,0.45)', strokeWidth:1.2 } },
  ]},
  'rear-left': { viewBox:'0 0 400 300', paths:[
    { d:'M35 55 L365 55 L365 100 L305 265 L35 265 Z', style:{ fill:'none', stroke:'rgba(255,255,255,0.9)', strokeWidth:2.5, strokeDasharray:'10 6' } },
    { d:'M300 55 L365 55 L365 100 L300 265 L240 265 L240 55 Z', style:{ fill:'rgba(255,255,255,0.04)', stroke:'rgba(255,255,255,0.38)', strokeWidth:1.2, strokeDasharray:'5 4' } },
    { d:'M35 55 L240 55 L240 265 L35 265 Z', style:{ fill:'rgba(255,255,255,0.03)', stroke:'rgba(255,255,255,0.18)', strokeWidth:1, strokeDasharray:'6 5' } },
    { d:'M72 255 A30 30 0 1 1 72.1 255 Z', style:{ fill:'none', stroke:'rgba(255,255,255,0.5)', strokeWidth:1.5, strokeDasharray:'5 3' } },
    { d:'M300 255 A30 30 0 1 1 300.1 255 Z', style:{ fill:'none', stroke:'rgba(255,255,255,0.6)', strokeWidth:2, strokeDasharray:'5 3' } },
    { d:'M318 255 A24 24 0 1 1 318.1 255 Z', style:{ fill:'none', stroke:'rgba(255,255,255,0.3)', strokeWidth:1, strokeDasharray:'4 3' } },
    { d:'M284 60 L298 60 L298 105 L284 105 Z', style:{ fill:'rgba(255,255,255,0.06)', stroke:'rgba(255,255,255,0.45)', strokeWidth:1.2 } },
  ]},
  'rear-right': { viewBox:'0 0 400 300', paths:[
    { d:'M35 100 L95 55 L365 55 L365 265 L35 265 Z', style:{ fill:'none', stroke:'rgba(255,255,255,0.9)', strokeWidth:2.5, strokeDasharray:'10 6' } },
    { d:'M35 100 L98 55 L160 55 L160 265 L35 265 Z', style:{ fill:'rgba(255,255,255,0.04)', stroke:'rgba(255,255,255,0.38)', strokeWidth:1.2, strokeDasharray:'5 4' } },
    { d:'M160 55 L365 55 L365 265 L160 265 Z', style:{ fill:'rgba(255,255,255,0.03)', stroke:'rgba(255,255,255,0.18)', strokeWidth:1, strokeDasharray:'6 5' } },
    { d:'M100 255 A30 30 0 1 1 100.1 255 Z', style:{ fill:'none', stroke:'rgba(255,255,255,0.6)', strokeWidth:2, strokeDasharray:'5 3' } },
    { d:'M115 255 A24 24 0 1 1 115.1 255 Z', style:{ fill:'none', stroke:'rgba(255,255,255,0.3)', strokeWidth:1, strokeDasharray:'4 3' } },
    { d:'M325 255 A30 30 0 1 1 325.1 255 Z', style:{ fill:'none', stroke:'rgba(255,255,255,0.5)', strokeWidth:1.5, strokeDasharray:'5 3' } },
    { d:'M102 60 L116 60 L116 105 L102 105 Z', style:{ fill:'rgba(255,255,255,0.06)', stroke:'rgba(255,255,255,0.45)', strokeWidth:1.2 } },
  ]},
}

function getStencils(vehicleType?: string): StencilSet {
  if (vehicleType === 'stepvan') return STENCILS_STEPVAN
  if (vehicleType === 'boxtruck') return STENCILS_BOXTRUCK
  return STENCILS_SPRINTER // default
}

function getVehicleLabel(vehicleType?: string): string {
  if (vehicleType === 'stepvan') return 'Step Van'
  if (vehicleType === 'boxtruck') return 'Box Truck'
  if (vehicleType === 'sprinter') return 'Sprinter Van'
  return 'Vehicle'
}

interface Props {
  onComplete: (frames: { shotId: string, label: string, dataUrl: string }[]) => void
  onCancel: () => void
  vehicleType?: string
}

export default function GuidedCapture({ onComplete, onCancel, vehicleType }: Props) {
  const [currentShot, setCurrentShot] = useState(0)
  const [captured, setCaptured] = useState<{ shotId: string, label: string, dataUrl: string }[]>([])
  const [mode, setMode] = useState<'camera'|'review'>('camera')
  const [countdown, setCountdown] = useState<number|null>(null)
  const [cameraError, setCameraError] = useState('')
  const [videoPlaying, setVideoPlaying] = useState(false)
  const [lastDataUrl, setLastDataUrl] = useState('')
  const streamRef = useRef<MediaStream|null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const stencils = getStencils(vehicleType)
  const shot = SHOTS[currentShot]
  const stencil = stencils[shot.id]
  const progress = Math.round((currentShot / SHOTS.length) * 100)
  const vehicleLabel = getVehicleLabel(vehicleType)

  useEffect(() => {
    requestCamera()
    return () => { streamRef.current?.getTracks().forEach(t => t.stop()) }
  }, [])

  // Attach stream to video element whenever mode is camera
  useEffect(() => {
    if (mode === 'camera') startVideoPreview()
  }, [mode])

  function startVideoPreview() {
    const el = videoRef.current
    const stream = streamRef.current
    if (!el || !stream) return
    el.srcObject = stream
    el.muted = true
    el.setAttribute('playsinline', 'true')
    setVideoPlaying(false)
    el.play().then(() => setVideoPlaying(true)).catch(() => setVideoPlaying(false))
  }

  function tapToStart() {
    const el = videoRef.current
    if (!el) return
    if (streamRef.current && !el.srcObject) el.srcObject = streamRef.current
    el.play().then(() => setVideoPlaying(true)).catch(() => {})
  }

  async function requestCamera() {
    setCameraError('')
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false
      })
      streamRef.current = s
      setMode('camera')
      // Small delay to ensure video element is rendered before attaching
      setTimeout(() => startVideoPreview(), 100)
    } catch {
      setCameraError('Camera access denied. Please allow camera access in your browser settings and try again.')
    }
  }

  function capturePhoto() {
    if (!videoRef.current || !canvasRef.current || countdown !== null) return
    setCountdown(3)
    let c = 3
    const t = setInterval(() => {
      c--
      setCountdown(c > 0 ? c : null)
      if (c <= 0) {
        clearInterval(t)
        const canvas = canvasRef.current!
        const video = videoRef.current!
        canvas.width = video.videoWidth || 1280
        canvas.height = video.videoHeight || 720
        canvas.getContext('2d')!.drawImage(video, 0, 0)
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85)
        setLastDataUrl(dataUrl)
        setMode('review')
      }
    }, 1000)
  }

  function acceptPhoto() {
    const newCapture = { shotId: shot.id, label: shot.label, dataUrl: lastDataUrl }
    const newCaptured = [...captured, newCapture]
    setCaptured(newCaptured)
    if (currentShot < SHOTS.length - 1) { setCurrentShot(prev => prev + 1); setMode('camera') }
    else onComplete(newCaptured)
  }

  function retakePhoto() { setLastDataUrl(''); setMode('camera') }

  function skipShot() {
    if (currentShot < SHOTS.length - 1) { setCurrentShot(prev => prev + 1); setMode('camera') }
    else onComplete(captured)
  }

  function finishEarly() {
    if (captured.length > 0) onComplete(captured)
    else onCancel()
  }

  return (
    <div style={{ borderRadius:12, overflow:'hidden', background:'#000', position:'relative' }}>
      <canvas ref={canvasRef} style={{ display:'none' }} />

      {cameraError && (
        <div style={{ padding:24, textAlign:'center', background:'#1a1a1a' }}>
          <div style={{ color:'#F09595', fontSize:14, marginBottom:16 }}>{cameraError}</div>
          <button onClick={requestCamera} style={{ padding:'10px 20px', background:'#185FA5', color:'white', border:'none', borderRadius:8, fontSize:13, cursor:'pointer' }}>Try again</button>
        </div>
      )}

      {mode === 'camera' && !cameraError && (
        <div style={{ position:'relative', width:'100%', aspectRatio:'4/3' }}>
          <video ref={videoRef} autoPlay playsInline muted style={{ width:'100%', height:'100%', objectFit:'cover', display:'block' }} onPlaying={() => setVideoPlaying(true)} />

          <svg width="100%" height="100%" viewBox={stencil.viewBox} preserveAspectRatio="xMidYMid meet"
            style={{ position:'absolute', inset:0, pointerEvents:'none' }}>
            {stencil.paths.map((p, i) => <path key={i} d={p.d} style={p.style} />)}
          </svg>

          <div style={{ position:'absolute', inset:0, background:'radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.45) 100%)', pointerEvents:'none' }} />

          {!videoPlaying && (
            <div onClick={tapToStart} style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', background:'rgba(0,0,0,0.7)', cursor:'pointer', zIndex:10 }}>
              <div style={{ fontSize:48, marginBottom:12 }}>📷</div>
              <div style={{ fontSize:16, fontWeight:600, color:'white', marginBottom:6 }}>Tap to start camera</div>
              <div style={{ fontSize:13, color:'rgba(255,255,255,0.6)' }}>Tap anywhere to activate</div>
            </div>
          )}

          <div style={{ position:'absolute', top:12, left:0, right:0, display:'flex', flexDirection:'column', alignItems:'center', gap:5 }}>
            <div style={{ background:'rgba(0,0,0,0.6)', color:'white', padding:'5px 14px', borderRadius:20, fontSize:14, fontWeight:600 }}>
              {shot.icon} {shot.label}
            </div>
            <div style={{ background:'rgba(0,0,0,0.45)', color:'rgba(255,255,255,0.75)', padding:'3px 12px', borderRadius:16, fontSize:11 }}>
              {currentShot + 1} of {SHOTS.length} · {vehicleLabel} · align to outline
            </div>
          </div>

          {countdown !== null && (
            <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', background:'rgba(0,0,0,0.35)', pointerEvents:'none' }}>
              <div style={{ fontSize:96, fontWeight:800, color:'white', lineHeight:1 }}>{countdown}</div>
            </div>
          )}

          <div style={{ position:'absolute', top:0, left:0, right:0, height:3, background:'rgba(255,255,255,0.15)' }}>
            <div style={{ height:'100%', background:'#185FA5', width:`${progress}%`, transition:'width 0.3s' }} />
          </div>

          <div style={{ position:'absolute', bottom:16, left:0, right:0, display:'flex', alignItems:'center', justifyContent:'center', gap:20 }}>
            <button onClick={finishEarly} style={{ padding:'9px 16px', background:'rgba(255,255,255,0.15)', color:'white', border:'none', borderRadius:10, fontSize:12, cursor:'pointer' }}>
              {captured.length > 0 ? `Finish (${captured.length})` : 'Cancel'}
            </button>
            <button onClick={capturePhoto} disabled={countdown !== null}
              style={{ width:70, height:70, borderRadius:'50%', background:'white', border:'4px solid rgba(255,255,255,0.5)', cursor:'pointer', padding:0, display:'flex', alignItems:'center', justifyContent:'center', opacity: countdown !== null ? 0.6 : 1 }}>
              <div style={{ width:52, height:52, borderRadius:'50%', background:'white', border:'3px solid #185FA5' }} />
            </button>
            <button onClick={skipShot} style={{ padding:'9px 16px', background:'rgba(255,255,255,0.15)', color:'white', border:'none', borderRadius:10, fontSize:12, cursor:'pointer' }}>Skip</button>
          </div>
        </div>
      )}

      {mode === 'review' && lastDataUrl && (
        <div style={{ position:'relative', width:'100%', aspectRatio:'4/3' }}>
          <img src={lastDataUrl} style={{ width:'100%', height:'100%', objectFit:'cover', display:'block' }} />
          <div style={{ position:'absolute', inset:0, background:'rgba(0,0,0,0.45)', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'flex-end', padding:24, gap:12 }}>
            <div style={{ fontSize:15, fontWeight:600, color:'white' }}>Use this photo?</div>
            <div style={{ display:'flex', gap:12 }}>
              <button onClick={retakePhoto} style={{ padding:'11px 22px', background:'rgba(255,255,255,0.2)', color:'white', border:'none', borderRadius:10, fontSize:14, cursor:'pointer' }}>Retake</button>
              <button onClick={acceptPhoto} style={{ padding:'11px 26px', background:'#185FA5', color:'white', border:'none', borderRadius:10, fontSize:14, fontWeight:600, cursor:'pointer' }}>
                {currentShot < SHOTS.length - 1 ? `Next: ${SHOTS[currentShot + 1].label} →` : 'Finish ✓'}
              </button>
            </div>
          </div>
        </div>
      )}

      {captured.length > 0 && mode === 'camera' && (
        <div style={{ display:'flex', gap:4, padding:'8px 10px', background:'#111', overflowX:'auto' }}>
          {captured.map((c, i) => (
            <div key={i} style={{ position:'relative', flexShrink:0 }}>
              <img src={c.dataUrl} style={{ width:52, height:40, objectFit:'cover', borderRadius:5, border:'1.5px solid rgba(255,255,255,0.3)' }} />
              <div style={{ position:'absolute', bottom:2, left:0, right:0, textAlign:'center', fontSize:8, color:'rgba(255,255,255,0.7)' }}>{c.label.split(' ')[0]}</div>
            </div>
          ))}
          {SHOTS.slice(captured.length).map((s, i) => (
            <div key={i} style={{ width:52, height:40, borderRadius:5, border:'1.5px dashed rgba(255,255,255,0.2)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              <span style={{ fontSize:14 }}>{s.icon}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
