import { useState, useRef, useEffect } from 'react'
import { ref, get, set as dbSet, runTransaction } from 'firebase/database'
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

  const joinRoom = async (code) => {
    const room = (code || roomCode).trim().toUpperCase()
    if (!room) { setError('Enter a room code'); return }
    setError('')

    try {
      const roomSnap = await get(ref(db, `rooms/${room}`))
      if (!roomSnap.exists()) { setError('Invalid room code. Please try again.'); return }

      const referees = roomSnap.val()?.referees || {}

      // Already in room — rejoin with existing name
      if (referees[refereeId]) {
        const finalName = referees[refereeId].name
        await dbSet(ref(db, `rooms/${room}/referees/${refereeId}`), {
          ...referees[refereeId],
          lastActive: Date.now(),
        })
        sessionStorage.setItem('isLoggedIn', 'true')
        sessionStorage.setItem('currentRoomId', room)
        onJoined(room, finalName)
        return
      }

      if (Object.keys(referees).length >= 4) {
        setError('Maximum of 4 referees allowed in this room.')
        return
      }

      // Atomically claim next sequential referee number
      const counterResult = await runTransaction(
        ref(db, `rooms/${room}/refereeCounter`),
        (current) => (current || 0) + 1,
      )

      if (!counterResult.committed) throw new Error('Failed to claim referee number')

      const assignedNumber = counterResult.snapshot.val()
      const finalName = `Referee ${assignedNumber}`

      await dbSet(ref(db, `rooms/${room}/referees/${refereeId}`), {
        joined: Date.now(),
        lastActive: Date.now(),
        name: finalName,
        number: assignedNumber,
      })

      sessionStorage.setItem('isLoggedIn', 'true')
      sessionStorage.setItem('currentRoomId', room)
      onJoined(room, finalName)
    } catch (err) {
      console.error('Join failed:', err)
      setError('Failed to join room. Try again.')
    }
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
      <h1>Referee Login</h1>

      <input
        type="text"
        placeholder="Enter Room Code"
        value={roomCode}
        onChange={e => setRoomCode(e.target.value.toUpperCase())}
        onKeyDown={e => e.key === 'Enter' && joinRoom()}
      />
      <button onClick={() => joinRoom()}>Join Room</button>
      {!scanning ? (
        <button onClick={startScan}>
          <span>&#x1F4F7;</span> Scan QR Code
        </button>
      ) : (
        <button onClick={stopScan}>Stop Scanning</button>
      )}
      {error && <p>{error}</p>}

      {scanning && <div id="qr-reader" ref={qrReaderRef} />}
    </div>
  )
}
