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
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 3000,
        }}>
          <div style={{
            background: '#1a1a2e', border: '2px solid #ffd700', borderRadius: 14,
            padding: '28px 36px', maxWidth: 360, textAlign: 'center', color: '#fff',
          }}>
            <div style={{ fontSize: 22, fontWeight: 'bold', marginBottom: 12, color: '#ffd700' }}>
              Warning
            </div>
            <p style={{ fontSize: 15, marginBottom: 20, lineHeight: 1.6 }}>
              Press <strong>Reset Scores</strong> to start the break time.
              <br />
              Press <strong>Start</strong> again to skip directly to the next round.
            </p>
            <button
              onClick={() => setShowResetWarning(false)}
              style={{
                padding: '10px 28px', background: '#ffd700', color: '#1a1a2e',
                border: 'none', borderRadius: 8, fontSize: 15, fontWeight: 'bold',
                cursor: 'pointer',
              }}
            >
              Close
            </button>
          </div>
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
