
# when an autosave that failed is tried again, and when the user is told.
#
# why it failed decides when it's tried again. the error a save fails with
# (save() wraps the sync's in a UserException) may say, with an
# autosave_retry attribute, on it or anything it was raised from:
#
# - 'soon' (the default): it may clear by itself (the store couldn't be
#   reached). tried again after a wait that grows, up to a minute;
# - 'later': it needs something to change (the folder is full), so it's
#   tried again every few minutes;
# - 'never': it can't succeed (the project was opened or saved somewhere else
#   since). not tried again, unless a save succeeds (a Save As, say).
#
# the user's told once, and again if what they're told changes: trying again
# doesn't tell them again. once a save succeeds, they're told that too.

# the waits, in seconds
RETRY_SOON = (5, 15, 30, 60)
RETRY_LATER = 300


def retry_kind(error: BaseException) -> str:
    cause: BaseException | None = error
    seen = 0
    while cause is not None and seen < 10:
        kind = getattr(cause, 'autosave_retry', None)
        if kind in ('soon', 'later', 'never'):
            return kind
        cause = cause.__cause__ or cause.__context__
        seen += 1
    return 'soon'


class AutosaveRetry:

    def __init__(self):
        self.failures = 0
        self.retry_at: float | None = None
        self.halted = False
        # what the user was last told, while it's shown
        self.notice: str | None = None

    def may_try(self, now: float, final: bool = False) -> bool:
        # final: the instance is ending, and this is the last chance, so a
        # wait is skipped (but not a halt)
        if self.halted:
            return False
        if final or self.retry_at is None:
            return True
        return now >= self.retry_at

    def failed(self, error: BaseException, now: float) -> tuple[str, bool]:
        # the kind of failure, and whether the user should be told
        kind = retry_kind(error)
        self.failures += 1
        if kind == 'never':
            self.halted = True
            self.retry_at = None
        elif kind == 'later':
            self.retry_at = now + RETRY_LATER
        else:
            index = min(self.failures, len(RETRY_SOON)) - 1
            self.retry_at = now + RETRY_SOON[index]

        message = str(error)
        if message == self.notice:
            return kind, False
        self.notice = message
        return kind, True

    def settled(self) -> bool:
        # a save worked: any failure is over. whether the user had been told
        # of one (and so should be told it's over)
        told = self.notice is not None
        self.failures = 0
        self.retry_at = None
        self.halted = False
        self.notice = None
        return told
