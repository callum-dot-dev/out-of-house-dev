// Importing each job module runs its defineJob() calls, populating ALL_JOBS.
import './jobs/leads';
import './jobs/outreach';
import './jobs/inbox';
import './jobs/reports';
import './jobs/ops';
import './jobs/email';

export { ALL_JOBS } from './defineJob';
