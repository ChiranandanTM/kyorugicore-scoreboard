import { useState, useEffect } from 'react'
import { useMatchStore } from '../../store/useMatchStore'

export default function CentralTimer() {
  const store = useMatchStore()
  const [showResetWarning, setShowResetWarning] = useState(false)

  // Clear warning once round is no longer declared (Reset Scores was pressed)
  useEffect(() => {
    if (!store.roundDeclared) setShowResetWarning(false)
  }, [store.roundDeclared])

  function handlePlayPause() {
    if (store.roundDeclared && !store.matchWinnerDeclared) {
      if (!showResetWarning) {
        setShowResetWarning(true)
        return
      }
      setShowResetWarning(false)
    }
    store.toggleTimer()
  }

  const minutes = Math.floor(store.timerTime / 60).toString().padStart(2, '0')
  const seconds = (store.timerTime % 60).toString().padStart(2, '0')

  // Break timer display text
  let breakText = null
  if (store.isBreakRunning && store.breakTimeRemaining > 0) {
    const bm = Math.floor(store.breakTimeRemaining / 60).toString().padStart(2, '0')
    const bs = (store.breakTimeRemaining % 60).toString().padStart(2, '0')
    breakText = `Break: ${bm}:${bs}`
  } else if (store.isOvertime) {
    const om = Math.floor(store.overtimeSeconds / 60).toString().padStart(2, '0')
    const os = (store.overtimeSeconds % 60).toString().padStart(2, '0')
    breakText = `Over time: ${om}:${os}`
  }

  // Medical timeout display in break area
  let medicalText = null
  if (store.isMedicalTimeout) {
    const mm = Math.floor(store.timerTime / 60).toString().padStart(2, '0')
    const ms = (store.timerTime % 60).toString().padStart(2, '0')
    medicalText = `Medical: ${mm}:${ms}`
  }

  const courtDisplay = store.defaultSettings.courtNumber !== 'none'
    ? `Court No ${store.defaultSettings.courtNumber}`
    : null

  return (
    <div className="timer-container">
      {store.isMedicalTimeout && (
        <button className="stop-timeout-button" onClick={store.stopMedicalTimeout}>
          Stop Timeout
        </button>
      )}

      {courtDisplay && (
        <div className="court-number">{courtDisplay}</div>
      )}

      {store.matchWinnerDeclared && (
        <div style={{
          fontSize: 36, fontWeight: 'bold', color: '#c0392b',
          letterSpacing: 2, textTransform: 'uppercase', margin: '4px 0'
        }}>
          Ended
        </div>
      )}

      <div className="rounds-completed">
        Round <span>{store.currentRound}</span> of 3
      </div>

      <div className="timer">
        <span className="timer-display">{minutes}:{seconds}</span>
      </div>

      <div className="timer-controls">
        <button className="play-pause-button" onClick={handlePlayPause}>
          <img
            src={store.isTimerRunning ? '/assets/images/pause.svg' : '/assets/images/play.svg'}
            alt={store.isTimerRunning ? 'pause' : 'play'}
          />
        </button>
        <button className="reset-timer-button" onClick={store.resetTimer}>
          Reset Timer
        </button>
      </div>

      {showResetWarning && (
        <div style={{
          marginTop: 8, padding: '6px 12px', background: '#c0392b',
          color: '#fff', borderRadius: 6, fontSize: 13, fontWeight: 600,
          textAlign: 'center', lineHeight: 1.4,
        }}>
          Press <strong>Reset Scores</strong> to start break time.<br />
          Press Start again to skip to next round.
        </div>
      )}

      {(breakText || medicalText) && (
        <div
          className="break-timer"
          style={store.isOvertime ? { color: '#ff0000' } : {}}
        >
          {medicalText || breakText}
        </div>
      )}
    </div>
  )
}
