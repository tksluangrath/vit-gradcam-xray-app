import { AppProvider } from './context/AppContext'
import { Header } from './components/layout/Header'
import { TwoColumnLayout } from './components/layout/TwoColumnLayout'
import { ImageGallery } from './components/gallery/ImageGallery'
import { DiagnosticReport } from './components/report/DiagnosticReport'
import { DatasetInfoPanel } from './components/dataset/DatasetInfoPanel'
import './styles/globals.css'
import './App.css'

export function App() {
  return (
    <AppProvider>
      <div className="app">
        <Header />
        <main>
          <TwoColumnLayout
            left={<ImageGallery />}
            right={<DiagnosticReport />}
          />
        </main>
        <footer>
          <DatasetInfoPanel />
        </footer>
      </div>
    </AppProvider>
  )
}
