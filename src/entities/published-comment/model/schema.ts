import { z } from 'zod'

/** Факт публикации замечания или summary у провайдера (FRONTEND_ARCHITECTURE.md §8.2). */
export const PublishedCommentSchema = z.object({
  finding_id: z.string().nullable(),
  provider_comment_id: z.string(),
  kind: z.enum(['summary', 'inline']),
  published_at: z.string(),
})

export type PublishedComment = z.infer<typeof PublishedCommentSchema>

/** Публикация по замечанию; summary к замечанию не относится. */
export function publicationsByFinding(
  comments: readonly PublishedComment[],
): ReadonlyMap<string, PublishedComment> {
  return new Map(
    comments.flatMap((comment) =>
      comment.finding_id === null ? [] : [[comment.finding_id, comment] as const],
    ),
  )
}
