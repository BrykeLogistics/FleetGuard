'use client'
import { useRef, useState, useEffect } from 'react'
import { analyzePhotoQuality } from './PhotoQuality'

const EXTERIOR_SHOTS = [
  { id: 'front',        label: 'Front',                       icon: '⬆', desc: 'Stand 10–15 ft away, centered on the front grille' },
  { id: 'front-left',   label: 'Driver side front corner',    icon: '↖', desc: 'Stand 10–15 ft away at a 45° angle from the driver side front corner' },
  { id: 'driver',       label: 'Driver side',                 icon: '⬅', desc: 'Stand 10–15 ft away, walk along the full length of the driver side' },
  { id: 'rear-left',    label: 'Driver side rear corner',     icon: '↙', desc: 'Stand 10–15 ft away at a 45° angle from the driver side rear corner' },
  { id: 'rear',         label: 'Rear',                        icon: '⬇', desc: 'Stand 10–15 ft away, centered on the rear doors' },
  { id: 'rear-right',   label: 'Passenger side rear corner',  icon: '↘', desc: 'Stand 10–15 ft away at a 45° angle from the passenger side rear corner' },
  { id: 'passenger',    label: 'Passenger side',              icon: '➡', desc: 'Stand 10–15 ft away, walk along the full length of the passenger side' },
  { id: 'front-right',  label: 'Passenger side front corner', icon: '↗', desc: 'Stand 10–15 ft away at a 45° angle from the passenger side front corner' },
]

const RENTAL_SHOTS = [
  { id: 'dashboard',    label: 'Dashboard',                   icon: '🎛', desc: 'Sit in driver seat, capture full dashboard — show all warning lights, odometer, and any interior damage' },
  { id: 'cargo-bed',    label: 'Cargo area / bed',            icon: '📦', desc: 'Stand at rear doors, photograph the full cargo area — floor, walls, ceiling, and tie-down points' },
]

function getShots(isRental: boolean) {
  return isRental ? [...EXTERIOR_SHOTS, ...RENTAL_SHOTS] : EXTERIOR_SHOTS
}

type StencilPath = { d: string; style?: any }
type StencilDef = { viewBox: string; paths: StencilPath[] }
type StencilSet = Record<string, StencilDef>

// ── SPRINTER VAN stencils ──────────────────────────────────────────
const STENCILS_SPRINTER: StencilSet = {
  front: { viewBox:'0 0 620 465', paths:[
    { d:'M 210 162 L 410 162 L 420 322 L 200 322 Z', style:{ fill:'none', stroke:'rgba(255,255,255,0.9)', strokeWidth:2.5, strokeDasharray:'10 6' } },
    { d:'M 225 172 L 395 172 L 395 242 L 225 242 Z', style:{ fill:'rgba(255,255,255,0.08)', stroke:'rgba(255,255,255,0.6)', strokeWidth:1.5, strokeDasharray:'6 4' } },
    { d:'M 212 267 L 258 267 L 258 292 L 212 292 Z', style:{ fill:'rgba(255,255,255,0.06)', stroke:'rgba(255,255,255,0.5)', strokeWidth:1.5, strokeDasharray:'5 4' } },
    { d:'M 362 267 L 408 267 L 408 292 L 362 292 Z', style:{ fill:'rgba(255,255,255,0.06)', stroke:'rgba(255,255,255,0.5)', strokeWidth:1.5, strokeDasharray:'5 4' } },
    { d:'M 225 247 L 395 247 L 395 257 L 225 257 Z', style:{ fill:'rgba(255,255,255,0.05)', stroke:'rgba(255,255,255,0.3)', strokeWidth:1 } },
    { d:'M 220 310 A 22 22 0 1 1 220 310 Z', style:{ fill:'none', stroke:'rgba(255,255,255,0.6)', strokeWidth:2, strokeDasharray:'5 3' } },
    { d:'M 400 310 A 22 22 0 1 1 400 310 Z', style:{ fill:'none', stroke:'rgba(255,255,255,0.6)', strokeWidth:2, strokeDasharray:'5 3' } },
  ]},
  rear: { viewBox:'0 0 620 465', paths:[
    { d:'M 200 152 L 420 152 L 420 322 L 200 322 Z', style:{ fill:'none', stroke:'rgba(255,255,255,0.9)', strokeWidth:2.5, strokeDasharray:'10 6' } },
    { d:'M 205 157 L 310 157 L 310 317 L 205 317 Z', style:{ fill:'rgba(255,255,255,0.05)', stroke:'rgba(255,255,255,0.5)', strokeWidth:1.5, strokeDasharray:'6 4' } },
    { d:'M 315 157 L 415 157 L 415 317 L 315 317 Z', style:{ fill:'rgba(255,255,255,0.05)', stroke:'rgba(255,255,255,0.5)', strokeWidth:1.5, strokeDasharray:'6 4' } },
    { d:'M 310 157 L 310 317', style:{ fill:'none', stroke:'rgba(255,255,255,0.3)', strokeWidth:1, strokeDasharray:'4 3' } },
    { d:'M 275 230 L 292 230 L 292 240 L 275 240 Z', style:{ fill:'rgba(255,255,255,0.1)', stroke:'rgba(255,255,255,0.5)', strokeWidth:1 } },
    { d:'M 328 230 L 345 230 L 345 240 L 328 240 Z', style:{ fill:'rgba(255,255,255,0.1)', stroke:'rgba(255,255,255,0.5)', strokeWidth:1 } },
    { d:'M 202 160 L 218 160 L 218 200 L 202 200 Z', style:{ fill:'rgba(255,255,255,0.06)', stroke:'rgba(255,255,255,0.5)', strokeWidth:1.2, strokeDasharray:'4 3' } },
    { d:'M 402 160 L 418 160 L 418 200 L 402 200 Z', style:{ fill:'rgba(255,255,255,0.06)', stroke:'rgba(255,255,255,0.5)', strokeWidth:1.2, strokeDasharray:'4 3' } },
    { d:'M 220 310 A 22 22 0 1 1 220 310 Z', style:{ fill:'none', stroke:'rgba(255,255,255,0.6)', strokeWidth:2, strokeDasharray:'5 3' } },
    { d:'M 400 310 A 22 22 0 1 1 400 310 Z', style:{ fill:'none', stroke:'rgba(255,255,255,0.6)', strokeWidth:2, strokeDasharray:'5 3' } },
  ]},
  driver: { viewBox:'0 0 620 465', paths:[
    { d:'M 130 162 L 490 162 L 490 332 L 130 332 Z', style:{ fill:'none', stroke:'rgba(255,255,255,0.9)', strokeWidth:2.5, strokeDasharray:'10 6' } },
    { d:'M 130 162 L 230 162 L 230 332 L 130 332 Z', style:{ fill:'rgba(255,255,255,0.04)', stroke:'rgba(255,255,255,0.35)', strokeWidth:1, strokeDasharray:'5 4' } },
    { d:'M 136 170 L 224 170 L 224 247 L 136 247 Z', style:{ fill:'rgba(255,255,255,0.07)', stroke:'rgba(255,255,255,0.55)', strokeWidth:1.5, strokeDasharray:'5 3' } },
    { d:'M 230 162 L 490 162 L 490 332 L 230 332 Z', style:{ fill:'rgba(255,255,255,0.03)', stroke:'rgba(255,255,255,0.3)', strokeWidth:1, strokeDasharray:'6 5' } },
    { d:'M 265 242 L 340 242 L 340 312 L 265 312 Z', style:{ fill:'rgba(255,255,255,0.04)', stroke:'rgba(255,255,255,0.3)', strokeWidth:1, strokeDasharray:'5 3' } },
    { d:'M 170 320 A 26 26 0 1 1 170 320 Z', style:{ fill:'none', stroke:'rgba(255,255,255,0.6)', strokeWidth:2, strokeDasharray:'6 3' } },
    { d:'M 430 320 A 26 26 0 1 1 430 320 Z', style:{ fill:'none', stroke:'rgba(255,255,255,0.6)', strokeWidth:2, strokeDasharray:'6 3' } },
    { d:'M 124 190 L 136 190 L 136 210 L 124 210 Z', style:{ fill:'rgba(255,255,255,0.08)', stroke:'rgba(255,255,255,0.5)', strokeWidth:1.2 } },
  ]},
  passenger: { viewBox:'0 0 620 465', paths:[
    { d:'M 130 162 L 490 162 L 490 332 L 130 332 Z', style:{ fill:'none', stroke:'rgba(255,255,255,0.9)', strokeWidth:2.5, strokeDasharray:'10 6' } },
    { d:'M 390 162 L 490 162 L 490 332 L 390 332 Z', style:{ fill:'rgba(255,255,255,0.04)', stroke:'rgba(255,255,255,0.35)', strokeWidth:1, strokeDasharray:'5 4' } },
    { d:'M 396 170 L 484 170 L 484 247 L 396 247 Z', style:{ fill:'rgba(255,255,255,0.07)', stroke:'rgba(255,255,255,0.55)', strokeWidth:1.5, strokeDasharray:'5 3' } },
    { d:'M 130 162 L 390 162 L 390 332 L 130 332 Z', style:{ fill:'rgba(255,255,255,0.03)', stroke:'rgba(255,255,255,0.3)', strokeWidth:1, strokeDasharray:'6 5' } },
    { d:'M 265 242 L 340 242 L 340 312 L 265 312 Z', style:{ fill:'rgba(255,255,255,0.04)', stroke:'rgba(255,255,255,0.3)', strokeWidth:1, strokeDasharray:'5 3' } },
    { d:'M 190 320 A 26 26 0 1 1 190 320 Z', style:{ fill:'none', stroke:'rgba(255,255,255,0.6)', strokeWidth:2, strokeDasharray:'6 3' } },
    { d:'M 450 320 A 26 26 0 1 1 450 320 Z', style:{ fill:'none', stroke:'rgba(255,255,255,0.6)', strokeWidth:2, strokeDasharray:'6 3' } },
    { d:'M 484 190 L 496 190 L 496 210 L 484 210 Z', style:{ fill:'rgba(255,255,255,0.08)', stroke:'rgba(255,255,255,0.5)', strokeWidth:1.2 } },
  ]},
  'front-left': { viewBox:'0 0 620 465', paths:[
    { d:'M 170 157 L 420 157 L 455 192 L 455 332 L 170 332 Z', style:{ fill:'none', stroke:'rgba(255,255,255,0.9)', strokeWidth:2.5, strokeDasharray:'10 6' } },
    { d:'M 170 157 L 280 157 L 280 332 L 170 332 Z', style:{ fill:'rgba(255,255,255,0.04)', stroke:'rgba(255,255,255,0.3)', strokeWidth:1, strokeDasharray:'5 4' } },
    { d:'M 175 165 L 272 165 L 272 242 L 175 242 Z', style:{ fill:'rgba(255,255,255,0.07)', stroke:'rgba(255,255,255,0.5)', strokeWidth:1.5, strokeDasharray:'5 3' } },
    { d:'M 280 157 L 420 157 L 455 192 L 455 332 L 280 332 Z', style:{ fill:'rgba(255,255,255,0.03)', stroke:'rgba(255,255,255,0.25)', strokeWidth:1, strokeDasharray:'6 5' } },
    { d:'M 210 320 A 24 24 0 1 1 210 320 Z', style:{ fill:'none', stroke:'rgba(255,255,255,0.6)', strokeWidth:2, strokeDasharray:'5 3' } },
    { d:'M 410 320 A 24 24 0 1 1 410 320 Z', style:{ fill:'none', stroke:'rgba(255,255,255,0.5)', strokeWidth:1.5, strokeDasharray:'5 3' } },
    { d:'M 162 187 L 176 187 L 176 207 L 162 207 Z', style:{ fill:'rgba(255,255,255,0.08)', stroke:'rgba(255,255,255,0.45)', strokeWidth:1.2 } },
  ]},
  'front-right': { viewBox:'0 0 620 465', paths:[
    { d:'M 165 192 L 200 157 L 450 157 L 450 332 L 165 332 Z', style:{ fill:'none', stroke:'rgba(255,255,255,0.9)', strokeWidth:2.5, strokeDasharray:'10 6' } },
    { d:'M 340 157 L 450 157 L 450 332 L 340 332 Z', style:{ fill:'rgba(255,255,255,0.04)', stroke:'rgba(255,255,255,0.3)', strokeWidth:1, strokeDasharray:'5 4' } },
    { d:'M 348 165 L 445 165 L 445 242 L 348 242 Z', style:{ fill:'rgba(255,255,255,0.07)', stroke:'rgba(255,255,255,0.5)', strokeWidth:1.5, strokeDasharray:'5 3' } },
    { d:'M 165 192 L 340 157 L 340 332 L 165 332 Z', style:{ fill:'rgba(255,255,255,0.03)', stroke:'rgba(255,255,255,0.25)', strokeWidth:1, strokeDasharray:'6 5' } },
    { d:'M 210 320 A 24 24 0 1 1 210 320 Z', style:{ fill:'none', stroke:'rgba(255,255,255,0.5)', strokeWidth:1.5, strokeDasharray:'5 3' } },
    { d:'M 410 320 A 24 24 0 1 1 410 320 Z', style:{ fill:'none', stroke:'rgba(255,255,255,0.6)', strokeWidth:2, strokeDasharray:'5 3' } },
    { d:'M 444 187 L 458 187 L 458 207 L 444 207 Z', style:{ fill:'rgba(255,255,255,0.08)', stroke:'rgba(255,255,255,0.45)', strokeWidth:1.2 } },
  ]},
  'rear-left': { viewBox:'0 0 620 465', paths:[
    { d:'M 165 157 L 455 157 L 455 192 L 400 332 L 165 332 Z', style:{ fill:'none', stroke:'rgba(255,255,255,0.9)', strokeWidth:2.5, strokeDasharray:'10 6' } },
    { d:'M 395 157 L 455 157 L 455 192 L 395 332 L 335 332 L 335 157 Z', style:{ fill:'rgba(255,255,255,0.04)', stroke:'rgba(255,255,255,0.35)', strokeWidth:1.2, strokeDasharray:'5 4' } },
    { d:'M 165 157 L 335 157 L 335 332 L 165 332 Z', style:{ fill:'rgba(255,255,255,0.03)', stroke:'rgba(255,255,255,0.2)', strokeWidth:1, strokeDasharray:'6 5' } },
    { d:'M 200 320 A 24 24 0 1 1 200 320 Z', style:{ fill:'none', stroke:'rgba(255,255,255,0.5)', strokeWidth:1.5, strokeDasharray:'5 3' } },
    { d:'M 395 320 A 24 24 0 1 1 395 320 Z', style:{ fill:'none', stroke:'rgba(255,255,255,0.6)', strokeWidth:2, strokeDasharray:'5 3' } },
    { d:'M 382 162 L 394 162 L 394 200 L 382 200 Z', style:{ fill:'rgba(255,255,255,0.06)', stroke:'rgba(255,255,255,0.45)', strokeWidth:1.2 } },
  ]},
  'rear-right': { viewBox:'0 0 620 465', paths:[
    { d:'M 165 192 L 220 157 L 455 157 L 455 332 L 165 332 Z', style:{ fill:'none', stroke:'rgba(255,255,255,0.9)', strokeWidth:2.5, strokeDasharray:'10 6' } },
    { d:'M 165 192 L 225 157 L 285 157 L 285 332 L 165 332 Z', style:{ fill:'rgba(255,255,255,0.04)', stroke:'rgba(255,255,255,0.35)', strokeWidth:1.2, strokeDasharray:'5 4' } },
    { d:'M 285 157 L 455 157 L 455 332 L 285 332 Z', style:{ fill:'rgba(255,255,255,0.03)', stroke:'rgba(255,255,255,0.2)', strokeWidth:1, strokeDasharray:'6 5' } },
    { d:'M 225 320 A 24 24 0 1 1 225 320 Z', style:{ fill:'none', stroke:'rgba(255,255,255,0.6)', strokeWidth:2, strokeDasharray:'5 3' } },
    { d:'M 420 320 A 24 24 0 1 1 420 320 Z', style:{ fill:'none', stroke:'rgba(255,255,255,0.5)', strokeWidth:1.5, strokeDasharray:'5 3' } },
    { d:'M 226 162 L 238 162 L 238 200 L 226 200 Z', style:{ fill:'rgba(255,255,255,0.06)', stroke:'rgba(255,255,255,0.45)', strokeWidth:1.2 } },
  ]},
}

// ── STEP VAN stencils ──────────────────────────────────────────────
const STENCILS_STEPVAN: StencilSet = {
  front: { viewBox:'0 0 620 465', paths:[
    { d:'M 170 137 L 450 137 L 450 332 L 170 332 Z', style:{ fill:'none', stroke:'rgba(255,255,255,0.9)', strokeWidth:2.5, strokeDasharray:'10 6' } },
    { d:'M 185 147 L 435 147 L 435 237 L 185 237 Z', style:{ fill:'rgba(255,255,255,0.08)', stroke:'rgba(255,255,255,0.6)', strokeWidth:1.5, strokeDasharray:'6 4' } },
    { d:'M 178 250 L 240 250 L 240 287 L 178 287 Z', style:{ fill:'rgba(255,255,255,0.06)', stroke:'rgba(255,255,255,0.5)', strokeWidth:1.5, strokeDasharray:'5 4' } },
    { d:'M 380 250 L 442 250 L 442 287 L 380 287 Z', style:{ fill:'rgba(255,255,255,0.06)', stroke:'rgba(255,255,255,0.5)', strokeWidth:1.5, strokeDasharray:'5 4' } },
    { d:'M 170 300 L 450 300 L 450 317 L 170 317 Z', style:{ fill:'rgba(255,255,255,0.04)', stroke:'rgba(255,255,255,0.3)', strokeWidth:1 } },
    { d:'M 198 324 A 22 22 0 1 1 198 324 Z', style:{ fill:'none', stroke:'rgba(255,255,255,0.6)', strokeWidth:2, strokeDasharray:'5 3' } },
    { d:'M 422 324 A 22 22 0 1 1 422 324 Z', style:{ fill:'none', stroke:'rgba(255,255,255,0.6)', strokeWidth:2, strokeDasharray:'5 3' } },
    { d:'M 265 282 L 355 282 L 355 312 L 265 312 Z', style:{ fill:'rgba(255,255,255,0.05)', stroke:'rgba(255,255,255,0.35)', strokeWidth:1, strokeDasharray:'4 3' } },
  ]},
  rear: { viewBox:'0 0 620 465', paths:[
    { d:'M 165 127 L 455 127 L 455 342 L 165 342 Z', style:{ fill:'none', stroke:'rgba(255,255,255,0.9)', strokeWidth:2.5, strokeDasharray:'10 6' } },
    { d:'M 170 132 L 308 132 L 308 337 L 170 337 Z', style:{ fill:'rgba(255,255,255,0.05)', stroke:'rgba(255,255,255,0.5)', strokeWidth:1.5, strokeDasharray:'6 4' } },
    { d:'M 312 132 L 450 132 L 450 337 L 312 337 Z', style:{ fill:'rgba(255,255,255,0.05)', stroke:'rgba(255,255,255,0.5)', strokeWidth:1.5, strokeDasharray:'6 4' } },
    { d:'M 310 132 L 310 337', style:{ fill:'none', stroke:'rgba(255,255,255,0.35)', strokeWidth:1.5, strokeDasharray:'4 3' } },
    { d:'M 272 232 L 292 232 L 292 244 L 272 244 Z', style:{ fill:'rgba(255,255,255,0.1)', stroke:'rgba(255,255,255,0.5)', strokeWidth:1 } },
    { d:'M 328 232 L 348 232 L 348 244 L 328 244 Z', style:{ fill:'rgba(255,255,255,0.1)', stroke:'rgba(255,255,255,0.5)', strokeWidth:1 } },
    { d:'M 167 134 L 188 134 L 188 190 L 167 190 Z', style:{ fill:'rgba(255,255,255,0.06)', stroke:'rgba(255,255,255,0.5)', strokeWidth:1.5, strokeDasharray:'5 3' } },
    { d:'M 432 134 L 453 134 L 453 190 L 432 190 Z', style:{ fill:'rgba(255,255,255,0.06)', stroke:'rgba(255,255,255,0.5)', strokeWidth:1.5, strokeDasharray:'5 3' } },
    { d:'M 165 330 L 455 330 L 455 344 L 165 344 Z', style:{ fill:'rgba(255,255,255,0.05)', stroke:'rgba(255,255,255,0.3)', strokeWidth:1 } },
    { d:'M 192 350 A 20 20 0 1 1 192 350 Z', style:{ fill:'none', stroke:'rgba(255,255,255,0.5)', strokeWidth:1.5, strokeDasharray:'5 3' } },
    { d:'M 428 350 A 20 20 0 1 1 428 350 Z', style:{ fill:'none', stroke:'rgba(255,255,255,0.5)', strokeWidth:1.5, strokeDasharray:'5 3' } },
  ]},
  driver: { viewBox:'0 0 620 465', paths:[
    { d:'M 125 137 L 495 137 L 495 342 L 125 342 Z', style:{ fill:'none', stroke:'rgba(255,255,255,0.9)', strokeWidth:2.5, strokeDasharray:'10 6' } },
    { d:'M 125 137 L 210 137 L 210 342 L 125 342 Z', style:{ fill:'rgba(255,255,255,0.04)', stroke:'rgba(255,255,255,0.3)', strokeWidth:1, strokeDasharray:'5 4' } },
    { d:'M 130 144 L 205 144 L 205 237 L 130 237 Z', style:{ fill:'rgba(255,255,255,0.07)', stroke:'rgba(255,255,255,0.5)', strokeWidth:1.5, strokeDasharray:'5 3' } },
    { d:'M 130 240 L 205 240 L 205 312 L 130 312 Z', style:{ fill:'rgba(255,255,255,0.04)', stroke:'rgba(255,255,255,0.35)', strokeWidth:1.2, strokeDasharray:'5 4' } },
    { d:'M 165 274 L 195 274 L 195 284 L 165 284 Z', style:{ fill:'rgba(255,255,255,0.1)', stroke:'rgba(255,255,255,0.5)', strokeWidth:1 } },
    { d:'M 210 137 L 495 137 L 495 342 L 210 342 Z', style:{ fill:'rgba(255,255,255,0.03)', stroke:'rgba(255,255,255,0.25)', strokeWidth:1, strokeDasharray:'6 5' } },
    { d:'M 170 332 A 34 34 0 1 1 170 332 Z', style:{ fill:'none', stroke:'rgba(255,255,255,0.6)', strokeWidth:2, strokeDasharray:'6 3' } },
    { d:'M 415 332 A 34 34 0 1 1 415 332 Z', style:{ fill:'none', stroke:'rgba(255,255,255,0.6)', strokeWidth:2, strokeDasharray:'6 3' } },
    { d:'M 432 332 A 28 28 0 1 1 432 332 Z', style:{ fill:'none', stroke:'rgba(255,255,255,0.4)', strokeWidth:1.5, strokeDasharray:'5 3' } },
    { d:'M 118 174 L 130 174 L 130 197 L 118 197 Z', style:{ fill:'rgba(255,255,255,0.08)', stroke:'rgba(255,255,255,0.45)', strokeWidth:1.2 } },
  ]},
  passenger: { viewBox:'0 0 620 465', paths:[
    { d:'M 125 137 L 495 137 L 495 342 L 125 342 Z', style:{ fill:'none', stroke:'rgba(255,255,255,0.9)', strokeWidth:2.5, strokeDasharray:'10 6' } },
    { d:'M 410 137 L 495 137 L 495 342 L 410 342 Z', style:{ fill:'rgba(255,255,255,0.04)', stroke:'rgba(255,255,255,0.3)', strokeWidth:1, strokeDasharray:'5 4' } },
    { d:'M 415 144 L 490 144 L 490 237 L 415 237 Z', style:{ fill:'rgba(255,255,255,0.07)', stroke:'rgba(255,255,255,0.5)', strokeWidth:1.5, strokeDasharray:'5 3' } },
    { d:'M 415 240 L 490 240 L 490 312 L 415 312 Z', style:{ fill:'rgba(255,255,255,0.04)', stroke:'rgba(255,255,255,0.35)', strokeWidth:1.2, strokeDasharray:'5 4' } },
    { d:'M 425 274 L 455 274 L 455 284 L 425 284 Z', style:{ fill:'rgba(255,255,255,0.1)', stroke:'rgba(255,255,255,0.5)', strokeWidth:1 } },
    { d:'M 125 137 L 410 137 L 410 342 L 125 342 Z', style:{ fill:'rgba(255,255,255,0.03)', stroke:'rgba(255,255,255,0.25)', strokeWidth:1, strokeDasharray:'6 5' } },
    { d:'M 205 332 A 34 34 0 1 1 205 332 Z', style:{ fill:'none', stroke:'rgba(255,255,255,0.6)', strokeWidth:2, strokeDasharray:'6 3' } },
    { d:'M 448 332 A 34 34 0 1 1 448 332 Z', style:{ fill:'none', stroke:'rgba(255,255,255,0.6)', strokeWidth:2, strokeDasharray:'6 3' } },
    { d:'M 465 332 A 28 28 0 1 1 465 332 Z', style:{ fill:'none', stroke:'rgba(255,255,255,0.4)', strokeWidth:1.5, strokeDasharray:'5 3' } },
    { d:'M 490 174 L 502 174 L 502 197 L 490 197 Z', style:{ fill:'rgba(255,255,255,0.08)', stroke:'rgba(255,255,255,0.45)', strokeWidth:1.2 } },
  ]},
  'front-left': { viewBox:'0 0 620 465', paths:[
    { d:'M 160 132 L 430 132 L 470 172 L 470 342 L 160 342 Z', style:{ fill:'none', stroke:'rgba(255,255,255,0.9)', strokeWidth:2.5, strokeDasharray:'10 6' } },
    { d:'M 160 132 L 270 132 L 270 342 L 160 342 Z', style:{ fill:'rgba(255,255,255,0.04)', stroke:'rgba(255,255,255,0.3)', strokeWidth:1, strokeDasharray:'5 4' } },
    { d:'M 165 140 L 264 140 L 264 237 L 165 237 Z', style:{ fill:'rgba(255,255,255,0.07)', stroke:'rgba(255,255,255,0.5)', strokeWidth:1.5, strokeDasharray:'5 3' } },
    { d:'M 270 132 L 430 132 L 470 172 L 470 342 L 270 342 Z', style:{ fill:'rgba(255,255,255,0.03)', stroke:'rgba(255,255,255,0.22)', strokeWidth:1, strokeDasharray:'6 5' } },
    { d:'M 200 332 A 30 30 0 1 1 200 332 Z', style:{ fill:'none', stroke:'rgba(255,255,255,0.6)', strokeWidth:2, strokeDasharray:'5 3' } },
    { d:'M 420 332 A 30 30 0 1 1 420 332 Z', style:{ fill:'none', stroke:'rgba(255,255,255,0.5)', strokeWidth:1.5, strokeDasharray:'5 3' } },
    { d:'M 152 170 L 166 170 L 166 192 L 152 192 Z', style:{ fill:'rgba(255,255,255,0.08)', stroke:'rgba(255,255,255,0.45)', strokeWidth:1.2 } },
  ]},
  'front-right': { viewBox:'0 0 620 465', paths:[
    { d:'M 150 172 L 190 132 L 460 132 L 460 342 L 150 342 Z', style:{ fill:'none', stroke:'rgba(255,255,255,0.9)', strokeWidth:2.5, strokeDasharray:'10 6' } },
    { d:'M 350 132 L 460 132 L 460 342 L 350 342 Z', style:{ fill:'rgba(255,255,255,0.04)', stroke:'rgba(255,255,255,0.3)', strokeWidth:1, strokeDasharray:'5 4' } },
    { d:'M 356 140 L 455 140 L 455 237 L 356 237 Z', style:{ fill:'rgba(255,255,255,0.07)', stroke:'rgba(255,255,255,0.5)', strokeWidth:1.5, strokeDasharray:'5 3' } },
    { d:'M 150 172 L 350 132 L 350 342 L 150 342 Z', style:{ fill:'rgba(255,255,255,0.03)', stroke:'rgba(255,255,255,0.22)', strokeWidth:1, strokeDasharray:'6 5' } },
    { d:'M 200 332 A 30 30 0 1 1 200 332 Z', style:{ fill:'none', stroke:'rgba(255,255,255,0.5)', strokeWidth:1.5, strokeDasharray:'5 3' } },
    { d:'M 420 332 A 30 30 0 1 1 420 332 Z', style:{ fill:'none', stroke:'rgba(255,255,255,0.6)', strokeWidth:2, strokeDasharray:'5 3' } },
    { d:'M 454 170 L 468 170 L 468 192 L 454 192 Z', style:{ fill:'rgba(255,255,255,0.08)', stroke:'rgba(255,255,255,0.45)', strokeWidth:1.2 } },
  ]},
  'rear-left': { viewBox:'0 0 620 465', paths:[
    { d:'M 155 132 L 465 132 L 465 177 L 405 342 L 155 342 Z', style:{ fill:'none', stroke:'rgba(255,255,255,0.9)', strokeWidth:2.5, strokeDasharray:'10 6' } },
    { d:'M 400 132 L 465 132 L 465 177 L 400 342 L 340 342 L 340 132 Z', style:{ fill:'rgba(255,255,255,0.04)', stroke:'rgba(255,255,255,0.38)', strokeWidth:1.2, strokeDasharray:'5 4' } },
    { d:'M 155 132 L 340 132 L 340 342 L 155 342 Z', style:{ fill:'rgba(255,255,255,0.03)', stroke:'rgba(255,255,255,0.2)', strokeWidth:1, strokeDasharray:'6 5' } },
    { d:'M 190 332 A 28 28 0 1 1 190 332 Z', style:{ fill:'none', stroke:'rgba(255,255,255,0.5)', strokeWidth:1.5, strokeDasharray:'5 3' } },
    { d:'M 400 332 A 28 28 0 1 1 400 332 Z', style:{ fill:'none', stroke:'rgba(255,255,255,0.6)', strokeWidth:2, strokeDasharray:'5 3' } },
    { d:'M 385 137 L 398 137 L 398 180 L 385 180 Z', style:{ fill:'rgba(255,255,255,0.06)', stroke:'rgba(255,255,255,0.45)', strokeWidth:1.2 } },
  ]},
  'rear-right': { viewBox:'0 0 620 465', paths:[
    { d:'M 155 177 L 215 132 L 465 132 L 465 342 L 155 342 Z', style:{ fill:'none', stroke:'rgba(255,255,255,0.9)', strokeWidth:2.5, strokeDasharray:'10 6' } },
    { d:'M 155 177 L 218 132 L 280 132 L 280 342 L 155 342 Z', style:{ fill:'rgba(255,255,255,0.04)', stroke:'rgba(255,255,255,0.38)', strokeWidth:1.2, strokeDasharray:'5 4' } },
    { d:'M 280 132 L 465 132 L 465 342 L 280 342 Z', style:{ fill:'rgba(255,255,255,0.03)', stroke:'rgba(255,255,255,0.2)', strokeWidth:1, strokeDasharray:'6 5' } },
    { d:'M 220 332 A 28 28 0 1 1 220 332 Z', style:{ fill:'none', stroke:'rgba(255,255,255,0.6)', strokeWidth:2, strokeDasharray:'5 3' } },
    { d:'M 425 332 A 28 28 0 1 1 425 332 Z', style:{ fill:'none', stroke:'rgba(255,255,255,0.5)', strokeWidth:1.5, strokeDasharray:'5 3' } },
    { d:'M 222 137 L 235 137 L 235 180 L 222 180 Z', style:{ fill:'rgba(255,255,255,0.06)', stroke:'rgba(255,255,255,0.45)', strokeWidth:1.2 } },
  ]},
}

// ── BOX TRUCK stencils ─────────────────────────────────────────────
const STENCILS_BOXTRUCK: StencilSet = {
  front: { viewBox:'0 0 620 465', paths:[
    { d:'M 180 132 L 440 132 L 440 342 L 180 342 Z', style:{ fill:'none', stroke:'rgba(255,255,255,0.9)', strokeWidth:2.5, strokeDasharray:'10 6' } },
    { d:'M 195 144 L 425 144 L 425 232 L 195 232 Z', style:{ fill:'rgba(255,255,255,0.08)', stroke:'rgba(255,255,255,0.6)', strokeWidth:1.5, strokeDasharray:'6 4' } },
    { d:'M 185 244 L 255 244 L 255 292 L 185 292 Z', style:{ fill:'rgba(255,255,255,0.06)', stroke:'rgba(255,255,255,0.5)', strokeWidth:1.5, strokeDasharray:'5 4' } },
    { d:'M 365 244 L 435 244 L 435 292 L 365 292 Z', style:{ fill:'rgba(255,255,255,0.06)', stroke:'rgba(255,255,255,0.5)', strokeWidth:1.5, strokeDasharray:'5 4' } },
    { d:'M 180 307 L 440 307 L 440 324 L 180 324 Z', style:{ fill:'rgba(255,255,255,0.04)', stroke:'rgba(255,255,255,0.3)', strokeWidth:1 } },
    { d:'M 210 334 A 24 24 0 1 1 210 334 Z', style:{ fill:'none', stroke:'rgba(255,255,255,0.6)', strokeWidth:2, strokeDasharray:'5 3' } },
    { d:'M 410 334 A 24 24 0 1 1 410 334 Z', style:{ fill:'none', stroke:'rgba(255,255,255,0.6)', strokeWidth:2, strokeDasharray:'5 3' } },
  ]},
  rear: { viewBox:'0 0 620 465', paths:[
    { d:'M 160 122 L 460 122 L 460 347 L 160 347 Z', style:{ fill:'none', stroke:'rgba(255,255,255,0.9)', strokeWidth:2.5, strokeDasharray:'10 6' } },
    { d:'M 165 127 L 308 127 L 308 340 L 165 340 Z', style:{ fill:'rgba(255,255,255,0.05)', stroke:'rgba(255,255,255,0.5)', strokeWidth:1.5, strokeDasharray:'6 4' } },
    { d:'M 312 127 L 455 127 L 455 340 L 312 340 Z', style:{ fill:'rgba(255,255,255,0.05)', stroke:'rgba(255,255,255,0.5)', strokeWidth:1.5, strokeDasharray:'6 4' } },
    { d:'M 310 127 L 310 340', style:{ fill:'none', stroke:'rgba(255,255,255,0.4)', strokeWidth:1.5, strokeDasharray:'4 3' } },
    { d:'M 270 230 L 292 230 L 292 244 L 270 244 Z', style:{ fill:'rgba(255,255,255,0.1)', stroke:'rgba(255,255,255,0.5)', strokeWidth:1 } },
    { d:'M 328 230 L 350 230 L 350 244 L 328 244 Z', style:{ fill:'rgba(255,255,255,0.1)', stroke:'rgba(255,255,255,0.5)', strokeWidth:1 } },
    { d:'M 162 130 L 186 130 L 186 192 L 162 192 Z', style:{ fill:'rgba(255,255,255,0.06)', stroke:'rgba(255,255,255,0.5)', strokeWidth:1.5, strokeDasharray:'5 3' } },
    { d:'M 434 130 L 458 130 L 458 192 L 434 192 Z', style:{ fill:'rgba(255,255,255,0.06)', stroke:'rgba(255,255,255,0.5)', strokeWidth:1.5, strokeDasharray:'5 3' } },
    { d:'M 160 337 L 460 337 L 460 350 L 160 350 Z', style:{ fill:'rgba(255,255,255,0.04)', stroke:'rgba(255,255,255,0.3)', strokeWidth:1 } },
    { d:'M 190 357 A 22 22 0 1 1 190 357 Z', style:{ fill:'none', stroke:'rgba(255,255,255,0.5)', strokeWidth:1.5, strokeDasharray:'4 3' } },
    { d:'M 205 357 A 18 18 0 1 1 205 357 Z', style:{ fill:'none', stroke:'rgba(255,255,255,0.3)', strokeWidth:1, strokeDasharray:'4 3' } },
    { d:'M 415 357 A 22 22 0 1 1 415 357 Z', style:{ fill:'none', stroke:'rgba(255,255,255,0.5)', strokeWidth:1.5, strokeDasharray:'4 3' } },
    { d:'M 430 357 A 18 18 0 1 1 430 357 Z', style:{ fill:'none', stroke:'rgba(255,255,255,0.3)', strokeWidth:1, strokeDasharray:'4 3' } },
  ]},
  driver: { viewBox:'0 0 620 465', paths:[
    { d:'M 120 142 L 500 142 L 500 347 L 120 347 Z', style:{ fill:'none', stroke:'rgba(255,255,255,0.9)', strokeWidth:2.5, strokeDasharray:'10 6' } },
    { d:'M 120 142 L 225 142 L 225 347 L 120 347 Z', style:{ fill:'rgba(255,255,255,0.04)', stroke:'rgba(255,255,255,0.3)', strokeWidth:1, strokeDasharray:'5 4' } },
    { d:'M 125 150 L 220 150 L 220 240 L 125 240 Z', style:{ fill:'rgba(255,255,255,0.07)', stroke:'rgba(255,255,255,0.5)', strokeWidth:1.5, strokeDasharray:'5 3' } },
    { d:'M 125 244 L 220 244 L 220 317 L 125 317 Z', style:{ fill:'rgba(255,255,255,0.04)', stroke:'rgba(255,255,255,0.35)', strokeWidth:1.2, strokeDasharray:'5 4' } },
    { d:'M 160 278 L 195 278 L 195 289 L 160 289 Z', style:{ fill:'rgba(255,255,255,0.1)', stroke:'rgba(255,255,255,0.5)', strokeWidth:1 } },
    { d:'M 225 142 L 500 142 L 500 347 L 225 347 Z', style:{ fill:'rgba(255,255,255,0.03)', stroke:'rgba(255,255,255,0.22)', strokeWidth:1, strokeDasharray:'6 5' } },
    { d:'M 175 337 A 36 36 0 1 1 175 337 Z', style:{ fill:'none', stroke:'rgba(255,255,255,0.6)', strokeWidth:2, strokeDasharray:'6 3' } },
    { d:'M 420 337 A 36 36 0 1 1 420 337 Z', style:{ fill:'none', stroke:'rgba(255,255,255,0.6)', strokeWidth:2, strokeDasharray:'6 3' } },
    { d:'M 440 337 A 30 30 0 1 1 440 337 Z', style:{ fill:'none', stroke:'rgba(255,255,255,0.4)', strokeWidth:1.5, strokeDasharray:'5 3' } },
    { d:'M 113 178 L 125 178 L 125 202 L 113 202 Z', style:{ fill:'rgba(255,255,255,0.08)', stroke:'rgba(255,255,255,0.45)', strokeWidth:1.2 } },
  ]},
  passenger: { viewBox:'0 0 620 465', paths:[
    { d:'M 120 142 L 500 142 L 500 347 L 120 347 Z', style:{ fill:'none', stroke:'rgba(255,255,255,0.9)', strokeWidth:2.5, strokeDasharray:'10 6' } },
    { d:'M 395 142 L 500 142 L 500 347 L 395 347 Z', style:{ fill:'rgba(255,255,255,0.04)', stroke:'rgba(255,255,255,0.3)', strokeWidth:1, strokeDasharray:'5 4' } },
    { d:'M 400 150 L 495 150 L 495 240 L 400 240 Z', style:{ fill:'rgba(255,255,255,0.07)', stroke:'rgba(255,255,255,0.5)', strokeWidth:1.5, strokeDasharray:'5 3' } },
    { d:'M 400 244 L 495 244 L 495 317 L 400 317 Z', style:{ fill:'rgba(255,255,255,0.04)', stroke:'rgba(255,255,255,0.35)', strokeWidth:1.2, strokeDasharray:'5 4' } },
    { d:'M 425 278 L 460 278 L 460 289 L 425 289 Z', style:{ fill:'rgba(255,255,255,0.1)', stroke:'rgba(255,255,255,0.5)', strokeWidth:1 } },
    { d:'M 120 142 L 395 142 L 395 347 L 120 347 Z', style:{ fill:'rgba(255,255,255,0.03)', stroke:'rgba(255,255,255,0.22)', strokeWidth:1, strokeDasharray:'6 5' } },
    { d:'M 180 337 A 36 36 0 1 1 180 337 Z', style:{ fill:'none', stroke:'rgba(255,255,255,0.6)', strokeWidth:2, strokeDasharray:'6 3' } },
    { d:'M 440 337 A 36 36 0 1 1 440 337 Z', style:{ fill:'none', stroke:'rgba(255,255,255,0.6)', strokeWidth:2, strokeDasharray:'6 3' } },
    { d:'M 460 337 A 30 30 0 1 1 460 337 Z', style:{ fill:'none', stroke:'rgba(255,255,255,0.4)', strokeWidth:1.5, strokeDasharray:'5 3' } },
    { d:'M 495 178 L 507 178 L 507 202 L 495 202 Z', style:{ fill:'rgba(255,255,255,0.08)', stroke:'rgba(255,255,255,0.45)', strokeWidth:1.2 } },
  ]},
  'front-left': { viewBox:'0 0 620 465', paths:[
    { d:'M 150 137 L 440 137 L 480 177 L 480 347 L 150 347 Z', style:{ fill:'none', stroke:'rgba(255,255,255,0.9)', strokeWidth:2.5, strokeDasharray:'10 6' } },
    { d:'M 150 137 L 265 137 L 265 347 L 150 347 Z', style:{ fill:'rgba(255,255,255,0.04)', stroke:'rgba(255,255,255,0.28)', strokeWidth:1, strokeDasharray:'5 4' } },
    { d:'M 155 144 L 258 144 L 258 240 L 155 240 Z', style:{ fill:'rgba(255,255,255,0.07)', stroke:'rgba(255,255,255,0.5)', strokeWidth:1.5, strokeDasharray:'5 3' } },
    { d:'M 265 137 L 440 137 L 480 177 L 480 347 L 265 347 Z', style:{ fill:'rgba(255,255,255,0.03)', stroke:'rgba(255,255,255,0.2)', strokeWidth:1, strokeDasharray:'6 5' } },
    { d:'M 192 337 A 32 32 0 1 1 192 337 Z', style:{ fill:'none', stroke:'rgba(255,255,255,0.6)', strokeWidth:2, strokeDasharray:'5 3' } },
    { d:'M 428 337 A 32 32 0 1 1 428 337 Z', style:{ fill:'none', stroke:'rgba(255,255,255,0.5)', strokeWidth:1.5, strokeDasharray:'5 3' } },
    { d:'M 445 337 A 26 26 0 1 1 445 337 Z', style:{ fill:'none', stroke:'rgba(255,255,255,0.3)', strokeWidth:1, strokeDasharray:'4 3' } },
    { d:'M 142 174 L 156 174 L 156 197 L 142 197 Z', style:{ fill:'rgba(255,255,255,0.08)', stroke:'rgba(255,255,255,0.45)', strokeWidth:1.2 } },
  ]},
  'front-right': { viewBox:'0 0 620 465', paths:[
    { d:'M 140 177 L 180 137 L 470 137 L 470 347 L 140 347 Z', style:{ fill:'none', stroke:'rgba(255,255,255,0.9)', strokeWidth:2.5, strokeDasharray:'10 6' } },
    { d:'M 355 137 L 470 137 L 470 347 L 355 347 Z', style:{ fill:'rgba(255,255,255,0.04)', stroke:'rgba(255,255,255,0.28)', strokeWidth:1, strokeDasharray:'5 4' } },
    { d:'M 362 144 L 465 144 L 465 240 L 362 240 Z', style:{ fill:'rgba(255,255,255,0.07)', stroke:'rgba(255,255,255,0.5)', strokeWidth:1.5, strokeDasharray:'5 3' } },
    { d:'M 140 177 L 355 137 L 355 347 L 140 347 Z', style:{ fill:'rgba(255,255,255,0.03)', stroke:'rgba(255,255,255,0.2)', strokeWidth:1, strokeDasharray:'6 5' } },
    { d:'M 192 337 A 32 32 0 1 1 192 337 Z', style:{ fill:'none', stroke:'rgba(255,255,255,0.5)', strokeWidth:1.5, strokeDasharray:'5 3' } },
    { d:'M 205 337 A 26 26 0 1 1 205 337 Z', style:{ fill:'none', stroke:'rgba(255,255,255,0.3)', strokeWidth:1, strokeDasharray:'4 3' } },
    { d:'M 428 337 A 32 32 0 1 1 428 337 Z', style:{ fill:'none', stroke:'rgba(255,255,255,0.6)', strokeWidth:2, strokeDasharray:'5 3' } },
    { d:'M 464 174 L 478 174 L 478 197 L 464 197 Z', style:{ fill:'rgba(255,255,255,0.08)', stroke:'rgba(255,255,255,0.45)', strokeWidth:1.2 } },
  ]},
  'rear-left': { viewBox:'0 0 620 465', paths:[
    { d:'M 145 137 L 475 137 L 475 182 L 415 347 L 145 347 Z', style:{ fill:'none', stroke:'rgba(255,255,255,0.9)', strokeWidth:2.5, strokeDasharray:'10 6' } },
    { d:'M 410 137 L 475 137 L 475 182 L 410 347 L 350 347 L 350 137 Z', style:{ fill:'rgba(255,255,255,0.04)', stroke:'rgba(255,255,255,0.38)', strokeWidth:1.2, strokeDasharray:'5 4' } },
    { d:'M 145 137 L 350 137 L 350 347 L 145 347 Z', style:{ fill:'rgba(255,255,255,0.03)', stroke:'rgba(255,255,255,0.18)', strokeWidth:1, strokeDasharray:'6 5' } },
    { d:'M 182 337 A 30 30 0 1 1 182 337 Z', style:{ fill:'none', stroke:'rgba(255,255,255,0.5)', strokeWidth:1.5, strokeDasharray:'5 3' } },
    { d:'M 410 337 A 30 30 0 1 1 410 337 Z', style:{ fill:'none', stroke:'rgba(255,255,255,0.6)', strokeWidth:2, strokeDasharray:'5 3' } },
    { d:'M 428 337 A 24 24 0 1 1 428 337 Z', style:{ fill:'none', stroke:'rgba(255,255,255,0.3)', strokeWidth:1, strokeDasharray:'4 3' } },
    { d:'M 394 142 L 408 142 L 408 187 L 394 187 Z', style:{ fill:'rgba(255,255,255,0.06)', stroke:'rgba(255,255,255,0.45)', strokeWidth:1.2 } },
  ]},
  'rear-right': { viewBox:'0 0 620 465', paths:[
    { d:'M 145 182 L 205 137 L 475 137 L 475 347 L 145 347 Z', style:{ fill:'none', stroke:'rgba(255,255,255,0.9)', strokeWidth:2.5, strokeDasharray:'10 6' } },
    { d:'M 145 182 L 208 137 L 270 137 L 270 347 L 145 347 Z', style:{ fill:'rgba(255,255,255,0.04)', stroke:'rgba(255,255,255,0.38)', strokeWidth:1.2, strokeDasharray:'5 4' } },
    { d:'M 270 137 L 475 137 L 475 347 L 270 347 Z', style:{ fill:'rgba(255,255,255,0.03)', stroke:'rgba(255,255,255,0.18)', strokeWidth:1, strokeDasharray:'6 5' } },
    { d:'M 210 337 A 30 30 0 1 1 210 337 Z', style:{ fill:'none', stroke:'rgba(255,255,255,0.6)', strokeWidth:2, strokeDasharray:'5 3' } },
    { d:'M 225 337 A 24 24 0 1 1 225 337 Z', style:{ fill:'none', stroke:'rgba(255,255,255,0.3)', strokeWidth:1, strokeDasharray:'4 3' } },
    { d:'M 435 337 A 30 30 0 1 1 435 337 Z', style:{ fill:'none', stroke:'rgba(255,255,255,0.5)', strokeWidth:1.5, strokeDasharray:'5 3' } },
    { d:'M 212 142 L 226 142 L 226 187 L 212 187 Z', style:{ fill:'rgba(255,255,255,0.06)', stroke:'rgba(255,255,255,0.45)', strokeWidth:1.2 } },
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
  isRental?: boolean
}

export default function GuidedCapture({ onComplete, onCancel, vehicleType, isRental }: Props) {
  const [currentShot, setCurrentShot] = useState(0)
  const [captured, setCaptured] = useState<{ shotId: string, label: string, dataUrl: string }[]>([])
  const [mode, setMode] = useState<'camera'|'review'>('camera')
  const [countdown, setCountdown] = useState<number|null>(null)
  const [cameraError, setCameraError] = useState('')
  const [videoPlaying, setVideoPlaying] = useState(false)
  const [lastDataUrl, setLastDataUrl] = useState('')
  const [qualityResult, setQualityResult] = useState<any>(null)
  const [checkingQuality, setCheckingQuality] = useState(false)
  const streamRef = useRef<MediaStream|null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const SHOTS = getShots(!!isRental)
  const stencils = getStencils(vehicleType)
  const shot = SHOTS[currentShot]
  const stencil = stencils[shot.id] || stencils['front']
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

  async function capturePhoto() {
    if (!videoRef.current || !canvasRef.current || countdown !== null) return
    setCountdown(3)
    let c = 3
    const t = setInterval(async () => {
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
        setCheckingQuality(true)
        setMode('review')
        // Check quality after showing preview
        const quality = await analyzePhotoQuality(dataUrl)
        setQualityResult(quality)
        setCheckingQuality(false)
      }
    }, 1000)
  }

  function acceptPhoto() {
    setQualityResult(null)
    const newCapture = { shotId: shot.id, label: shot.label, dataUrl: lastDataUrl }
    const newCaptured = [...captured, newCapture]
    setCaptured(newCaptured)
    if (currentShot < SHOTS.length - 1) { setCurrentShot(prev => prev + 1); setMode('camera') }
    else onComplete(newCaptured)
  }

  function retakePhoto() { setLastDataUrl(''); setQualityResult(null); setMode('camera') }

  function skipShot() {
    if (currentShot < SHOTS.length - 1) { setCurrentShot(prev => prev + 1); setMode('camera') }
    else onComplete(captured)
  }

  function finishEarly() {
    const missing = SHOTS.length - captured.length
    if (missing > 0 && captured.length > 0) {
      if (!confirm(`You have ${missing} photo${missing > 1 ? 's' : ''} remaining. Submit with ${captured.length} of ${SHOTS.length} photos? Missing angles may reduce inspection accuracy.`)) return
    }
    if (captured.length > 0) onComplete(captured)
    else onCancel()
  }

  return (
    <div style={{ borderRadius:12, overflow:'hidden', background:'#000', position:'relative' }}>
      <canvas ref={canvasRef} style={{ display:'none' }} />

      {cameraError && (
        <div style={{ padding:24, textAlign:'center', background:'#1 a 1 a 1 a' }}>
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

          <div style={{ position:'absolute', inset:0, background:'radial-gradient (e l l ip s e a t c en t er, t r a n s p a ren t 40%, rgba(0,0,0,0.45) 100%)', pointerEvents:'none' }} />

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

          {/* Quality checking overlay */}
          {checkingQuality && (
            <div style={{ position:'absolute', inset:0, background:'rgba(0,0,0,0.6)', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center' }}>
              <div style={{ width:28, height:28, border:'2px solid rgba(255,255,255,0.3)', borderTopColor:'white', borderRadius:'50%', animation:'spin 0.8s linear infinite', marginBottom:10 }} />
              <div style={{ color:'white', fontSize:13 }}>Checking photo quality...</div>
            </div>
          )}

          {/* Quality FAILED overlay — auto prompt retake */}
          {!checkingQuality && qualityResult && !qualityResult.passed && (
            <div style={{ position:'absolute', inset:0, background:'rgba(0,0,0,0.75)', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:24, textAlign:'center' }}>
              <div style={{ fontSize:36, marginBottom:12 }}>⚠️</div>
              <div style={{ fontSize:16, fontWeight:700, color:'white', marginBottom:8 }}>Photo quality issue</div>
              <div style={{ fontSize:13, color:'rgba(255,255,255,0.85)', marginBottom:6, lineHeight:1.5 }}>{qualityResult.issues.join(' · ')}</div>
              <div style={{ fontSize:12, color:'rgba(255,255,255,0.65)', marginBottom:20, lineHeight:1.5, maxWidth:260 }}>{qualityResult.suggestion}</div>
              <div style={{ display:'flex', gap:10 }}>
                <button onClick={retakePhoto} style={{ padding:'12px 28px', background:'#185FA5', color:'white', border:'none', borderRadius:10, fontSize:14, fontWeight:600, cursor:'pointer' }}>Retake photo</button>
                <button onClick={acceptPhoto} style={{ padding:'12px 18px', background:'rgba(255,255,255,0.15)', color:'white', border:'none', borderRadius:10, fontSize:13, cursor:'pointer' }}>Use anyway</button>
              </div>
            </div>
          )}

          {/* Quality PASSED — normal review */}
          {!checkingQuality && (!qualityResult || qualityResult.passed) && (
            <div style={{ position:'absolute', inset:0, background:'rgba(0,0,0,0.35)', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'flex-end', padding:20, gap:10 }}>
              {qualityResult?.passed && (
                <div style={{ background:'rgba(39,80,10,0.85)', color:'white', padding:'5px 14px', borderRadius:20, fontSize:12, fontWeight:500 }}>✓ Photo quality good</div>
              )}
              <div style={{ fontSize:15, fontWeight:600, color:'white' }}>Use this photo?</div>
              <div style={{ display:'flex', gap:12 }}>
                <button onClick={retakePhoto} style={{ padding:'11px 22px', background:'rgba(255,255,255,0.2)', color:'white', border:'none', borderRadius:10, fontSize:14, cursor:'pointer' }}>Retake</button>
                <button onClick={acceptPhoto} style={{ padding:'11px 26px', background:'#185FA5', color:'white', border:'none', borderRadius:10, fontSize:14, fontWeight:600, cursor:'pointer' }}>
                  {currentShot < SHOTS.length - 1 ? `Next: ${SHOTS[currentShot + 1].label} →` : 'Finish ✓'}
                </button>
              </div>
            </div>
          )}
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
