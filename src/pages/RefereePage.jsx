import { useState } from 'react'
import RoomEntry from '../components/referee/RoomEntry'
import ScoringUI from '../components/referee/ScoringUI'

export default function RefereePage() {
  const [sessionRoom, setSessionRoom] = useState(() => sessionStorage.getItem('currentRoomId') || null)
  const [refereeId] = useState(() => {
    let id = localStorage.getItem('refereeId')
    if (!id) {
      id = 'referee_' + Math.random().toString(36).substr(2, 9)
      localStorage.setItem('refereeId', id)
    }
    return id
  })
  const [refereeName, setRefereeName] = useState(null)

  if (!sessionRoom) {
    return (
      <div className="referee-page">
        <RoomEntry
          refereeId={refereeId}
          onJoined={(roomId, name) => {
            setSessionRoom(roomId)
            setRefereeName(name)
          }}
        />
      </div>
    )
  }

  return (
    <div className="referee-page">
      <ScoringUI
        roomId={sessionRoom}
        refereeId={refereeId}
        refereeName={refereeName}
        onLeave={() => {
          sessionStorage.removeItem('currentRoomId')
          setSessionRoom(null)
        }}
      />
    </div>
  )
}
