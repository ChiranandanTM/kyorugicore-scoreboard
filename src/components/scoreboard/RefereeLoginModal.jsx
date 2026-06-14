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
      QRCode.toCanvas(canvasRef.current, roomId, { width: 180 }, err => {
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
    setLocalNames(prev => { const n = { ...prev }; delete n[id]; return n })
  }

  return (
    <div className="referee-login-overlay">
      <div className="rlm-card">
        <div className="rlm-brand">KYORUGI CORE</div>
        <h1 className="rlm-title">Referee Room Manager</h1>

        <button className="rlm-btn-create" onClick={handleCreateRoom}>
          {roomId ? 'Regenerate Room' : 'Create Room'}
        </button>

        {roomId && (
          <div className="rlm-room-info">
            <div className="rlm-room-id">Room ID: <strong>{roomId}</strong></div>
            <div className="rlm-qr-wrap">
              <canvas ref={canvasRef} />
            </div>
          </div>
        )}

        {refereeEntries.length > 0 && (
          <div className="rlm-referee-list">
            <h3 className="rlm-ref-heading">
              Connected Referees <span className="rlm-ref-count">{refereeEntries.length}</span>
            </h3>
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
                    <button className="save-referee" onClick={() => handleSave(id, idx)}>
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

        <button className="rlm-btn-exit" onClick={() => store.toggleRefereeLogin(false)}>
          Exit
        </button>
      </div>
    </div>
  )
}
