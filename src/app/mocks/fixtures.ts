import {
  buildHunk as hunk,
  toApiDiffFile,
  type DiffFile,
  type ReviewDiff,
} from '../../entities/diff'
import type { PublishedComment } from '../../entities/published-comment'
import type { ReviewFinding } from '../../entities/review-finding'
import type { ReviewRun } from '../../entities/review-run'
import type { ReviewRunStep } from '../../entities/review-run-step'
import type { ReviewRunResponse } from '../../pages/review-run'

/**
 * Mock-данные одного прогона в форме контракта бэкенда: прогон (`ReviewRunResponse`), дифф
 * (`ReviewDiffResponse`) и шаги (`ReviewRunStepListResponse`). Ханки диффа удобно писать строками
 * через `buildHunk`; в ответ они уходят без UI-полей — их строит фронт.
 */

const RUN_ID = 'run-42'

export const run: ReviewRun = {
  id: RUN_ID,
  merge_request_id: 'mr-42',
  merge_request: {
    id: 'mr-42',
    number: 42,
    title: 'Эндпоинт замечаний прогона и повтор запросов к БД',
    author: 'a.petrova',
    source_branch: 'feat/findings-endpoint',
    target_branch: 'develop',
    state: 'open',
    url: 'https://github.com/acme/review-service/pull/42',
    repository: { id: 'repo-1', provider: 'github', full_name: 'acme/review-service' },
  },
  head_sha: '9f3c2a17e4b8d6c0a5f1',
  base_sha: '2b7e41d09c3a8f6e1d24',
  status: 'completed',
  trigger: 'webhook',
  model: 'claude-sonnet-5',
  tokens_used: 48213,
  rejected_findings: 2,
  duration_seconds: 134,
  failure_reason: null,
  failed_stage: null,
  last_progress_at: '2026-09-26T09:14:18Z',
  created_at: '2026-09-26T09:12:04Z',
  updated_at: '2026-09-26T09:14:18Z',
}

const rawDiffFiles: DiffFile[] = [
  {
    path: 'app/api/review_runs.py',
    previous_path: null,
    status: 'modified',
    is_binary: false,
    language: 'python',
    hunks: [
      hunk(1, 1, [
        ' from fastapi import APIRouter, Depends, HTTPException',
        ' ',
        ' from app.auth import require_reader',
        '-from app.db import session',
        '+from app.db.session import get_session',
        '+from app.services.retry import with_retry',
        ' ',
        ' router = APIRouter(prefix="/review-runs")',
        '~',
        '~',
        '~@router.get("")',
        '~def list_runs(session=Depends(get_session)):',
        '~    rows = session.execute("SELECT * FROM review_runs").all()',
        '~    return [row._asdict() for row in rows]',
        ' ',
        ' ',
      ]),
      hunk(
        20,
        21,
        [
          ' @router.get("/{run_id}")',
          '-def get_run(run_id: str, user=Depends(require_reader)):',
          '-    row = session.execute(',
          '-        "SELECT * FROM review_runs WHERE id = :id", {"id": run_id}',
          '-    ).first()',
          '-    if row is None:',
          '-        raise HTTPException(status_code=404)',
          '-    return row',
          '+def get_run(run_id: str, session=Depends(get_session)):',
          '+    query = f"SELECT * FROM review_runs WHERE id = \'{run_id}\'"',
          '+    row = with_retry(lambda: session.execute(query).first())',
          '+    return row',
          '+',
          '+',
          '+@router.get("/{run_id}/findings")',
          '+def list_findings(run_id: str, session=Depends(get_session)):',
          '+    rows = session.execute(',
          '+        "SELECT * FROM findings WHERE review_run_id = :id", {"id": run_id}',
          '+    ).all()',
          '+    return [dict(row) for row in rows]',
        ],
        'router = APIRouter(prefix="/review-runs")',
      ),
    ],
  },
  {
    path: 'app/services/retry.py',
    previous_path: null,
    status: 'added',
    is_binary: false,
    language: 'python',
    hunks: [
      hunk(0, 1, [
        '+import time',
        '+from collections.abc import Callable',
        '+from typing import TypeVar',
        '+',
        '+T = TypeVar("T")',
        '+',
        '+',
        '+def with_retry(fn: Callable[[], T], attempts: int = 3, delay: float = 0.5) -> T:',
        '+    for attempt in range(attempts):',
        '+        try:',
        '+            return fn()',
        '+        except Exception:',
        '+            if attempt == attempts - 1:',
        '+                raise',
        '+            time.sleep(delay)',
      ]),
    ],
  },
  {
    path: 'app/db/session.py',
    previous_path: 'app/db.py',
    status: 'renamed',
    is_binary: false,
    language: 'python',
    hunks: [
      hunk(1, 1, [
        ' from sqlalchemy import create_engine',
        '-from sqlalchemy.orm import Session',
        '+from sqlalchemy.orm import sessionmaker',
        '~',
        '~from app.config import DATABASE_URL',
        '~',
        '-session = Session(create_engine(DATABASE_URL))',
        '+engine = create_engine(DATABASE_URL, pool_pre_ping=True)',
        '+SessionLocal = sessionmaker(engine)',
        '+',
        '+',
        '+def get_session():',
        '+    with SessionLocal() as session:',
        '+        yield session',
      ]),
    ],
  },
  {
    path: 'web/src/api/client.ts',
    previous_path: null,
    status: 'modified',
    is_binary: false,
    language: 'typescript',
    hunks: [
      hunk(
        8,
        8,
        [
          ' export async function getRun(id: string): Promise<unknown> {',
          '-  const response = await fetch(`/api/review-runs/${id}`)',
          '+  const response = await fetch(`/api/v1/review-runs/${id}`)',
          '+  if (!response.ok) throw new Error(`HTTP ${response.status}`)',
          '   return response.json()',
          ' }',
        ],
        "const BASE = '/api'",
      ),
    ],
  },
  {
    path: 'app/legacy/tasks.py',
    previous_path: null,
    status: 'deleted',
    is_binary: false,
    language: 'python',
    hunks: [
      hunk(1, 0, [
        '-from celery import shared_task',
        '-',
        '-',
        '-@shared_task',
        '-def run_review(run_id: str) -> None:',
        '-    raise NotImplementedError',
      ]),
    ],
  },
  {
    path: 'docs/architecture.png',
    previous_path: null,
    status: 'added',
    is_binary: true,
    language: null,
    hunks: [],
  },
]

const finding = (fields: ReviewFinding): ReviewFinding => fields

const findings: ReviewFinding[] = [
  finding({
    id: 'f-sql-injection',
    file_path: 'app/api/review_runs.py',
    side: 'new',
    old_line: null,
    new_line: 23,
    category: 'security',
    severity: 'critical',
    message:
      "SQL-инъекция: `run_id` из пути запроса подставляется в f-строку.\nЗначение вида `x' OR '1'='1` вернёт чужой прогон. Передавайте параметр через bind.",
    suggestion:
      '    query = text("SELECT * FROM review_runs WHERE id = :id").bindparams(id=run_id)',
    confidence: 0.97,
  }),
  finding({
    id: 'f-auth-removed',
    file_path: 'app/api/review_runs.py',
    side: 'old',
    old_line: 21,
    new_line: null,
    category: 'security',
    severity: 'high',
    message: 'Удалена зависимость `require_reader`: эндпоинт стал доступен без проверки прав.',
    suggestion: null,
    confidence: 0.91,
  }),
  finding({
    id: 'f-missing-404',
    file_path: 'app/api/review_runs.py',
    side: 'new',
    old_line: null,
    new_line: 25,
    category: 'correctness',
    severity: 'high',
    message:
      'Пропала обработка отсутствующего прогона: вместо 404 клиент получит `null` с кодом 200.',
    suggestion: '    if row is None:\n        raise HTTPException(status_code=404)\n    return row',
    confidence: 0.88,
  }),
  finding({
    id: 'f-row-dict',
    file_path: 'app/api/review_runs.py',
    side: 'new',
    old_line: null,
    new_line: 33,
    category: 'correctness',
    severity: 'medium',
    message: '`Row` в SQLAlchemy 2 не приводится через `dict()` — упадёт с `TypeError`.',
    suggestion: '    return [row._asdict() for row in rows]',
    confidence: 0.74,
  }),
  finding({
    id: 'f-no-tests',
    file_path: 'app/api/review_runs.py',
    side: 'new',
    old_line: null,
    new_line: null,
    category: 'correctness',
    severity: 'medium',
    message: 'Для нового эндпоинта `/findings` не добавлено ни одного теста.',
    suggestion: null,
    confidence: 0.6,
  }),
  finding({
    id: 'f-broad-except',
    file_path: 'app/services/retry.py',
    side: 'new',
    old_line: null,
    new_line: 12,
    category: 'correctness',
    severity: 'medium',
    message:
      '`except Exception` повторяет и неисправимые ошибки: `IntegrityError` выполнится трижды.\nПовторять стоит только сбои соединения.',
    suggestion: '        except OperationalError:',
    confidence: 0.82,
  }),
  finding({
    id: 'f-no-backoff',
    file_path: 'app/services/retry.py',
    side: 'new',
    old_line: null,
    new_line: 15,
    category: 'performance',
    severity: 'low',
    message: 'Фиксированная задержка без backoff: под нагрузкой повторы придут одновременно.',
    suggestion: '            time.sleep(delay * 2**attempt)',
    confidence: 0.55,
  }),
  finding({
    id: 'f-error-message',
    file_path: 'web/src/api/client.ts',
    side: 'new',
    old_line: null,
    new_line: 10,
    category: 'readability',
    severity: 'low',
    message: 'В тексте ошибки нет пути запроса — по логу не понять, какой вызов упал.',
    suggestion:
      '  if (!response.ok) throw new Error(`GET /api/v1/review-runs/${id}: HTTP ${response.status}`)',
    confidence: 0.5,
  }),
  finding({
    id: 'f-outside-hunk',
    file_path: 'web/src/api/client.ts',
    side: 'new',
    old_line: null,
    new_line: 40,
    category: 'readability',
    severity: 'low',
    message: '`listRuns` дублирует обработку ответа из `getRun` — стоит вынести в общий helper.',
    suggestion: null,
    confidence: 0.45,
  }),
]

const published = (findingId: string | null, n: number): PublishedComment => ({
  id: `pc-${n}`,
  finding_id: findingId,
  provider_comment_id: String(2400000 + n),
  kind: findingId === null ? 'summary' : 'inline',
  published_at: '2026-09-26T09:14:12Z',
})

const publishedComments: PublishedComment[] = [
  published(null, 1),
  published('f-sql-injection', 2),
  published('f-auth-removed', 3),
  published('f-missing-404', 4),
  published('f-broad-except', 5),
]

const step = (
  stage: ReviewRunStep['stage'],
  offsetSeconds: number,
  fields: Partial<ReviewRunStep> = {},
): ReviewRunStep => ({
  stage,
  status: 'completed',
  started_at: new Date(Date.parse('2026-09-26T09:12:06Z') + offsetSeconds * 1000).toISOString(),
  duration_seconds: 2,
  tokens_used: null,
  error_code: null,
  ...fields,
})

const steps: ReviewRunStep[] = [
  step('fetching_diff', 0),
  step('building_context', 3, { duration_seconds: 4 }),
  step('analysing', 8, { duration_seconds: 30, status: 'failed', error_code: 'LLM_TIMEOUT' }),
  step('analysing', 39, { duration_seconds: 41, tokens_used: 41320 }),
  step('verifying', 81, { duration_seconds: 9, tokens_used: 6893 }),
  step('publishing', 91, { duration_seconds: 3 }),
]

/** Дифф в форме контракта: без идентификаторов строк и признака свёрнутого контекста. */
const diff: ReviewDiff = { files: rawDiffFiles.map(toApiDiffFile) }

/** Ответ `GET /reviews/run-42` в форме контракта. */
export const mockReview: ReviewRunResponse = {
  ...run,
  findings,
  published_comments: publishedComments,
}

/** Ответ `GET /reviews/run-42/diff`. */
export const mockDiff = diff

/** Ответ `GET /reviews/run-42/steps`. */
export const mockSteps = { items: steps }
