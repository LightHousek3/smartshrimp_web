import ExpertProtocolAuthoringEditor from './ExpertProtocolAuthoringEditor';
import { expertProductionProtocolAPI } from '../apis';
import { useMemo } from 'react';

export default function ExpertProductionProtocolForm({ seasonId, season, detail, api = expertProductionProtocolAPI, ...props }) {
    const application = useMemo(() => ({ seasonId, season, detail, api }), [seasonId, season, detail, api]);
    return <ExpertProtocolAuthoringEditor {...props} application={application} />;
}
