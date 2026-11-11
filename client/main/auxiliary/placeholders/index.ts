import type { AuxEntry } from '../types';
import AnalysisAuxView from './analysis';
import AssistantAuxView from './assistant';
import DataQualityAuxView from './data-quality';
import DatasetAuxView from './dataset';
import GuidanceAuxView from './guidance';
import HistoryAuxView from './history';
import IssuesAuxView from './issues';
import NotesAuxView from './notes';
import OutputNavAuxView from './output-nav';
import ResultsTocAuxView from './results-toc';
import ReviewAuxView from './review';
import SearchAuxView from './search';
import TransformsAuxView from './transforms';
import VariableInfoAuxView from './variable-info';
import './style.css';

// placeholder entries, showing the kinds of thing the panel could hold.
// they're only for show: to remove them, delete this folder, and its line
// in registry.ts and their ids in types.ts
const placeholderEntries: AuxEntry[] = [
    { id: 'assistant', order: 10, create: () => new AssistantAuxView() },
    { id: 'results-toc', order: 20, create: ({ instance }) => new ResultsTocAuxView(instance) },
    { id: 'dataset', order: 30, create: ({ instance }) => new DatasetAuxView(instance) },
    { id: 'analysis', order: 40, create: ({ instance }) => new AnalysisAuxView(instance) },
    { id: 'variable-info', order: 60, create: () => new VariableInfoAuxView() },
    { id: 'issues', order: 70, create: () => new IssuesAuxView() },
    { id: 'history', order: 80, create: () => new HistoryAuxView() },
    { id: 'search', order: 90, create: () => new SearchAuxView() },
    { id: 'notes', order: 100, create: () => new NotesAuxView() },
    { id: 'output-nav', order: 110, create: () => new OutputNavAuxView() },
    { id: 'data-quality', order: 120, create: () => new DataQualityAuxView() },
    { id: 'transforms', order: 130, create: () => new TransformsAuxView() },
    { id: 'guidance', order: 150, create: () => new GuidanceAuxView() },
    { id: 'review', order: 160, create: () => new ReviewAuxView() },
];

export default placeholderEntries;
