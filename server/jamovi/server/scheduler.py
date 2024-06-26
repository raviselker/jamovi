
from asyncio import wait
from asyncio import FIRST_COMPLETED
from asyncio import ensure_future as create_task
from asyncio import CancelledError
from logging import getLogger

from .analyses import Analysis
from .jamovi_pb2 import AnalysisRequest
from .jamovi_pb2 import AnalysisStatus
from .pool import Pool
from .utils import req_str


ANALYSIS_ERROR = AnalysisStatus.Value('ANALYSIS_ERROR')

PERFORM_INIT = AnalysisRequest.Perform.Value('INIT')
PERFORM_SAVE = AnalysisRequest.Perform.Value('SAVE')
PERFORM_RUN = AnalysisRequest.Perform.Value('RUN')


log = getLogger(__name__)


class Scheduler:

    def __init__(self, n_init_slots, n_run_slots, analyses):
        self._n_init_slots = n_init_slots
        self._n_run_slots = n_run_slots
        self._n_slots = n_init_slots + n_run_slots
        self._analyses = analyses

        self._n_initing = 0
        self._n_running = 0

        self._analyses.add_options_changed_listener(self._send_next)

        self._pool = Pool(self._n_slots)

    def _send_next(self, analysis=None):

        # print('counts', self._n_initing, self._n_running, self._n_slots, self._n_run_slots)

        # if the analysis already running, update the queue
        if analysis is not None:
            key = (analysis.instance.id, analysis.id)
            if key in self._pool:
                analysis.status = Analysis.Status.RUNNING
                request = self._to_message(analysis, 'init')
                self._run_analysis(request)
                self._n_initing += 1
                log.debug('%s %s %s', 'inc_counters', 'initing', (self._n_initing, self._n_running, self._n_slots))

        if self._n_initing + self._n_running >= self._n_slots:
            return

        for analysis in self._analyses.needs_init:
            analysis.status = Analysis.Status.RUNNING
            request = self._to_message(analysis, 'init')
            self._run_analysis(request)
            self._n_initing += 1
            log.debug('%s %s %s', 'inc_counters', 'initing', (self._n_initing, self._n_running, self._n_slots))
            if self._n_initing + self._n_running >= self._n_slots:
                return

        if self._n_running >= self._n_run_slots:
            return

        for analysis in self._analyses.needs_op:
            analysis.status = Analysis.Status.RUNNING
            request = self._to_message(analysis, 'op')
            self._run_analysis(request)
            self._n_running += 1
            log.debug('%s %s %s', 'inc_counters', 'running', (self._n_initing, self._n_running, self._n_slots))
            if self._n_running + self._n_initing >= self._n_slots:
                return
            if self._n_running >= self._n_run_slots:
                return

        for analysis in self._analyses.needs_run:
            analysis.status = Analysis.Status.RUNNING
            request = self._to_message(analysis, 'run')
            self._run_analysis(request)
            self._n_running += 1
            log.debug('%s %s %s', 'inc_counters', 'running', (self._n_initing, self._n_running, self._n_slots))
            if self._n_running + self._n_initing >= self._n_slots:
                return
            if self._n_running >= self._n_run_slots:
                return

    def _run_analysis(self, request):
        log.debug('%s %s', 'sending_to_pool', req_str(request))
        stream = self._pool.add(request)
        task = create_task(self._handle_results(request, stream))
        task.add_done_callback(self._run_done)

    def _run_done(self, f):
        try:
            f.result()
        except CancelledError:
            pass
        except Exception as e:
            log.exception(e)

        self._send_next()

    async def _handle_results(self, request, stream):

        instance_id = request.instanceId
        analysis_id = request.analysisId
        analysis = self._analyses.get(analysis_id, instance_id)

        try:
            async for results in stream:
                log.debug('%s %s', 'results_received', req_str(request))
                analysis.set_results(results, False)

            log.debug('%s %s', 'results_received', req_str(request))
            results = stream.result()

            if request.perform == PERFORM_SAVE:
                if results.status == ANALYSIS_ERROR:
                    analysis.op.set_exception(ValueError(results.error.message))
                else:
                    analysis.op.set_result(results)
            else:
                analysis.set_results(results)

            if results.status == ANALYSIS_ERROR:
                analysis.status = Analysis.Status.ERROR
            elif request.perform == PERFORM_INIT:
                analysis.status = Analysis.Status.INITED
            else:
                analysis.status = Analysis.Status.COMPLETE
        finally:
            if request.perform == PERFORM_INIT:
                self._n_initing -= 1
                log.debug('%s %s %s', 'dec_counters', 'initing', (self._n_initing, self._n_running, self._n_slots))
            else:
                self._n_running -= 1
                log.debug('%s %s %s', 'dec_counters', 'running', (self._n_initing, self._n_running, self._n_slots))

    @property
    def queue(self):
        return self._pool

    def _to_message(self, analysis, perform, request_pb=None):

        if request_pb is None:
            request_pb = AnalysisRequest()

        request_pb.sessionId = analysis.instance.session.id
        request_pb.instanceId = analysis.instance.id
        request_pb.analysisId = analysis.id
        request_pb.name = analysis.name
        request_pb.ns = analysis.ns
        request_pb.arbitraryCode = analysis.arbitrary_code

        for addon in analysis.addons:
            addon_pb = request_pb.addons.add()
            self._to_message(addon, perform, addon_pb)

        if analysis.complete and analysis.needs_op:

            analysis.op.waiting = False

            request_pb.options.CopyFrom(analysis.options.as_pb())
            request_pb.perform = PERFORM_SAVE
            request_pb.path = analysis.op.path
            request_pb.part = analysis.op.part

        else:

            analysis.status = Analysis.Status.RUNNING

            request_pb.options.CopyFrom(analysis.options.as_pb())
            request_pb.changed.extend(analysis.changes)
            request_pb.revision = analysis.revision
            request_pb.clearState = analysis.clear_state

            if perform == 'init':
                request_pb.perform = PERFORM_INIT
            else:
                request_pb.perform = PERFORM_RUN

        return request_pb
