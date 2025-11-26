export async function fetchJson<T>(input: RequestInfo | URL, init?: RequestInit & { timeoutMs?: number }) {
  const controller = new AbortController()
  const timeout = init?.timeoutMs ?? 15000
  const id = setTimeout(() => controller.abort(), timeout)
  try {
    const res = await fetch(input, { ...init, signal: controller.signal })
    const data = await res.json().catch(() => null)
    return { ok: res.ok, status: res.status, data: data as T }
  } finally {
    clearTimeout(id)
  }
}
