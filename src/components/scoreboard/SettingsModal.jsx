import { useState } from 'react'
import { useMatchStore } from '../../store/useMatchStore'

export default function SettingsModal() {
  const { defaultSettings, closeSettings, saveSettings } = useMatchStore()

  const [roundMinutes, setRoundMinutes] = useState(defaultSettings.roundMinutes)
  const [roundSeconds, setRoundSeconds] = useState(defaultSettings.roundSeconds)
  const [breakSeconds, setBreakSeconds] = useState(defaultSettings.breakSeconds)
  const [medicalTimeout, setMedicalTimeout] = useState(defaultSettings.medicalTimeout)
  const [courtNumber, setCourtNumber] = useState(defaultSettings.courtNumber)

  const clamp = (v, min, max) => Math.min(max, Math.max(min, parseInt(v) || 0))

  const handleSave = () => {
    saveSettings({
      roundMinutes: clamp(roundMinutes, 0, 59),
      roundSeconds: clamp(roundSeconds, 0, 59),
      breakSeconds: clamp(breakSeconds, 0, 300),
      medicalTimeout: clamp(medicalTimeout, 0, 300),
      courtNumber,
    })
  }

  return (
    <div className="settings-modal">
      <h2>Edit Scoreboard Settings</h2>
      <div className="edit-scoreboard-inputs">
        <label>Default Round Time:</label>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <input
            type="number" min="0" max="59" value={roundMinutes}
            onChange={e => setRoundMinutes(e.target.value)}
            style={{ flex: 1 }}
          />
          <span>min</span>
          <input
            type="number" min="0" max="59" value={roundSeconds}
            onChange={e => setRoundSeconds(e.target.value)}
            style={{ flex: 1 }}
          />
          <span>sec</span>
        </div>

        <label>Default Break Time (seconds):</label>
        <input
          type="number" min="0" max="300" value={breakSeconds}
          onChange={e => setBreakSeconds(e.target.value)}
        />

        <label>Default Medical Timeout (seconds):</label>
        <input
          type="number" min="0" max="300" value={medicalTimeout}
          onChange={e => setMedicalTimeout(e.target.value)}
        />

        <label>Court Number:</label>
        <select value={courtNumber} onChange={e => setCourtNumber(e.target.value)}>
          <option value="none">None</option>
          <option value="1">Court No 1</option>
          <option value="2">Court No 2</option>
          <option value="3">Court No 3</option>
          <option value="4">Court No 4</option>
          <option value="5">Court No 5</option>
        </select>
      </div>

      <button className="save-btn" onClick={handleSave}>Save</button>
      <button className="close-slide" onClick={closeSettings}>Cancel</button>
    </div>
  )
}
