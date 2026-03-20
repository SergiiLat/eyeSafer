import { writeFileSync, mkdirSync } from 'fs'

const dir = 'public/exercises'
mkdirSync(dir, { recursive: true })

const BG = '#1a2233'
const FG = '#cbd5e1'
const BLUE = '#60a5fa'
const AMBER = '#f59e0b'
const GRAY = '#475569'
const GREEN = '#34d399'

function svg(body) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 300" width="300" height="300">
  <rect width="300" height="300" fill="${BG}" rx="10"/>
  ${body}
</svg>`
}

// Seated stick figure. cx/cy = hip center position.
function fig(cx, cy, opts = {}) {
  const { headDx = 0, headDy = 0, armL, armR, handL, handR, shoulderDy = 0 } = opts
  const sx = cx, sy = cy - 85 + shoulderDy  // shoulder point
  const hx = cx + headDx, hy = cy - 130 + headDy  // head center
  // chair back
  const chair = `<line x1="${cx-42}" y1="${cy-55}" x2="${cx-42}" y2="${cy+8}" stroke="${GRAY}" stroke-width="2.5" stroke-linecap="round"/>
  <line x1="${cx-42}" y1="${cy-55}" x2="${cx+8}" y2="${cy-55}" stroke="${GRAY}" stroke-width="2.5" stroke-linecap="round"/>
  <line x1="${cx-42}" y1="${cy+8}" x2="${cx+42}" y2="${cy+8}" stroke="${GRAY}" stroke-width="2.5" stroke-linecap="round"/>`
  // spine
  const spine = `<line x1="${cx}" y1="${cy}" x2="${sx}" y2="${sy}" stroke="${FG}" stroke-width="3" stroke-linecap="round"/>`
  // neck + head
  const head = `<line x1="${sx}" y1="${sy}" x2="${hx}" y2="${hy+20}" stroke="${FG}" stroke-width="2.5" stroke-linecap="round"/>
  <circle cx="${hx}" cy="${hy}" r="20" fill="none" stroke="${FG}" stroke-width="3"/>`
  // legs (seated)
  const legs = `<line x1="${cx}" y1="${cy}" x2="${cx-28}" y2="${cy-8}" stroke="${FG}" stroke-width="3" stroke-linecap="round"/>
  <line x1="${cx}" y1="${cy}" x2="${cx+28}" y2="${cy-8}" stroke="${FG}" stroke-width="3" stroke-linecap="round"/>
  <line x1="${cx-28}" y1="${cy-8}" x2="${cx-28}" y2="${cy+8}" stroke="${FG}" stroke-width="3" stroke-linecap="round"/>
  <line x1="${cx+28}" y1="${cy-8}" x2="${cx+28}" y2="${cy+8}" stroke="${FG}" stroke-width="3" stroke-linecap="round"/>`
  // arms
  let arms = ''
  if (armL) arms += `<line x1="${sx}" y1="${sy}" x2="${armL[0]}" y2="${armL[1]}" stroke="${FG}" stroke-width="3" stroke-linecap="round"/>`
  if (armR) arms += `<line x1="${sx}" y1="${sy}" x2="${armR[0]}" y2="${armR[1]}" stroke="${FG}" stroke-width="3" stroke-linecap="round"/>`
  if (handL) arms += `<circle cx="${handL[0]}" cy="${handL[1]}" r="5" fill="${AMBER}"/>`
  if (handR) arms += `<circle cx="${handR[0]}" cy="${handR[1]}" r="5" fill="${AMBER}"/>`
  return chair + spine + head + legs + arms
}

function label(text, y = 285, color = GRAY) {
  return `<text x="150" y="${y}" text-anchor="middle" fill="${color}" font-size="12" font-family="system-ui,sans-serif">${text}</text>`
}

function timer(cx, cy, t) {
  return `<circle cx="${cx}" cy="${cy}" r="26" fill="none" stroke="${BLUE}" stroke-width="2.5"/>
  <text x="${cx}" y="${cy+5}" text-anchor="middle" fill="${BLUE}" font-size="15" font-weight="bold" font-family="system-ui,sans-serif">${t}</text>`
}

function arrow(x1, y1, x2, y2, color = BLUE, id = 'a') {
  return `<defs><marker id="${id}" markerWidth="8" markerHeight="6" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="${color}"/></marker></defs>
  <line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}" stroke-width="2" marker-end="url(#${id})"/>`
}

// ─── CHIN TUCK ────────────────────────────────────────────────────────────────
const chinTuck1 = svg(`
  ${fig(150, 220, { armL: [108, 163], armR: [192, 163] })}
  <line x1="150" y1="50" x2="150" y2="88" stroke="${BLUE}" stroke-width="1.5" stroke-dasharray="4,3" opacity="0.6"/>
  <text x="162" y="64" fill="${BLUE}" font-size="10" font-family="system-ui,sans-serif">neutral</text>
  ${label('Sit tall, eyes forward')}
`)

const chinTuck2 = svg(`
  ${fig(150, 220, { headDx: -12, armL: [108, 163], armR: [178, 148], handR: [178, 148] })}
  ${arrow(174, 90, 148, 90, BLUE, 'a1')}
  <text x="193" y="94" fill="${BLUE}" font-size="10" font-family="system-ui,sans-serif">back</text>
  ${label('Push chin back with fingers')}
`)

const chinTuck3 = svg(`
  ${fig(150, 220, { headDx: -12, armL: [108, 163], armR: [192, 163] })}
  ${timer(240, 75, '5s')}
  <text x="240" y="108" text-anchor="middle" fill="${FG}" font-size="9" font-family="system-ui,sans-serif">hold</text>
  ${label('Hold 5s · repeat ×5', 285, AMBER)}
`)

// ─── CHEST OPENER ─────────────────────────────────────────────────────────────
const chestOpener1 = svg(`
  ${fig(150, 220, { armL: [108, 170], armR: [192, 170] })}
  ${label('Starting position')}
`)

const chestOpener2 = svg(`
  ${fig(150, 220, {})}
  <line x1="150" y1="135" x2="115" y2="175" stroke="${FG}" stroke-width="3" stroke-linecap="round"/>
  <line x1="150" y1="135" x2="185" y2="175" stroke="${FG}" stroke-width="3" stroke-linecap="round"/>
  <line x1="115" y1="175" x2="150" y2="192" stroke="${FG}" stroke-width="3" stroke-linecap="round"/>
  <line x1="185" y1="175" x2="150" y2="192" stroke="${FG}" stroke-width="3" stroke-linecap="round"/>
  <circle cx="150" cy="196" r="5" fill="${AMBER}"/>
  ${arrow(95, 135, 118, 143, BLUE, 'b1')}
  ${arrow(205, 135, 182, 143, BLUE, 'b2')}
  ${label('Clasp hands behind back')}
`)

const chestOpener3 = svg(`
  ${fig(150, 220, { headDy: -8 })}
  <line x1="150" y1="135" x2="115" y2="175" stroke="${FG}" stroke-width="3" stroke-linecap="round"/>
  <line x1="150" y1="135" x2="185" y2="175" stroke="${FG}" stroke-width="3" stroke-linecap="round"/>
  <line x1="115" y1="175" x2="150" y2="192" stroke="${FG}" stroke-width="3" stroke-linecap="round"/>
  <line x1="185" y1="175" x2="150" y2="192" stroke="${FG}" stroke-width="3" stroke-linecap="round"/>
  <circle cx="150" cy="196" r="5" fill="${AMBER}"/>
  ${timer(240, 72, '15s')}
  <text x="240" y="105" text-anchor="middle" fill="${FG}" font-size="9" font-family="system-ui,sans-serif">hold</text>
  ${label('Lift chin · hold 15s', 285, BLUE)}
`)

// ─── NECK MASSAGE ─────────────────────────────────────────────────────────────
const neckMassage1 = svg(`
  ${fig(150, 220, {})}
  <line x1="150" y1="135" x2="112" y2="108" stroke="${FG}" stroke-width="3" stroke-linecap="round"/>
  <line x1="150" y1="135" x2="188" y2="108" stroke="${FG}" stroke-width="3" stroke-linecap="round"/>
  <circle cx="112" cy="104" r="6" fill="${AMBER}"/>
  <circle cx="188" cy="104" r="6" fill="${AMBER}"/>
  <line x1="106" y1="97" x2="75" y2="78" stroke="${BLUE}" stroke-width="1.5"/>
  <text x="25" y="75" fill="${BLUE}" font-size="10" font-family="system-ui,sans-serif">base of</text>
  <text x="25" y="87" fill="${BLUE}" font-size="10" font-family="system-ui,sans-serif">skull</text>
  ${label('Fingertips at occipital ridge')}
`)

const neckMassage2 = svg(`
  ${fig(150, 220, {})}
  <line x1="150" y1="135" x2="112" y2="108" stroke="${FG}" stroke-width="3" stroke-linecap="round"/>
  <line x1="150" y1="135" x2="188" y2="108" stroke="${FG}" stroke-width="3" stroke-linecap="round"/>
  <circle cx="112" cy="104" r="6" fill="${AMBER}"/>
  <circle cx="188" cy="104" r="6" fill="${AMBER}"/>
  <path d="M96 98 A16 16 0 1 1 95 114" fill="none" stroke="${BLUE}" stroke-width="2.5" marker-end="url(#circ1)"/>
  <path d="M204 98 A16 16 0 0 0 205 114" fill="none" stroke="${BLUE}" stroke-width="2.5" marker-end="url(#circ2)"/>
  <defs>
    <marker id="circ1" markerWidth="8" markerHeight="6" refX="1" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="${BLUE}"/></marker>
    <marker id="circ2" markerWidth="8" markerHeight="6" refX="1" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="${BLUE}"/></marker>
  </defs>
  ${label('Gentle circular pressure', 285, BLUE)}
`)

// ─── SHOULDER ROLLS ───────────────────────────────────────────────────────────
const shoulderRolls1 = svg(`
  ${fig(150, 220, { armL: [105, 170], armR: [195, 170] })}
  ${label('Arms relaxed at sides')}
`)

const shoulderRolls2 = svg(`
  ${fig(150, 220, { armL: [100, 158], armR: [200, 158], shoulderDy: -8 })}
  <path d="M108 138 A32 32 0 0 1 80 160" fill="none" stroke="${BLUE}" stroke-width="2.5" marker-end="url(#sr1)"/>
  <path d="M192 138 A32 32 0 0 0 220 160" fill="none" stroke="${BLUE}" stroke-width="2.5" marker-end="url(#sr2)"/>
  <defs>
    <marker id="sr1" markerWidth="8" markerHeight="6" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="${BLUE}"/></marker>
    <marker id="sr2" markerWidth="8" markerHeight="6" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="${BLUE}"/></marker>
  </defs>
  ${label('Roll backward ×5', 285, BLUE)}
`)

const shoulderRolls3 = svg(`
  ${fig(150, 220, { armL: [105, 170], armR: [195, 170] })}
  <path d="M108 148 A32 32 0 0 0 82 168" fill="none" stroke="${AMBER}" stroke-width="2.5" marker-end="url(#sf1)"/>
  <path d="M192 148 A32 32 0 0 1 218 168" fill="none" stroke="${AMBER}" stroke-width="2.5" marker-end="url(#sf2)"/>
  <defs>
    <marker id="sf1" markerWidth="8" markerHeight="6" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="${AMBER}"/></marker>
    <marker id="sf2" markerWidth="8" markerHeight="6" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="${AMBER}"/></marker>
  </defs>
  ${label('Then forward ×5', 285, AMBER)}
`)

// ─── SPINAL TWIST ─────────────────────────────────────────────────────────────
const spinalTwist1 = svg(`
  ${fig(150, 220, { armL: [108, 163], armR: [192, 163] })}
  <line x1="150" y1="55" x2="150" y2="220" stroke="${BLUE}" stroke-width="1" stroke-dasharray="4,3" opacity="0.4"/>
  ${label('Sit upright · feet flat', 285, GRAY)}
`)

const spinalTwist2 = svg(`
  ${fig(150, 220, { armL: [108, 163] })}
  <line x1="150" y1="135" x2="122" y2="198" stroke="${FG}" stroke-width="3" stroke-linecap="round"/>
  <circle cx="122" cy="202" r="7" fill="${BLUE}"/>
  <text x="60" y="208" fill="${BLUE}" font-size="10" font-family="system-ui,sans-serif">right hand</text>
  <text x="60" y="220" fill="${BLUE}" font-size="10" font-family="system-ui,sans-serif">on left knee</text>
  ${label('Right hand on left knee')}
`)

const spinalTwist3 = svg(`
  ${fig(150, 220, { headDx: -18 })}
  <line x1="150" y1="135" x2="122" y2="198" stroke="${FG}" stroke-width="3" stroke-linecap="round"/>
  <circle cx="122" cy="202" r="7" fill="${BLUE}"/>
  <path d="M172 110 A38 38 0 0 1 112 105" fill="none" stroke="${BLUE}" stroke-width="2.5" marker-end="url(#tw1)"/>
  <defs><marker id="tw1" markerWidth="8" markerHeight="6" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="${BLUE}"/></marker></defs>
  ${timer(240, 72, '15s')}
  ${label('Twist left · hold 15s', 285, BLUE)}
`)

const spinalTwist4 = svg(`
  ${fig(150, 220, { headDx: 18 })}
  <line x1="150" y1="135" x2="178" y2="198" stroke="${FG}" stroke-width="3" stroke-linecap="round"/>
  <circle cx="178" cy="202" r="7" fill="${AMBER}"/>
  <path d="M128 110 A38 38 0 0 0 188 105" fill="none" stroke="${AMBER}" stroke-width="2.5" marker-end="url(#tw2)"/>
  <defs><marker id="tw2" markerWidth="8" markerHeight="6" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="${AMBER}"/></marker></defs>
  ${timer(240, 72, '15s')}
  ${label('Other side · hold 15s', 285, AMBER)}
`)

const files = {
  'chin-tuck-1.svg': chinTuck1,
  'chin-tuck-2.svg': chinTuck2,
  'chin-tuck-3.svg': chinTuck3,
  'chest-opener-1.svg': chestOpener1,
  'chest-opener-2.svg': chestOpener2,
  'chest-opener-3.svg': chestOpener3,
  'neck-massage-1.svg': neckMassage1,
  'neck-massage-2.svg': neckMassage2,
  'shoulder-rolls-1.svg': shoulderRolls1,
  'shoulder-rolls-2.svg': shoulderRolls2,
  'shoulder-rolls-3.svg': shoulderRolls3,
  'spinal-twist-1.svg': spinalTwist1,
  'spinal-twist-2.svg': spinalTwist2,
  'spinal-twist-3.svg': spinalTwist3,
  'spinal-twist-4.svg': spinalTwist4,
}

for (const [name, content] of Object.entries(files)) {
  writeFileSync(`${dir}/${name}`, content, 'utf8')
  console.log(`  ✓ ${name}`)
}
console.log(`\nGenerated ${Object.keys(files).length} SVG files in ${dir}/`)
