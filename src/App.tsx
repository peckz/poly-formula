import { observer } from 'mobx-react-lite'
import { CameraView } from './components/CameraView'
import { EntryScreen } from './components/EntryScreen'
import { GameOverlay } from './components/GameOverlay'
import { LeaderboardPanel } from './components/LeaderboardPanel'
import { RaceHud } from './components/RaceHud'
import { Scene } from './components/Scene'
import { TrackingHud } from './components/TrackingHud'
import { entryStore } from './entry/store'

const App = observer(function App() {
  const { entered } = entryStore

  return (
    <div className="app">
      <Scene />
      {entered ? (
        <>
          <CameraView />
          <TrackingHud />
          <RaceHud />
          <GameOverlay />
        </>
      ) : (
        <EntryScreen />
      )}
      <LeaderboardPanel />
    </div>
  )
})

export default App
