/** 文档解析工作台 — 三栏布局 */
import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Tabs, Tag, Button, Space, Typography, Spin, Empty, message, Collapse, Tooltip, Input } from 'antd';
import { FileTextOutlined, EditOutlined, SaveOutlined, RightCircleOutlined, ThunderboltOutlined, BulbOutlined, WarningOutlined, QuestionCircleOutlined, RiseOutlined, SearchOutlined, RocketOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import apiClient from '../api/client';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

const CAT_CFG: Record<string, { icon: React.ReactNode; color: string }> = {
  mda: { icon: <FileTextOutlined />, color: '#163D7A' },
  financials: { icon: <ThunderboltOutlined />, color: '#2D995F' },
  kpi: { icon: <RiseOutlined />, color: '#722ED1' },
  capital: { icon: <BulbOutlined />, color: '#FA8C16' },
  risk: { icon: <WarningOutlined />, color: '#E6772E' },
  notes: { icon: <SearchOutlined />, color: '#1677FF' },
  guidance: { icon: <RocketOutlined />, color: '#EB2F96' },
};

export default function DocumentAnalysisPage() {
  const { t } = useTranslation();
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const [project, setProject] = useState<any>(null);
  const [documents, setDocuments] = useState<any[]>([]);
  const [analyses, setAnalyses] = useState<any[]>([]);
  const [categories, setCategories] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<any>(null);
  const [activeCat, setActiveCat] = useState('all');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');

  const fetchData = useCallback(async () => {
    if (!projectId) return;
    try {
      const [pr, dr, ar] = await Promise.all([apiClient.get(`/projects/${projectId}`), apiClient.get(`/projects/${projectId}/documents`), apiClient.get(`/projects/${projectId}/analysis`)]);
      setProject(pr.data.data); const docs = dr.data.data.items || []; setDocuments(docs); if (docs.length > 0 && !selectedDoc) setSelectedDoc(docs[0]);
      setAnalyses(ar.data.data.items || []); setCategories(ar.data.data.categories || {}); setAnalyzing(pr.data.data.status === 'analyzing');
    } catch { } finally { setLoading(false); }
  }, [projectId]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { if (!analyzing) return; const iv = setInterval(fetchData, 3000); return () => clearInterval(iv); }, [analyzing, fetchData]);

  const handleAnalyze = async () => { setAnalyzing(true); try { await apiClient.post(`/projects/${projectId}/analyze`); message.success(t('common.success')); } catch (e: any) { message.error(e.response?.data?.detail || ''); setAnalyzing(false); } };
  const handleSaveEdit = async (id: string) => { try { await apiClient.put(`/projects/${projectId}/analysis/${id}`, { content: editContent }); message.success(t('analysis.save')); setEditingId(null); fetchData(); } catch { message.error(t('common.error')); } };

  const filtered = activeCat === 'all' ? analyses : analyses.filter((a: any) => a.category === activeCat);
  const catTabs = [{ key: 'all', label: `${t('analysis.all')} (${analyses.length})` }, ...Object.entries(categories).map(([k, v]: [string, any]) => ({ key: k, label: `${t(`analysis.categories.${k}`)} (${v.count})` }))];

  if (loading) return <Spin size="large" style={{ display: 'block', marginTop: 80 }} />;

  return (
    <div style={{ height: 'calc(100vh - 140px)', display: 'flex', gap: 16 }}>
      <div style={{ width: 280, flexShrink: 0, overflow: 'auto' }}>
        <Card size="small" title={t('analysis.docPanel')} style={{ height: '100%' }}>
          {documents.length === 0 ? <Empty description={t('analysis.noDocs')} /> : documents.map(d => (
            <Card key={d.id} size="small" hoverable style={{ marginBottom: 8, borderColor: selectedDoc?.id === d.id ? '#163D7A' : undefined, background: selectedDoc?.id === d.id ? '#E8EFF9' : undefined }} onClick={() => setSelectedDoc(d)}>
              <Space direction="vertical" size={2}><Text strong style={{ fontSize: 13 }}>{d.title}</Text><Space size={4}><Tag color="blue" style={{ fontSize: 11 }}>{d.ticker}</Tag><Tag style={{ fontSize: 11 }}>{d.doc_type}</Tag></Space></Space>
            </Card>
          ))}
        </Card>
      </div>
      <div style={{ flex: 1, overflow: 'auto' }}>
        <Card size="small" title={t('analysis.aiPanel')} extra={<Space>{analyzing && <Tag icon={<Spin size="small" />} color="processing">{t('analysis.analyzing')}</Tag>}<Button size="small" onClick={handleAnalyze} icon={<ThunderboltOutlined />} loading={analyzing} disabled={documents.length === 0}>{t('analysis.startBtn')}</Button></Space>} style={{ height: '100%' }}>
          {analyses.length === 0 && !analyzing ? <Empty description={t('analysis.noAnalysis')} style={{ marginTop: 60 }} />
            : analyzing && analyses.length === 0 ? <div style={{ textAlign: 'center', padding: 60 }}><Spin size="large" /><p style={{ marginTop: 16, color: '#999' }}>{t('analysis.analyzingWait')}</p></div>
              : <><Tabs activeKey={activeCat} onChange={setActiveCat} items={catTabs} size="small" style={{ marginBottom: 16 }} />
                {filtered.map(item => (
                  <Card key={item.id} size="small" style={{ marginBottom: 12 }} title={<Space><Tag color={CAT_CFG[item.category]?.color}>{t(`analysis.categories.${item.category}`)}</Tag><Text strong>{item.is_edited ? (item.edited_title || item.title) : item.title}</Text>{item.confidence && <Tag color={item.confidence > 0.8 ? 'green' : item.confidence > 0.5 ? 'orange' : 'red'}>{t('analysis.confidence')} {(item.confidence * 100).toFixed(0)}%</Tag>}</Space>}>
                    {editingId === item.id ? <div><TextArea rows={4} value={editContent} onChange={e => setEditContent(e.target.value)} defaultValue={item.edited_content || item.content} /><Space style={{ marginTop: 8 }}><Button size="small" type="primary" icon={<SaveOutlined />} onClick={() => handleSaveEdit(item.id)}>{t('analysis.save')}</Button><Button size="small" onClick={() => setEditingId(null)}>{t('analysis.cancel')}</Button></Space></div>
                      : <div><Paragraph style={{ whiteSpace: 'pre-wrap', marginBottom: 8 }}>{item.edited_content || item.content}</Paragraph>{item.is_edited && <Tag color="orange" style={{ marginBottom: 8 }}>{t('analysis.edited')}</Tag>}<div style={{ display: 'flex', justifyContent: 'space-between' }}><Space size={4}>{item.citations?.map((c: any, i: number) => <Tooltip key={i} title={`${t('analysis.sourceFrom')}${c.document_title}`}><Tag style={{ cursor: 'pointer', fontSize: 11, background: '#f0f0f0' }}>[{i + 1}]</Tag></Tooltip>)}</Space><Button size="small" icon={<EditOutlined />} onClick={() => { setEditingId(item.id); setEditContent(item.edited_content || item.content); }}>{t('common.edit')}</Button></div></div>}
                  </Card>
                ))}
              </>}
        </Card>
      </div>
      <div style={{ width: 320, flexShrink: 0, overflow: 'auto' }}>
        <Card size="small" title={t('analysis.previewPanel')} style={{ height: '100%' }}>
          {selectedDoc ? <div><Title level={5}>{selectedDoc.title}</Title><Space size={4} style={{ marginBottom: 12 }}><Tag>{selectedDoc.doc_type}</Tag><Tag color="blue">{selectedDoc.ticker}</Tag></Space><div style={{ whiteSpace: 'pre-wrap', fontSize: 13, lineHeight: 1.8, maxHeight: 'calc(100vh - 280px)', overflow: 'auto', background: '#fafafa', padding: 12, borderRadius: 4 }}>{selectedDoc.content_preview || t('analysis.noDocs')}</div></div> : <Empty description={t('analysis.noDocs')} />}
          {project?.status === 'analyzed' && <div style={{ marginTop: 16, textAlign: 'center' }}><Button type="primary" icon={<RightCircleOutlined />} onClick={() => navigate(`/projects/${projectId}/peer-comparison`)}>{t('analysis.enterPeer')}</Button></div>}
        </Card>
      </div>
    </div>
  );
}
