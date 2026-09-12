import { CameraView } from './components/CameraView'
import { Scene } from './components/Scene'
import { TrackingHud } from './components/TrackingHud'

function App() {
  return (
    <div className="app">
      <Scene />
      <CameraView />
      <TrackingHud />
    </div>
  )
}

export default App
