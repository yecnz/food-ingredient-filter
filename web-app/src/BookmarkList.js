// web-app/src/BookmarkList.js

import React, { useState, useEffect } from 'react';

function BookmarkList({ onClose }) {
    const [bookmarks, setBookmarks] = useState([]);

    useEffect(() => {
        const data = localStorage.getItem('myBookmarks');
        if (data) {
            setBookmarks(JSON.parse(data));
        }
    }, []);

    const handleDelete = (id) => {
        if (window.confirm('이 기록을 삭제하시겠습니까?')) {
            const newList = bookmarks.filter(item => item.id !== id);
            setBookmarks(newList);
            localStorage.setItem('myBookmarks', JSON.stringify(newList));
        }
    };

    return (
        <div className="bookmark-container" style={{ padding: '20px', maxWidth: '600px', margin: '0 auto', backgroundColor: '#fff', minHeight: '100vh' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', paddingBottom: '10px', borderBottom: '1px solid #eee' }}>
                <h2 style={{ margin: 0, fontSize: '20px' }}>🔖 내 북마크</h2>
                <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer' }}>✕</button>
            </div>

            {bookmarks.length === 0 ? (
                <div style={{ textAlign: 'center', marginTop: '100px', color: '#999' }}>
                    <p>저장된 북마크가 없습니다.</p>
                </div>
            ) : (
                <ul style={{ listStyle: 'none', padding: 0 }}>
                    {bookmarks.map((item) => (
                        <li key={item.id} style={{ 
                            backgroundColor: 'white',
                            marginBottom: '15px', 
                            padding: '15px', 
                            borderRadius: '12px',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                            borderLeft: item.status === 'danger' ? '6px solid #FF6B6B' : '6px solid #4CAF50',
                            position: 'relative'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                                <div>
                                    <h3 style={{ margin: '0 0 5px 0', fontSize: '18px', color: '#333' }}>{item.name}</h3>
                                    <span style={{ fontSize: '12px', color: '#aaa' }}>{item.date}</span>
                                </div>
                                <button 
                                    onClick={() => handleDelete(item.id)} 
                                    style={{ 
                                        fontSize: '12px', color: '#ff6b6b', background: '#fff0f0', 
                                        border: 'none', borderRadius: '4px', padding: '4px 8px', cursor: 'pointer' 
                                    }}
                                >
                                    삭제
                                </button>
                            </div>

                            {item.feature && (
                                <div style={{ marginTop: '8px', fontSize: '14px', color: '#555', backgroundColor: '#f8f9fa', padding: '8px', borderRadius: '6px' }}>
                                    📝 <strong>특징:</strong> {item.feature}
                                </div>
                            )}
                            
                            <div style={{ marginTop: '10px', fontSize: '14px', paddingTop: '10px', borderTop: '1px dashed #eee' }}>
                                {item.ingredients && item.ingredients.length > 0 ? (
                                    <div style={{ color: '#E53935' }}>
                                        ⚠️ <strong>검출 성분:</strong> {item.ingredients.join(', ')}
                                    </div>
                                ) : (
                                    <div style={{ color: '#43A047' }}>
                                        ✅ 알레르기 성분 없음
                                    </div>
                                )}
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}

export default BookmarkList;