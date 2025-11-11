# food-filter/test.py

import os
import re
from Levenshtein import distance 
from ocr import process_image_to_text
from database import ingredient_dict, MASTER_DB_LIST

# ===== 2. 동의어/확장 매핑 =====
synonyms = {
    "전지분유": "우유",
    "탈지분유": "우유",
    "분유": "우유",
    "카제인": "우유",  
    "레시틴": "대두", 
    "콩기름": "대두",
    "두유": "대두",
    "달걀": "계란",
    "난백": "계란",
    "난황": "계란",
    "닭가슴살": "닭고기"
}

# ===== 5. 성분 분리 함수 (개선) =====
def parse_ingredients(text):
    inner_texts = re.findall(r"\((.*?)\)", text)
    parsed = []
    for inner in inner_texts:
        inner_parts = [i.strip() for i in inner.split(",")]
        parsed.extend(inner_parts)

    no_parentheses_text = re.sub(r"\s*\(.*?\)", "", text)
    outer_parts = [p.strip() for p in no_parentheses_text.split(",") if p.strip()]
    return outer_parts + parsed

# ===== 6. 성분 매칭 함수 (핵심 개선) =====
def match_ingredients(parsed_ingredients, db, synonyms_map, user):
    results = {
        "경고": set(),
        "주의": set(),
        "안전": set() 
    }
    matched_original_ingredients = set()

    for ing in parsed_ingredients:
        if ing in matched_original_ingredients:
            continue 

        check_value = ing 
        standardized_value = None 

        for syn_key, syn_value in synonyms_map.items():
            if syn_key in ing:
                standardized_value = syn_value
                break 
        
        if standardized_value:
            check_value = standardized_value

        found = False

        for allergen_item in db["알레르겐"]:
            if allergen_item in check_value and allergen_item in user["알레르기"]:
                results["경고"].add(ing)
                matched_original_ingredients.add(ing)
                found = True
                break
        
        if found: continue

        if user["비건"]:
            for vegan_item in db["비건X"]:
                if vegan_item in check_value:
                    results["주의"].add(ing)
                    matched_original_ingredients.add(ing)
                    found = True
                    break
        
        if found: continue

        for etc_item in db["기타기피"]:
            if etc_item in check_value and etc_item in user["기타기피"]:
                results["주의"].add(ing)
                matched_original_ingredients.add(ing)
                found = True
                break

        if not found:
            results["안전"].add(ing)
            matched_original_ingredients.add(ing)

    return {k: list(v) for k, v in results.items()}

# ===== 7. 실행 테스트 =====
def analyze_product(ocr_text, user_settings):
    print("<사용자 설정>")
    print(f"  알레르기: {user_settings.get('알레르기')}")
    print(f"  비건: {user_settings.get('비건')}")
    print(f"  기타기피: {user_settings.get('기타기피')}")
    print()
    ingredients = parse_ingredients(ocr_text)
    print(f"추출된 성분: {ingredients}")

    matched = match_ingredients(ingredients, ingredient_dict, synonyms, user_settings)
    
    print("\n[최종 분류 결과]")
    for level, items in matched.items():
        print(f"  {level}: {items}")
    
    if matched["경고"]:
        print(">> 최종 판정: 경고")
    elif matched["주의"]:
        print(">> 최종 판정: 주의")
    else:
        print(">> 최종 판정: 안전")
    print("-" * 30)
    return matched


if __name__ == "__main__":
    
    # Mac 경로로 수정
    BASE_DIR = os.path.expanduser("~/Desktop/project/food-filter") # Mac 경로로 수정
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

            print("--- 성분 분석 중... ---")
            print()
            analyze_product(corrected_text, user_settings_for_test) 

    except Exception as e:
        print(f"[오류] 통합 실행 중 에러 발생: {e}")