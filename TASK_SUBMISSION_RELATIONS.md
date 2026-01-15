# Task Submission Relations

This document summarizes the database relationships related to task submissions and the
recommended delete order to fully remove a submission and its related data.

## Tables and Relationships

- **task_submissions** (primary record)
  - `id` (PK)
- **task_submission_users** (direct relation)
  - `submission_id` → `task_submissions.id`
  - associates related users with a submission
- **task_submission_tags** (direct relation)
  - `submission_id` → `task_submissions.id`
  - associates tags with a submission
- **task_submission_followups** (direct relation)
  - `submission_id` → `task_submissions.id`
  - stores follow-up items for a submission
- **task_submission_followup_assignees** (indirect relation)
  - `followup_id` → `task_submission_followups.id`
  - assigns users to follow-up items

## Deletion Order (Cascade by Hand)

1. Collect follow-up IDs for the submission from `task_submission_followups`.
2. Delete rows in `task_submission_followup_assignees` by `followup_id`.
3. Delete rows in `task_submission_followups` by `submission_id`.
4. Delete rows in `task_submission_tags` by `submission_id`.
5. Delete rows in `task_submission_users` by `submission_id`.
6. Delete the row in `task_submissions` by `id`.
