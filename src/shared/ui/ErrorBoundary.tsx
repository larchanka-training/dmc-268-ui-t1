import { Component, type ReactNode } from 'react'

type Props = {
  fallback: (error: unknown, reset: () => void) => ReactNode
  children: ReactNode
}

type State = { error: unknown; failed: boolean }

/** Изолирует сбой одного блока: остальная страница продолжает работать. */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null, failed: false }

  static getDerivedStateFromError(error: unknown): State {
    return { error, failed: true }
  }

  reset = () => this.setState({ error: null, failed: false })

  render() {
    return this.state.failed
      ? this.props.fallback(this.state.error, this.reset)
      : this.props.children
  }
}
