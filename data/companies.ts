import { Company } from '../types';

export const companies: Company[] = [
  {
    id: 'kakao',
    name: '카카오',
    industry: 'IT/인터넷',
    interviewFocus: [
      '사용자 중심 사고',
      '협업 능력',
      '기술적 깊이',
      '문제 해결 능력',
      '서비스 개선 경험'
    ],
    portfolioTips: [
      '대규모 사용자를 고려한 설계 경험 강조',
      '데이터 기반 의사결정 사례 포함',
      '팀 협업 과정과 역할 명확히 기술',
      '성과 지표(MAU, 전환율 등) 구체적으로 제시',
      '기술 스택 선택 이유와 트레이드오프 설명'
    ],
    commonQuestions: [
      '프로젝트에서 가장 어려웠던 기술적 챌린지는 무엇이었나요?',
      '사용자 피드백을 어떻게 반영했나요?',
      '팀원들과 의견 충돌이 있을 때 어떻게 해결했나요?',
      '이 프로젝트의 핵심 성과 지표는 무엇인가요?'
    ]
  },
  {
    id: 'naver',
    name: '네이버',
    industry: 'IT/인터넷',
    interviewFocus: [
      '기술력',
      '확장 가능한 설계',
      '코드 품질',
      '성능 최적화',
      '문제 정의 능력'
    ],
    portfolioTips: [
      '기술적 깊이와 구현 디테일 상세히 작성',
      '성능 개선 전후 비교 데이터 포함',
      '확장성을 고려한 아키텍처 설명',
      '코드 품질 향상을 위한 노력(테스트, 리팩토링 등)',
      '기술 블로그나 오픈소스 기여 경험 추가'
    ],
    commonQuestions: [
      '이 시스템의 병목 구간은 어디였고 어떻게 개선했나요?',
      '왜 이 기술 스택을 선택했나요?',
      '코드 리뷰는 어떻게 진행했나요?',
      '트래픽이 10배 증가하면 어떤 문제가 발생할까요?'
    ]
  },
  {
    id: 'toss',
    name: '토스',
    industry: 'Fintech',
    interviewFocus: [
      '사용자 경험',
      '디테일에 대한 집착',
      '빠른 실행력',
      '데이터 기반 사고',
      '고객 가치 창출'
    ],
    portfolioTips: [
      'UI/UX 개선 과정과 이유 상세히 설명',
      'A/B 테스트 등 실험 문화 경험 강조',
      '빠른 이터레이션과 개선 사례',
      '사용자 행동 데이터 분석 경험',
      '간결하고 직관적인 인터페이스 디자인 사례'
    ],
    commonQuestions: [
      '사용자가 이 기능을 왜 사용해야 하나요?',
      'UI 개선의 효과를 어떻게 측정했나요?',
      '가장 많이 개선한 부분과 그 이유는?',
      '출시 후 예상치 못한 사용 패턴이 있었나요?'
    ]
  },
  {
    id: 'coupang',
    name: '쿠팡',
    industry: 'E-commerce/Tech',
    interviewFocus: [
      '대규모 시스템 경험',
      '문제 해결 능력',
      '오너십',
      '데이터 기반 의사결정',
      '고객 중심 사고'
    ],
    portfolioTips: [
      '대용량 트래픽 처리 경험',
      '시스템 안정성 개선 사례',
      '모니터링 및 장애 대응 경험',
      '비즈니스 임팩트 구체적 수치로 제시',
      'End-to-end 프로젝트 오너십 경험'
    ],
    commonQuestions: [
      '장애 상황에서 어떻게 대응했나요?',
      '시스템 모니터링은 어떻게 구축했나요?',
      '프로젝트의 비즈니스 임팩트는 무엇인가요?',
      '레거시 시스템 개선 경험이 있나요?'
    ]
  },
  {
    id: 'startup',
    name: '스타트업(일반)',
    industry: 'Startup',
    interviewFocus: [
      '빠른 학습 능력',
      '다양한 역할 수행',
      '주도적 문제 해결',
      '제품 마인드',
      '커뮤니케이션'
    ],
    portfolioTips: [
      '0→1 프로젝트 경험 강조',
      '제한된 리소스에서의 문제 해결',
      '다양한 기술 스택 활용 능력',
      '빠른 MVP 개발 및 피벗 경험',
      '비개발 영역(기획, 디자인 등) 협업 경험'
    ],
    commonQuestions: [
      '혼자서 프로젝트를 완성한 경험이 있나요?',
      '새로운 기술을 빠르게 학습한 사례는?',
      '제한된 시간에 우선순위를 어떻게 정했나요?',
      '실패한 프로젝트에서 무엇을 배웠나요?'
    ]
  },
  {
    id: 'samsung',
    name: '삼성전자',
    industry: '전자/제조',
    interviewFocus: [
      '기술 전문성',
      '연구 개발 역량',
      '협업 및 커뮤니케이션',
      '글로벌 마인드',
      '혁신성'
    ],
    portfolioTips: [
      '하드웨어/소프트웨어 통합 경험',
      '특허나 논문 등 연구 성과',
      '글로벌 프로젝트 경험',
      '최신 기술 트렌드 적용 사례',
      '체계적인 문서화 능력'
    ],
    commonQuestions: [
      '최신 기술 트렌드 중 관심 있는 분야는?',
      '연구 프로젝트의 독창성은 무엇인가요?',
      '글로벌 팀과 협업한 경험이 있나요?',
      '기술적 난제를 어떻게 해결했나요?'
    ]
  }
];

export const getCompanyById = (id: string): Company | undefined => {
  return companies.find(company => company.id === id);
};

export const getCompanyByName = (name: string): Company | undefined => {
  return companies.find(company =>
    company.name.toLowerCase().includes(name.toLowerCase())
  );
};
