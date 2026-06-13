import { useEffect, useRef, useState } from 'react'
import QRCode from 'qrcode'
import { useMatchStore } from '../../store/useMatchStore'

export default function RefereeLoginModal() {
  const store = useMatchStore()
  const canvasRef = useRef(null)
  const [roomId, setRoomId] = useState(store.currentRoomId || '')

  const handleCreateRoom = () => {
    const id = store.createRoom()
    setRoomId(id)
  }

  useEffect(() => {
    if (roomId && canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, roomId, { width: 200 }, err => {
        if (err) console.error('QR generation failed:', err)
      })
    }
  }, [roomId])

  const refereeEntries = Object.entries(store.referees)
    .sort((a, b) => (a[1].joined || 0) - (b[1].joined || 0))

  return (
    <div className="referee-login-overlay">
      <h1>Referee Room Manager</h1>

      <button onClick={handleCreateRoom}>Create Room</button>

      {roomId && (
        <>
          <div style={{ marginTop: '0.5em', fontSize: '1.2em' }}>Room ID: {roomId}</div>
          <canvas ref={canvasRef} />
        </>
      )}

      {refereeEntries.length > 0 && (
        <div style={{ marginTop: '1em', textAlign: 'left' }}>
          <h3>Connected Referees ({refereeEntries.length})</h3>
          {refereeEntries.map(([id, val], idx) => (
            <div key={id} className="referee-entry">
              <span className="referee-id">Referee {idx + 1}</span>
              <input
                type="text"
                className="rename-input"
                defaultValue={val.name || `Referee ${idx + 1}`}
                placeholder="Enter referee name"
                onBlur={e => store.renameDevice(id, e.target.value)}
              />
              <button
                className="delete-referee"
                onClick={() => {
                  if (confirm('Remove this referee?')) store.deleteReferee(id)
                }}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      <button className="exit-button" onClick={() => store.toggleRefereeLogin(false)}>
        Exit
      </button>
    </div>
  )
}
