# 🚀 GitHub Pages 배포 가이드

## 1단계: Git 저장소 초기화 및 커밋

PowerShell에서 프로젝트 폴더로 이동 후 실행:

```powershell
# 프로젝트 폴더로 이동
cd f:\유튭파인더\ChannelCompare

# Git 저장소 초기화
git init

# 모든 파일 추가
git add .

# 첫 커밋
git commit -m "Initial commit: YouTube Channel Compare"
```

## 2단계: GitHub 저장소 생성

1. https://github.com 접속 및 로그인
2. 우측 상단 '+' 클릭 > 'New repository' 선택
3. 저장소 정보 입력:
   - Repository name: `ChannelCompare` (또는 원하는 이름)
   - Description: `YouTube 채널 비교 분석 도구`
   - Public 선택
   - README, .gitignore, license는 선택하지 않음 (이미 생성됨)
4. 'Create repository' 클릭

## 3단계: GitHub에 푸시

GitHub에서 제공하는 명령어 중 "…or push an existing repository" 섹션 사용:

```powershell
# GitHub 저장소 연결 (본인의 username으로 변경)
git remote add origin https://github.com/YOUR_USERNAME/ChannelCompare.git

# 메인 브랜치로 이름 변경
git branch -M main

# GitHub에 푸시
git push -u origin main
```

## 4단계: GitHub Pages 활성화

1. GitHub 저장소 페이지에서 'Settings' 탭 클릭
2. 왼쪽 메뉴에서 'Pages' 클릭
3. Source 섹션:
   - Branch: `main` 선택
   - Folder: `/ (root)` 선택
4. 'Save' 클릭
5. 1~2분 후 페이지 상단에 배포 URL 표시:
   `https://YOUR_USERNAME.github.io/ChannelCompare/`

## 5단계: API 키 보안 설정 (중요!)

배포 후 Google Cloud Console에서 API 키 제한 설정:

1. https://console.cloud.google.com/ 접속
2. YouTube Data API v3 프로젝트 선택
3. '사용자 인증 정보' > API 키 클릭
4. '애플리케이션 제한사항':
   - 'HTTP 리퍼러' 선택
   - 웹사이트 제한사항 추가:
     ```
     https://YOUR_USERNAME.github.io/ChannelCompare/*
     https://YOUR_USERNAME.github.io/*
     ```
5. 'API 제한사항':
   - 'API 선택' 체크
   - 'YouTube Data API v3'만 선택
6. '저장' 클릭

## ✅ 완료!

이제 다음 URL에서 여러분의 앱에 접속할 수 있습니다:
`https://YOUR_USERNAME.github.io/ChannelCompare/`

## 🔄 업데이트 방법

코드 수정 후:

```powershell
git add .
git commit -m "설명 메시지"
git push
```

1~2분 후 자동으로 GitHub Pages에 반영됩니다.

## 🆘 문제 해결

### 404 에러
- Settings > Pages에서 배포 상태 확인
- 1~2분 기다린 후 새로고침

### API 키 오류
- Google Cloud Console에서 HTTP 리퍼러 확인
- API 할당량 확인 (일 10,000 요청)

### 차트가 안 보임
- 브라우저 개발자 도구(F12) > Console 탭에서 에러 확인
- API 키가 올바르게 입력되었는지 확인
