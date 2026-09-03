export interface DiffOp {
  type: 'equal' | 'removed' | 'added'
  text: string
}

/**
 * Diff a nivel de palabra (LCS) entre dos textos, preservando espacios
 * para poder reconstruir cada lado exactamente.
 */
export function diffWords(before: string, after: string): DiffOp[] {
  const a = before.split(/(\s+)/).filter((t) => t !== '')
  const b = after.split(/(\s+)/).filter((t) => t !== '')
  const n = a.length
  const m = b.length

  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0))
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1])
    }
  }

  const ops: DiffOp[] = []
  let i = 0
  let j = 0
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      ops.push({ type: 'equal', text: a[i] })
      i++
      j++
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      ops.push({ type: 'removed', text: a[i] })
      i++
    } else {
      ops.push({ type: 'added', text: b[j] })
      j++
    }
  }
  while (i < n) {
    ops.push({ type: 'removed', text: a[i] })
    i++
  }
  while (j < m) {
    ops.push({ type: 'added', text: b[j] })
    j++
  }
  return ops
}
