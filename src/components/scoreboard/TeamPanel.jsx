import { useEffect, useRef } from 'react'
import headGearImg from '../../assets/images/head-gear.png'
import bodyProtectorImg from '../../assets/images/body-protector.png'
import fistImg from '../../assets/images/fist.png'

function actionImage(action) {
  if (action === 'head-click' || action === 'head-swipe') return headGearImg
  if (action === 'body-click' || action === 'body-swipe') return bodyProtectorImg
  if (action === 'punch-click') return fistImg
  return null
}

export default function TeamPanel({
  team, side, score, gamJeom, blinkClass, lastAction, lastPressedAction, disabled,
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
    }, 800)
  }, [lastAction])

  return (
    <div className={containerClass}>
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
    </div>
  )
}
