import { createRoot } from 'react-dom/client'
import '@xyflow/react/dist/style.css'
import './styles.css'
import { listenForKnowledgeContext } from '../integration/frameBridge'
import { KnowledgeMapApp } from './KnowledgeMapApp'

listenForKnowledgeContext()

createRoot(document.getElementById('root')!).render(<KnowledgeMapApp />)
