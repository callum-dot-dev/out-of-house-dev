// Email queue drain + sequence stepper. EMAIL_DRY_RUN (default true) keeps real
// sends off until go-live (Phase 11 wires Resend + rendered bodies); for now the
// drain advances queued email_events to sent.
import { z } from 'zod';
import { defineJob } from '../defineJob';
import { one, query } from '../lib/db';

export const emailQueueDrain = defineJob('email.queue_drain', z.object({}), async () => {
  const rows = (await query<{ id: number }>("select id from email_events where status='queued' order by ts asc limit 200")).rows;
  let drained = 0;
  for (const e of rows) {
    // Resend send (with rendered body) lands in Phase 11; dry-run advances state.
    await one("update email_events set status='sent' where id=$1 returning id", [e.id]);
    drained++;
  }
  return { drained };
});

// Nurture / dunning step engine — populated in Phase 8.
export const emailSequences = defineJob('email.sequences', z.object({}), async () => ({ sent: 0 }));
