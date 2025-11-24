import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';

interface EvaluationCategory {
  name: string;
  maxScore: number;
  items: EvaluationItem[];
}

interface EvaluationItem {
  id: string;
  description: string;
  points: number;
  examples?: string[];
}

const evaluationCriteria: EvaluationCategory[] = [
  {
    name: '1. 사전 준비',
    maxScore: 20,
    items: [
      {
        id: 'company_research',
        description: '회사 정보 충분히 조사 (연혁·사업·재무·뉴스·JD 분석)',
        points: 10,
        examples: [
          '회사의 최근 뉴스나 사업 방향을 언급',
          'JD의 키워드와 연결하여 준비',
        ],
      },
      {
        id: 'resume_mastery',
        description: '이력서 항목을 1분 내 설명 가능하도록 준비',
        points: 10,
        examples: [
          '각 경력 항목의 핵심을 명확히 설명',
          'JD와 겹치는 키워드 경험 강조',
        ],
      },
    ],
  },
  {
    name: '2. 인터뷰 문답',
    maxScore: 60,
    items: [
      {
        id: 'self_intro',
        description: '자기소개: 키워드 중심, 경험→성과→강점 흐름, 1분 이내',
        points: 10,
        examples: [
          '팩트 중심으로 간결하게 어필',
          '과한 미사어구 없이 핵심만 전달',
        ],
      },
      {
        id: 'core_questions',
        description: 'JD 핵심 키워드 질문: 개인 역할·경험·역량 명확히 설명',
        points: 20,
        examples: [
          '조직 성과가 아닌 개인의 기여 설명',
          '회사 니즈에 맞는 솔루션 제시',
        ],
      },
      {
        id: 'common_questions',
        description: '기출 문제 대답 (지원동기, 장단점, 성공/실패 사례)',
        points: 20,
        examples: [
          '지원동기: 미래 희망 중심, 부정적 언급 회피',
          '장점: 태도→행동→결과 흐름',
          '단점: 개선 증거와 함께 제시',
          '성공/실패: 구체적 사례와 배운 점',
        ],
      },
      {
        id: 'final_question',
        description: '마지막 질문: 회사 비전·성장 패스·인사이트 있는 질문',
        points: 10,
        examples: [
          '회사의 미래 방향성 질문',
          '장기 성장 의지 표현',
          '워라벨·휴가 질문 지양',
        ],
      },
    ],
  },
  {
    name: '3. 태도',
    maxScore: 20,
    items: [
      {
        id: 'answer_style',
        description: '대답 방식: 두괄식, 간결함, 구체적 숫자·성과, 긍정형 마무리',
        points: 15,
        examples: [
          '평소보다 느린 속도로 안정감 있게',
          '모호한 말 대신 숫자로 구체화',
          '부정형으로 끝내지 않기',
          '1~2초 생각 정리 후 대답',
        ],
      },
      {
        id: 'behavior',
        description: '행동 태도: 자세·눈맞춤·밝은 표정·장기 성장 의지',
        points: 5,
        examples: [
          '앞쪽에 앉아 눈 맞추기',
          '밝은 표정과 가벼운 고개 끄덕임',
          '간보는 태도 지양',
        ],
      },
    ],
  },
];

interface InterviewScoreProps {
  onClose: () => void;
  onSaveScore?: (score: number, feedback: string) => void;
}

export const InterviewScore: React.FC<InterviewScoreProps> = ({ onClose, onSaveScore }) => {
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [showExamples, setShowExamples] = useState<Set<string>>(new Set());

  const toggleItem = (itemId: string) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(itemId)) {
      newSelected.delete(itemId);
    } else {
      newSelected.add(itemId);
    }
    setSelectedItems(newSelected);
  };

  const toggleExamples = (itemId: string) => {
    const newShow = new Set(showExamples);
    if (newShow.has(itemId)) {
      newShow.delete(itemId);
    } else {
      newShow.add(itemId);
    }
    setShowExamples(newShow);
  };

  const calculateScore = () => {
    let totalScore = 0;
    evaluationCriteria.forEach((category) => {
      category.items.forEach((item) => {
        if (selectedItems.has(item.id)) {
          totalScore += item.points;
        }
      });
    });
    return totalScore;
  };

  const getCategoryScore = (category: EvaluationCategory) => {
    let score = 0;
    category.items.forEach((item) => {
      if (selectedItems.has(item.id)) {
        score += item.points;
      }
    });
    return score;
  };

  const generateFeedback = (score: number): string => {
    if (score >= 90) {
      return '🎉 완벽한 면접입니다! 합격 가능성이 매우 높습니다.';
    } else if (score >= 80) {
      return '✨ 우수한 면접입니다. 좋은 인상을 남겼을 것입니다.';
    } else if (score >= 70) {
      return '👍 양호한 면접입니다. 몇 가지만 보완하면 더 좋을 것 같습니다.';
    } else if (score >= 60) {
      return '📝 보통 수준입니다. 부족한 부분을 보완해보세요.';
    } else {
      return '💪 더 많은 준비가 필요합니다. 체크리스트를 참고해 재준비하세요.';
    }
  };

  const currentScore = calculateScore();
  const feedback = generateFeedback(currentScore);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>면접 합격 예상 점수</Text>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Text style={styles.closeButtonText}>✕</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.scorePanel}>
        <Text style={styles.scoreLarge}>{currentScore}</Text>
        <Text style={styles.scoreUnit}>/ 100점</Text>
        <Text style={styles.feedback}>{feedback}</Text>
      </View>

      <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.instruction}>
          ✓ 면접에서 잘 수행한 항목을 체크해주세요
        </Text>

        {evaluationCriteria.map((category, catIndex) => (
          <View key={catIndex} style={styles.categoryCard}>
            <View style={styles.categoryHeader}>
              <Text style={styles.categoryTitle}>{category.name}</Text>
              <Text style={styles.categoryScore}>
                {getCategoryScore(category)} / {category.maxScore}점
              </Text>
            </View>

            {category.items.map((item) => (
              <View key={item.id} style={styles.itemContainer}>
                <TouchableOpacity
                  style={styles.checkboxRow}
                  onPress={() => toggleItem(item.id)}
                  activeOpacity={0.7}
                >
                  <View
                    style={[
                      styles.checkbox,
                      selectedItems.has(item.id) && styles.checkboxChecked,
                    ]}
                  >
                    {selectedItems.has(item.id) && (
                      <Text style={styles.checkmark}>✓</Text>
                    )}
                  </View>
                  <View style={styles.itemTextContainer}>
                    <Text style={styles.itemDescription}>{item.description}</Text>
                    <Text style={styles.itemPoints}>{item.points}점</Text>
                  </View>
                </TouchableOpacity>

                {item.examples && item.examples.length > 0 && (
                  <>
                    <TouchableOpacity
                      style={styles.exampleToggle}
                      onPress={() => toggleExamples(item.id)}
                    >
                      <Text style={styles.exampleToggleText}>
                        {showExamples.has(item.id) ? '▼ 예시 숨기기' : '▶ 예시 보기'}
                      </Text>
                    </TouchableOpacity>
                    {showExamples.has(item.id) && (
                      <View style={styles.examplesContainer}>
                        {item.examples.map((example, idx) => (
                          <Text key={idx} style={styles.exampleText}>
                            • {example}
                          </Text>
                        ))}
                      </View>
                    )}
                  </>
                )}
              </View>
            ))}
          </View>
        ))}

        <View style={styles.bottomSpacer} />
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.saveButton}
          onPress={() => {
            if (onSaveScore) {
              onSaveScore(currentScore, feedback);
            }
            onClose();
          }}
        >
          <Text style={styles.saveButtonText}>점수 저장하고 닫기</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000000',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    fontSize: 18,
    color: '#666666',
  },
  scorePanel: {
    backgroundColor: '#000000',
    paddingVertical: 32,
    alignItems: 'center',
  },
  scoreLarge: {
    fontSize: 64,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -2,
  },
  scoreUnit: {
    fontSize: 18,
    color: '#CCCCCC',
    marginTop: -8,
  },
  feedback: {
    fontSize: 16,
    color: '#FFFFFF',
    marginTop: 16,
    fontWeight: '600',
  },
  scrollContent: {
    flex: 1,
    paddingHorizontal: 24,
  },
  instruction: {
    fontSize: 14,
    color: '#666666',
    marginTop: 24,
    marginBottom: 16,
    lineHeight: 20,
  },
  categoryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 2,
    borderBottomColor: '#F0F0F0',
  },
  categoryTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000000',
  },
  categoryScore: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0066FF',
  },
  itemContainer: {
    marginBottom: 16,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#CCCCCC',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  checkboxChecked: {
    backgroundColor: '#000000',
    borderColor: '#000000',
  },
  checkmark: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  itemTextContainer: {
    flex: 1,
  },
  itemDescription: {
    fontSize: 15,
    color: '#000000',
    lineHeight: 22,
    marginBottom: 4,
  },
  itemPoints: {
    fontSize: 13,
    color: '#0066FF',
    fontWeight: '600',
  },
  exampleToggle: {
    marginLeft: 36,
    marginTop: 8,
  },
  exampleToggleText: {
    fontSize: 13,
    color: '#666666',
    fontWeight: '500',
  },
  examplesContainer: {
    marginLeft: 36,
    marginTop: 8,
    paddingLeft: 12,
    borderLeftWidth: 2,
    borderLeftColor: '#E0E0E0',
  },
  exampleText: {
    fontSize: 13,
    color: '#666666',
    lineHeight: 20,
    marginBottom: 4,
  },
  bottomSpacer: {
    height: 24,
  },
  footer: {
    padding: 24,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  saveButton: {
    backgroundColor: '#000000',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
