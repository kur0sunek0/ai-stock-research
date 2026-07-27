/** 数据采集进度页 */
import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Progress, Table, Tag, Button, Space, Typography, Alert, Upload, message, Spin } from 'antd';
import { ReloadOutlined, UploadOutlined, FileTextOutlined, CheckCircleOutlined, CloseCircleOutlined, ClockCircleOutlined, SyncOutlined, RightCircleOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import apiClient from '../api/client';

const { Title } = Typography;

const DOC_TYPES: Record<string, string> = { earnings: 'earnings', news: 'news', transcript: 'transcript', presentation: 'presentation', sec_filing: 'SEC Filing' };
const STATUS_TAG: Record<string, { color: string; icon: React.ReactNode }> = { completed: { color: 'success', icon: <CheckCircleOutlined /> }, failed: { color: 'error', icon: <CloseCircleOutlined /> }, pending: { color: 'default', icon: <ClockCircleOutlined /> } };

export default function DataCollectionPage() {
  const { t } = useTranslation();
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const [project, setProject] = useState<any>(null);
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [collecting, setCollecting] = useState(false);

  const fetchStatus = useCallback(async () => {
    if (!projectId) return;
    try {
      const [pr, dr] = await Promise.all([apiClient.get(`/projects/${projectId}`), apiClient.get(`/projects/${projectId}/documents`)]);
      setProject(pr.data.data); setDocuments(dr.data.data.items || []); setCollecting(pr.data.data.status === 'collecting');
    } catch { } finally { setLoading(false); }
  }, [projectId]);

  useEffect(() => { fetchStatus(); const iv = setInterval(() => { if (collecting) fetchStatus(); }, 3000); return () => clearInterval(iv); }, [fetchStatus, collecting]);

  const handleStart = async () => { setCollecting(true); try { await apiClient.post(`/projects/${projectId}/collect`); message.success(t('collect.collectionStarted')); fetchStatus(); } catch (e: any) { message.error(e.response?.data?.detail || ''); } finally { setCollecting(false); } };

  if (loading) return <Spin size="large" style={{ display: 'block', marginTop: 80 }} />;

  const stats = Object.fromEntries(Object.keys(DOC_TYPES).map(k => [k, documents.filter(d => d.doc_type === k)]));
  const total = documents.length, completed = documents.filter(d => d.fetch_status === 'completed').length;
  const failed = documents.filter(d => d.fetch_status === 'failed').length;
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

  const columns = [
    { title: t('collect.type'), dataIndex: 'doc_type', key: 'type', width: 100, render: (v: string) => DOC_TYPES[v] || v },
    { title: t('collect.title_col'), dataIndex: 'title', key: 'title', ellipsis: true },
    { title: t('collect.ticker'), dataIndex: 'ticker', key: 'ticker', width: 100 },
    { title: t('collect.status_col'), dataIndex: 'fetch_status', key: 'st', width: 100, render: (s: string) => { const c = STATUS_TAG[s] || STATUS_TAG.pending; return <Tag color={c.color} icon={c.icon}>{s}</Tag>; } },
  ];

  return (
    <div>
      <Title level={3}>{project?.stock_name || ''} {project?.stock_code ? `(${project.stock_code})` : ''} — {t('collect.title')}</Title>
      <Card style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <Space>{t('collect.progress')} {collecting && <Tag icon={<SyncOutlined spin />} color="processing">{t('collect.collecting')}</Tag>}{project?.status === 'collected' && <Tag color="success">{t('collect.completed')}</Tag>}</Space>
          <Space>{!collecting && total === 0 && <Button type="primary" onClick={handleStart} icon={<ReloadOutlined />}>{t('collect.startBtn')}</Button>}{collecting && <Button disabled icon={<SyncOutlined spin />}>{t('collect.collectingBtn')}</Button>}<Button onClick={fetchStatus} icon={<ReloadOutlined />}>{t('collect.refresh')}</Button></Space>
        </div>
        <Progress percent={pct} status={collecting ? 'active' : undefined} />
      </Card>
      {failed > 0 && <Alert type="warning" message={t('collect.missingAlert')} style={{ marginBottom: 16 }} showIcon />}
      <Card title={t('collect.docList')} extra={<Space><Upload accept=".pdf,.docx,.txt" showUploadList={false} customRequest={async (o: any) => { const fd = new FormData(); fd.append('file', o.file); try { await apiClient.post(`/projects/${projectId}/documents/upload`, fd, { headers: { 'Content-Type': 'multipart/form-data' } }); message.success(t('collect.uploadSuccess')); fetchStatus(); } catch { message.error(t('collect.uploadFailed')); } }}><Button icon={<UploadOutlined />}>{t('collect.uploadBtn')}</Button></Upload>{project?.status === 'collected' && <Button type="primary" icon={<RightCircleOutlined />} onClick={() => navigate(`/projects/${projectId}/analysis`)}>{t('collect.enterAnalysis')}</Button>}</Space>}>
        {total === 0 ? <div style={{ textAlign: 'center', padding: 40, color: '#999' }}><FileTextOutlined style={{ fontSize: 48, marginBottom: 16 }} /><div>{t('collect.noDocs')}</div></div>
          : <Table columns={columns} dataSource={documents} rowKey="id" pagination={{ pageSize: 20 }} size="middle" />}
      </Card>
    </div>
  );
}
