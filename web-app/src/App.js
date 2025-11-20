// web-app/src/App.js

import React, { useState } from 'react';
import CheckboxGroup from './CheckboxGroup';
import ImageUploader from './ImageUploader';
import AnalysisModal from './AnalysisModal';
import MenuRecommender from './MenuRecommender';
import IngredientSearcher from './IngredientSearcher';
import BookmarkList from './BookmarkList';
import './App.css';

const CHECKBOX_OPTIONS = {
  "알레르기": ["밀", "대두", "땅콩", "우유", "계란", "새우", "게", "닭고기", "쇠고기", "돼지고기", "조개"],
  "기타기피": ["MSG", "사카린", "아스파탐", "수크랄로스", "젤라틴", "카제인", "유청", "코치닐", "꿀"],
  "비건": ["비건 (모든 동물성)"]
};

function App() {
  const [checkedItems, setCheckedItems] = useState({
    "알레르기": [],
    "기타기피": [],
    "비건": []
  });

  const [analysisResult, setAnalysisResult] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [activeTab, setActiveTab] = useState('analyzer');
  const [showBookmark, setShowBookmark] = useState(false);
  
  const handleCheckboxChange = (category, item) => {
    setCheckedItems(prev => {
      const currentItems = prev[category] || [];
      const newItems = currentItems.includes(item)
        ? currentItems.filter(i => i !== item)
        : [...currentItems, item];
      return { ...prev, [category]: newItems };
    });
  };

  const userSettingsData = {
    알레르기: checkedItems["알레르기"],
    기타기피: checkedItems["기타기피"],
    비건: checkedItems["비건"].includes("비건 (모든 동물성)")
  };

  const allCheckedIngredients = [
      ...checkedItems["알레르기"],
      ...checkedItems["기타기피"]
  ];
  
  if (userSettingsData.비건) {
      allCheckedIngredients.push(...["젤라틴", "카제인", "유청", "코치닐", "꿀"]);
  }

  const handleUploadSuccess = (result) => {
    setAnalysisResult(result);
    setShowModal(true);
  };

  return (
    <div className="App" style={{ position: 'relative', minHeight: '100vh' }}>
      
      <header style={{ position: 'relative', textAlign: 'center', padding: '10px 0' }}>
        <h1>이건 먹어두대~ 🍎 🍜 🍤</h1>
        
        {!showBookmark && (
            <button 
                onClick={() => setShowBookmark(true)}
                style={{
                    position: 'absolute',
                    top: '20px',
                    right: '20px',
                    backgroundColor: 'white',
                    border: '1px solid #ddd',
                    borderRadius: '20px',
                    padding: '8px 15px',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    color: '#555',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                    fontSize: '14px',
                    zIndex: 10
                }}
            >
                🔖 북마크
            </button>
        )}
      </header>

      {showBookmark ? (
        <BookmarkList onClose={() => setShowBookmark(false)} />
      ) : (

        <>
          <div className="tab-container">
            <button 
              className={`tab-button ${activeTab === 'analyzer' ? 'active' : ''}`}
              onClick={() => setActiveTab('analyzer')}
            >
              🔬 성분 분석기
            </button>
            <button 
              className={`tab-button ${activeTab === 'recommender' ? 'active' : ''}`}
              onClick={() => setActiveTab('recommender')}
            >
              🧑‍🍳 안전 메뉴 추천
            </button>
            <button 
              className={`tab-button ${activeTab === 'search' ? 'active' : ''}`}
              onClick={() => setActiveTab('search')}
            >
              🔍 성분 검색
            </button>
          </div>

          {activeTab === 'analyzer' && (
            <>
              <section>
                <h2>1. 필터링 성분 설정</h2>
                {Object.entries(CHECKBOX_OPTIONS).map(([category, items]) => (
                  <CheckboxGroup
                    key={category}
                    category={category}
                    items={items}
                    checkedItems={checkedItems[category] || []}
                    onChange={handleCheckboxChange}
                  />
                ))}
                <div className="current-settings">
                  현재 필터링 설정: [알레르기: {checkedItems["알레르기"].join(', ') || '없음'}] [기타: {checkedItems["기타기피"].join(', ') || '없음'}] [비건: {userSettingsData.비건 ? '활성화' : '비활성화'}]
                </div>
              </section>

              <section>
                <h2>2. 성분표 이미지 업로드</h2>
                <ImageUploader 
                  onUploadSuccess={handleUploadSuccess} 
                  userSettings={userSettingsData}
                />
              </section>
            </>
          )}

          {activeTab === 'recommender' && (
            <MenuRecommender 
              userSettings={userSettingsData}
            />
          )}

          {activeTab === 'search' && (
            <IngredientSearcher />
          )}
        </> 
      )}

      <AnalysisModal
        show={showModal}
        onClose={() => setShowModal(false)}
        results={analysisResult}
        checkedIngredients={allCheckedIngredients}
      />
    </div>
  );
}

export default App;