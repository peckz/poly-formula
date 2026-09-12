import { useEffect, useState } from 'react'
import { CameraView } from './components/CameraView'
import { GenerateAtlas } from './components/GenerateAtlas'
import { Scene, type ViewMode } from './components/Scene'
import { TrackingHud } from './components/TrackingHud'

function parseHashViewMode(): ViewMode {
  const hash = window.location.hash.toLowerCase().replace(/^#/, '')
  if (hash === 'rettifilo' || hash === 't1') {
    return 'rettifilo'
  }
  if (hash === 'parabolica' || hash === 't11') {
    return 'parabolica'
  }
  if (hash === 'perspective') {
    return 'perspective'
  }
  return 'full'
}

function App() {
  const [viewMode, setViewMode] = useState<ViewMode>(parseHashViewMode)

  useEffect(() => {
    const handleHashChange = () => {
      setViewMode(parseHashViewMode())
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return
      }
      if (e.key === '1') {
        window.location.hash = 'full'
      } else if (e.key === '2') {
        window.location.hash = 'rettifilo'
      } else if (e.key === '3') {
        window.location.hash = 'parabolica'
      } else if (e.key === '4') {
        window.location.hash = 'perspective'
      }
    }

    window.addEventListener('hashchange', handleHashChange)
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('hashchange', handleHashChange)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  const handleSelectMode = (mode: ViewMode) => {
    window.location.hash = mode
  }

  return (
    <div className="app">
      <Scene viewMode={viewMode} />
      <CameraView />
      <TrackingHud />
      <GenerateAtlas />

      <nav className="track-controls" aria-label="Track camera views">
        <span className="track-title">Monza GP</span>
        <div className="view-buttons">
          <button
            type="button"
            className={viewMode === 'full' ? 'active' : ''}
            onClick={() => handleSelectMode('full')}
            title="Full Circuit Top-Down (Key: 1)"
          >
            Full Track [1]
          </button>
          <button
            type="button"
            className={viewMode === 'rettifilo' ? 'active' : ''}
            onClick={() => handleSelectMode('rettifilo')}
            title="Variante del Rettifilo T1-T2 (Key: 2)"
          >
            Rettifilo [2]
          </button>
          <button
            type="button"
            className={viewMode === 'parabolica' ? 'active' : ''}
            onClick={() => handleSelectMode('parabolica')}
            title="Curva Parabolica T11 (Key: 3)"
          >
            Parabolica [3]
          </button>
          <button
            type="button"
            className={viewMode === 'perspective' ? 'active' : ''}
            onClick={() => handleSelectMode('perspective')}
            title="Perspective View (Key: 4)"
          >
            3D [4]
          </button>
        </div>
      </nav>
    </div>
  )
}

export default App
