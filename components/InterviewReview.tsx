import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { Message, Company, Position, Experience } from '../types';

interface InterviewReviewProps {
  messages: Message[];
  company: Company;
  position: Position;
  experience: Experience;
  onSave: (difficultQuestionIds: string[]) => void;
  onClose: () => void;
}

export const InterviewReview: React.FC<InterviewReviewProps> = ({
  messages,
  company,
  position,
  experience,
  onSave,
  onClose,
}) => {
  const [difficultQuestions, setDifficultQuestions] = useState<Set<string>>(new Set());

  const assistantMessages = messages.filter(msg => msg.role === 'assistant');

  const toggleDifficult = (messageId: string) => {
    const newSet = new Set(difficultQuestions);
    if (newSet.has(messageId)) {
      newSet.delete(messageId);
    } else {
      newSet.add(messageId);
    }
    setDifficultQuestions(newSet);
  };

  const handleSave = () => {
    onSave(Array.from(difficultQuestions));
  };

  const positionNames = {
    designer: '디자이너',
    frontend: '프론트엔드',
    backend: '백엔드',
    fullstack: '풀스택',
    pm: '기획자',
    marketer: '마케터',
    other: '기타',
  };

  const experienceNames = {
    junior: '신입~주니어',
    mid: '미드레벨',
    senior: '시니어',
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>면접 복습하기</Text>
        <Text style={styles.subtitle}>
          {company.name} · {positionNames[position]} · {experienceNames[experience]}
        </Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.instructionBox}>
          <Text style={styles.instructionTitle}>💡 복습 팁</Text>
          <Text style={styles.instructionText}>
            어려웠던 질문을 체크하면 나중에 따로 모아서 볼 수 있어요.
          </Text>
        </View>

        <Text style={styles.sectionTitle}>면접 질문 ({assistantMessages.length}개)</Text>

        {assistantMessages.map((msg, index) => {
          const isDifficult = difficultQuestions.has(msg.id);
          const userResponse = messages.find(
            (m, i) => m.role === 'user' && i > messages.indexOf(msg)
          );

          return (
            <View key={msg.id} style={styles.questionCard}>
              <View style={styles.questionHeader}>
                <Text style={styles.questionNumber}>Q{index + 1}</Text>
                <TouchableOpacity
                  style={[styles.difficultyButton, isDifficult && styles.difficultyButtonActive]}
                  onPress={() => toggleDifficult(msg.id)}
                >
                  <Text style={[styles.difficultyText, isDifficult && styles.difficultyTextActive]}>
                    {isDifficult ? '✓ 어려웠음' : '어려웠나요?'}
                  </Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.questionText}>{msg.content}</Text>

              {userResponse && (
                <View style={styles.answerBox}>
                  <Text style={styles.answerLabel}>내 답변</Text>
                  <Text style={styles.answerText}>{userResponse.content}</Text>
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.continueButton} onPress={onClose}>
          <Text style={styles.continueButtonText}>계속 대화하기</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
          <Text style={styles.saveButtonText}>
            {difficultQuestions.size > 0
              ? `저장하기 (${difficultQuestions.size}개 체크됨)`
              : '저장하기'}
          </Text>
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
    padding: 24,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#666666',
  },
  content: {
    flex: 1,
    padding: 24,
  },
  instructionBox: {
    backgroundColor: '#F0F7FF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    borderLeftWidth: 4,
    borderLeftColor: '#0066FF',
  },
  instructionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 8,
  },
  instructionText: {
    fontSize: 14,
    color: '#333333',
    lineHeight: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 16,
  },
  questionCard: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  questionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  questionNumber: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0066FF',
  },
  difficultyButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  difficultyButtonActive: {
    backgroundColor: '#FFF3E0',
    borderColor: '#FF9800',
  },
  difficultyText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666666',
  },
  difficultyTextActive: {
    color: '#FF9800',
  },
  questionText: {
    fontSize: 15,
    color: '#000000',
    lineHeight: 22,
    marginBottom: 12,
  },
  answerBox: {
    backgroundColor: '#F8F9FA',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  answerLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666666',
    marginBottom: 6,
  },
  answerText: {
    fontSize: 14,
    color: '#333333',
    lineHeight: 20,
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
    padding: 24,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  continueButton: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  continueButtonText: {
    color: '#666666',
    fontSize: 15,
    fontWeight: '600',
  },
  saveButton: {
    flex: 2,
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
