import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Badge, Button, ConfigProvider, Tabs } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { expertSeasonAPI } from '../../apis';
import Loading from '../../components/Loading';
import ExpertSeasonHeader from '../../components/ExpertSeasonHeader';
import ExpertSeasonMetrics from '../../components/ExpertSeasonMetrics';
import ExpertSeasonProtocols from '../../components/ExpertSeasonProtocols';
import ExpertDiseaseCases from '../../components/ExpertDiseaseCases';
import { PROTOCOL_THEME, protocolError } from '../../constants/productionProtocol';
import { expertStyle } from '../../constants/expertStyle';
import ErrorState from '../../components/ErrorState';

/** Coordinate the detail request and tabs; cancel stale requests when the route changes. */
const SeasonDetailContent = ({ seasonId }) => {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const requestedTab = searchParams.get('tab');
    const tab = ['protocols', 'diseases'].includes(requestedTab) ? requestedTab : 'metrics';
    const changeTab = value => setSearchParams(previous => {
        const next = new URLSearchParams(previous);
        next.set('tab', value);
        return next;
    }, { replace: true });
    const [attempt, setAttempt] = useState(0);
    const [state, setState] = useState(null);
    useEffect(() => {
        const controller = new AbortController();
        expertSeasonAPI.getMetrics(seasonId, controller.signal)
            .then((response) => {
                if (!controller.signal.aborted) setState({ attempt, season: response.data.data });
            })
            .catch((error) => {
                if (!controller.signal.aborted) setState({ attempt, error: protocolError(error) });
            });
        return () => controller.abort();
    }, [seasonId, attempt]);

    const back = <Button type="text" icon={<ArrowLeftOutlined />} className="mb-2! h-9! shrink-0! self-start! px-1! text-[13px]! text-[#6a7994]!"
        onClick={() => navigate('/expert/seasons')}>Vụ nuôi được phân công</Button>;
    if (!state || state.attempt !== attempt) return <div className="flex min-h-[calc(100dvh-112px)] flex-col max-[900px]:min-h-[calc(100dvh-108px)] max-[650px]:min-h-[calc(100dvh-104px)]">
        {back}
        <Loading tip="Đang tải chỉ số chuyên môn" className="flex-1!" />
    </div>;
    if (state.error) return <>{back}<ErrorState message={state.error} onRetry={() => setAttempt((value) => value + 1)} /></>;

    const { season } = state;
    return <div className={`${expertStyle.page} [&_.ant-tabs-tab-disabled]:text-[#3a4a63]!`}>
        {back}
        <ExpertSeasonHeader season={season} />
        <Tabs activeKey={tab} onChange={changeTab} tabBarGutter={32} items={[
            { key: 'metrics', label: 'Chỉ số chuyên môn', children: <ExpertSeasonMetrics season={season} /> },
            { key: 'protocols', label: 'Phác đồ nuôi', children: <ExpertSeasonProtocols seasonId={seasonId} /> },
            { key: 'diseases', label: <span className="inline-flex items-center gap-1">Ca bệnh{season.openCaseCount > 0 && <Badge count={season.openCaseCount} size="small" color="#d43b57" />}</span>,
                children: <ExpertDiseaseCases seasonId={seasonId} /> },
        ]} />
    </div>;
};

const ExpertSeasonDetail = () => {
    const { seasonId } = useParams();
    return <ConfigProvider theme={PROTOCOL_THEME}><SeasonDetailContent key={seasonId} seasonId={seasonId} /></ConfigProvider>;
};

export default ExpertSeasonDetail;
