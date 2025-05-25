"use client"

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { PostgrestError } from '@supabase/supabase-js'

interface Todo {
  id: number
  task: string
  is_complete: boolean
  created_at: string
}

export default function TodoList() {
  const [todos, setTodos] = useState<Todo[]>([])
  const [task, setTask] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all')
  const [actionLoading, setActionLoading] = useState<{
    add?: boolean;
    toggle?: number;
    delete?: number;
  }>({})

  useEffect(() => {
    fetchTodos()
  }, [])

  async function fetchTodos() {
    try {
      setLoading(true)
      setError(null)
      const { data, error } = await supabase
        .from('todos')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setTodos(data || [])
    } catch (err) {
      const error = err as PostgrestError
      setError(error.message || 'Failed to fetch todos')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  async function handleAdd() {
    if (!task.trim()) return

    try {
      setError(null)
      setActionLoading(prev => ({ ...prev, add: true }))
      const { data, error } = await supabase
        .from('todos')
        .insert([{ task: task.trim() }])
        .select()
        .single()

      if (error) throw error
      setTodos([data, ...todos])
      setTask("")
    } catch (err) {
      const error = err as PostgrestError
      setError(error.message || 'Failed to add todo')
      console.error(err)
    } finally {
      setActionLoading(prev => ({ ...prev, add: false }))
    }
  }

  async function handleToggle(todo: Todo) {
    try {
      setError(null)
      setActionLoading(prev => ({ ...prev, toggle: todo.id }))
      const { error } = await supabase
        .from('todos')
        .update({ is_complete: !todo.is_complete })
        .eq('id', todo.id)

      if (error) throw error
      setTodos(todos.map(t => 
        t.id === todo.id ? { ...t, is_complete: !t.is_complete } : t
      ))
    } catch (err) {
      const error = err as PostgrestError
      setError(error.message || 'Failed to update todo')
      console.error(err)
    } finally {
      setActionLoading(prev => ({ ...prev, toggle: undefined }))
    }
  }

  async function handleDelete(id: number) {
    try {
      setError(null)
      setActionLoading(prev => ({ ...prev, delete: id }))
      const { error } = await supabase
        .from('todos')
        .delete()
        .eq('id', id)

      if (error) throw error
      setTodos(todos.filter(t => t.id !== id))
    } catch (err) {
      const error = err as PostgrestError
      setError(error.message || 'Failed to delete todo')
      console.error(err)
    } finally {
      setActionLoading(prev => ({ ...prev, delete: undefined }))
    }
  }

  const filteredTodos = todos.filter(todo => {
    if (filter === 'active') return !todo.is_complete
    if (filter === 'completed') return todo.is_complete
    return true
  })

  const completedCount = todos.filter(todo => todo.is_complete).length
  const activeCount = todos.length - completedCount

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 py-12">
      <div className="max-w-2xl mx-auto px-4">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-8 text-center">
            ✨ Todo App
          </h1>

          {error && (
            <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded mb-6">
              <p className="font-medium">Error</p>
              <p>{error}</p>
            </div>
          )}

          <div className="flex gap-2 mb-8">
            <input
              type="text"
              value={task ?? ""}
              onChange={(e) => setTask(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
              placeholder="What needs to be done?"
              className="flex-1 px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-gray-900 placeholder-gray-400 bg-white"
              disabled={actionLoading.add}
            />
            <button
              onClick={handleAdd}
              disabled={actionLoading.add}
              className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {actionLoading.add ? 'Adding...' : 'Add'}
            </button>
          </div>

          <div className="flex gap-4 mb-6">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg transition-all ${
                filter === 'all'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              All ({todos.length})
            </button>
            <button
              onClick={() => setFilter('active')}
              className={`px-4 py-2 rounded-lg transition-all ${
                filter === 'active'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Active ({activeCount})
            </button>
            <button
              onClick={() => setFilter('completed')}
              className={`px-4 py-2 rounded-lg transition-all ${
                filter === 'completed'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Completed ({completedCount})
            </button>
          </div>

          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
              <p className="mt-2 text-gray-600">Loading todos...</p>
            </div>
          ) : filteredTodos.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {filter === 'all'
                ? 'No todos yet! Add one above.'
                : filter === 'active'
                ? 'No active todos!'
                : 'No completed todos!'}
            </div>
          ) : (
            <ul className="space-y-3">
              {filteredTodos.map(todo => (
                <li
                  key={todo.id}
                  className="group flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={todo.is_complete}
                      onChange={() => handleToggle(todo)}
                      disabled={actionLoading.toggle === todo.id}
                      className="w-5 h-5 rounded-full border-gray-300 text-blue-500 focus:ring-blue-500 disabled:opacity-50 transition-all"
                    />
                    <span
                      className={`${
                        todo.is_complete
                          ? 'line-through text-gray-400'
                          : 'text-gray-900'
                      } transition-all`}
                    >
                      {todo.task}
                    </span>
                  </div>
                  <button
                    onClick={() => handleDelete(todo.id)}
                    disabled={actionLoading.delete === todo.id}
                    className="text-gray-400 hover:text-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all opacity-0 group-hover:opacity-100"
                  >
                    {actionLoading.delete === todo.id ? (
                      <span className="animate-spin">⌛</span>
                    ) : (
                      '🗑️'
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}