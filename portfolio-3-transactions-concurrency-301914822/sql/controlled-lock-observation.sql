\set ON_ERROR_STOP on

SET search_path TO nubian_portfolio, public;

\qecho 'Controlled concurrency lock observation'
SELECT
    blocked.application_name AS waiting_session,
    blocked.wait_event_type,
    blocked.wait_event,
    blocker.application_name AS blocking_session
FROM pg_stat_activity AS blocked
CROSS JOIN LATERAL unnest(pg_blocking_pids(blocked.pid)) AS blocker_pid(pid)
JOIN pg_stat_activity AS blocker
    ON blocker.pid = blocker_pid.pid
WHERE blocked.application_name = 'portfolio3-controlled-session-b';
