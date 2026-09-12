import { CameraView } from './components/CameraView'
import { GenerateAtlas } from './components/GenerateAtlas'
import { Scene } from './components/Scene'
import { TrackingHud } from './components/TrackingHud'

function App() {
  return (
    <div className="app">
      <Scene />
      <CameraView />
      <TrackingHud />
      <GenerateAtlas />
    </div>
  )
}

export default App
