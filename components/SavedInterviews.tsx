import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { InterviewRecord, Position, Experience } from '../types';
import { getInterviewRecords, deleteInterviewRecord, getDifficultQuestions } from '../services/storage';

interface SavedInterviewsProps {
  onClose: () => void;
  onSelectRecord: (record: InterviewRecord) => void;
}

export const SavedInterviews: React.FC<SavedInterviewsProps> = ({
  onClose,
  onSelectRecord,
}) => {
  const [records, setRecords] = useState<InterviewRecord[]>([]);

  useEffect(() => {
    loadRecords();
  }, []);

  const loadRecords = () => {
    const loaded = getInterviewRecords();
    setRecords(loaded);
  };

  const handleDelete = (id: string) => {
    Alert.alert(
      '삭제 확인',
      '이 면접 기록을 삭제하시겠습니까?',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '삭제',
          style: 'destructive',
          onPress: () => {
            deleteInterviewRecord(id);
            loadRecords();
          },
        },
      ]
    );
  };

  const formatDate = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return '오늘';
    if (days === 1) return '어제';
    if (days < 7) return `${days}일 전`;

    return new Date(date).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
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

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>저장된 면접 기록</Text>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Text style={styles.closeButtonText}>✕</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {records.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>📋</Text>
            <Text style={styles.emptyTitle}>저장된 면접이 없습니다</Text>
            <Text style={styles.emptyText}>
              면접을 마치고 저장하면 여기에서 다시 볼 수 있어요
            </Text>
          </View>
        ) : (
          records.map((record) => {
            const difficultCount = record.difficultQuestions.length;
            const totalQuestions = record.messages.filter(m => m.role === 'assistant').length;

            return (
              <TouchableOpacity
                key={record.id}
                style={styles.recordCard}
                onPress={() => onSelectRecord(record)}
              >
                <View style={styles.recordHeader}>
                  <View style={styles.recordInfo}>
                    <Text style={styles.companyName}>{record.company.name}</Text>
                    <Text style={styles.positionText}>
                      {positionNames[record.position]} · {experienceNames[record.experience]}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={(e) => {
                      e.stopPropagation();
                      handleDelete(record.id);
                    }}
                  >
                    <Text style={styles.deleteButtonText}>삭제</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.recordStats}>
                  <View style={styles.statItem}>
                    <Text style={styles.statNumber}>{totalQuestions}</Text>
                    <Text style={styles.statLabel}>질문</Text>
                  </View>
                  {difficultCount > 0 && (
                    <>
                      <View style={styles.statDivider} />
                      <View style={styles.statItem}>
                        <Text style={[styles.statNumber, styles.difficultNumber]}>
                          {difficultCount}
                        </Text>
                        <Text style={styles.statLabel}>어려웠던 질문</Text>
                      </View>
                    </>
                  )}
                </View>

                <Text style={styles.dateText}>{formatDate(record.createdAt)}</Text>
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
  content: {
    flex: 1,
    padding: 24,
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
  recordCard: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  recordHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  recordInfo: {
    flex: 1,
    gap: 6,
  },
  companyName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000000',
  },
  positionText: {
    fontSize: 14,
    color: '#666666',
  },
  deleteButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#FFE5E5',
  },
  deleteButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FF3B30',
  },
  recordStats: {
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
  dateText: {
    fontSize: 13,
    color: '#999999',
  },
});
