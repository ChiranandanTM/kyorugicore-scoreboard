import { useMatchStore } from '../../store/useMatchStore'

const TECHNIQUE_ROWS = [
  { pts: 5, label: 'Spinning Head Kick' },
  { pts: 4, label: 'Turning Body Kick'  },
  { pts: 3, label: 'Head Kick'          },
  { pts: 2, label: 'Body Kick'          },
  { pts: 1, label: 'Punch'              },
]

export default function SuperiorityModal() {
  const store = useMatchStore()
  const { roundStats, hongGamJeom, chongGamJeom } = store

  const hongBy  = roundStats?.hong?.byPoints  || {}
  const chongBy = roundStats?.chong?.byPoints || {}

  const hongTotal  = TECHNIQUE_ROWS.reduce((s, r) => s + (hongBy[r.pts]  || 0), 0)
  const chongTotal = TECHNIQUE_ROWS.reduce((s, r) => s + (chongBy[r.pts] || 0), 0)

  function winner(h, c) {
    if (h > c) return 'hong'
    if (c > h) return 'chong'
    return null
  }

  function Cell({ h, c }) {
    const w = winner(h, c)
    return (
      <>
        <td className={w === 'hong' ? 'sup-winner' : w === 'chong' ? 'sup-loser' : ''}>{h}</td>
        <td className={w === 'chong' ? 'sup-winner' : w === 'hong' ? 'sup-loser' : ''}>{c}</td>
      </>
    )
  }

  return (
    <div className="sup-overlay">
      <div className="sup-modal">
        <h2 className="sup-title">Tie Round — Superiority Decision</h2>
        <p className="sup-subtitle">
          Scores are equal. The table below shows each technique type from highest to lowest value.
          The first row where counts differ determines the winner automatically.
        </p>

        <table className="sup-table">
          <thead>
            <tr>
              <th>Technique</th>
              <th>Pts</th>
              <th style={{ color: '#ff4444' }}>Hong</th>
              <th style={{ color: '#4488ff' }}>Chong</th>
            </tr>
          </thead>
          <tbody>
            {TECHNIQUE_ROWS.map(({ pts, label }) => (
              <tr key={pts}>
                <td style={{ textAlign: 'left' }}>{label}</td>
                <td>{pts}</td>
                <Cell h={hongBy[pts] || 0} c={chongBy[pts] || 0} />
              </tr>
            ))}
            <tr className="sup-total-row">
              <td style={{ textAlign: 'left' }}>Total techniques</td>
              <td>—</td>
              <Cell h={hongTotal} c={chongTotal} />
            </tr>
            <tr>
              <td style={{ textAlign: 'left' }}>Gam-Jeom (fewer = better)</td>
              <td>—</td>
              <Cell h={chongGamJeom} c={hongGamJeom} />
            </tr>
          </tbody>
        </table>

        <p className="sup-prompt">
          ③ Technical dominance · ④ Aggressiveness · ⑥ Referee judgment:
        </p>

        <div className="sup-buttons">
          <button
            className="sup-btn sup-hong"
            onClick={() => store.declareSuperiorityWinner('hong')}
          >
            Hong Wins
          </button>
          <button
            className="sup-btn sup-chong"
            onClick={() => store.declareSuperiorityWinner('chong')}
          >
            Chong Wins
          </button>
        </div>
      </div>
    </div>
  )
}
