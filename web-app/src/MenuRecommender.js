// web-app/src/MenuRecommender.js
import React, { useState, useEffect } from 'react';
import { recipeDB } from './recipeDB';

const surveySteps = [
    { id: 'category', question: '1) 어떤 종류의 음식을 선호하시나요?', options: ['한식', '중식', '일식', '양식', '아시안', '상관없음'] },
    { id: 'flavor', question: '2) 어떤 맛을 가장 선호하나요?', options: ['매운 맛', '담백한 맛', '달콤짭짤한 맛', '상큼하고 가벼운 맛', '상관없음'] },
    { id: 'temperature', question: '3) 지금 먹고 싶은 음식의 온도는 어떤가요?', options: ['뜨겁고 얼큰한', '따뜻하고 편안한', '차갑고 시원한', '상관없음'] },
    { id: 'form', question: '4) 어떤 형태의 식사가 더 좋나요?', options: ['면 요리', '밥 요리', '국물 요리', '가벼운 한 끼', '상관없음'] }
];

const preferenceMap = {
    '매운 맛': '매운',
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

    const [currentStep, setCurrentStep] = useState(0);
    const [preferences, setPreferences] = useState({});
    const [isLoading, setIsLoading] = useState(false);
    const [recommendedMenu, setRecommendedMenu] = useState(null);
    const [errorMsg, setErrorMsg] = useState(null);
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [avoidedList, setAvoidedList] = useState([]);

    const resetSurvey = () => {
        setCurrentStep(0);
        setPreferences({});
        setRecommendedMenu(null);
        setErrorMsg(null);
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

    const handleSubmit = (finalPreferences) => {
        setIsLoading(true);
        setRecommendedMenu(null);
        setErrorMsg(null);

        const allAvoidIngredients = [
            ...safeUserSettings.알레르기,
            ...safeUserSettings.기타기피
        ];

        if (safeUserSettings.비건) {
            allAvoidIngredients.push("젤라틴", "카제인", "유청", "코치닐", "꿀");
        }

        setAvoidedList(allAvoidIngredients);

        setTimeout(() => {
            let filteredList = recipeDB;

            filteredList = filteredList.filter(recipe => 
                !recipe.allergens.some(allergen => allAvoidIngredients.includes(allergen))
            );

            Object.entries(finalPreferences).forEach(([key, value]) => {
                if (value === '상관없음') return;

                if (key === 'category') {
                    filteredList = filteredList.filter(recipe => recipe.category === value);
                } 
                else {
                    const mapped = preferenceMap[value];
                    if (mapped) {
                        filteredList = filteredList.filter(recipe => recipe[key] === mapped);
                    }
                }
            });

            if (filteredList.length > 0) {
                const randomIndex = Math.floor(Math.random() * filteredList.length);
                setRecommendedMenu(filteredList[randomIndex]);
                setErrorMsg(null);
            } else {
                setRecommendedMenu(null);
                setErrorMsg("조건을 모두 만족하는 안전한 메뉴를 찾지 못했습니다. 😢");
            }

            setIsLoading(false);
        }, 2000);
    };

    const handleBack = () => {
        if (currentStep > 0) setCurrentStep(currentStep - 1);
    };

    return (
        <>
            {isLoading && (
                <section>
                    <div className="loading-container">
                        <h2>안전 메뉴를 검색 중입니다...</h2>
                        <p>기피 성분과 선호도를 분석 중입니다.</p>
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
                        className="analyze-button"
                        onClick={resetSurvey}
                        style={{ width: '100%', marginTop: '20px' }}
                    >
                        다른 메뉴 추천받기
                    </button>
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

            {!isLoading && !recommendedMenu && !errorMsg && (
                <section>
                    <div className="survey-container">
                        {currentStep > 0 && (
                            <button className="survey-back-button" onClick={handleBack}>
                                ← 뒤로 가기
                            </button>
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