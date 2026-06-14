import { useEffect, useRef, useState } from 'react'
import QRCode from 'qrcode'
import { useMatchStore } from '../../store/useMatchStore'

export default function RefereeLoginModal() {
  const store = useMatchStore()
  const canvasRef = useRef(null)
  const [roomId, setRoomId] = useState(store.currentRoomId || '')
  const [localNames, setLocalNames] = useState({})

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

  function handleNameChange(id, value) {
    setLocalNames(prev => ({ ...prev, [id]: value }))
  }

  function handleSave(id, idx) {
    const newName = (localNames[id] ?? '').trim() ||
      store.referees[id]?.name ||
      `Referee ${idx + 1}`
    store.renameDevice(id, newName)
    // Clear local edit so button disappears after save
    setLocalNames(prev => { const n = { ...prev }; delete n[id]; return n })
  }

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
          {refereeEntries.map(([id, val], idx) => {
            const currentVal = localNames[id] ?? val.name ?? `Referee ${idx + 1}`
            const isDirty = localNames[id] !== undefined && localNames[id] !== val.name

            return (
              <div key={id} className="referee-entry">
                <span className="referee-id">Referee {idx + 1}</span>
                <input
                  type="text"
                  className="rename-input"
                  value={currentVal}
                  placeholder="Enter referee name"
                  onChange={e => handleNameChange(id, e.target.value)}
                />
                {isDirty && (
                  <button
                    className="save-referee"
                    onClick={() => handleSave(id, idx)}
                  >
                    Save
                  </button>
                )}
                <button
                  className="delete-referee"
                  onClick={() => {
                    if (confirm('Remove this referee?')) store.deleteReferee(id)
                  }}
                >
                  ✕
                </button>
              </div>
            )
          })}
        </div>
      )}

      <button className="exit-button" onClick={() => store.toggleRefereeLogin(false)}>
        Exit
      </button>
    </div>
  )
}
