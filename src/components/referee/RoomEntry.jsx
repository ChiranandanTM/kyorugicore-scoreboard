import { useState, useRef, useEffect } from 'react'
import { ref, set as dbSet, onValue, off } from 'firebase/database'
import { db } from '../../firebase'

export default function RoomEntry({ refereeId, onJoined }) {
  const [roomCode, setRoomCode] = useState('')
  const [scanning, setScanning] = useState(false)
  const [error, setError] = useState('')
  const scannerRef = useRef(null)
  const qrReaderRef = useRef(null)

  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {})
        scannerRef.current = null
      }
    }
  }, [])

  const joinRoom = (code) => {
    const room = (code || roomCode).trim().toUpperCase()
    if (!room) { setError('Enter a room code'); return }

    dbSet(ref(db, `rooms/${room}/referees/${refereeId}`), {
      connected: true,
      name: `Referee ${Math.floor(Math.random() * 1000)}`,
      lastActive: Date.now(),
      joined: Date.now()
    }).then(() => {
      sessionStorage.setItem('isLoggedIn', 'true')
      sessionStorage.setItem('currentRoomId', room)
      sessionStorage.setItem('refereeId', refereeId)

      // Listen for assigned name
      const nameRef = ref(db, `rooms/${room}/referees/${refereeId}`)
      const unsub = onValue(nameRef, (snap) => {
        if (snap.exists()) {
          const name = snap.val().name
          off(nameRef)
          onJoined(room, name)
        }
      })
    }).catch(err => {
      console.error('Join failed:', err)
      setError('Failed to join room. Try again.')
    })
  }

  const startScan = async () => {
    const { Html5Qrcode } = await import('html5-qrcode')
    setScanning(true)
    setError('')

    setTimeout(() => {
      if (!qrReaderRef.current) return
      const html5QrCode = new Html5Qrcode('qr-reader')
      scannerRef.current = html5QrCode
      html5QrCode.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decoded) => {
          html5QrCode.stop().catch(() => {})
          scannerRef.current = null
          setScanning(false)
          setRoomCode(decoded)
          joinRoom(decoded)
        },
        () => {}
      ).catch(err => {
        console.error('QR scanner init error:', err)
        setError('Camera access denied or unavailable.')
        setScanning(false)
      })
    }, 100)
  }

  const stopScan = () => {
    if (scannerRef.current) {
      scannerRef.current.stop().catch(() => {})
      scannerRef.current = null
    }
    setScanning(false)
  }

  return (
    <div className="room-entry">
      <div className="ref-login-card">
        <div className="ref-login-brand">KYORUGI CORE</div>
        <h1>Referee Login</h1>
        <p className="ref-login-sub">Enter your room code to join</p>

        <input
          type="text"
          placeholder="Enter Room Code"
          value={roomCode}
          onChange={e => setRoomCode(e.target.value.toUpperCase())}
          onKeyDown={e => e.key === 'Enter' && joinRoom()}
        />
        <button className="ref-btn-join" onClick={() => joinRoom()}>Join Room</button>
        {!scanning ? (
          <button className="ref-btn-scan" onClick={startScan}>
            <span>&#x1F4F7;</span> Scan QR Code
          </button>
        ) : (
          <button className="ref-btn-stop" onClick={stopScan}>Stop Scanning</button>
        )}
        {error && <p className="ref-error">{error}</p>}
      </div>

      {scanning && <div id="qr-reader" ref={qrReaderRef} />}
    </div>
  )
}
