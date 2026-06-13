import { useEffect, useState } from 'react'
import { ref, onValue, off, push } from 'firebase/database'
import { db } from '../../firebase'

const ACTIONS = [
  { type: 'head', label: 'Head Kick', points: 3, img: '/assets/images/head-gear.png' },
  { type: 'body', label: 'Body Kick', points: 2, img: '/assets/images/body-protector.png' },
  { type: 'punch', label: 'Punch', points: 1, img: '/assets/images/fist.png' },
]

export default function ScoringUI({ roomId, refereeId, refereeName, onLeave }) {
  const [timerRunning, setTimerRunning] = useState(false)
  const [currentName, setCurrentName] = useState(refereeName || '')

  useEffect(() => {
    const timerRef = ref(db, `rooms/${roomId}/timer/running`)
    onValue(timerRef, snap => setTimerRunning(!!snap.val()))

    const nameRef = ref(db, `rooms/${roomId}/referees/${refereeId}/name`)
    onValue(nameRef, snap => { if (snap.val()) setCurrentName(snap.val()) })

    return () => {
      off(timerRef)
      off(nameRef)
    }
  }, [roomId, refereeId])

  const submitScore = (team, points, actionType, imgUrl) => {
    push(ref(db, `rooms/${roomId}/submissions`), {
      player: team,
      points,
      action: 'score',
      refereeId,
      refereeName: currentName,
      image: imgUrl,
      timestamp: Date.now()
    }).catch(console.error)
  }

  return (
    <div style={{ padding: '20px', minHeight: '100vh', background: '#1a1a2e' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 style={{ color: 'white', margin: 0 }}>Room: {roomId}</h2>
        <button
          onClick={onLeave}
          style={{ background: '#dc3545', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '5px', cursor: 'pointer' }}
        >
          Leave
        </button>
      </div>

      {!timerRunning && (
        <div style={{ background: 'rgba(255,193,7,0.2)', border: '1px solid #ffc107', borderRadius: '8px', padding: '12px', marginBottom: '20px', color: '#ffc107', textAlign: 'center' }}>
          Timer is not running — scores won't be awarded
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        {/* Hong (Red) */}
        <div>
          <h3 style={{ color: '#ff0505', textAlign: 'center', marginBottom: '10px' }}>Hong (Red)</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {ACTIONS.map(action => (
              <div
                key={action.type}
                className="section red"
                onClick={() => submitScore('red', action.points, action.type, action.img)}
              >
                <img src={action.img} alt={action.label} onError={e => { e.target.style.display = 'none' }} />
                <div className="text">{action.label}</div>
                <div className="label" style={{ color: '#ff0000' }}>+{action.points} pts</div>
              </div>
            ))}
          </div>
        </div>

        {/* Chong (Blue) */}
        <div>
          <h3 style={{ color: '#0511fc', textAlign: 'center', marginBottom: '10px' }}>Chong (Blue)</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {ACTIONS.map(action => (
              <div
                key={action.type}
                className="section blue"
                onClick={() => submitScore('blue', action.points, action.type, action.img)}
              >
                <img src={action.img} alt={action.label} onError={e => { e.target.style.display = 'none' }} />
                <div className="text">{action.label}</div>
                <div className="label" style={{ color: '#0000ff' }}>+{action.points} pts</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ marginTop: '20px', color: '#888', textAlign: 'center', fontSize: '14px' }}>
        Logged in as: {currentName}
      </div>
    </div>
  )
}
