import os
import re
from Levenshtein import distance 
from ocr import process_image_to_text
from database import ingredient_dict, MASTER_DB_LIST

# ===== 2. 동의어/확장 매핑 =====
# 파싱된 성분(Key)을 DB의 표준 성분(Value)으로 변환합니다.
# "밀가루" -> "밀" 변환 대신, DB("밀")가 성분("밀가루")에 포함되는지(in)
# 검사하는 것이 더 효율적이므로, 여기서는 주로 완전 동의어를 다룹니다.
synonyms = {
    "전지분유": "우유",
    "탈지분유": "우유",
    "분유": "우유",
    "카제인": "우유",  # 카제인은 '비건X'이면서 '우유 알레르겐'일 수 있음
    "레시틴": "대두",  # '대두 레시틴'의 경우
    "콩기름": "대두",
    "두유": "대두",
    "달걀": "계란",
    "난백": "계란",
    "난황": "계란",
    "닭가슴살": "닭고기"
}

"""
# ===== 3. 샘플 OCR 결과 (가정) =====
ocr_text_1 = "밀가루, 우유(전지분유, 탈지분유), 설탕, 대두유(대두, 레시틴), 정제소금, 젤라틴(돼지고기)"
ocr_text_2 = "정제수, 설탕, 꿀, 아스파탐(감미료), 구연산"
ocr_text_3 = "설탕, 정제소금, 두유"


# ===== 4. 사용자 설정 (가정) =====
# 역할 C(UI)로부터 이 데이터를 전달받는다고 가정합니다.
user_settings = {
    "알레르기": ["밀", "우유", "돼지고기"],  # 사용자가 선택한 알레르겐
    "비건": True,                   # 비건 여부
    "기타기피": ["아스파탐"]             # 사용자 추가 기피 성분
}
"""

# ===== 5. 성분 분리 함수 (개선) =====
def parse_ingredients(text):
    # 1. 괄호 안의 내용물을 먼저 추출 (예: '대두, 레시틴')
    # r"\((.*?)\)" : 괄호 '()' 사이의 모든 문자(.)를 비탐욕적(*)으로 찾음
    inner_texts = re.findall(r"\((.*?)\)", text)

    parsed = []
    for inner in inner_texts:
        # 괄호 안의 성분들을 쉼표로 분리
        inner_parts = [i.strip() for i in inner.split(",")]
        parsed.extend(inner_parts)

    # 2. 원본 텍스트에서 괄호와 그 내용물을 모두 제거
    # r"\s*\(.*?\)" : 공백(선택) + 괄호와 그 내용물 제거
    no_parentheses_text = re.sub(r"\s*\(.*?\)", "", text)

    # 3. 괄호 밖의 성분들을 쉼표로 분리
    outer_parts = [p.strip() for p in no_parentheses_text.split(",") if p.strip()]

    # 4. 괄호 밖 성분 + 괄호 안 성분 리스트 반환 (중복 제거가 필요하면 set() 사용)
    # 예: ['밀가루', '우유', '설탕', '대두유', '정제소금', '젤라틴', '전지분유', '탈지분유', '대두', '레시틴', '돼지고기']
    return outer_parts + parsed

# ===== 6. 성분 매칭 함수 (핵심 개선) =====
def match_ingredients(parsed_ingredients, db, synonyms_map, user):
    results = {
        "경고": set(),  # 사용자의 '알레르기'와 일치
        "주의": set(),  # 사용자의 '비건/기타기피'와 일치
        "안전": set()   # 어디에도 해당하지 않음
    }
    # 원본 성분명을 저장하기 위해 set 사용 (예: '전지분유'와 '우유'가 둘 다 '우유'로 경고되는 것을 방지)
    matched_original_ingredients = set()

    for ing in parsed_ingredients:
        if ing in matched_original_ingredients:
            continue  # 이미 처리된 성분(예: 괄호 밖 '대두유', 괄호 안 '대두')

        check_value = ing  # 일단 원본으로 시작
        standardized_value = None # 표준화된 값 (예: "우유", "닭고기")

        for syn_key, syn_value in synonyms_map.items():
            # 예: if "분유" in ":온합분유"
            # 예: if "닭가슴살" in "...닭가슴살 16 %"
            if syn_key in ing:
                standardized_value = syn_value # "우유" 또는 "닭고기"가 됨
                break # 가장 먼저 일치하는 동의어 1개만 적용
        
        # 만약 동의어(예: "분유")가 발견되었다면, 
        # check_value를 표준 성분(예: "우유")으로 교체
        if standardized_value:
            check_value = standardized_value

        found = False

        # 2. [경고] 알레르겐 검사 (사용자 설정 기반)
        for allergen_item in db["알레르겐"]:
            # '밀'(DB)이 '밀가루'(check_value)에 포함되고, '밀'(DB)이 사용자 설정에 있는지
            if allergen_item in check_value and allergen_item in user["알레르기"]:
                results["경고"].add(ing) # 경고 표시는 *원본 성분명*으로
                matched_original_ingredients.add(ing)
                found = True
                break # 이미 경고이므로 더 검사할 필요 없음
        
        if found: continue

        # 3. [주의] 비건 검사 (사용자 설정 기반)
        if user["비건"]:
            for vegan_item in db["비건X"]:
                if vegan_item in check_value:
                    results["주의"].add(ing)
                    matched_original_ingredients.add(ing)
                    found = True
                    break
        
        if found: continue

        # 4. [주의] 기타 기피 성분 검사 (사용자 설정 기반)
        for etc_item in db["기타기피"]:
            if etc_item in check_value and etc_item in user["기타기피"]:
                results["주의"].add(ing)
                matched_original_ingredients.add(ing)
                found = True
                break

        # 5. [안전] 어디에도 해당되지 않은 경우
        if not found:
            results["안전"].add(ing)
            matched_original_ingredients.add(ing)

    # set을 list로 변환하여 반환
    return {k: list(v) for k, v in results.items()}

# ===== 7. 실행 테스트 =====
def analyze_product(ocr_text, user_settings):
    """
    - ocr_text: 역할 A(OCR)로부터 받을 문자열
    - user_settings: 역할 C(UI)로부터 받을 사용자 설정 딕셔너리
    """
    print("<사용자 설정>")
    print(f"  알레르기: {user_settings.get('알레르기')}")
    print(f"  비건: {user_settings.get('비건')}")
    print(f"  기타기피: {user_settings.get('기타기피')}")
    print()
    # 1. 성분 분리
    ingredients = parse_ingredients(ocr_text)
    print(f"추출된 성분: {ingredients}")

    # 2. 성분 매칭
    matched = match_ingredients(ingredients, ingredient_dict, synonyms, user_settings)
    
    # 3. 최종 결과 반환 
    print("\n[최종 분류 결과]")
    for level, items in matched.items():
        print(f"  {level}: {items}")
    
    # 제품 전체 등급 판정
    if matched["경고"]:
        print(">> 최종 판정: 🚨 경고")
    elif matched["주의"]:
        print(">> 최종 판정: ⚠️ 주의")
    else:
        print(">> 최종 판정: ✅ 안전")
    print("-" * 30)
    return matched


if __name__ == "__main__":
    
    BASE_DIR = os.path.expanduser("~/Desktop/project/food-filter") # 사용자 경로에 맞게 수정
    IMAGE_DIR = os.path.join(BASE_DIR, "image")
    RESULT_DIR = os.path.join(BASE_DIR, "result") 
    os.makedirs(RESULT_DIR, exist_ok=True)
    os.makedirs(IMAGE_DIR, exist_ok=True)

    user_settings_for_test = {
        "알레르기": ["밀", "우유", "돼지고기","닭고기", "대두", "계란", "새우"],
        "비건": True,
        "기타기피": ["아스파탐"]
    }

    try:
        img_files = [f for f in os.listdir(IMAGE_DIR) if f.lower().endswith(('.jpg', '.jpeg', '.png'))]
        
        if not img_files:
            print(f"[!] '{IMAGE_DIR}' 폴더에 이미지 파일이 없습니다.")
        
        print(f"총 {len(img_files)}개의 이미지를 분석합니다.\n")

        for img_name in img_files:
            full_path = os.path.join(IMAGE_DIR, img_name)
            
            print(f"\n=============================")
            print(f" 분석 이미지: {img_name}")
            print(f"=============================")
            
            print("--- OCR 처리 중... ---")
            corrected_text = process_image_to_text(full_path) 
            
            if corrected_text is None:
                print("[오류] OCR 처리 실패")
                continue

            try:
                base_name = os.path.splitext(img_name)[0]
                output_filename = f"{base_name}_ocr.txt" 
                output_path = os.path.join(RESULT_DIR, output_filename)
                
                with open(output_path, "w", encoding="utf-8") as f:
                    f.write(corrected_text)
                print(f"--- 텍스트 저장 완료: {output_filename} ---")
            except Exception as e: 
                print(f"[오류] 텍스트 파일 저장 중 에러 발생: {e}")
            # --- [여기까지 추가] ---

            print("--- 성분 분석 중... ---")
            print()
            analyze_product(corrected_text, user_settings_for_test) 

    except Exception as e:
        print(f"[오류] 통합 실행 중 에러 발생: {e}")