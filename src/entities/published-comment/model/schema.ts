import { z } from 'zod'

import type { ApiSchemas, MatchesContract } from '@/shared/api/contract'

/** Комментарий, опубликованный прогоном у провайдера (`PublishedCommentResponse` контракта). */
export const PublishedCommentSchema = z.object({
  id: z.string(),
  finding_id: z.string().nullable(),
  provider_comment_id: z.string(),
  kind: z.enum(['summary', 'inline', 'thread_reply']),
  published_at: z.string(),
})

export type PublishedComment = z.infer<typeof PublishedCommentSchema>

const contractCheck: MatchesContract<PublishedComment, ApiSchemas['PublishedCommentResponse']> =
  true
void contractCheck

/**
 * Комментарий к строке по каждому замечанию. Сводка к замечанию не относится, а ответ в тред —
 * не сама публикация замечания: иначе он перезаписал бы её в карте.
 */
export function publicationsByFinding(
  comments: readonly PublishedComment[],
): ReadonlyMap<string, PublishedComment> {
  return new Map(
    comments.flatMap((comment) =>
      comment.kind === 'inline' && comment.finding_id !== null
        ? [[comment.finding_id, comment] as const]
        : [],
    ),
  )
}
