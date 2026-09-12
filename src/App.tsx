import { CameraView } from './components/CameraView'
import { GenerateAtlas } from './components/GenerateAtlas'
import { RaceHud } from './components/RaceHud'
import { Scene } from './components/Scene'
import { TrackingHud } from './components/TrackingHud'

function App() {
  return (
    <div className="app">
      <Scene />
      <CameraView />
      <TrackingHud />
      <GenerateAtlas />
      <RaceHud />
    </div>
  )
}

export default App
