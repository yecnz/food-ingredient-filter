// web-app/src/MenuRecommender.js
import React, { useState, useEffect } from 'react';
import { recipeDB } from './recipeDB';

const API_ENDPOINTS = {
    GENERATE: 'https://mogododae-server.ngrok.app/api/generate-menu', 
    ADD_MENU: 'https://mogododae-server.ngrok.app/api/add-menu'  
};

const surveySteps = [
    { id: 'category', question: '1) 어떤 종류의 음식을 선호하시나요?', options: ['한식', '중식', '일식', '양식', '아시안', '상관없음'] },
    { id: 'flavor', question: '2) 어떤 맛을 가장 선호하나요?', options: ['매운 맛', '담백한 맛', '달콤짭짤한 맛', '상큼하고 가벼운 맛', '상관없음'] },
    { id: 'temperature', question: '3) 지금 먹고 싶은 음식의 온도는 어떤가요?', options: ['뜨겁고 얼큰한', '따뜻하고 편안한', '차갑고 시원한', '상관없음'] },
    { id: 'form', question: '4) 어떤 형태의 식사가 더 좋나요?', options: ['면 요리', '밥 요리', '국물 요리', '가벼운 한 끼', '상관없음'] },
];

const preferenceMap = {
    '매운 맛': '매움',
    '담백한 맛': '담백',
    '달콤짭짤한 맛': '달콤짭짤',
    '상큼하고 가벼운 맛': '상큼',
    '뜨겁고 얼큰한': '뜨겁',
    '따뜻하고 편안한': '따뜻',
    '차갑고 시원한': '시원',
    '면 요리': '면',
    '밥 요리': '밥',
    '국물 요리': '국물',
    '가벼운 한 끼': '가벼운',
    '향신료 강한 음식': '향신료강',
    '고기 중심 요리': '고기',
    '채소·가벼운 식단': '채소'
};

const loadingImages = [
    '/images/food1.jpg',
    '/images/food2.jpg',
    '/images/food3.jpg'
];

function MenuRecommender({ userSettings }) {

    const safeUserSettings = {
        알레르기: userSettings?.알레르기 || [],
        기타기피: userSettings?.기타기피 || [],
        비건: userSettings?.비건 || false
    };

    // 필터 UI 표시를 위한 리스트
    const ORDER_ALLERGY = ["밀", "대두", "땅콩", "우유", "계란", "새우", "게", "닭고기", "쇠고기", "돼지고기", "조개"];
    const ORDER_DISLIKE = ["MSG", "사카린", "아스파탐", "수크랄로스", "젤라틴", "카제인", "유청", "코치닐", "꿀"];

    const allergyList = ORDER_ALLERGY.filter(item => safeUserSettings.알레르기.includes(item));
    const rawDislikeList = ORDER_DISLIKE.filter(item => safeUserSettings.기타기피.includes(item));

    const [currentStep, setCurrentStep] = useState(0);
    const [preferences, setPreferences] = useState({});
    const [isLoading, setIsLoading] = useState(false);
    const [recommendedMenu, setRecommendedMenu] = useState(null);
    const [errorMsg, setErrorMsg] = useState(null);
    const [aiGeneratedMenus, setAiGeneratedMenus] = useState(null); // AI 결과 상태
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [avoidedList, setAvoidedList] = useState([]);

    const resetSurvey = () => {
        setCurrentStep(0);
        setPreferences({});
        setRecommendedMenu(null);
        setErrorMsg(null);
        setAiGeneratedMenus(null);
        setCurrentImageIndex(0);
        setAvoidedList([]);
    };

    useEffect(() => {
        resetSurvey();
    }, [userSettings]);

    useEffect(() => {
        let interval;
        if (isLoading) {
            interval = setInterval(() => {
                setCurrentImageIndex(prev => (prev + 1) % loadingImages.length);
            }, 500);
        }
        return () => clearInterval(interval);
    }, [isLoading]);
    
    // AI 결과가 나오면 로딩 해제
    useEffect(() => {
        if (aiGeneratedMenus || errorMsg) {
            setIsLoading(false);
        }
    }, [aiGeneratedMenus, errorMsg]);


    const handleSelect = (option) => {
        const currentQuestionId = surveySteps[currentStep].id;
        const newPreferences = {
            ...preferences,
            [currentQuestionId]: option
        };
        setPreferences(newPreferences);

        if (currentStep < surveySteps.length - 1) {
            setCurrentStep(currentStep + 1);
        } else {
            handleSubmit(newPreferences);
        }
    };

    // AI 메뉴 선택 시 DB에 추가하고 결과 화면으로 이동
    const handleSelectAndAddMenu = async (selectedMenu) => {
        setIsLoading(true);
        setAiGeneratedMenus(null); // AI 선택 화면 숨김

        try {
            const response = await fetch(API_ENDPOINTS.ADD_MENU, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'ngrok-skip-browser-warning': '69420', // ngrok 우회 헤더
                },
                body: JSON.stringify(selectedMenu),
            });

            if (!response.ok) throw new Error('메뉴 등록 실패');

            // DB 등록 성공 시 해당 메뉴를 추천 결과로 설정
            setRecommendedMenu(selectedMenu);
            setErrorMsg(null);
            console.log(`[DB 등록 성공] 메뉴: ${selectedMenu.title}`);
            
        } catch (error) {
            console.error("메뉴 등록 에러:", error);
            setErrorMsg("메뉴 등록 중 문제가 발생했습니다.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleSubmit = async (finalPreferences) => {
        setIsLoading(true);
        setRecommendedMenu(null);
        setErrorMsg(null);
        setAiGeneratedMenus(null);

        const allAvoidIngredients = [
            ...safeUserSettings.알레르기,
            ...safeUserSettings.기타기피
        ];
        if (safeUserSettings.비건) {
            allAvoidIngredients.push("젤라틴", "카제인", "유청", "코치닐", "꿀");
        }
        setAvoidedList(allAvoidIngredients);

        // 잠시 지연을 주어 로딩 효과 (기존 DB 검색 느낌)
        setTimeout(async () => {
            let filteredList = recipeDB;

            // 1. 알레르기/기피 성분 필터링
            filteredList = filteredList.filter(recipe => 
                !recipe.allergens.some(allergen => allAvoidIngredients.includes(allergen))
            );

            // 2. 선호도 필터링
            Object.entries(finalPreferences).forEach(([key, value]) => {
                if (value === '상관없음') return;

                // flavor, style 등 매핑이 필요한 경우
                const mapped = preferenceMap[value];
                if (mapped) {
                    filteredList = filteredList.filter(recipe => recipe[key] === mapped);
                } else {
                    // category 등 매핑 없이 그대로 비교하는 경우
                    filteredList = filteredList.filter(recipe => recipe[key] === value);
                }
            });

            if (filteredList.length > 0) {
                // (A) DB에서 메뉴 찾음 -> 바로 추천
                const randomIndex = Math.floor(Math.random() * filteredList.length);
                setRecommendedMenu(filteredList[randomIndex]);
                setErrorMsg(null);
                setIsLoading(false);

            } else {
                // (B) DB에 없음 -> AI 생성 요청
                console.log("Database 메뉴 없음. AI 생성 요청 시작...");
                
                try {
                    const response = await fetch(API_ENDPOINTS.GENERATE, {
                        method: 'POST',
                        headers: { 
                            'Content-Type': 'application/json',
                            'ngrok-skip-browser-warning': '69420',
                        },
                        body: JSON.stringify({
                            ...finalPreferences,
                            avoidedIngredients: allAvoidIngredients 
                        }),                    
                    });

                    if (!response.ok) throw new Error('AI 생성 실패');

                    const data = await response.json(); 

                    if (data && data.length > 0) {
                        setAiGeneratedMenus(data); // AI 결과 표시
                    } else {
                        setErrorMsg("AI도 적합한 메뉴를 찾지 못했습니다. 😭");
                        setIsLoading(false);
                    }

                } catch (error) {
                    console.error("AI 에러:", error);
                    setErrorMsg("서버 연결에 실패했습니다.");
                    setIsLoading(false);
                }
            }
        }, 1000);
    };

    const handleBack = () => {
        if (currentStep > 0) setCurrentStep(currentStep - 1);
    };

    return (
        <>
            {isLoading && (
                <section>
                    <div className="loading-container">
                        <h2>
                            {/* AI 요청 중일 때 메시지 변경 */}
                            {recommendedMenu === null && !errorMsg && !aiGeneratedMenus 
                                ? '조건에 맞는 메뉴를 찾고 있습니다...' 
                                : 'AI가 새로운 메뉴를 생성 중입니다...'}
                        </h2>
                        <h3>AI가 기피 성분과 선호도를 분석하여 안전한 메뉴를 검색중이에요! 🍎</h3>
                        <div className="spinner" />
                        
                        <div className="loading-image-wrapper"> 
                            <img 
                                src={loadingImages[currentImageIndex]}
                                alt="loading-food"
                                className="loading-food-carousel-img"
                            />
                        </div>
                    </div>
                </section>
            )}

            {/* 결과 화면 (DB 찾음 or AI 메뉴 선택 후) */}
            {recommendedMenu && (
                <section>
                    <div className="recommend-result-box">
                        {avoidedList.length > 0 && (
                            <p className="recommend-avoid-list">
                                '{avoidedList.join(', ')}' 성분을 제외한 메뉴입니다.
                            </p>
                        )}
                        <h3>오늘의 안전 메뉴 추천</h3>
                        <h2>{recommendedMenu.title}</h2>
                        <p>#{recommendedMenu.tags.join(' #')}</p>
                    </div>

                    <button
                        className="map-search-button"
                        onClick={() => {
                            const cleanTitle = recommendedMenu.title.replace(/\(.*\)/gi, '').trim();
                            const query = encodeURIComponent(`${cleanTitle}`);
                            window.open(`https://m.map.naver.com/search2/search.naver?query=${query}`, '_blank');
                        }}
                    >
                        🗺️ 주변 식당 찾아보기
                    </button>

                    <button
                        className="analyze-button"
                        onClick={resetSurvey}
                        style={{ width: '100%', marginTop: '20px' }}
                    >
                        다른 메뉴 추천받기
                    </button>
                </section>
            )}

            {/* AI 생성 메뉴 선택 화면 */}
            {!isLoading && aiGeneratedMenus && (
                <section>
                    <div className="ai-recommend-container">
                        <h3>✨ AI가 생성한 맞춤 메뉴입니다!</h3>
                        <p>마음에 드는 메뉴를 선택하면 데이터베이스에 추가됩니다.</p>
                        
                        <div className="ai-menu-options">
                            {aiGeneratedMenus.map((menu, index) => (
                                <div key={index} className="ai-menu-card">
                                    <h4>{menu.title}</h4>
                                    <p>#{menu.tags.join(' #')}</p>
                                    <p className="ai-menu-details">
                                        {menu.category} | {menu.flavor} | {menu.temperature}
                                    </p>
                                    <button
                                        className="select-menu-button"
                                        onClick={() => handleSelectAndAddMenu(menu)}
                                    >
                                        이 메뉴 선택 및 등록
                                    </button>
                                </div>
                            ))}
                        </div>

                        <button 
                            className="change-image-button"
                            onClick={resetSurvey}
                            style={{ width: '100%', marginTop: '20px' }}
                        >
                            처음부터 다시 선택하기
                        </button>
                    </div>
                </section>
            )}
            
            {errorMsg && (
                <section>
                    <div className="recommend-error-box">
                        <p>{errorMsg}</p>
                    </div>
                    <button 
                        className="change-image-button"
                        onClick={resetSurvey}
                        style={{ width: '100%', marginTop: '20px' }}
                    >
                        처음부터 다시 선택하기
                    </button>
                </section>
            )}

            {/* 설문 화면 (결과나 에러가 없을 때만 표시) */}
            {!isLoading && !recommendedMenu && !errorMsg && !aiGeneratedMenus && (
                <section>
                    <div className="survey-container">
                        {currentStep > 0 && (
                            <div style={{ width: '100%', display: 'flex', justifyContent: 'flex-start', marginBottom: '15px' }}>
                                <button className="survey-back-button" onClick={handleBack}>
                                    ← 뒤로 가기
                                </button>
                            </div>
                        )}

                        <div className="inner-filter-box">
                            {/* 알레르기 표시 */}
                            {allergyList.length > 0 && (
                                <div className="filter-row">
                                    <span className="filter-label-danger">⚠️ 알레르기:</span>
                                    <div className="filter-tags-wrapper">
                                        {allergyList.map((tag, index) => (
                                            <span key={index} className="user-filter-tag danger">{tag}</span>
                                        ))}
                                    </div>
                                </div>
                            )}
                            {/* 기피성분 표시 */}
                            {rawDislikeList.length > 0 && (
                                <div className="filter-row">
                                    <span className="filter-label-warning">🚫 기피성분:</span>
                                    <div className="filter-tags-wrapper">
                                        {rawDislikeList.map((tag, index) => (
                                            <span key={index} className="user-filter-tag warning">{tag}</span>
                                        ))}
                                    </div>
                                </div>
                            )}
                            {/* 비건 표시 */}
                            {safeUserSettings.비건 && (
                                <div className="filter-row">
                                    <span className="filter-label-vegan">🌿 비건:</span>
                                    <div className="filter-tags-wrapper">
                                        <span className="user-filter-tag vegan">모든 동물성 식품 제외</span>
                                    </div>
                                </div>
                            )}
                            {/* 아무것도 없을 때 */}
                            {!safeUserSettings.비건 && allergyList.length === 0 && rawDislikeList.length === 0 && (
                                <div className="filter-row center">
                                    <span className="filter-label-safe">✅ 제외하는 성분 없음 (모두 가능)</span>
                                </div>
                            )}
                        </div>

                        {/* 선택한 답변 태그 표시 */}
                        {currentStep > 0 && (
                            <div className="selected-tags-container">
                                {surveySteps.slice(0, currentStep).map(step => (
                                    <span key={step.id} className="selected-tag">
                                        #{preferences[step.id]}
                                    </span>
                                ))}
                            </div>
                        )}

                        <h3 className="survey-question">
                            {surveySteps[currentStep].question}
                        </h3>

                        <div className="survey-options">
                            {surveySteps[currentStep].options.map(option => (
                                <button
                                    key={option}
                                    className="survey-option-button"
                                    onClick={() => handleSelect(option)}
                                >
                                    {option}
                                </button>
                            ))}
                        </div>
                    </div>
                </section>
            )}
        </>
    );
}

export default MenuRecommender;