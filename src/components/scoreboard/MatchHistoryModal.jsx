import { useMatchStore } from '../../store/useMatchStore'
import headGearImg from '../../assets/images/head-gear.png'
import bodyProtectorImg from '../../assets/images/body-protector.png'
import fistImg from '../../assets/images/fist.png'
import turnImg from '../../assets/images/turn.png'
import spinningImg from '../../assets/images/spinning.png'

function getActionInfo(action, points) {
  switch (action) {
    case 'head':
    case 'head-click':  return { label: 'Head Kick',          img: headGearImg }
    case 'head-swipe':  return { label: 'Spinning Head Kick', img: spinningImg }
    case 'body':
    case 'body-click':  return { label: 'Body Kick',          img: bodyProtectorImg }
    case 'body-swipe':  return { label: 'Turning Body Kick',  img: turnImg }
    case 'punch':
    case 'punch-click': return { label: 'Punch',              img: fistImg }
    case 'gamjeom':     return { label: 'Gam-Jeom Penalty',   img: null }
    default:
      if (points === 5) return { label: 'Spinning Head Kick', img: spinningImg }
      if (points === 4) return { label: 'Turning Body Kick',  img: turnImg }
      if (points === 3) return { label: 'Head Kick',          img: headGearImg }
      if (points === 2) return { label: 'Body Kick',          img: bodyProtectorImg }
      if (points === 1) return { label: 'Punch',              img: fistImg }
      return { label: 'Score', img: null }
  }
}

function EntryRow({ e }) {
  const isHong = e.player === 'red'
  const color = isHong ? '#ff4444' : '#4488ff'
  const { label, img } = getActionInfo(e.action, e.points)

  return (
    <div style={{
      display: 'flex', gap: 12, alignItems: 'center',
      marginBottom: 6, padding: '8px 12px',
      background: isHong ? 'rgba(255,68,68,0.1)' : 'rgba(68,136,255,0.1)',
      borderRadius: 7, borderLeft: `3px solid ${color}`
    }}>
      {img ? (
        <img src={img} alt={label} style={{
          width: 44, height: 44, objectFit: 'contain',
          background: 'rgba(255,255,255,0.1)', borderRadius: 7, padding: 5, flexShrink: 0
        }} />
      ) : (
        <div style={{ width: 44, height: 44, flexShrink: 0 }} />
      )}

      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 'bold', fontSize: 14, color }}>
          {isHong ? 'Hong' : 'Chong'} — {label}
        </div>
        {e.voters?.length > 0 && (
          <div style={{ fontSize: 11, color: '#bbb', marginTop: 2 }}>
            Referees: {e.voters.map(v => v.refereeName).join(' · ')}
          </div>
        )}
      </div>

      <div style={{
        background: color, color: '#fff', fontWeight: 'bold',
        fontSize: 16, borderRadius: 7, padding: '5px 10px',
        flexShrink: 0, minWidth: 40, textAlign: 'center'
      }}>
        +{e.points}
      </div>

      <div style={{ fontSize: 11, color: '#555', flexShrink: 0 }}>
        {new Date(e.timestamp).toLocaleTimeString()}
      </div>
    </div>
  )
}

export default function MatchHistoryModal() {
  const { matchLog, closeMatchHistory } = useMatchStore()

  const hongTotal  = matchLog.filter(e => e.player === 'red').reduce((s, e) => s + e.points, 0)
  const chongTotal = matchLog.filter(e => e.player === 'blue').reduce((s, e) => s + e.points, 0)

  // Group entries by round, preserving chronological order within each round
  const sorted = [...matchLog].sort((a, b) => a.timestamp - b.timestamp)
  const rounds = []
  sorted.forEach(e => {
    const r = e.round ?? 1
    let group = rounds.find(g => g.round === r)
    if (!group) { group = { round: r, entries: [] }; rounds.push(group) }
    group.entries.push(e)
  })

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3000
    }}>
      <div style={{
        background: '#1a1a2e', border: '2px solid #ffd700', borderRadius: 14,
        padding: '28px 32px', width: 760, maxWidth: '95vw', maxHeight: '85vh',
        color: '#fff', display: 'flex', flexDirection: 'column', gap: 14
      }}>

        {/* Title */}
        <h2 style={{ textAlign: 'center', color: '#ffd700', margin: 0, fontSize: 22, textTransform: 'uppercase', letterSpacing: 1 }}>
          Match History
        </h2>

        {/* Score summary */}
        <div style={{ display: 'flex', justifyContent: 'space-around', background: 'rgba(255,255,255,0.05)', borderRadius: 10, padding: '10px 0' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ color: '#ff4444', fontWeight: 'bold', fontSize: 16 }}>Hong</div>
            <div style={{ fontSize: 38, fontWeight: 'bold' }}>{hongTotal}</div>
          </div>
          <div style={{ alignSelf: 'center', color: '#ffd700', fontSize: 20, fontWeight: 'bold' }}>vs</div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ color: '#4488ff', fontWeight: 'bold', fontSize: 16 }}>Chong</div>
            <div style={{ fontSize: 38, fontWeight: 'bold' }}>{chongTotal}</div>
          </div>
        </div>

        {/* Rounds */}
        <div style={{ overflowY: 'auto', flex: 1, paddingRight: 4 }}>
          {sorted.length === 0 ? (
            <p style={{ color: '#888', textAlign: 'center', marginTop: 24 }}>No points scored yet</p>
          ) : (
            rounds.map(({ round, entries }) => {
              const roundHong  = entries.filter(e => e.player === 'red').reduce((s, e) => s + e.points, 0)
              const roundChong = entries.filter(e => e.player === 'blue').reduce((s, e) => s + e.points, 0)
              return (
                <div key={round} style={{ marginBottom: 20 }}>
                  {/* Round header */}
                  <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    background: 'rgba(255,215,0,0.12)', border: '1px solid rgba(255,215,0,0.3)',
                    borderRadius: 8, padding: '8px 14px', marginBottom: 10
                  }}>
                    <span style={{ color: '#ffd700', fontWeight: 'bold', fontSize: 15, textTransform: 'uppercase', letterSpacing: 1 }}>
                      Round {round}
                    </span>
                    <span style={{ fontSize: 13, color: '#ccc' }}>
                      <span style={{ color: '#ff4444', fontWeight: 'bold' }}>Hong {roundHong}</span>
                      {' — '}
                      <span style={{ color: '#4488ff', fontWeight: 'bold' }}>Chong {roundChong}</span>
                    </span>
                  </div>

                  {/* Entries for this round */}
                  {entries.map((e, i) => <EntryRow key={i} e={e} />)}
                </div>
              )
            })
          )}
        </div>

        <button
          onClick={closeMatchHistory}
          style={{
            background: '#dc3545', color: 'white', border: 'none',
            padding: '12px 32px', borderRadius: 8, fontSize: 16,
            cursor: 'pointer', alignSelf: 'center'
          }}
        >
          Close
        </button>
      </div>
    </div>
  )
}
