# bank

재정 내역을 관리하고, Gemini API를 통해 투자 조언을 받아볼 수 있는 프로젝트입니다.

## 폴더 구조

```text
bank/
├─ backend/
├─ frontend/
└─ README.md
```

## 폴더별 설명

### `backend/`

Gemini API를 호출하는 백엔드 서버 폴더입니다.

- `server.js`
  Node 내장 `http` 서버로 `/api/investment-advice` 엔드포인트를 제공합니다.
- `.env`
  실제 Gemini API 키와 포트, 모델명을 저장하는 환경 변수 파일입니다.
- `.env.example`
  `.env` 작성 예시 파일입니다.
- `package.json`
  백엔드 실행 스크립트(`npm run dev`, `npm start`)를 정의합니다.

### `frontend/`

사용자가 가계부를 입력하고 AI 투자 조언을 요청하는 React + Vite 프론트엔드 폴더입니다.

- `src/`
  화면 로직이 들어 있는 소스 코드 폴더입니다.
  현재 핵심 화면은 `src/App.jsx`에서 관리합니다.
- `public/`
  정적 파일(`favicon`, 아이콘 등)을 보관합니다.
- `dist/`
  프론트엔드 빌드 결과물이 생성되는 폴더입니다.
- `node_modules/`
  프론트엔드 의존성이 설치되는 폴더입니다.
- `index.html`
  Vite 앱의 HTML 진입 파일입니다.
- `vite.config.js`
  Vite 설정 파일이며, `/api` 요청을 백엔드로 프록시합니다.
- `package.json`
  프론트엔드 개발/빌드 스크립트와 의존성을 정의합니다.
- `README.md`
  Vite 기본 안내 문서입니다.

## 실행 방식

### 백엔드 실행

```bash
cd backend
npm run dev
```

### 프론트엔드 실행

```bash
cd frontend
npm run dev
```

## 참고

- 실제 Gemini API 키는 `backend/.env`에 넣어야 합니다.
- 프론트엔드는 가계부 데이터와 사용자 투자 조건을 백엔드에 전달하고, 백엔드는 Gemini 응답을 다시 프론트에 반환합니다.
