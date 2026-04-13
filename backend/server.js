import { createServer } from 'node:http';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function loadEnvFile(filePath) {
  if (!existsSync(filePath)) {
    return;
  }

  const raw = readFileSync(filePath, 'utf8');
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    let value = trimmed.slice(separatorIndex + 1).trim();

    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }

    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

loadEnvFile(resolve(process.cwd(), '.env'));

const PORT = Number(process.env.PORT || 3001);
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.0-flash';

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  });
  response.end(JSON.stringify(payload));
}

function summarizeTransactions(transactions = []) {
  return transactions
    .map((item) => `${item.date} | ${item.type} | ${item.category} | ${item.amount}원 | ${item.memo || '메모 없음'}`)
    .join('\n');
}

async function createAdvice(payload) {
  if (!GEMINI_API_KEY) {
    throw new Error('backend/.env 파일에 GEMINI_API_KEY를 설정해 주세요.');
  }

  const prompt = `
사용자의 재정 상태를 바탕으로 한국어로 주식 투자 조언을 작성해 주세요.
반드시 아래 형식을 지켜 주세요.

1. 핵심 진단
2. 추천 투자 방향
3. 주의할 점
4. 한 줄 요약

조건:
- 실제 투자 판단은 본인 책임이라는 짧은 안내를 포함합니다.
- 개별 종목 추천만 하지 말고 ETF, 분산 투자, 현금 비중 같은 현실적인 전략을 설명합니다.
- 공격적인 수익 약속 표현은 금지합니다.
- 문단과 bullet을 적절히 섞어 350자 이상 700자 이하로 작성합니다.

[사용자 프로필]
- 나이: ${payload.profile.age ?? '미입력'}
- 월 투자 가능 금액: ${payload.profile.monthlyInvestment}원
- 위험 성향: ${payload.profile.riskLevel}
- 투자 목표: ${payload.profile.investmentGoal || '미입력'}

[재정 요약]
- 현재 잔액: ${payload.financialSummary.balance}원
- 총 수입: ${payload.financialSummary.totalIncome}원
- 총 지출: ${payload.financialSummary.totalExpense}원
- 월평균 수입: ${payload.financialSummary.averageMonthlyIncome}원
- 월평균 지출: ${payload.financialSummary.averageMonthlyExpense}원
- 입력된 거래 수: ${payload.financialSummary.transactionCount}건

[최근 거래]
${summarizeTransactions(payload.financialSummary.recentTransactions)}
`.trim();

  const geminiResponse = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [{ text: prompt }],
          },
        ],
      }),
    },
  );

  const data = await geminiResponse.json();
  if (!geminiResponse.ok) {
    throw new Error(data?.error?.message || 'Gemini API 호출에 실패했습니다.');
  }

  const advice = data?.candidates?.[0]?.content?.parts?.map((part) => part.text).join('\n').trim();
  if (!advice) {
    throw new Error('Gemini 응답에서 투자 조언 텍스트를 찾지 못했습니다.');
  }

  return advice;
}

const server = createServer(async (request, response) => {
  if (request.method === 'OPTIONS') {
    sendJson(response, 204, {});
    return;
  }

  if (request.method === 'GET' && request.url === '/health') {
    sendJson(response, 200, { ok: true });
    return;
  }

  if (request.method === 'POST' && request.url === '/api/investment-advice') {
    try {
      let body = '';
      for await (const chunk of request) {
        body += chunk;
      }

      const payload = JSON.parse(body || '{}');
      if (!payload?.profile?.monthlyInvestment) {
        sendJson(response, 400, { error: '월 투자 가능 금액은 필수입니다.' });
        return;
      }

      const advice = await createAdvice(payload);
      sendJson(response, 200, { advice });
    } catch (error) {
      sendJson(response, 500, { error: error.message || '서버 오류가 발생했습니다.' });
    }
    return;
  }

  sendJson(response, 404, { error: 'Not found' });
});

server.listen(PORT, () => {
  console.log(`Gemini backend listening on http://localhost:${PORT}`);
});
