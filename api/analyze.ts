import type { VercelRequest, VercelResponse } from '@vercel/node';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

type Position = 'designer' | 'frontend' | 'backend' | 'fullstack' | 'pm' | 'marketer' | 'other';
type Experience = 'junior' | 'mid' | 'senior';

interface RequestBody {
  file: {
    uri: string;
    name: string;
    type: 'image' | 'pdf';
    mimeType: string;
    base64: string;
  };
  files?: Array<{
    uri: string;
    name: string;
    type: 'image' | 'pdf';
    mimeType: string;
    base64: string;
  }>;
  company: {
    id: string;
    name: string;
    industry: string;
    interviewFocus: string[];
    portfolioTips: string[];
    commonQuestions: string[];
  };
  position: Position;
  experience: Experience;
  conversationHistory: Array<{
    id: string;
    role: 'user' | 'assistant';
    content: string;
  }>;
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

    if (!body.file || !body.company || !body.position || !body.experience) {
      return res.status(400).json({ error: '파일, 회사, 직무, 경력 정보가 필요합니다.' });
    }

    // 직무와 경력에 따른 설명
    const positionNames: Record<Position, string> = {
      designer: '디자이너(UI/UX, 그래픽, 제품)',
      frontend: '프론트엔드 개발자',
      backend: '백엔드 개발자',
      fullstack: '풀스택 개발자',
      pm: '기획자(PM/PO)',
      marketer: '마케터',
      other: '기타',
    };

    const experienceNames: Record<Experience, string> = {
      junior: '신입~주니어(0-3년)',
      mid: '미드레벨(3-7년)',
      senior: '시니어(7년+)',
    };

    const experienceLevels: Record<Experience, string> = {
      junior: `신입~주니어 (0-3년) 수준에 맞는 질문:
- 기본적인 도구와 프로세스 이해도 확인
- 프로젝트에서 맡은 역할과 구체적으로 한 작업 질문
- 어려웠던 점과 어떻게 해결했는지 물어보기
- 학습 과정과 성장 의지 확인
- 예시: "이 프로젝트에서 어떤 부분을 직접 담당하셨나요?", "어려웠던 점은 무엇이었고 어떻게 해결하셨어요?"`,
      mid: `미드레벨 (3-7년) 수준에 맞는 질문:
- 프로젝트 전체를 주도한 경험 확인
- 기술적/디자인적 의사결정 과정 질문
- 팀원들과의 협업 방식과 커뮤니케이션
- 데이터 기반 개선 사례 요구
- 예시: "왜 이런 기술/디자인을 선택하셨나요?", "팀과 어떻게 협업하셨나요?", "성과를 수치로 말씀해주실 수 있나요?"`,
      senior: `시니어 (7년+) 수준에 맞는 질문:
- 전체 시스템 아키텍처 설계 경험
- 비즈니스 임팩트와 조직 전체에 미친 영향
- 팀 리딩과 기술적 의사결정의 근거
- 장기적 관점의 전략적 판단
- 예시: "어떤 기준으로 아키텍처를 설계하셨나요?", "비즈니스에 어떤 임팩트를 주었나요?", "팀을 어떻게 리드하셨나요?"`,
    };

    // 시스템 프롬프트 생성
    const systemPrompt = `당신은 ${body.company.name}에 지원하는 지원자의 포트폴리오를 검토하는 전문 면접관입니다.

**중요: 모든 답변은 반드시 한국어로 작성해야 합니다.**

**지원자 정보:**
- 지원 직무: ${positionNames[body.position]}
- 경력 수준: ${experienceNames[body.experience]}

**경력 수준별 평가 기준:**
${experienceLevels[body.experience]}

**이미지 처리 지침:**
- 제공된 이미지는 취업 지원을 위한 포트폴리오입니다.
- 디자인, 프로젝트, UI/UX, 개발 결과물 등 전문적인 작업물을 포함합니다.
- 이미지에 개인정보가 포함될 수 있지만, 포트폴리오 검토 목적으로만 사용됩니다.
- 안전하고 건설적인 피드백을 제공하는 것이 목적입니다.

회사 정보:
- 회사명: ${body.company.name}
- 산업: ${body.company.industry}
- 면접 중점사항: ${body.company.interviewFocus.join(', ')}

검토 가이드라인:
${body.company.portfolioTips.map((tip, i) => `${i + 1}. ${tip}`).join('\n')}

당신의 역할:
1. 포트폴리오를 ${body.company.name}의 채용 기준에 맞춰 객관적으로 평가
2. 구체적이고 실행 가능한 피드백 제공
3. 실제 면접에서 나올 수 있는 질문을 던지며 대화 진행
4. 개선이 필요한 부분은 명확히 지적하되, 건설적인 조언 제공
5. 데이터, 성과 지표, 구체적인 사례를 요구

대화 스타일:
- **첫 인사는 친근하게**: "안녕하세요 :) 반갑습니다. 편안하게 커피챗 한다고 생각하시고 임해주시면 됩니다 ㅎㅎ"
- 친근하지만 전문적인 톤 유지
- 한 번에 1-2개의 핵심 질문만 던지기
- 지원자의 답변을 바탕으로 심화 질문 진행
- 이모티콘(:), ㅎㅎ) 등을 자연스럽게 사용하여 편안한 분위기 조성
- **모든 응답을 한국어로 작성**

첫 메시지 구조:
1. 친근한 인사 (예: "안녕하세요 :) 반갑습니다")
2. 편안한 분위기 조성 (예: "커피챗 한다고 생각하시고 편하게 말씀해주세요")
3. 포트폴리오에서 인상 깊었던 점 간단히 언급
4. 자연스럽게 질문으로 이어가기`;

    // 대화 히스토리 변환
    const messages: OpenAI.ChatCompletionMessageParam[] = [
      {
        role: 'system',
        content: systemPrompt,
      },
    ];

    // 첫 메시지에 이미지/PDF 포함
    if (body.conversationHistory.length === 0) {
      // 초기 분석 요청
      if (body.file.type === 'image') {
        const hasMultipleFiles = body.files && body.files.length > 1;

        if (hasMultipleFiles) {
          // 여러 이미지가 있는 경우
          const content: any[] = [
            {
              type: 'text',
              text: `${body.company.name} 면접관입니다. 포트폴리오를 확인했습니다.

친근하게 인사로 시작해주세요:
"안녕하세요 :) 반갑습니다. 편안하게 커피챗 한다고 생각하시고 임해주시면 됩니다 ㅎㅎ"

그 다음 포트폴리오에서 인상 깊었던 부분을 간단히 언급하고, 자연스럽게 1-2개의 질문으로 이어가주세요.`,
            },
          ];

          // 모든 이미지를 content에 추가
          body.files!.forEach(file => {
            content.push({
              type: 'image_url',
              image_url: {
                url: `data:${file.mimeType};base64,${file.base64}`,
              },
            });
          });

          messages.push({
            role: 'user',
            content,
          });
        } else {
          // 단일 이미지
          messages.push({
            role: 'user',
            content: [
              {
                type: 'text',
                text: `${body.company.name} 면접관입니다. 포트폴리오를 확인했습니다.

친근하게 인사로 시작해주세요:
"안녕하세요 :) 반갑습니다. 편안하게 커피챗 한다고 생각하시고 임해주시면 됩니다 ㅎㅎ"

그 다음 포트폴리오에서 인상 깊었던 부분을 간단히 언급하고, 자연스럽게 1-2개의 질문으로 이어가주세요.`,
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:${file.mimeType};base64,${file.base64}`,
                },
              },
            ],
          });
        }
      } else {
        // PDF의 경우 텍스트로만 처리 (GPT-4 Vision은 PDF를 직접 읽지 못함)
        messages.push({
          role: 'user',
          content: `${body.company.name} 면접관입니다. PDF 포트폴리오를 확인했습니다.

친근하게 인사로 시작해주세요:
"안녕하세요 :) 반갑습니다. 편안하게 커피챗 한다고 생각하시고 임해주시면 됩니다 ㅎㅎ"

그 다음 자연스럽게 1-2개의 질문으로 이어가주세요.`,
        });
      }
    } else {
      // 대화 히스토리 추가
      body.conversationHistory.forEach((msg) => {
        messages.push({
          role: msg.role,
          content: msg.content,
        });
      });
    }

    // OpenAI API 호출
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages,
      max_tokens: 1000,
      temperature: 0.7,
    });

    const assistantMessage = completion.choices[0]?.message?.content || '응답을 생성할 수 없습니다.';

    // OpenAI의 안전 필터 거부 감지
    if (completion.choices[0]?.finish_reason === 'content_filter') {
      return res.status(400).json({
        error: '업로드된 이미지가 콘텐츠 정책에 위배됩니다. 다른 이미지를 사용해주세요.',
      });
    }

    // "I'm sorry" 같은 거부 메시지 감지
    if (assistantMessage.toLowerCase().includes("i'm sorry") ||
        assistantMessage.toLowerCase().includes("i can't assist")) {
      return res.status(400).json({
        error: '이미지 분석이 거부되었습니다. 포트폴리오 내용만 포함된 이미지를 사용해주세요.',
      });
    }

    return res.status(200).json({
      message: assistantMessage,
    });
  } catch (error: any) {
    console.error('Error in analyze API:', error);
    return res.status(500).json({
      error: error.message || '분석 중 오류가 발생했습니다.',
    });
  }
}
