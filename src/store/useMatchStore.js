import { create } from 'zustand'
import {
  ref, set as dbSet, update as dbUpdate,
  onValue, off, get as dbGet, remove, push, runTransaction
} from 'firebase/database'
import { db } from '../firebase'

const DEFAULT_SETTINGS = {
  roundMinutes: 1,
  roundSeconds: 30,
  breakSeconds: 30,
  medicalTimeout: 60,
  courtNumber: 'none',
  pointGap: 12,
}

// Module-level interval refs (not in Zustand to avoid spurious re-renders)
let timerInterval = null
let breakInterval = null
let currentlyPlaying = null
let isValidating = false

function getActionImageUrl(action, points) {
  switch (action) {
    case 'head':        case 'head-click':  return '/assets/images/head-gear.png'
    case 'head-swipe':                      return '/assets/images/spinning.png'
    case 'body':        case 'body-click':  return '/assets/images/body-protector.png'
    case 'body-swipe':                      return '/assets/images/turn.png'
    case 'punch':       case 'punch-click': return '/assets/images/fist.png'
    default:
      if (points === 5) return '/assets/images/spinning.png'
      if (points === 4) return '/assets/images/turn.png'
      if (points === 3) return '/assets/images/head-gear.png'
      if (points === 2) return '/assets/images/body-protector.png'
      if (points === 1) return '/assets/images/fist.png'
      return ''
  }
}

export function playSound(soundId) {
  if (currentlyPlaying) {
    const old = document.getElementById(currentlyPlaying)
    if (old) { old.pause(); old.currentTime = 0 }
  }
  const sound = document.getElementById(soundId)
  if (!sound) return
  sound.currentTime = 0
  const p = sound.play()
  if (p) p.then(() => { currentlyPlaying = soundId }).catch(() => {})
}

export const useMatchStore = create((set, get) => ({
  // ── Match state ────────────────────────────────────────────────
  hongScore: 0,
  chongScore: 0,
  hongGamJeom: 0,
  chongGamJeom: 0,
  currentRound: 1,
  totalRounds: 3,
  hongRoundsWon: 0,
  chongRoundsWon: 0,
  timerTime: DEFAULT_SETTINGS.roundMinutes * 60 + DEFAULT_SETTINGS.roundSeconds,
  timerSetTime: DEFAULT_SETTINGS.roundMinutes * 60 + DEFAULT_SETTINGS.roundSeconds,
  isTimerRunning: false,
  matchWinnerDeclared: false,
  roundDeclared: false,
  isMedicalTimeout: false,
  redBlinkClass: '',
  blueBlinkClass: '',
  currentRoomId: null,
  defaultSettings: { ...DEFAULT_SETTINGS },
  referees: {},

  // UI state
  pointSlideOpen: false,
  pointAction: '',
  pointTeam: '',
  settingsOpen: false,
  refereeLoginOpen: false,

  // Last action display
  hongLastAction: null,
  chongLastAction: null,

  // Last pressed action (immediate, before consensus)
  hongLastPressedAction: null,
  chongLastPressedAction: null,

  // Round technique stats for superiority tie-break (counts per point value)
  roundStats: { hong: { byPoints: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } }, chong: { byPoints: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } } },
  superiorityModalOpen: false,

  // Break timer display
  breakTimeRemaining: 0,
  isBreakRunning: false,
  overtimeSeconds: 0,
  isOvertime: false,

  // Match history log (persists until New Match)
  matchLog: [],
  matchHistoryOpen: false,

  // ── Room ────────────────────────────────────────────────────────
  createRoom: () => {
    const roomId = Math.random().toString(36).substr(2, 6).toUpperCase()
    const { defaultSettings } = get()

    const initialData = {
      teamA: { score: 0, gamJeoms: 0 },
      teamB: { score: 0, gamJeoms: 0 },
      timer: { minutes: defaultSettings.roundMinutes, seconds: defaultSettings.roundSeconds, running: false },
      round: 1,
      hongRoundsWon: 0,
      chongRoundsWon: 0,
      medicalTimeout: { active: false, team: '' },
      redBlinkClass: '',
      blueBlinkClass: '',
      settings: defaultSettings,
      submissions: {},
      referees: {},
      lastAction: {
        hong: { image: '', refereeName: '' },
        chong: { image: '', refereeName: '' }
      },
      lastPressedAction: {
        hong: null,
        chong: null,
      },
      roundStats: {
        hong: { byPoints: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } },
        chong: { byPoints: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } },
      }
    }

    set({ currentRoomId: roomId })

    off(ref(db, `rooms/${roomId}`))
    dbSet(ref(db, `rooms/${roomId}`), initialData)
      .catch(err => console.error('Failed to create room:', err))

    return roomId
  },

  // ── Firebase sync ────────────────────────────────────────────────
  syncFromFirebase: (data) => {
    if (!data) return
    const state = get()

    const newHong = data.teamA?.score ?? state.hongScore
    const newChong = data.teamB?.score ?? state.chongScore
    const newHongGj = data.teamA?.gamJeoms ?? state.hongGamJeom
    const newChongGj = data.teamB?.gamJeoms ?? state.chongGamJeom
    const newRound = data.round ?? state.currentRound
    const newHongWon = data.hongRoundsWon ?? state.hongRoundsWon
    const newChongWon = data.chongRoundsWon ?? state.chongRoundsWon
    const newRedBlink = data.redBlinkClass ?? state.redBlinkClass
    const newBlueBlink = data.blueBlinkClass ?? state.blueBlinkClass
    const newSettings = data.settings ?? state.defaultSettings
    const fbRunning = !!(data.timer?.running)
    const newMedical = data.medicalTimeout?.active ?? state.isMedicalTimeout

    let newTimerTime = state.timerTime
    if (!state.isTimerRunning && !fbRunning) {
      newTimerTime = (data.timer?.minutes || 0) * 60 + (data.timer?.seconds || 0)
    }

    const newHongPressed = data.lastPressedAction?.hong ?? state.hongLastPressedAction
    const newChongPressed = data.lastPressedAction?.chong ?? state.chongLastPressedAction
    const newRoundStats = data.roundStats ?? state.roundStats
    const newMatchLog = data.currentMatchLog
      ? Object.values(data.currentMatchLog).sort((a, b) => a.timestamp - b.timestamp)
      : state.matchLog

    const newReferees = data.referees != null ? data.referees : state.referees

    set({
      hongScore: newHong,
      chongScore: newChong,
      hongGamJeom: newHongGj,
      chongGamJeom: newChongGj,
      currentRound: newRound,
      hongRoundsWon: newHongWon,
      chongRoundsWon: newChongWon,
      redBlinkClass: newRedBlink,
      blueBlinkClass: newBlueBlink,
      defaultSettings: newSettings,
      timerTime: newTimerTime,
      isMedicalTimeout: newMedical,
      hongLastPressedAction: newHongPressed,
      chongLastPressedAction: newChongPressed,
      roundStats: newRoundStats,
      matchLog: newMatchLog,
      referees: newReferees,
    })

    // Sync timer running state across clients
    const { matchWinnerDeclared, roundDeclared } = get()
    const shouldRun = fbRunning && !matchWinnerDeclared && !roundDeclared
    if (shouldRun && !timerInterval) {
      get()._startTimerTick()
    } else if (!shouldRun && timerInterval && !state.isTimerRunning) {
      get()._stopTimerInternal()
    }

    // Medical timeout state
    if (newMedical && data.medicalTimeout?.team) {
      const teamEl = data.medicalTimeout.team === 'hong' ? 'redTimeout' : 'blueTimeout'
      const el = document.getElementById(teamEl)
      if (el) el.textContent = `${data.medicalTimeout.team.toUpperCase()} Medical Timeout`
    } else if (!newMedical) {
      const r = document.getElementById('redTimeout')
      const b = document.getElementById('blueTimeout')
      if (r) r.textContent = ''
      if (b) b.textContent = ''
    }
  },

  syncReferees: (data) => {
    set({ referees: data || {} })
  },

  // ── Submissions validation ────────────────────────────────────────
  validateSubmissions: async (roomId) => {
    if (isValidating) return
    isValidating = true
    try {
      const snap = await dbGet(ref(db, `rooms/${roomId}`))
      const data = snap.val()
      if (!data) return

      const refCount = Object.keys(data.referees || {}).length
      const now = Date.now()
      const SYNC_WINDOW = 5000
      const timerRunning = !!(data.timer?.running)

      const subSnap = await dbGet(ref(db, `rooms/${roomId}/submissions`))
      const subsRaw = subSnap.val() || {}
      const subs = Object.entries(subsRaw).map(([key, v]) => ({ key, ...v }))
      if (!subs.length) return

      const groups = {}
      subs.forEach(s => {
        if (!s.player || !s.action || typeof s.points === 'undefined' || !s.refereeId) return
        const gKey = `${s.player}__${s.points}__${s.action}`
        groups[gKey] = groups[gKey] || []
        groups[gKey].push(s)
      })

      const toAward = []
      const staleKeys = []

      Object.entries(groups).forEach(([, groupSubs]) => {
        groupSubs.sort((a, b) => a.timestamp - b.timestamp)
        const earliest = groupSubs[0]

        const sampleRefName = data.referees?.[earliest.refereeId]?.name || earliest.refereeId || ''

        const actionTeam = earliest.player === 'red' ? 'hong' : 'chong'
        dbUpdate(ref(db, `rooms/${roomId}/lastAction/${actionTeam}`), {
          image: getActionImageUrl(earliest.action, earliest.points),
          refereeName: sampleRefName, timestamp: Date.now(), sourceTeam: earliest.player
        }).catch(console.error)

        groupSubs.forEach(s => { if (now - s.timestamp > SYNC_WINDOW * 2) staleKeys.push(s.key) })

        if (!timerRunning) return

        const uniq = [...new Set(groupSubs.map(s => s.refereeId))]
        const spread = groupSubs[groupSubs.length - 1].timestamp - groupSubs[0].timestamp
        let shouldAward = false
        if (refCount <= 1) shouldAward = uniq.length >= 1
        else if (refCount === 2) shouldAward = uniq.length === 2 && spread <= SYNC_WINDOW
        else shouldAward = uniq.length >= 2 && spread <= SYNC_WINDOW

        if (shouldAward) {
          const voters = [...new Set(groupSubs.map(s => s.refereeId))].map(id => ({
            refereeId: id,
            refereeName: data.referees?.[id]?.name || groupSubs.find(s => s.refereeId === id)?.refereeName || id,
          }))
          toAward.push({
            player: earliest.player,
            points: earliest.points,
            action: earliest.action,
            voters,
            allKeys: groupSubs.map(s => s.key),
            sentinelKey: earliest.key,
          })
        }
      })

      // Use a Firebase transaction to atomically claim each group's submissions.
      // If two clients (scoreboard + referee lead device) both try to award the same
      // group, only the one that wins the transaction proceeds — the other sees the
      // submissions already deleted and aborts without awarding.
      for (const award of toAward) {
        try {
          const result = await runTransaction(ref(db, `rooms/${roomId}/submissions`), (currentSubs) => {
            if (!currentSubs) return currentSubs
            // If sentinel key is gone, another client already claimed this group — abort
            if (currentSubs[award.sentinelKey] === undefined) return undefined
            // Atomically delete ALL submissions for this group (including extra refs)
            award.allKeys.forEach(k => { delete currentSubs[k] })
            return currentSubs
          })
          if (result.committed) {
            get().awardPoints(award.player, award.points, award.action, award.voters)
          }
        } catch (err) {
          console.error('Submission claim transaction error:', err)
        }
      }

      // Clean up stale submissions
      await Promise.all(
        staleKeys.map(k => remove(ref(db, `rooms/${roomId}/submissions/${k}`)).catch(console.error))
      )
    } catch (err) {
      console.error('validateSubmissions error:', err)
    } finally {
      isValidating = false
    }
  },

  awardPoints: (player, points, action = 'score', voters = []) => {
    const { hongScore, chongScore, hongGamJeom, chongGamJeom, currentRoomId, roundStats, currentRound, matchLog } = get()
    const newHong = player === 'red' ? hongScore + points : hongScore
    const newChong = player === 'blue' ? chongScore + points : chongScore

    const teamKey = player === 'red' ? 'hong' : 'chong'
    const newStats = {
      hong: { byPoints: { ...(roundStats?.hong?.byPoints || {}) } },
      chong: { byPoints: { ...(roundStats?.chong?.byPoints || {}) } },
    }
    newStats[teamKey].byPoints[points] = (newStats[teamKey].byPoints[points] || 0) + 1

    const logEntry = { timestamp: Date.now(), player, points, action, voters, round: currentRound }
    const newMatchLog = [...matchLog, logEntry]

    set({ hongScore: newHong, chongScore: newChong, roundStats: newStats, matchLog: newMatchLog })
    if (currentRoomId) {
      dbUpdate(ref(db, `rooms/${currentRoomId}`), {
        teamA: { score: newHong, gamJeoms: hongGamJeom },
        teamB: { score: newChong, gamJeoms: chongGamJeom },
        roundStats: newStats,
      }).catch(console.error)
      push(ref(db, `rooms/${currentRoomId}/currentMatchLog`), logEntry).catch(console.error)
    }
    get().checkPointGap()
    get().checkGamJeomLimit()
  },

  // ── Tie-break Superiority ────────────────────────────────────────
  checkTieBreaker: () => {
    const { roundStats } = get()
    const hong  = roundStats?.hong?.byPoints  || {}
    const chong = roundStats?.chong?.byPoints || {}

    // Compare technique counts from highest to lowest point value
    // 5pt (spinning head kick) → 4pt (turning body kick) → 3pt (head kick)
    // → 2pt (body kick) → 1pt (punch)
    for (const pts of [5, 4, 3, 2, 1]) {
      const h = hong[pts]  || 0
      const c = chong[pts] || 0
      if (h !== c) {
        get().declareRoundWinner(h > c ? 'hong' : 'chong')
        return
      }
    }

    // All technique counts tied at every point value — operator judgment required
    set({ superiorityModalOpen: true })
  },

  declareSuperiorityWinner: (team) => {
    set({ superiorityModalOpen: false })
    get().declareRoundWinner(team)
  },

  closeSuperiorityModal: () => set({ superiorityModalOpen: false }),

  // ── Referee management ───────────────────────────────────────────
  renameDevice: (refereeId, name) => {
    const { currentRoomId } = get()
    if (!currentRoomId) return
    dbUpdate(ref(db, `rooms/${currentRoomId}/referees/${refereeId}`), { name }).catch(console.error)
  },

  deleteReferee: (refereeId) => {
    const { currentRoomId } = get()
    if (!currentRoomId) return
    remove(ref(db, `rooms/${currentRoomId}/referees/${refereeId}`)).catch(console.error)
  },

  // ── Settings ────────────────────────────────────────────────────
  openSettings: () => set({ settingsOpen: true }),
  closeSettings: () => set({ settingsOpen: false }),

  saveSettings: (newSettings) => {
    const { currentRoomId, isMedicalTimeout, matchWinnerDeclared, roundDeclared, isTimerRunning } = get()
    set({ defaultSettings: newSettings, settingsOpen: false })
    if (!isMedicalTimeout && !matchWinnerDeclared && !roundDeclared) {
      const t = newSettings.roundMinutes * 60 + newSettings.roundSeconds
      set({ timerTime: t, timerSetTime: t })
    }
    if (currentRoomId) {
      dbUpdate(ref(db, `rooms/${currentRoomId}/settings`), newSettings).catch(console.error)
      if (!matchWinnerDeclared && !roundDeclared && !isMedicalTimeout && !isTimerRunning) {
        dbUpdate(ref(db, `rooms/${currentRoomId}/timer`), {
          minutes: newSettings.roundMinutes,
          seconds: newSettings.roundSeconds,
          running: false
        }).catch(console.error)
      }
    }
  },

  // ── Point slide ─────────────────────────────────────────────────
  openPointSlide: (action, teamColor) => {
    const { matchWinnerDeclared, isMedicalTimeout, roundDeclared } = get()
    if (matchWinnerDeclared || isMedicalTimeout || roundDeclared) return
    set({ pointSlideOpen: true, pointAction: action, pointTeam: teamColor })
  },

  closePointSlide: () => set({ pointSlideOpen: false, pointAction: '', pointTeam: '' }),

  adjustPoints: (points) => {
    const { matchWinnerDeclared, isMedicalTimeout, roundDeclared, pointAction, pointTeam,
            hongScore, chongScore, hongGamJeom, chongGamJeom, currentRoomId } = get()
    if (matchWinnerDeclared || isMedicalTimeout || roundDeclared) return

    let newHong = hongScore
    let newChong = chongScore

    if (pointAction === 'add') {
      if (pointTeam === 'red') newHong += points
      else newChong += points
    } else {
      if (pointTeam === 'red') newHong = Math.max(0, newHong - points)
      else newChong = Math.max(0, newChong - points)
    }

    set({ hongScore: newHong, chongScore: newChong })
    get().closePointSlide()
    get().checkPointGap()
    get().checkGamJeomLimit()

    if (currentRoomId) {
      dbUpdate(ref(db, `rooms/${currentRoomId}`), {
        teamA: { score: newHong, gamJeoms: hongGamJeom },
        teamB: { score: newChong, gamJeoms: chongGamJeom }
      }).catch(console.error)
    }
  },

  // ── Gam-Jeom ────────────────────────────────────────────────────
  addGamJeom: (team) => {
    const { matchWinnerDeclared, isMedicalTimeout, roundDeclared,
            hongGamJeom, chongGamJeom, hongScore, chongScore, currentRoomId } = get()
    if (matchWinnerDeclared || isMedicalTimeout || roundDeclared) return

    let newHongGj = hongGamJeom, newChongGj = chongGamJeom
    let newHong = hongScore, newChong = chongScore

    if (team === 'hong') { newHongGj++; newChong++ }
    else { newChongGj++; newHong++ }

    set({ hongGamJeom: newHongGj, chongGamJeom: newChongGj, hongScore: newHong, chongScore: newChong })

    if (currentRoomId) {
      dbUpdate(ref(db, `rooms/${currentRoomId}`), {
        teamA: { score: newHong, gamJeoms: newHongGj },
        teamB: { score: newChong, gamJeoms: newChongGj }
      }).catch(console.error)
    }
    get().checkGamJeomLimit()
    get().checkPointGap()
  },

  subtractGamJeom: (team) => {
    const { matchWinnerDeclared, isMedicalTimeout, roundDeclared,
            hongGamJeom, chongGamJeom, hongScore, chongScore, currentRoomId } = get()
    if (matchWinnerDeclared || isMedicalTimeout || roundDeclared) return

    let newHongGj = hongGamJeom, newChongGj = chongGamJeom
    let newHong = hongScore, newChong = chongScore

    if (team === 'hong' && newHongGj > 0) { newHongGj--; if (newChong > 0) newChong-- }
    else if (team === 'chong' && newChongGj > 0) { newChongGj--; if (newHong > 0) newHong-- }

    set({ hongGamJeom: newHongGj, chongGamJeom: newChongGj, hongScore: newHong, chongScore: newChong })
    get().checkPointGap()
    get().checkGamJeomLimit()

    if (currentRoomId) {
      dbUpdate(ref(db, `rooms/${currentRoomId}`), {
        teamA: { score: newHong, gamJeoms: newHongGj },
        teamB: { score: newChong, gamJeoms: newChongGj }
      }).catch(console.error)
    }
  },

  checkGamJeomLimit: () => {
    const { hongGamJeom, chongGamJeom, hongRoundsWon, chongRoundsWon, matchWinnerDeclared, roundDeclared } = get()
    if (matchWinnerDeclared || roundDeclared) return
    if (hongGamJeom >= 5 && hongRoundsWon < 2 && chongRoundsWon < 2) get().declareRoundWinner('chong')
    else if (chongGamJeom >= 5 && hongRoundsWon < 2 && chongRoundsWon < 2) get().declareRoundWinner('hong')
  },

  checkPointGap: () => {
    const { hongScore, chongScore, hongRoundsWon, chongRoundsWon, matchWinnerDeclared, roundDeclared, defaultSettings } = get()
    if (matchWinnerDeclared || roundDeclared) return
    const gap = defaultSettings.pointGap ?? 12
    if (hongScore - chongScore >= gap && hongRoundsWon < 2 && chongRoundsWon < 2) {
      get().stopTimer(); get().declareRoundWinner('hong')
    } else if (chongScore - hongScore >= gap && hongRoundsWon < 2 && chongRoundsWon < 2) {
      get().stopTimer(); get().declareRoundWinner('chong')
    }
  },

  // ── Winner ───────────────────────────────────────────────────────
  declareRoundWinner: (winner) => {
    const { matchWinnerDeclared, isMedicalTimeout, roundDeclared,
            hongRoundsWon, chongRoundsWon, currentRound,
            hongScore, chongScore, hongGamJeom, chongGamJeom, currentRoomId } = get()
    if (matchWinnerDeclared || isMedicalTimeout || roundDeclared) return

    const newHongWon = hongRoundsWon + (winner === 'hong' ? 1 : 0)
    const newChongWon = chongRoundsWon + (winner === 'chong' ? 1 : 0)
    const redBlink = winner === 'hong' ? 'blink-white' : ''
    const blueBlink = winner === 'chong' ? 'blink-white' : ''

    set({ roundDeclared: true, hongRoundsWon: newHongWon, chongRoundsWon: newChongWon, redBlinkClass: redBlink, blueBlinkClass: blueBlink })
    get().stopTimer()

    if (newHongWon >= 2 || newChongWon >= 2) {
      get().declareMatchWinner(winner)
      return
    }

    if (currentRoomId) {
      dbUpdate(ref(db, `rooms/${currentRoomId}`), {
        round: currentRound, hongRoundsWon: newHongWon, chongRoundsWon: newChongWon,
        redBlinkClass: redBlink, blueBlinkClass: blueBlink,
        matchWinnerDeclared: false, roundDeclared: true,
        teamA: { score: hongScore, gamJeoms: hongGamJeom },
        teamB: { score: chongScore, gamJeoms: chongGamJeom }
      }).catch(console.error)
    }
  },

  declareMatchWinner: (winner) => {
    const { matchWinnerDeclared, currentRoomId } = get()
    if (matchWinnerDeclared) return
    const redBlink = winner === 'hong' ? 'blink-yellow' : ''
    const blueBlink = winner === 'chong' ? 'blink-yellow' : ''
    set({ matchWinnerDeclared: true, redBlinkClass: redBlink, blueBlinkClass: blueBlink })
    get().stopTimer()
    if (currentRoomId) {
      dbUpdate(ref(db, `rooms/${currentRoomId}`), { redBlinkClass: redBlink, blueBlinkClass: blueBlink }).catch(console.error)
    }
  },

  // ── Medical Timeout ──────────────────────────────────────────────
  medicalTimeout: (team) => {
    const { matchWinnerDeclared, isMedicalTimeout, defaultSettings, currentRoomId, roundDeclared } = get()
    if (matchWinnerDeclared || isMedicalTimeout) return

    if (roundDeclared) {
      if (breakInterval) { clearInterval(breakInterval); breakInterval = null }
      set({ roundDeclared: false, isBreakRunning: false, isOvertime: false, overtimeSeconds: 0, breakTimeRemaining: 0 })
    }

    get().stopTimer()
    const medSecs = defaultSettings.medicalTimeout
    set({ isMedicalTimeout: true, timerTime: medSecs })

    if (timerInterval) { clearInterval(timerInterval); timerInterval = null }
    timerInterval = setInterval(() => {
      const { timerTime: t } = get()
      if (t > 0 && get().isMedicalTimeout) {
        set({ timerTime: t - 1 })
      } else if (t <= 0) {
        clearInterval(timerInterval); timerInterval = null
        get().stopMedicalTimeout()
      }
    }, 1000)

    if (currentRoomId) {
      dbUpdate(ref(db, `rooms/${currentRoomId}`), {
        medicalTimeout: { active: true, team: team === 'red' ? 'hong' : 'chong' },
        timer: { minutes: Math.floor(medSecs / 60), seconds: medSecs % 60, running: false }
      }).catch(console.error)
    }
  },

  stopMedicalTimeout: () => {
    const { isMedicalTimeout, timerSetTime, currentRoomId } = get()
    if (!isMedicalTimeout) return
    if (timerInterval) { clearInterval(timerInterval); timerInterval = null }
    set({ isMedicalTimeout: false, timerTime: timerSetTime })
    if (currentRoomId) {
      dbUpdate(ref(db, `rooms/${currentRoomId}`), {
        medicalTimeout: { active: false, team: '' },
        timer: { minutes: Math.floor(timerSetTime / 60), seconds: timerSetTime % 60, running: false }
      }).catch(console.error)
    }
  },

  // ── Timer ────────────────────────────────────────────────────────
  _startTimerTick: () => {
    if (timerInterval) return
    set({ isTimerRunning: true })
    timerInterval = setInterval(() => {
      const { timerTime, matchWinnerDeclared, isMedicalTimeout, roundDeclared, hongScore, chongScore } = get()
      if (timerTime > 0 && !matchWinnerDeclared && !isMedicalTimeout && !roundDeclared) {
        set({ timerTime: timerTime - 1 })
        if (Math.abs(hongScore - chongScore) >= (get().defaultSettings.pointGap ?? 12)) {
          get().stopTimer()
          get().declareRoundWinner(hongScore > chongScore ? 'hong' : 'chong')
        }
      } else {
        clearInterval(timerInterval); timerInterval = null
        set({ isTimerRunning: false })
        const s = get()
        if (s.timerTime <= 0 && !s.matchWinnerDeclared && !s.roundDeclared) {
          if (s.hongScore > s.chongScore) s.declareRoundWinner('hong')
          else if (s.chongScore > s.hongScore) s.declareRoundWinner('chong')
          else s.checkTieBreaker()
        }
      }
    }, 1000)
  },

  _stopTimerInternal: () => {
    if (timerInterval) { clearInterval(timerInterval); timerInterval = null }
    set({ isTimerRunning: false })
  },

  toggleTimer: () => {
    const { isMedicalTimeout, matchWinnerDeclared, roundDeclared, isTimerRunning,
            timerTime, defaultSettings, currentRoomId } = get()
    if (isMedicalTimeout || matchWinnerDeclared) return

    if (roundDeclared) {
      if (breakInterval) { clearInterval(breakInterval); breakInterval = null }
      const newTime = defaultSettings.roundMinutes * 60 + defaultSettings.roundSeconds
      set({ timerTime: newTime, timerSetTime: newTime, roundDeclared: false, isBreakRunning: false, isOvertime: false, overtimeSeconds: 0, breakTimeRemaining: 0 })
      playSound('startSound')
      get()._startTimerTick()
      if (currentRoomId) {
        remove(ref(db, `rooms/${currentRoomId}/submissions`)).catch(console.error)
        dbUpdate(ref(db, `rooms/${currentRoomId}`), {
          roundDeclared: false,
          timer: { minutes: Math.floor(newTime / 60), seconds: newTime % 60, running: true }
        }).catch(console.error)
      }
      return
    }

    if (isTimerRunning) {
      if (timerInterval) { clearInterval(timerInterval); timerInterval = null }
      set({ isTimerRunning: false })
      playSound('stopSound')
      if (currentRoomId) {
        dbUpdate(ref(db, `rooms/${currentRoomId}/timer`), {
          running: false, minutes: Math.floor(timerTime / 60), seconds: timerTime % 60
        }).catch(console.error)
      }
    } else {
      playSound('startSound')
      get()._startTimerTick()
      const t = get().timerTime
      if (currentRoomId) {
        remove(ref(db, `rooms/${currentRoomId}/submissions`)).catch(console.error)
        dbUpdate(ref(db, `rooms/${currentRoomId}/timer`), {
          running: true, minutes: Math.floor(t / 60), seconds: t % 60
        }).catch(console.error)
      }
    }
  },

  stopTimer: () => {
    if (timerInterval) {
      clearInterval(timerInterval); timerInterval = null
      const { currentRoomId, timerTime } = get()
      set({ isTimerRunning: false })
      playSound('stopSound')
      if (currentRoomId) {
        dbUpdate(ref(db, `rooms/${currentRoomId}/timer`), {
          running: false,
          minutes: Math.floor(timerTime / 60),
          seconds: timerTime % 60,
        }).catch(console.error)
      }
    }
  },

  resetTimer: () => {
    const { isMedicalTimeout, matchWinnerDeclared, roundDeclared, currentRound, totalRounds, defaultSettings, currentRoomId } = get()
    if (isMedicalTimeout || matchWinnerDeclared) return
    get()._stopTimerInternal()

    let newTime
    if (roundDeclared && currentRound < totalRounds) {
      newTime = defaultSettings.breakSeconds
    } else {
      newTime = defaultSettings.roundMinutes * 60 + defaultSettings.roundSeconds
    }
    set({ timerTime: newTime, timerSetTime: newTime })
    if (currentRoomId) {
      dbUpdate(ref(db, `rooms/${currentRoomId}/timer`), {
        minutes: Math.floor(newTime / 60), seconds: newTime % 60, running: false
      }).catch(console.error)
    }
  },

  // ── Break timer ──────────────────────────────────────────────────
  startBreakTime: () => {
    const { currentRound, totalRounds, defaultSettings, currentRoomId } = get()
    if (currentRound < 2 || currentRound > totalRounds) return
    const breakSecs = defaultSettings.breakSeconds
    if (breakSecs <= 0) return

    if (timerInterval) { clearInterval(timerInterval); timerInterval = null }
    if (breakInterval) { clearInterval(breakInterval); breakInterval = null }

    set({ roundDeclared: true, breakTimeRemaining: breakSecs, isBreakRunning: true, isOvertime: false, overtimeSeconds: 0 })

    let remaining = breakSecs
    breakInterval = setInterval(() => {
      remaining--
      if (remaining > 0) {
        set({ breakTimeRemaining: remaining })
      } else {
        clearInterval(breakInterval); breakInterval = null
        set({ breakTimeRemaining: 0, isBreakRunning: false, isOvertime: true, overtimeSeconds: 0 })
        playSound('stopSound')
        let overtime = 0
        breakInterval = setInterval(() => {
          overtime++
          set({ overtimeSeconds: overtime })
        }, 1000)
      }
    }, 1000)

    if (currentRoomId) {
      dbUpdate(ref(db, `rooms/${currentRoomId}`), { roundDeclared: true, 'timer/running': false }).catch(console.error)
    }
  },

  // ── Reset & New Match ────────────────────────────────────────────
  resetScores: () => {
    const { isMedicalTimeout, matchWinnerDeclared, currentRound, totalRounds, defaultSettings, currentRoomId } = get()
    if (isMedicalTimeout) return

    const emptyStats = { hong: { byPoints: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } }, chong: { byPoints: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } } }
    set({ hongScore: 0, chongScore: 0, hongGamJeom: 0, chongGamJeom: 0, redBlinkClass: '', blueBlinkClass: '', roundDeclared: false, roundStats: emptyStats })

    let newRound = currentRound
    let newTime = defaultSettings.roundMinutes * 60 + defaultSettings.roundSeconds

    if (!matchWinnerDeclared && currentRound < totalRounds) {
      newRound = currentRound + 1
      set({ currentRound: newRound })
      get().startBreakTime()
    } else {
      set({ timerTime: newTime, timerSetTime: newTime, isBreakRunning: false, isOvertime: false, overtimeSeconds: 0, breakTimeRemaining: 0 })
    }

    get()._stopTimerInternal()

    if (currentRoomId) {
      dbUpdate(ref(db, `rooms/${currentRoomId}`), {
        teamA: { score: 0, gamJeoms: 0 }, teamB: { score: 0, gamJeoms: 0 },
        round: newRound, redBlinkClass: '', blueBlinkClass: '',
        timer: { minutes: Math.floor(newTime / 60), seconds: newTime % 60, running: false },
        roundStats: { hong: { byPoints: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } }, chong: { byPoints: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } } },
      }).catch(console.error)
    }
  },

  newMatch: () => {
    const { isMedicalTimeout, defaultSettings, currentRoomId } = get()
    if (isMedicalTimeout) return

    if (timerInterval) { clearInterval(timerInterval); timerInterval = null }
    if (breakInterval) { clearInterval(breakInterval); breakInterval = null }

    const newTime = defaultSettings.roundMinutes * 60 + defaultSettings.roundSeconds
    set({
      hongScore: 0, chongScore: 0, hongGamJeom: 0, chongGamJeom: 0,
      hongRoundsWon: 0, chongRoundsWon: 0, currentRound: 1,
      matchWinnerDeclared: false, roundDeclared: false,
      isTimerRunning: false, timerTime: newTime, timerSetTime: newTime,
      redBlinkClass: '', blueBlinkClass: '',
      isBreakRunning: false, isOvertime: false, overtimeSeconds: 0, breakTimeRemaining: 0,
      roundStats: { hong: { byPoints: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } }, chong: { byPoints: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } } },
      superiorityModalOpen: false,
      matchLog: [],
      matchHistoryOpen: false,
    })

    if (currentRoomId) {
      dbUpdate(ref(db, `rooms/${currentRoomId}`), {
        teamA: { score: 0, gamJeoms: 0 }, teamB: { score: 0, gamJeoms: 0 },
        timer: { minutes: defaultSettings.roundMinutes, seconds: defaultSettings.roundSeconds, running: false },
        round: 1, hongRoundsWon: 0, chongRoundsWon: 0,
        medicalTimeout: { active: false, team: '' },
        redBlinkClass: '', blueBlinkClass: '', submissions: {},
        currentMatchLog: null,
      }).catch(console.error)
    }
  },

  resetRoomScore: () => {
    const { currentRoomId, defaultSettings, hongGamJeom, chongGamJeom } = get()
    set({ hongScore: 0, chongScore: 0 })
    if (currentRoomId) {
      dbUpdate(ref(db, `rooms/${currentRoomId}`), {
        teamA: { score: 0, gamJeoms: hongGamJeom },
        teamB: { score: 0, gamJeoms: chongGamJeom }
      }).catch(console.error)
    }
  },

  // UI toggles
  toggleRefereeLogin: (show) => set({ refereeLoginOpen: show }),
  openMatchHistory: () => set({ matchHistoryOpen: true }),
  closeMatchHistory: () => set({ matchHistoryOpen: false }),
}))
