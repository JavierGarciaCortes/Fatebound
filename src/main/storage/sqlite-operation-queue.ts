export class SqliteOperationQueue {
  #tail: Promise<void> = Promise.resolve()
  #accepting = true

  run<T>(operation: () => T | Promise<T>): Promise<T> {
    if (!this.#accepting) {
      return Promise.reject(new Error('SQLite is closing and cannot accept new operations'))
    }

    const result = this.#tail.then(operation)
    this.#tail = result.then(
      () => undefined,
      () => undefined
    )
    return result
  }

  stopAccepting(): void {
    this.#accepting = false
  }

  async waitForIdle(): Promise<void> {
    await this.#tail
  }
}
