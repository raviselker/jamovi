
from .jamovi_pb2 import Notification as NotificationPB
from .jamovi_pb2 import ValueType

INT = ValueType.Value('INT')
DOUBLE = ValueType.Value('DOUBLE')
STRING = ValueType.Value('STRING')
BOOL = ValueType.Value('BOOL')


SESSION_SHUTDOWN_IDLE = 1
SESSION_SHUTDOWN_MAINTENANCE = 2
SESSION_SHUTDOWN_TIME_LIMIT = 3
AUTOSAVE_FAILED = 4
AUTOSAVE_RECOVERED = 5
AUTOSAVE_STATE = 6


class Notification:

    TRANSIENT = 0
    DISMISS = 1
    INDEFINITE = 2

    def __init__(self, id, status=0, values={}, title='', message=''):
        self.id = id
        self.status = status
        self.values = values
        self.title = title
        self.message = message

    def dismiss(self):
        self.status = Notification.DISMISS
        return self

    def as_pb(self):
        pb = NotificationPB()
        pb.id = self.id
        pb.status = self.status
        pb.title = self.title
        pb.message = self.message

        for name, value in self.values.items():
            # bool first: a bool is an int too
            if isinstance(value, bool):
                v_pb = pb.values.add()
                v_pb.name = name
                v_pb.valueType = BOOL
                v_pb.b = value
            elif isinstance(value, int):
                v_pb = pb.values.add()
                v_pb.name = name
                v_pb.valueType = INT
                v_pb.i = value
            elif isinstance(value, float):
                v_pb = pb.values.add()
                v_pb.name = name
                v_pb.valueType = DOUBLE
                v_pb.d = value
            elif isinstance(value, str):
                v_pb = pb.values.add()
                v_pb.name = name
                v_pb.valueType = STRING
                v_pb.s = value

        return pb


class SessionShutdownNotification(Notification):
    def __init__(self, id, shutdown_in):
        values = { }
        if shutdown_in is not None:
            values = { 'shutdownIn': shutdown_in }
        super().__init__(id, Notification.INDEFINITE, values)


class SessionShutdownIdleNotification(SessionShutdownNotification):
    def __init__(self, shutdown_in=None):
        super().__init__(SESSION_SHUTDOWN_IDLE, shutdown_in)


class SessionShutdownMaintenanceNotification(SessionShutdownNotification):
    def __init__(self, shutdown_in=None):
        super().__init__(SESSION_SHUTDOWN_MAINTENANCE, shutdown_in)


class SessionShutdownTimeLimitNotification(SessionShutdownNotification):
    def __init__(self, shutdown_in=None):
        super().__init__(SESSION_SHUTDOWN_TIME_LIMIT, shutdown_in)


class AutosaveFailedNotification(Notification):
    # shown until autosaving works again: the user's changes aren't being
    # kept meanwhile
    def __init__(self, title='', message=''):
        super().__init__(AUTOSAVE_FAILED, Notification.INDEFINITE, title=title, message=message)


class AutosaveRecoveredNotification(Notification):
    def __init__(self, title='', message=''):
        super().__init__(AUTOSAVE_RECOVERED, Notification.TRANSIENT, title=title, message=message)


class AutosaveStateNotification(Notification):
    # not shown: it tells the page how an autosave is going, for a
    # deployment that shows the save state (the client's 'autosaveState'
    # event). state is 'saving', 'saved' or 'failed'; edited, after 'saved',
    # whether there are changes since, which the next autosave will save
    def __init__(self, state: str, edited: bool = False, message: str = ''):
        super().__init__(AUTOSAVE_STATE, Notification.TRANSIENT,
                         values={ 'state': state, 'edited': edited },
                         message=message)
