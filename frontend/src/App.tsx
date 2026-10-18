
import { useEffect, useState, type FormEvent } from 'react'
import './App.css'

type Status = 'todo' | 'doing' | 'done'

type Task = {
  id: number
  title: string
  status: Status
}

const API_URL = 'https://cu-fde2-kanban-api.onrender.com'

const columns: { status: Status; title: string; subtitle: string }[] = [
  { status: 'todo', title: 'To do', subtitle: 'Ready when you are' },
  { status: 'doing', title: 'Doing', subtitle: 'Work in progress' },
  { status: 'done', title: 'Done', subtitle: 'Look what you did!' },
]

async function request<T>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  })

  if (!response.ok) {
    const message = await response.text()
    throw new Error(message || `HTTP ${response.status}`)
  }

  if (response.status === 204) {
    return undefined as T
  }

  return response.json() as Promise<T>
}

function App() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [newTitle, setNewTitle] = useState('')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function loadTasks() {
    setLoading(true)
    setError('')

    try {
      const data = await request<Task[]>('/cards')
      setTasks(data)
    } catch {
      setError(
        'Cannot connect to the backend. Check that FastAPI is running on port 8000.',
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadTasks()
  }, [])

  async function addTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const title = newTitle.trim()

    if (!title || busy) return

    setBusy(true)
    setError('')

    try {
      const created = await request<Task>('/cards', {
        method: 'POST',
        body: JSON.stringify({ title, status: 'todo' }),
      })

      setTasks((current) => [...current, created])
      setNewTitle('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add task.')
    } finally {
      setBusy(false)
    }
  }

  async function moveTask(id: number, direction: -1 | 1) {
    if (busy) return

    const task = tasks.find((item) => item.id === id)
    if (!task) return

    const order: Status[] = ['todo', 'doing', 'done']
    const nextIndex = order.indexOf(task.status) + direction

    if (nextIndex < 0 || nextIndex >= order.length) return

    const nextStatus = order[nextIndex]

    setBusy(true)
    setError('')

    try {
      const updated = await request<Task>(`/cards/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          title: task.title,
          status: nextStatus,
        }),
      })

      setTasks((current) =>
        current.map((item) => (item.id === id ? updated : item)),
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not move task.')
    } finally {
      setBusy(false)
    }
  }

  async function deleteTask(id: number) {
    if (busy) return

    setBusy(true)
    setError('')

    try {
      await request<void>(`/cards/${id}`, { method: 'DELETE' })
      setTasks((current) => current.filter((item) => item.id !== id))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete task.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="#" aria-label="Kanban home">
          <span className="brand-icon">K</span>
          <span>Flowboard</span>
        </a>
        <span className="course-label">CU FDE2 · PROJECT</span>
      </header>

      <section className="hero">
        <p className="eyebrow">YOUR WORKSPACE</p>
        <h1>Make progress, <span>one task at a time.</span></h1>
        <p className="hero-description">
          A little organization goes a long way. What will you work on today?
        </p>

        <form className="add-form" onSubmit={addTask}>
          <span className="plus-icon">＋</span>
          <input
            value={newTitle}
            onChange={(event) => setNewTitle(event.target.value)}
            placeholder="What needs to get done?"
            aria-label="New task title"
            maxLength={120}
          />
          <button type="submit" disabled={busy || !newTitle.trim()}>
            {busy ? 'Saving...' : 'Add task ↗'}
          </button>
        </form>
      </section>

      {error && (
        <div role="alert" style={{ color: '#c0394b', marginBottom: 16 }}>
          {error}
          <button
            type="button"
            onClick={() => void loadTasks()}
            style={{ marginLeft: 12 }}
          >
            Retry
          </button>
        </div>
      )}

      <section className="board-heading">
        <div>
          <h2>Your board</h2>
          <p>Keep your ideas moving forward.</p>
        </div>
        <span className="task-total">{tasks.length} tasks total</span>
      </section>

      {loading ? (
        <p>Loading tasks from the backend...</p>
      ) : (
        <section className="board">
          {columns.map((column, index) => {
            const columnTasks = tasks.filter(
              (task) => task.status === column.status,
            )

            return (
              <section
                className={`column column-${column.status}`}
                key={column.status}
              >
                <div className="column-header">
                  <div className="column-title-row">
                    <span className={`status-dot dot-${column.status}`} />
                    <h3>{column.title}</h3>
                    <span className="task-count">{columnTasks.length}</span>
                  </div>
                  <p>{column.subtitle}</p>
                </div>

                <div className="task-list">
                  {columnTasks.map((task) => (
                    <article className="task-card" key={task.id}>
                      <p className="task-title">{task.title}</p>
                      <div className="task-actions">
                        <div className="move-actions">
                          {index > 0 && (
                            <button
                              type="button"
                              className="move-button"
                              disabled={busy}
                              onClick={() => void moveTask(task.id, -1)}
                              aria-label={`Move ${task.title} left`}
                              title="Move left"
                            >
                              ←
                            </button>
                          )}
                          {index < columns.length - 1 && (
                            <button
                              type="button"
                              className="move-button"
                              disabled={busy}
                              onClick={() => void moveTask(task.id, 1)}
                              aria-label={`Move ${task.title} right`}
                              title="Move right"
                            >
                              →
                            </button>
                          )}
                        </div>
                        <button
                          type="button"
                          className="delete-button"
                          disabled={busy}
                          onClick={() => void deleteTask(task.id)}
                          aria-label={`Delete ${task.title}`}
                          title="Delete task"
                        >
                          ×
                        </button>
                      </div>
                    </article>
                  ))}

                  {columnTasks.length === 0 && (
                    <div className="empty-state">
                      <span>✳</span>
                      <p>No tasks here yet</p>
                    </div>
                  )}
                </div>
              </section>
            )
          })}
        </section>
      )}

      <footer className="footer">
        <span>FLOWBOARD</span>
        <span>Small steps. Real progress.</span>
      </footer>
    </main>
  )
}

export default App
