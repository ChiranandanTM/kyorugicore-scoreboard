import { useEffect, useRef } from 'react'
import { ref, onValue, off } from 'firebase/database'
import { db } from '../firebase'
import { useMatchStore } from '../store/useMatchStore'
import TeamPanel from '../components/scoreboard/TeamPanel'
import CentralTimer from '../components/scoreboard/CentralTimer'
import PointSlideModal from '../components/scoreboard/PointSlideModal'
import SettingsModal from '../components/scoreboard/SettingsModal'
import RefereeLoginModal from '../components/scoreboard/RefereeLoginModal'
import SuperiorityModal from '../components/scoreboard/SuperiorityModal'

export default function ScoreboardPage() {
  const store = useMatchStore()
  const roomListenerRef = useRef(null)
  const refListenerRef = useRef(null)

  // Set up Firebase listeners whenever room changes
  useEffect(() => {
    const { currentRoomId } = store
    if (!currentRoomId) return

    // Clean up old listeners
    if (roomListenerRef.current) off(roomListenerRef.current)
    if (refListenerRef.current) off(refListenerRef.current)

    // Room data listener
    roomListenerRef.current = ref(db, `rooms/${currentRoomId}`)
    onValue(roomListenerRef.current, (snapshot) => {
      store.syncFromFirebase(snapshot.val())
      store.validateSubmissions(currentRoomId)
    }, (err) => console.error('Room listener error:', err))

    // Referees listener
    refListenerRef.current = ref(db, `rooms/${currentRoomId}/referees`)
    onValue(refListenerRef.current, (snapshot) => {
      store.syncReferees(snapshot.val())
    })

    return () => {
      if (roomListenerRef.current) off(roomListenerRef.current)
      if (refListenerRef.current) off(refListenerRef.current)
    }
  }, [store.currentRoomId])

  const buttonsDisabled = store.matchWinnerDeclared

  return (
    <>
      {/* Audio elements */}
      <audio id="startSound" preload="auto">
        <source src="/assets/sounds/start.mp3" type="audio/mpeg" />
      </audio>
      <audio id="stopSound" preload="auto">
        <source src="/assets/sounds/stop.mp3" type="audio/mpeg" />
      </audio>

      {/* Referee Login Overlay */}
      {store.refereeLoginOpen && <RefereeLoginModal />}

      <div className="container">
        <button className="create-room-button" onClick={() => store.toggleRefereeLogin(true)}>
          Referee Login
        </button>
        <button className="edit-scoreboard-button" onClick={store.openSettings}>
          Edit Scoreboard
        </button>

        {/* Hong (Red) - Left */}
        <TeamPanel
          team="hong"
          side="left"
          score={store.hongScore}
          gamJeom={store.hongGamJeom}
          blinkClass={store.redBlinkClass}
          lastAction={store.hongLastAction}
          lastPressedAction={store.hongLastPressedAction}
          disabled={buttonsDisabled}
          onAddPoints={() => store.openPointSlide('add', 'red')}
          onRemovePoints={() => store.openPointSlide('subtract', 'red')}
          onDeclareRoundWinner={() => store.declareRoundWinner('hong')}
          onDeclareMatchWinner={() => store.declareMatchWinner('hong')}
          onMedicalTimeout={() => store.medicalTimeout('red')}
          onAddGamJeom={() => store.addGamJeom('hong')}
          onSubtractGamJeom={() => store.subtractGamJeom('hong')}
        />

        {/* Central Timer */}
        <CentralTimer />

        {/* Chong (Blue) - Right */}
        <TeamPanel
          team="chong"
          side="right"
          score={store.chongScore}
          gamJeom={store.chongGamJeom}
          blinkClass={store.blueBlinkClass}
          lastAction={store.chongLastAction}
          lastPressedAction={store.chongLastPressedAction}
          disabled={buttonsDisabled}
          onAddPoints={() => store.openPointSlide('add', 'blue')}
          onRemovePoints={() => store.openPointSlide('subtract', 'blue')}
          onDeclareRoundWinner={() => store.declareRoundWinner('chong')}
          onDeclareMatchWinner={() => store.declareMatchWinner('chong')}
          onMedicalTimeout={() => store.medicalTimeout('blue')}
          onAddGamJeom={() => store.addGamJeom('chong')}
          onSubtractGamJeom={() => store.subtractGamJeom('chong')}
        />

        <button
          className="reset-scores-button"
          onClick={store.resetScores}
        >
          Reset Scores
        </button>
        <button
          className="new-match-button"
          onClick={store.newMatch}
        >
          New Match
        </button>
        <button
          className="reset-room-button"
          onClick={store.resetRoomScore}
        >
          Reset Room Score
        </button>

        <div id="redTimeout" className="timeout-message" />
        <div id="blueTimeout" className="timeout-message" />

        {store.pointSlideOpen && <PointSlideModal />}
        {store.settingsOpen && <SettingsModal />}
        {store.superiorityModalOpen && <SuperiorityModal />}
      </div>
    </>
  )
}
