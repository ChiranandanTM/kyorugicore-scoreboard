import { useMatchStore } from '../../store/useMatchStore'

export default function PointSlideModal() {
  const { pointAction, adjustPoints, closePointSlide } = useMatchStore()

  return (
    <div className="point-slide-modal">
      <div className="slide-content">
        <h2>{pointAction === 'add' ? 'Add Points' : 'Subtract Points'}</h2>
        <p>Select the number of points:</p>
        <div className="point-buttons">
          {[1, 2, 3, 4, 5].map(n => (
            <button key={n} onClick={() => adjustPoints(n)}>{n}</button>
          ))}
        </div>
        <button className="close-slide" onClick={closePointSlide}>Cancel</button>
      </div>
    </div>
  )
}
