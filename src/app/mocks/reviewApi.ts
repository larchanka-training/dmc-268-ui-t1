import { parseReview, type ReviewState } from '../../entities/review/model'

const payload: unknown = {
  run: {
    id: 'run-42',
    mergeRequestId: 'mr-17',
    status: 'completed',
    headSha: 'ab12cd3',
  },
  files: [
    { path: 'src/auth.ts', additions: 2, deletions: 1 },
    { path: 'src/limits.ts', additions: 1, deletions: 1 },
  ],
  diffsByPath: {
    'src/auth.ts': {
      path: 'src/auth.ts',
      lines: [
        {
          id: 'a1',
          kind: 'context',
          oldLine: 10,
          newLine: 10,
          content: 'export function login(password: string) {',
        },
        {
          id: 'a2',
          kind: 'removed',
          oldLine: 11,
          newLine: null,
          content: '  logger.info(password)',
        },
        {
          id: 'a3',
          kind: 'added',
          oldLine: null,
          newLine: 11,
          content: '  logger.info("Login attempt")',
        },
        { id: 'a4', kind: 'added', oldLine: null, newLine: 12, content: '  return hash(password)' },
        { id: 'a5', kind: 'context', oldLine: 12, newLine: 13, content: '}' },
      ],
    },
    'src/limits.ts': {
      path: 'src/limits.ts',
      lines: [
        { id: 'l1', kind: 'context', oldLine: 1, newLine: 1, content: 'export const limits = {' },
        { id: 'l2', kind: 'removed', oldLine: 2, newLine: null, content: '  attempts: 3,' },
        { id: 'l3', kind: 'added', oldLine: null, newLine: 2, content: '  attempts: 5,' },
        { id: 'l4', kind: 'context', oldLine: 3, newLine: 3, content: '}' },
      ],
    },
  },
  findings: [
    {
      id: 'f1',
      reviewRunId: 'run-42',
      filePath: 'src/auth.ts',
      side: 'new',
      oldLine: null,
      newLine: 12,
      severity: 'high',
      message: 'Хеширование пароля должно использовать безопасный алгоритм.',
    },
    {
      id: 'f2',
      reviewRunId: 'run-42',
      filePath: 'src/auth.ts',
      side: 'new',
      oldLine: null,
      newLine: 10,
      severity: 'low',
      message: 'Это замечание не должно появиться у context-строки.',
    },
  ],
  publishedComments: [
    {
      id: 'published-1',
      reviewRunId: 'run-42',
      findingId: 'f1',
      providerCommentId: 'github-comment-42',
      kind: 'inline',
      publishedAt: '2026-09-29T18:00:00Z',
    },
    {
      id: 'published-2',
      reviewRunId: 'run-42',
      findingId: null,
      providerCommentId: 'github-comment-43',
      kind: 'summary',
      publishedAt: '2026-09-29T18:00:01Z',
    },
  ],
  actions: [
    {
      id: 'action-1',
      reviewRunId: 'run-42',
      tool: 'build_context',
      status: 'completed',
      durationSeconds: 2,
      preview: 'Собран контекст двух файлов.',
    },
    {
      id: 'action-2',
      reviewRunId: 'run-42',
      tool: 'analyse',
      status: 'completed',
      durationSeconds: 5,
      preview: 'Найдены два замечания.',
    },
  ],
}
export async function getMockReview(): Promise<ReviewState> {
  return parseReview(payload)
}
