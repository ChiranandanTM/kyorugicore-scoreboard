import { useMatchStore } from '../../store/useMatchStore'

export default function CentralTimer() {
  const store = useMatchStore()

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

      <div className="rounds-completed">
        Round <span>{store.currentRound}</span> of 3
      </div>

      <div className="timer">
        <span className="timer-display">{minutes}:{seconds}</span>
      </div>

      <div className="timer-controls">
        <button className="play-pause-button" onClick={store.toggleTimer}>
          <img
            src={store.isTimerRunning ? '/assets/images/pause.svg' : '/assets/images/play.svg'}
            alt={store.isTimerRunning ? 'pause' : 'play'}
          />
        </button>
        <button className="reset-timer-button" onClick={store.resetTimer}>
          Reset Timer
        </button>
      </div>

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
