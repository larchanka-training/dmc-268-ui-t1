import { useState } from 'react'

export function App() {
  const [count, setCount] = useState(0)

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-gray-50 p-8 text-center">
      <h1 className="text-3xl font-bold text-gray-900">DMC-268 Team 1 UI</h1>
      <p className="text-gray-600">React + TypeScript + Vite + Tailwind CSS</p>
      <button
        type="button"
        onClick={() => setCount((c) => c + 1)}
        className="rounded-lg bg-blue-600 px-6 py-3 font-medium text-white transition hover:bg-blue-700 active:scale-95"
      >
        Count is {count}
      </button>
    </div>
  )
}

export default App
