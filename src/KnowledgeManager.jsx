import React, { useState, useEffect } from 'react';
import { Database, Plus, Trash2, Search, CheckCircle2, AlertCircle, Save, Edit3, Zap, FileUp, Download } from 'lucide-react';
import * as XLSX from 'xlsx';
import initialKnowledge from './data/knowledge.json';
import { computeEmbedding } from './lib/gemini';

function KnowledgeManager() {
    const [knowledge, setKnowledge] = useState([]);
    const [newEntry, setNewEntry] = useState({ q: '', topic: '', a: '' });
    const [searchTerm, setSearchTerm] = useState('');
    const [editingId, setEditingId] = useState(null);
    const [isProcessingAll, setIsProcessingAll] = useState(false);

    // Tự động phân luồng: Chạy trên Vercel thì dùng /api/..., chạy Local thì dùng localhost:3001
    const API_URL = import.meta.env.PROD ? '/api/knowledge' : 'http://localhost:3001/api/knowledge';

    // Load data API
    useEffect(() => {
        fetch(API_URL)
            .then(res => res.json())
            .then(data => {
                const dataWithId = data.map((item, index) => ({
                    ...item,
                    id: item.id || ('init-' + index),
                    ragStatus: item.embedding ? 'success' : 'pending'
                }));
                setKnowledge(dataWithId);
            })
            .catch(err => console.error("Lỗi tải data từ server:", err));
    }, []);

    // Sync data API
    const syncWithServer = async (data) => {
        try {
            await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
        } catch (err) {
            console.error("Lỗi đồng bộ server:", err);
        }
    };

    useEffect(() => {
        if (knowledge.length > 0) {
            syncWithServer(knowledge);
        }
    }, [knowledge]);

    const handleAdd = async () => {
        if (!newEntry.q || !newEntry.a) return;
        const tempId = 'user-' + Date.now();
        const newItem = {
            ...newEntry,
            id: tempId,
            ragStatus: 'pending'
        };

        // Cập nhật state trước
        setKnowledge(prev => [newItem, ...prev]);
        setNewEntry({ q: '', topic: '', a: '' });

        // Tự động chạy RAG sau khi state đã cập nhật (dùng setTimeout để đảm bảo render)
        setTimeout(() => runRAG(tempId), 500);
    };

    const handleSaveEdit = (id, updatedItem) => {
        setKnowledge(knowledge.map(item => item.id === id ? { ...updatedItem, ragStatus: 'pending' } : item));
        setEditingId(null);
    };

    const runRAG = async (id) => {
        const item = knowledge.find(k => k.id === id);
        if (!item) return;

        setKnowledge(prev => prev.map(k => k.id === id ? { ...k, ragStatus: 'processing' } : k));

        try {
            const textToEmbed = `HỎI: ${item.q}\nCHỦ ĐỀ: ${item.topic}\nTRẢ LỜI: ${item.a}`;
            const embedding = await computeEmbedding(textToEmbed);
            setKnowledge(prev => prev.map(k => k.id === id ? { ...k, embedding, ragStatus: 'success' } : k));
        } catch (err) {
            console.error(err);
            setKnowledge(prev => prev.map(k => k.id === id ? { ...k, ragStatus: 'error' } : k));
        }
    };

    const runRAGForAll = async () => {
        if (isProcessingAll) return;
        setIsProcessingAll(true);

        const pendingItems = knowledge.filter(k => k.ragStatus !== 'success');

        for (const item of pendingItems) {
            await runRAG(item.id);
            await new Promise(r => setTimeout(r, 500));
        }

        setIsProcessingAll(false);
        alert('Đã hoàn thành RAG cho tất cả các mục!');
    };

    const handleImportExcel = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const bstr = event.target.result;
            const wb = XLSX.read(bstr, { type: 'binary' });
            const wsname = wb.SheetNames[0];
            const ws = wb.Sheets[wsname];
            const data = XLSX.utils.sheet_to_json(ws);

            const imported = data.map((row, i) => ({
                topic: row['Chủ đề'] || row['Topic'] || 'Chung',
                q: row['Câu hỏi'] || row['Question'] || '',
                a: row['Câu trả lời'] || row['Answer'] || '',
                id: 'excel-' + Date.now() + '-' + i,
                ragStatus: 'pending'
            })).filter(item => item.q && item.a);

            setKnowledge([...imported, ...knowledge]);
        };
        reader.readAsBinaryString(file);
    };

    const downloadTemplate = () => {
        const ws = XLSX.utils.json_to_sheet([
            { 'Câu hỏi': 'GHN là gì?', 'Chủ đề': 'Khái niệm', 'Câu trả lời': 'Giao Hàng Nhanh' },
            { 'Câu hỏi': 'Quy trình POD', 'Chủ đề': 'Vận hành', 'Câu trả lời': 'Bước 1: Chụp ảnh...' },
        ]);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Mau_Import");
        XLSX.writeFile(wb, "Mau_Kien_Thuc_GHN.xlsx");
    };

    const filteredKnowledge = knowledge.filter(item =>
        item.q.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.topic.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="admin-container" style={{ padding: '40px', maxWidth: '1200px', margin: '0 auto', height: '100vh', overflowY: 'auto', color: 'white' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
                <div>
                    <h1 style={{ fontSize: '2rem', marginBottom: '8px', background: 'linear-gradient(to right, #ff8a00, #fbbf24)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                        Quản trị Trợ lý GHN
                    </h1>
                    <p style={{ opacity: 0.6 }}>Kết nối Google Sheets & Xoay API Key tự động</p>
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                    <button
                        onClick={runRAGForAll}
                        disabled={isProcessingAll}
                        style={{ background: '#00a0fa', display: 'flex', alignItems: 'center', gap: '8px' }}
                    >
                        <Zap size={18} className={isProcessingAll ? 'spinning' : ''} />
                        {isProcessingAll ? 'Đang chạy RAG...' : 'RAG cho tất cả'}
                    </button>

                    <button
                        onClick={downloadTemplate}
                        style={{ background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', gap: '8px', border: '1px solid rgba(255,255,255,0.2)' }}
                    >
                        <Download size={18} /> Tải mẫu
                    </button>

                    <label style={{ background: '#ff8a00', padding: '12px 24px', borderRadius: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold' }}>
                        <FileUp size={18} /> Import Excel
                        <input type="file" hidden accept=".xlsx, .xls" onChange={handleImportExcel} />
                    </label>
                </div>
            </div>

            {/* Form thêm nhanh */}
            <div style={{ background: 'var(--glass)', padding: '24px', borderRadius: '24px', border: '1px solid var(--glass-border)', marginBottom: '32px', backdropFilter: 'blur(10px)' }}>
                <h3 style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1rem' }}>
                    <Plus size={18} /> Thêm Kiến thức Mới
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr 2fr auto', gap: '12px' }}>
                    <input className="admin-input" placeholder="Chủ đề" value={newEntry.topic} onChange={e => setNewEntry({ ...newEntry, topic: e.target.value })} />
                    <input className="admin-input" placeholder="Câu hỏi" value={newEntry.q} onChange={e => setNewEntry({ ...newEntry, q: e.target.value })} />
                    <input className="admin-input" placeholder="Câu trả lời" value={newEntry.a} onChange={e => setNewEntry({ ...newEntry, a: e.target.value })} />
                    <button onClick={handleAdd}>Thêm</button>
                </div>
            </div>

            {/* Danh sách kiến thức */}
            <div style={{ background: 'var(--glass)', padding: '24px', borderRadius: '24px', border: '1px solid var(--glass-border)', backdropFilter: 'blur(10px)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px', background: 'rgba(255,255,255,0.05)', padding: '12px 20px', borderRadius: '16px' }}>
                    <Search size={18} opacity={0.5} />
                    <input
                        style={{ background: 'none', border: 'none', padding: '4px', width: '100%', color: 'white', outline: 'none' }}
                        placeholder="Tìm kiếm nhanh quy trình..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {filteredKnowledge.map((item) => (
                        <div key={item.id} style={{
                            padding: '20px',
                            background: editingId === item.id ? 'rgba(59, 130, 246, 0.1)' : 'rgba(255,255,255,0.02)',
                            borderRadius: '20px',
                            border: '1px solid ' + (editingId === item.id ? 'rgba(59, 130, 246, 0.3)' : 'rgba(255,255,255,0.05)')
                        }}>
                            {editingId === item.id ? (
                                <div style={{ display: 'grid', gap: '12px' }}>
                                    <input className="admin-input" value={item.topic} onChange={e => setKnowledge(knowledge.map(k => k.id === item.id ? { ...k, topic: e.target.value } : k))} />
                                    <input className="admin-input" value={item.q} onChange={e => setKnowledge(knowledge.map(k => k.id === item.id ? { ...k, q: e.target.value } : k))} />
                                    <textarea className="admin-input" style={{ minHeight: '80px' }} value={item.a} onChange={e => setKnowledge(knowledge.map(k => k.id === item.id ? { ...k, a: e.target.value } : k))} />
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <button onClick={() => handleSaveEdit(item.id, item)} style={{ background: '#10b981' }}><Save size={16} /> Lưu</button>
                                        <button onClick={() => setEditingId(null)}>Hủy</button>
                                    </div>
                                </div>
                            ) : (
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                                            <span style={{ fontSize: '0.65rem', background: 'rgba(59, 130, 246, 0.2)', color: '#60a5fa', padding: '4px 10px', borderRadius: '8px', fontWeight: '700' }}>
                                                {item.topic.toUpperCase()}
                                            </span>
                                            <div
                                                onClick={() => item.ragStatus !== 'success' && runRAG(item.id)}
                                                style={{
                                                    display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.7rem',
                                                    cursor: item.ragStatus === 'success' ? 'default' : 'pointer', padding: '4px 8px', borderRadius: '8px',
                                                    background: item.ragStatus === 'success' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                                                    color: item.ragStatus === 'success' ? '#10b981' : '#f59e0b'
                                                }}
                                            >
                                                {item.ragStatus === 'success' ? <CheckCircle2 size={12} /> : item.ragStatus === 'processing' ? <Zap size={12} className="spinning" /> : <AlertCircle size={12} />}
                                                {item.ragStatus === 'success' ? 'Đã RAG' : item.ragStatus === 'processing' ? 'Đang RAG...' : 'Bấm để RAG'}
                                            </div>
                                        </div>
                                        <h4 style={{ marginBottom: '8px' }}>{item.q}</h4>
                                        <p style={{ fontSize: '0.9rem', opacity: 0.7 }}>{item.a}</p>
                                    </div>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <button onClick={() => setEditingId(item.id)} style={{ background: 'rgba(255,255,255,0.05)', padding: '8px' }}><Edit3 size={16} /></button>
                                        <button onClick={() => setKnowledge(knowledge.filter(k => k.id !== item.id))} style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: '8px' }}><Trash2 size={16} /></button>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            <style>{`
        .admin-input { background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.1); padding: 10px 14px; border-radius: 10px; color: white; outline: none; width: 100%; }
        .spinning { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
        </div>
    );
}

export default KnowledgeManager;
