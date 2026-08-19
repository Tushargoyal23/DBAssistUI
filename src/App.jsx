import { useState } from 'react'
import './App.css'

const defaultApiBase = import.meta.env.VITE_API_BASE || 'http://localhost:8080'
const suggestionPrompts = [
  'Show me all active users',
  'What collections are in this database?',
  'Write a query for recent orders',
  'Explain the schema for the payments table',
]

function App() {
  const [apiBase, setApiBase] = useState(defaultApiBase)
  const [connectionString, setConnectionString] = useState('mongodb://localhost:27017')
  const [databaseName, setDatabaseName] = useState('sample_db')
  const [schemaResult, setSchemaResult] = useState(null)
  const [question, setQuestion] = useState('Show me all active users')
  const [queryResult, setQueryResult] = useState(null)
  const [loadingSchema, setLoadingSchema] = useState(false)
  const [loadingQuery, setLoadingQuery] = useState(false)
  const [error, setError] = useState('')
  const [status, setStatus] = useState('Ready')

  const handleGenerateSchema = async (event) => {
    event.preventDefault()
    setLoadingSchema(true)
    setError('')
    setStatus('Connecting to MongoDB...')

    try {
      const baseUrl = apiBase.replace(/\/$/, '')
      const response = await fetch(`${baseUrl}/api/mongo/schema-summary`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ connectionString, databaseName }),
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Unable to connect to MongoDB.')
      }

      setSchemaResult(data)
      setStatus('Schema ready')
      setQueryResult(null)
    } catch (err) {
      setError(err.message)
      setStatus('Connection failed')
    } finally {
      setLoadingSchema(false)
    }
  }

  const handleAskQuestion = async (event) => {
    event.preventDefault()

    if (!schemaResult || !schemaResult.schemaSummary) {
      setError('Generate a schema first before asking a question.')
      return
    }

    setLoadingQuery(true)
    setError('')
    setStatus('Generating answer...')

    try {
      const baseUrl = apiBase.replace(/\/$/, '')
      const response = await fetch(`${baseUrl}/api/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          schemaSummary: schemaResult.schemaSummary,
          question,
        }),
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Unable to generate a response from Gemini.')
      }

      setQueryResult(data)
      setStatus('Query generated')
    } catch (err) {
      setError(err.message)
      setStatus('Generation failed')
    } finally {
      setLoadingQuery(false)
    }
  }

  const collections = schemaResult?.collections ?? ['users', 'orders', 'products']

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">AI Database Copilot</p>
          <h1>DB Assist</h1>
        </div>
        <div className="status-pill">
          <span className="status-dot" />
          {status}
        </div>
      </header>

      <main className="dashboard">
        <aside className="sidebar card-panel">
          <div className="panel-header">
            <h2>Connection</h2>
          </div>

          <form onSubmit={handleGenerateSchema} className="connection-form">
            <label>
              API base URL
              <input
                type="text"
                value={apiBase}
                onChange={(event) => setApiBase(event.target.value)}
                placeholder="http://localhost:8080"
              />
            </label>

            <label>
              MongoDB URI
              <input
                type="text"
                value={connectionString}
                onChange={(event) => setConnectionString(event.target.value)}
                placeholder="mongodb://localhost:27017"
              />
            </label>

            <label>
              Database name
              <input
                type="text"
                value={databaseName}
                onChange={(event) => setDatabaseName(event.target.value)}
                placeholder="sample_db"
              />
            </label>

            <button type="submit" disabled={loadingSchema} className="primary-btn">
              {loadingSchema ? 'Connecting...' : 'Generate schema'}
            </button>
          </form>

          <div className="collections-block">
            <div className="mini-header">
              <h3>Collections</h3>
              <span>{collections.length}</span>
            </div>

            <div className="collection-list">
              {collections.map((collection) => (
                <button key={collection} type="button" className="collection-item">
                  {collection}
                </button>
              ))}
            </div>
          </div>
        </aside>

        <section className="content-area">
          <div className="card-panel schema-panel">
            <div className="panel-header">
              <h2>Schema summary</h2>
              <span>{schemaResult ? 'Live' : 'Waiting'}</span>
            </div>

            {schemaResult ? (
              <div className="schema-content">
                <div className="meta-row">
                  <div>
                    <p className="label">Database</p>
                    <strong>{schemaResult.databaseName}</strong>
                  </div>
                  <div>
                    <p className="label">Collections</p>
                    <strong>{schemaResult.collections.length}</strong>
                  </div>
                </div>

                <pre>{schemaResult.schemaSummary}</pre>
              </div>
            ) : (
              <div className="empty-state">
                <p>
                  Connect to your MongoDB database and generate a schema summary to start
                  asking questions.
                </p>
              </div>
            )}
          </div>

          <div className="card-panel assistant-panel">
            <div className="panel-header">
              <h2>Ask DB Assist</h2>
            </div>

            <form onSubmit={handleAskQuestion} className="question-form">
              <textarea
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                rows="4"
                placeholder="Ask about your data..."
              />

              <div className="prompt-row">
                {suggestionPrompts.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    className="chip"
                    onClick={() => setQuestion(prompt)}
                  >
                    {prompt}
                  </button>
                ))}
              </div>

              <button type="submit" disabled={loadingQuery} className="primary-btn">
                {loadingQuery ? 'Thinking...' : 'Ask question'}
              </button>
            </form>

            {error && <div className="alert error">{error}</div>}

            {queryResult ? (
              <div className="result-box">
                <div className="result-header">
                  <h3>Generated result</h3>
                  <span className="success-badge">Success</span>
                </div>

                <div className="result-block">
                  <p className="label">SQL / answer</p>
                  <pre>{queryResult.sql}</pre>
                </div>

                <div className="result-block">
                  <p className="label">Explanation</p>
                  <p>{queryResult.explanation}</p>
                </div>
              </div>
            ) : null}
          </div>
        </section>
      </main>
    </div>
  )
}

export default App
