import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  ActivityIndicator,
} from 'react-native';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../services/firebase';
import { Position, Experience } from '../types';

interface InterviewData {
  id: string;
  company: {
    name: string;
    industry: string;
    interviewFocus?: string[];
  };
  position: Position;
  experience: Experience;
  messages: Array<{
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
  }>;
  difficultQuestions: string[];
  fileCount?: number;
  createdAt: Date;
}

interface AdminPanelProps {
  onClose: () => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ onClose }) => {
  const [interviews, setInterviews] = useState<InterviewData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedInterview, setSelectedInterview] = useState<InterviewData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadInterviews();
  }, []);

  const loadInterviews = async () => {
    try {
      setLoading(true);
      setError(null);

      const q = query(collection(db, 'interviews'), orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);

      const data: InterviewData[] = querySnapshot.docs.map((doc) => {
        const docData = doc.data();
        return {
          id: doc.id,
          company: docData.company,
          position: docData.position,
          experience: docData.experience,
          messages: docData.messages.map((m: any) => ({
            role: m.role,
            content: m.content,
            timestamp: m.timestamp?.toDate() || new Date(),
          })),
          difficultQuestions: docData.difficultQuestions || [],
          fileCount: docData.fileCount || 0,
          createdAt: docData.createdAt?.toDate() || new Date(),
        };
      });

      setInterviews(data);
    } catch (err: any) {
      console.error('Failed to load interviews:', err);
      setError(err.message || '데이터를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const positionNames: Record<Position, string> = {
    designer: '디자이너',
    frontend: '프론트엔드',
    backend: '백엔드',
    fullstack: '풀스택',
    pm: '기획자',
    marketer: '마케터',
    other: '기타',
  };

  const experienceNames: Record<Experience, string> = {
    junior: '신입~주니어',
    mid: '미드레벨',
    senior: '시니어',
  };

  // 이미지 URL 추출 (메시지 내용에서)
  const extractImageUrls = (messages: InterviewData['messages']): string[] => {
    const urls: string[] = [];
    const urlRegex = /(https?:\/\/[^\s]+\.(jpg|jpeg|png|gif|webp))/gi;

    messages.forEach((msg) => {
      const matches = msg.content.match(urlRegex);
      if (matches) {
        urls.push(...matches);
      }
    });

    return urls;
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>관리자 패널</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#000000" />
          <Text style={styles.loadingText}>데이터 로딩 중...</Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>관리자 패널</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>❌ {error}</Text>
          <TouchableOpacity onPress={loadInterviews} style={styles.retryButton}>
            <Text style={styles.retryButtonText}>다시 시도</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (selectedInterview) {
    const imageUrls = extractImageUrls(selectedInterview.messages);

    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => setSelectedInterview(null)}
            style={styles.backButton}
          >
            <Text style={styles.backButtonText}>← 목록</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.detailHeader}>
            <Text style={styles.detailCompany}>{selectedInterview.company.name}</Text>
            <Text style={styles.detailMeta}>
              {positionNames[selectedInterview.position]} · {experienceNames[selectedInterview.experience]}
            </Text>
            <Text style={styles.detailDate}>{formatDate(selectedInterview.createdAt)}</Text>
          </View>

          {imageUrls.length > 0 && (
            <View style={styles.imageSection}>
              <Text style={styles.sectionTitle}>📎 포트폴리오 이미지 ({imageUrls.length}개)</Text>
              {imageUrls.map((url, index) => (
                <View key={index} style={styles.imageContainer}>
                  <Image
                    source={{ uri: url }}
                    style={styles.portfolioImage}
                    resizeMode="contain"
                  />
                  <Text style={styles.imageUrl} numberOfLines={1}>{url}</Text>
                </View>
              ))}
            </View>
          )}

          <View style={styles.messagesSection}>
            <Text style={styles.sectionTitle}>💬 면접 대화 ({selectedInterview.messages.length}개)</Text>
            {selectedInterview.messages.map((msg, index) => (
              <View
                key={index}
                style={[
                  styles.messageCard,
                  msg.role === 'assistant' && styles.assistantMessage,
                ]}
              >
                <Text style={styles.messageRole}>
                  {msg.role === 'assistant' ? '🤖 면접관' : '👤 지원자'}
                </Text>
                <Text style={styles.messageContent}>{msg.content}</Text>
                <Text style={styles.messageTime}>
                  {msg.timestamp.toLocaleTimeString('ko-KR', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Text>
              </View>
            ))}
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>관리자 패널</Text>
          <Text style={styles.subtitle}>총 {interviews.length}개의 면접 기록</Text>
        </View>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Text style={styles.closeButtonText}>✕</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {interviews.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>📋</Text>
            <Text style={styles.emptyTitle}>아직 면접 기록이 없습니다</Text>
            <Text style={styles.emptyText}>
              사용자가 면접을 저장하면 여기에 표시됩니다
            </Text>
          </View>
        ) : (
          interviews.map((interview) => {
            const totalQuestions = interview.messages.filter(
              (m) => m.role === 'assistant'
            ).length;
            const totalAnswers = interview.messages.filter(
              (m) => m.role === 'user'
            ).length;

            return (
              <TouchableOpacity
                key={interview.id}
                style={styles.interviewCard}
                onPress={() => setSelectedInterview(interview)}
              >
                <View style={styles.cardHeader}>
                  <View style={styles.cardInfo}>
                    <Text style={styles.cardCompany}>{interview.company.name}</Text>
                    <Text style={styles.cardMeta}>
                      {positionNames[interview.position]} · {experienceNames[interview.experience]}
                    </Text>
                  </View>
                  {interview.fileCount > 0 && (
                    <View style={styles.fileBadge}>
                      <Text style={styles.fileBadgeText}>📎 {interview.fileCount}</Text>
                    </View>
                  )}
                </View>

                <View style={styles.cardStats}>
                  <View style={styles.statItem}>
                    <Text style={styles.statNumber}>{totalQuestions}</Text>
                    <Text style={styles.statLabel}>질문</Text>
                  </View>
                  <View style={styles.statDivider} />
                  <View style={styles.statItem}>
                    <Text style={styles.statNumber}>{totalAnswers}</Text>
                    <Text style={styles.statLabel}>답변</Text>
                  </View>
                  {interview.difficultQuestions.length > 0 && (
                    <>
                      <View style={styles.statDivider} />
                      <View style={styles.statItem}>
                        <Text style={[styles.statNumber, styles.difficultNumber]}>
                          {interview.difficultQuestions.length}
                        </Text>
                        <Text style={styles.statLabel}>어려웠던 질문</Text>
                      </View>
                    </>
                  )}
                </View>

                <Text style={styles.cardDate}>{formatDate(interview.createdAt)}</Text>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
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
    padding: 24,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000000',
  },
  subtitle: {
    fontSize: 14,
    color: '#666666',
    marginTop: 4,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    fontSize: 20,
    color: '#333333',
  },
  backButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#F5F5F5',
  },
  backButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000000',
  },
  content: {
    flex: 1,
    padding: 24,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    color: '#666666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    padding: 24,
  },
  errorText: {
    fontSize: 16,
    color: '#FF3B30',
    textAlign: 'center',
  },
  retryButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    backgroundColor: '#000000',
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 80,
    gap: 12,
  },
  emptyIcon: {
    fontSize: 60,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000000',
  },
  emptyText: {
    fontSize: 15,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 300,
  },
  interviewCard: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  cardInfo: {
    flex: 1,
    gap: 6,
  },
  cardCompany: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000000',
  },
  cardMeta: {
    fontSize: 14,
    color: '#666666',
  },
  fileBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#E3F2FD',
  },
  fileBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1976D2',
  },
  cardStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 12,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000000',
  },
  difficultNumber: {
    color: '#FF9800',
  },
  statLabel: {
    fontSize: 13,
    color: '#666666',
  },
  statDivider: {
    width: 1,
    height: 16,
    backgroundColor: '#E0E0E0',
  },
  cardDate: {
    fontSize: 13,
    color: '#999999',
  },
  detailHeader: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  detailCompany: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 8,
  },
  detailMeta: {
    fontSize: 16,
    color: '#666666',
    marginBottom: 8,
  },
  detailDate: {
    fontSize: 14,
    color: '#999999',
  },
  imageSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 16,
  },
  imageContainer: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  portfolioImage: {
    width: '100%',
    height: 300,
    borderRadius: 8,
    backgroundColor: '#F5F5F5',
    marginBottom: 12,
  },
  imageUrl: {
    fontSize: 12,
    color: '#999999',
    fontFamily: 'monospace',
  },
  messagesSection: {
    marginBottom: 24,
  },
  messageCard: {
    backgroundColor: '#F8F9FA',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  assistantMessage: {
    backgroundColor: '#E3F2FD',
    borderColor: '#90CAF9',
  },
  messageRole: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666666',
    marginBottom: 8,
  },
  messageContent: {
    fontSize: 15,
    color: '#000000',
    lineHeight: 22,
    marginBottom: 8,
  },
  messageTime: {
    fontSize: 11,
    color: '#999999',
  },
});
