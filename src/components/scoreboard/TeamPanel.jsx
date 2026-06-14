import { useEffect, useRef } from 'react'
import headGearImg from '../../assets/images/head-gear.png'
import bodyProtectorImg from '../../assets/images/body-protector.png'
import fistImg from '../../assets/images/fist.png'
import turnImg from '../../assets/images/turn.png'
import spinningImg from '../../assets/images/spinning.png'

function actionImage(action) {
  if (action === 'head-click' || action === 'head') return headGearImg
  if (action === 'head-swipe')                      return spinningImg
  if (action === 'body-click' || action === 'body') return bodyProtectorImg
  if (action === 'body-swipe')                      return turnImg
  if (action === 'punch-click' || action === 'punch') return fistImg
  return null
}

const KNOWN_ACTIONS = new Set(['punch','punch-click','body','body-click','body-swipe','head','head-click','head-swipe','gamjeom'])

const TECH_COLS = [
  { key: 'punch',    label: 'Punch',    img: fistImg,          actions: ['punch','punch-click'],   pts: [1] },
  { key: 'trunk',    label: 'Trunk',    img: bodyProtectorImg, actions: ['body','body-click'],     pts: [2] },
  { key: 'turn',     label: 'Turn',     img: turnImg,          actions: ['body-swipe'],            pts: [4] },
  { key: 'head',     label: 'Head',     img: headGearImg,      actions: ['head','head-click'],     pts: [3] },
  { key: 'spinning', label: 'Spinning', img: spinningImg,      actions: ['head-swipe'],            pts: [5] },
]

function countFor(entries, col) {
  return entries.filter(e => {
    if (col.actions.includes(e.action)) return true
    if (!KNOWN_ACTIONS.has(e.action)) return col.pts.includes(e.points)
    return false
  }).length
}

function TechTable({ matchLog, playerKey, currentRound }) {
  const myLog = matchLog.filter(e => e.player === playerKey)
  const rounds = Array.from({ length: currentRound }, (_, i) => i + 1)

  const tdStyle = { padding: '5px 6px', textAlign: 'center', borderBottom: '1px solid rgba(255,255,255,0.08)' }
  const thStyle = { padding: '4px 6px', textAlign: 'center', borderBottom: '2px solid rgba(255,255,255,0.2)' }

  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, color: '#fff' }}>
      <thead>
        <tr style={{ background: 'rgba(0,0,0,0.5)' }}>
          <th style={{ ...thStyle, textAlign: 'left', paddingLeft: 10 }}>R #</th>
          {TECH_COLS.map(col => (
            <th key={col.key} style={thStyle}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                <img src={col.img} alt={col.label} style={{ width: 22, height: 22, objectFit: 'contain', filter: 'brightness(1.2)' }} />
                <span style={{ fontSize: 10, opacity: 0.85 }}>{col.label}</span>
              </div>
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rounds.map(r => {
          const re = myLog.filter(e => e.round === r)
          return (
            <tr key={r} style={{ background: r % 2 === 0 ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.15)' }}>
              <td style={{ ...tdStyle, textAlign: 'left', paddingLeft: 10, fontWeight: 'bold' }}>Round {r}</td>
              {TECH_COLS.map(col => (
                <td key={col.key} style={tdStyle}>{countFor(re, col)}</td>
              ))}
            </tr>
          )
        })}
        <tr style={{ background: 'rgba(0,0,0,0.5)', fontWeight: 'bold' }}>
          <td style={{ ...tdStyle, textAlign: 'left', paddingLeft: 10 }}>Total</td>
          {TECH_COLS.map(col => (
            <td key={col.key} style={tdStyle}>{countFor(myLog, col)}</td>
          ))}
        </tr>
      </tbody>
    </table>
  )
}

export default function TeamPanel({
  team, side, score, gamJeom, blinkClass, lastAction, lastPressedAction, disabled,
  matchWinnerDeclared, matchLog, currentRound,
  onAddPoints, onRemovePoints, onDeclareRoundWinner, onDeclareMatchWinner,
  onMedicalTimeout, onAddGamJeom, onSubtractGamJeom
}) {
  const isHong = team === 'hong'
  const containerClass = `team-container ${side === 'left' ? 'left-team' : 'right-team'}`
  const teamClass = `team ${isHong ? 'red-team' : 'blue-team'}`
  const gamJeomContainerClass = isHong ? 'gamjeom-container-left' : 'gamjeom-container-right'

  const imgRef = useRef(null)
  const nameRef = useRef(null)
  const hideTimerRef = useRef(null)

  const pressedImgRef = useRef(null)
  const pressedNameRef = useRef(null)
  const pressedTimerRef = useRef(null)

  // Show pressed action image + referee name for 1 second, replacing immediately on new press
  useEffect(() => {
    if (!lastPressedAction?.action || !lastPressedAction?.timestamp) return

    if (pressedTimerRef.current) clearTimeout(pressedTimerRef.current)

    const src = actionImage(lastPressedAction.action)
    if (!src || !pressedImgRef.current) return

    pressedImgRef.current.src = src
    pressedImgRef.current.style.display = 'block'

    if (pressedNameRef.current) {
      pressedNameRef.current.textContent = lastPressedAction.refereeName || ''
      pressedNameRef.current.style.display = 'block'
    }

    pressedTimerRef.current = setTimeout(() => {
      if (pressedImgRef.current) pressedImgRef.current.style.display = 'none'
      if (pressedNameRef.current) pressedNameRef.current.style.display = 'none'
    }, 1000)
  }, [lastPressedAction?.timestamp])

  // Flash last action image/name for 800ms
  useEffect(() => {
    if (!lastAction?.image || !lastAction?.timestamp) return
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current)
    if (imgRef.current) {
      imgRef.current.src = lastAction.image
      imgRef.current.style.display = 'block'
    }
    if (nameRef.current && lastAction.refereeName) {
      nameRef.current.textContent = `Referee: ${lastAction.refereeName}`
      nameRef.current.style.display = 'block'
    }
    hideTimerRef.current = setTimeout(() => {
      if (imgRef.current) imgRef.current.style.display = 'none'
      if (nameRef.current) nameRef.current.style.display = 'none'
    }, 1000)
  }, [lastAction])
  
  const playerKey = isHong ? 'red' : 'blue'

  return (
    <div className={containerClass} style={{ position: 'relative' }}>
      <div className={teamClass}>
        <h1>{isHong ? 'Hong' : 'Chong'}</h1>
        <div className={`score ${blinkClass}`}>{score}</div>
        <button onClick={onAddPoints} disabled={disabled}>Add Points</button>
        <button onClick={onRemovePoints} disabled={disabled}>Remove Points</button>
        <button onClick={onDeclareRoundWinner} disabled={disabled}>Declare Round Winner</button>
        <button onClick={onDeclareMatchWinner} disabled={disabled}>Declare Match Winner</button>
        <button onClick={onMedicalTimeout} disabled={disabled}>Medical Timeout</button>

        <div
          className={gamJeomContainerClass}
          style={{ '--gamJeom': gamJeom }}
        >
          <div className="gamjeom-display">
            <div className="gamjeom-circle">
              <span className="gamjeom-fraction">{gamJeom}/5</span>
            </div>
          </div>
          <button onClick={onAddGamJeom} disabled={disabled}>+ Gam-Jeom</button>
          <button onClick={onSubtractGamJeom} disabled={disabled}>- Gam-Jeom</button>
          <div className="action-container">
            <img ref={imgRef} className="action-image" alt="Action" style={{ display: 'none' }} />
            <div ref={nameRef} className="referee-name-display" style={{ display: 'none' }} />
          </div>
          <img
            ref={pressedImgRef}
            className="pressed-action-image"
            alt=""
            style={{ display: 'none' }}
          />
          <div
            ref={pressedNameRef}
            className="pressed-action-name"
            style={{ display: 'none' }}
          />
        </div>
      </div>

      {matchWinnerDeclared && matchLog && (
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(4px)',
        }}>
          <TechTable matchLog={matchLog} playerKey={playerKey} currentRound={currentRound || 1} />
        </div>
      )}
    </div>
  )
}
