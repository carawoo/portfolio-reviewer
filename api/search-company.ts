import type { VercelRequest, VercelResponse } from '@vercel/node';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface RequestBody {
  companyName: string;
  position?: string;
  jobPosting?: string;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS 헤더 설정
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  // OPTIONS 요청 처리
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body: RequestBody = req.body;

    if (!body.companyName || !body.companyName.trim()) {
      return res.status(400).json({ error: '회사명이 필요합니다.' });
    }

    const companyName = body.companyName.trim();
    const position = body.position || '';
    const jobPosting = body.jobPosting?.trim() || '';

    // OpenAI를 사용하여 회사 정보 생성
    const prompt = `당신은 채용 전문가입니다. "${companyName}"라는 회사에 대한 면접 준비 정보를 생성해주세요.
${position ? `직무는 "${position}"입니다.` : ''}

${jobPosting ? `**채용 공고 내용:**
"""
${jobPosting}
"""

위 채용 공고를 분석하여 회사가 중요하게 생각하는 역량, 면접에서 중점적으로 볼 항목, 포트폴리오 작성 팁, 예상 질문을 생성해주세요.
` : ''}

다음 정보를 JSON 형식으로 제공해주세요:

{
  "industry": "산업 분야 (예: IT, 제조, 금융, 스타트업)",
  "interviewFocus": ["면접에서 중점적으로 보는 항목 3-4개"],
  "portfolioTips": ["포트폴리오 작성 팁 3-4개"],
  "commonQuestions": ["예상 면접 질문 3-5개"]
}

**중요 지침:**
1. 회사 이름을 기반으로 실제 회사라면 그 회사의 특성을 반영하고, 모르는 회사라면 일반적이고 실용적인 정보를 제공하세요
2. interviewFocus는 구체적이고 실용적이어야 합니다 (예: "문제 해결 능력", "협업 역량", "기술적 깊이")
3. portfolioTips는 실행 가능한 조언이어야 합니다
4. commonQuestions는 실제 면접에서 나올 법한 질문이어야 합니다
5. 모든 내용은 한국어로 작성하세요
6. 반드시 유효한 JSON 형식으로만 응답하세요 (다른 설명 없이)`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: '당신은 채용 및 면접 전문가입니다. 회사 정보를 바탕으로 면접 준비에 필요한 정보를 JSON 형식으로 제공합니다.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 1000,
    });

    const responseText = completion.choices[0]?.message?.content || '';

    // JSON 파싱
    let companyInfo;
    try {
      // 마크다운 코드 블록 제거
      const jsonText = responseText
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();

      companyInfo = JSON.parse(jsonText);
    } catch (parseError) {
      console.error('JSON 파싱 실패:', responseText);
      return res.status(500).json({ error: '회사 정보를 생성하는 중 오류가 발생했습니다.' });
    }

    // 응답 검증
    if (!companyInfo.industry || !companyInfo.interviewFocus || !companyInfo.portfolioTips || !companyInfo.commonQuestions) {
      return res.status(500).json({ error: '불완전한 회사 정보가 생성되었습니다.' });
    }

    return res.status(200).json({
      company: {
        id: 'custom',
        name: companyName,
        industry: companyInfo.industry,
        interviewFocus: companyInfo.interviewFocus,
        portfolioTips: companyInfo.portfolioTips,
        commonQuestions: companyInfo.commonQuestions,
      },
    });
  } catch (error: any) {
    console.error('Error in search-company API:', error);
    return res.status(500).json({
      error: error.message || '회사 정보를 검색하는 중 오류가 발생했습니다.',
    });
  }
}
