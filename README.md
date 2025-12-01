# Channel Compare

유튜브 채널을 비교 분석하는 웹 애플리케이션입니다.

## 주요 기능

### ✅ 구현된 기능

1. **📊 핵심 지표 비교**
   - 구독자 수, 총 조회수, 동영상 개수
   - 평균 조회수 (최근 30개 영상 기준)
   - 참여도 (조회수/구독자 비율)

2. **🕸️ 채널 밸런스 차트**
   - 레이더 차트로 5가지 항목 시각화
   - 구독자 규모, 조회수 파워, 영상 수, 참여도, 최근 성과

3. **📅 업로드 패턴 히트맵**
   - 24시간 기준 업로드 시간대 분석
   - 각 채널의 업로드 습관 파악

4. **🏆 채널별 대표 영상**
   - 최근 30개 영상 중 최고 성과 영상
   - 클릭 시 유튜브에서 바로 확인 가능

## 사용 방법

1. **API 키 설정**
   - 우측 상단 "API 키 설정" 버튼 클릭
   - YouTube Data API v3 키 입력

2. **채널 검색 및 추가**
   - 채널명 또는 핸들(@handle) 입력하여 검색
   - 최대 5개 채널까지 추가 가능

3. **분석 시작**
   - 최소 2개 채널 선택 후 "분석 시작하기" 클릭
   - 데이터 수집 및 분석 완료 (약 5-10초 소요)

4. **결과 확인**
   - 표, 차트, 히트맵으로 상세 비교
   - 대표 영상 카드 클릭 시 유튜브 이동

## 기술 스택

- **Frontend**: Vanilla JavaScript (ES6 Modules)
- **Styling**: Premium Dark Mode CSS with Glassmorphism
- **Charts**: Chart.js
- **API**: YouTube Data API v3

## 파일 구조

```
ChannelCompare/
├── index.html
├── css/
│   └── style.css
├── js/
│   ├── main.js        # 메인 로직
│   ├── api.js         # YouTube API 관리
│   ├── analyzer.js    # 데이터 분석
│   └── chart.js       # 차트 렌더링
└── README.md
```

## 개발자

Built with ❤️ for YouTube creators and analysts.
