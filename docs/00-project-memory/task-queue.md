# Task Queue

Purpose: Optional queue for work outside the single primary task slot.

## Runtime Pending Delivery

| Task ID | Reason | Owner | Resume Condition | Delivery State |
| --- | --- | --- | --- | --- |
| reservation-delete | delivery follow-up | codex-delete | explicit delivery action or confirmation | waiting-confirmation |
