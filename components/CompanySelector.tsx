import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
} from 'react-native';
import { Company, Position, Experience } from '../types';
import { companies } from '../data/companies';

interface CompanySelectorProps {
  onCompanySelect: (company: Company) => void;
  selectedCompany?: Company;
  onPositionSelect: (position: Position) => void;
  selectedPosition?: Position;
  onExperienceSelect: (experience: Experience) => void;
  selectedExperience?: Experience;
}

export const CompanySelector: React.FC<CompanySelectorProps> = ({
  onCompanySelect,
  selectedCompany,
  onPositionSelect,
  selectedPosition,
  onExperienceSelect,
  selectedExperience,
}) => {
  const [searchText, setSearchText] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customCompanyName, setCustomCompanyName] = useState('');

  const scrollViewRef = useRef<ScrollView>(null);
  const experienceSectionRef = useRef<View>(null);
  const companySectionRef = useRef<View>(null);

  const positions = [
    { id: 'designer' as Position, name: '디자이너', desc: 'UI/UX, 그래픽, 제품' },
    { id: 'frontend' as Position, name: '프론트엔드', desc: '웹/앱 개발' },
    { id: 'backend' as Position, name: '백엔드', desc: '서버/DB 개발' },
    { id: 'fullstack' as Position, name: '풀스택', desc: '전체 개발' },
    { id: 'pm' as Position, name: '기획자', desc: 'PM/PO/서비스 기획' },
    { id: 'marketer' as Position, name: '마케터', desc: '디지털/그로스' },
    { id: 'other' as Position, name: '기타', desc: '직접 입력' },
  ];

  const experiences = [
    { id: 'junior' as Experience, name: '신입~주니어', desc: '0-3년' },
    { id: 'mid' as Experience, name: '미드레벨', desc: '3-7년' },
    { id: 'senior' as Experience, name: '시니어', desc: '7년+' },
  ];

  // 직무 선택 시 경력 섹션으로 스크롤
  useEffect(() => {
    if (selectedPosition && experienceSectionRef.current) {
      setTimeout(() => {
        experienceSectionRef.current?.measureLayout(
          scrollViewRef.current as any,
          (x, y) => {
            scrollViewRef.current?.scrollTo({ y: y - 20, animated: true });
          },
          () => {}
        );
      }, 100);
    }
  }, [selectedPosition]);

  // 경력 선택 시 회사 섹션으로 스크롤
  useEffect(() => {
    if (selectedExperience && companySectionRef.current) {
      setTimeout(() => {
        companySectionRef.current?.measureLayout(
          scrollViewRef.current as any,
          (x, y) => {
            scrollViewRef.current?.scrollTo({ y: y - 20, animated: true });
          },
          () => {}
        );
      }, 100);
    }
  }, [selectedExperience]);

  const filteredCompanies = companies.filter((company) =>
    company.name.toLowerCase().includes(searchText.toLowerCase())
  );

  const handleCustomCompany = () => {
    if (customCompanyName.trim()) {
      const customCompany: Company = {
        id: 'custom',
        name: customCompanyName,
        industry: '기타',
        interviewFocus: ['전문성', '협업 능력', '문제 해결 능력'],
        portfolioTips: [
          '프로젝트의 목표와 결과를 명확히 제시',
          '기술적 의사결정 과정 설명',
          '팀 협업 경험 강조',
        ],
        commonQuestions: [
          '이 프로젝트에서 가장 어려웠던 점은?',
          '왜 이 기술을 선택했나요?',
          '팀에서 어떤 역할을 맡았나요?',
        ],
      };
      onCompanySelect(customCompany);
      setShowCustomInput(false);
      setCustomCompanyName('');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>지원 정보 입력</Text>
        <Text style={styles.subtitle}>직무, 경력, 회사 순서로 선택해주세요</Text>
      </View>

      <ScrollView
        ref={scrollViewRef}
        style={styles.companyList}
        showsVerticalScrollIndicator={false}
      >
        {/* 직무 선택 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>1. 직무</Text>
          <View style={styles.optionGrid}>
            {positions.map((position) => (
              <TouchableOpacity
                key={position.id}
                style={[
                  styles.optionCard,
                  selectedPosition === position.id && styles.selectedOption,
                ]}
                onPress={() => onPositionSelect(position.id)}
              >
                <Text style={[
                  styles.optionName,
                  selectedPosition === position.id && styles.selectedOptionText
                ]}>
                  {position.name}
                </Text>
                <Text style={styles.optionDesc}>{position.desc}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* 경력 선택 */}
        {selectedPosition && (
          <View ref={experienceSectionRef} style={styles.section}>
            <Text style={styles.sectionTitle}>2. 경력</Text>
            <View style={styles.optionGrid}>
              {experiences.map((exp) => (
                <TouchableOpacity
                  key={exp.id}
                  style={[
                    styles.optionCard,
                    selectedExperience === exp.id && styles.selectedOption,
                  ]}
                  onPress={() => onExperienceSelect(exp.id)}
                >
                  <Text style={[
                    styles.optionName,
                    selectedExperience === exp.id && styles.selectedOptionText
                  ]}>
                    {exp.name}
                  </Text>
                  <Text style={styles.optionDesc}>{exp.desc}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* 회사 선택 */}
        {selectedPosition && selectedExperience && (
          <>
            <View ref={companySectionRef} style={styles.section}>
              <Text style={styles.sectionTitle}>3. 회사</Text>
            </View>

            <TextInput
              style={styles.searchInput}
              placeholder="회사 검색..."
              value={searchText}
              onChangeText={setSearchText}
              placeholderTextColor="#999999"
            />

            {filteredCompanies.map((company) => (
          <TouchableOpacity
            key={company.id}
            style={[
              styles.companyCard,
              selectedCompany?.id === company.id && styles.selectedCard,
            ]}
            onPress={() => onCompanySelect(company)}
          >
            <View style={styles.cardContent}>
              <Text style={styles.companyName}>{company.name}</Text>
              <Text style={styles.companyIndustry}>{company.industry}</Text>
            </View>
            <View style={styles.focusContainer}>
              {company.interviewFocus.slice(0, 3).map((focus, index) => (
                <View key={index} style={styles.focusTag}>
                  <Text style={styles.focusText}>{focus}</Text>
                </View>
              ))}
            </View>
            {selectedCompany?.id === company.id && (
              <View style={styles.checkmark}>
                <Text style={styles.checkmarkText}>✓</Text>
              </View>
            )}
          </TouchableOpacity>
        ))}

        {!showCustomInput ? (
          <TouchableOpacity
            style={styles.customButton}
            onPress={() => setShowCustomInput(true)}
          >
            <Text style={styles.customButtonText}>+ 다른 회사 추가</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.customInputContainer}>
            <TextInput
              style={styles.customInput}
              placeholder="회사명을 입력하세요"
              value={customCompanyName}
              onChangeText={setCustomCompanyName}
              placeholderTextColor="#999999"
              autoFocus
            />
            <View style={styles.customButtonRow}>
              <TouchableOpacity
                style={styles.customConfirmButton}
                onPress={handleCustomCompany}
              >
                <Text style={styles.customConfirmText}>추가</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.customCancelButton}
                onPress={() => {
                  setShowCustomInput(false);
                  setCustomCompanyName('');
                }}
              >
                <Text style={styles.customCancelText}>취소</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
          </>
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
    padding: 24,
    gap: 8,
    backgroundColor: '#FAFAFA',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#000000',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    color: '#666666',
    lineHeight: 22,
  },
  searchInput: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 24,
    padding: 16,
    borderRadius: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#F0F0F0',
    marginBottom: 16,
  },
  companyList: {
    flex: 1,
    paddingHorizontal: 24,
  },
  companyCard: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#F0F0F0',
    position: 'relative',
  },
  selectedCard: {
    borderColor: '#000000',
    backgroundColor: '#FAFAFA',
  },
  cardContent: {
    gap: 6,
    marginBottom: 12,
  },
  companyName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000000',
  },
  companyIndustry: {
    fontSize: 14,
    color: '#666666',
  },
  focusContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  focusTag: {
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  focusText: {
    fontSize: 13,
    color: '#333333',
    fontWeight: '500',
  },
  checkmark: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmarkText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  customButton: {
    padding: 20,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    borderStyle: 'dashed',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 24,
    backgroundColor: '#FFFFFF',
  },
  customButtonText: {
    fontSize: 16,
    color: '#666666',
    fontWeight: '600',
  },
  customInputContainer: {
    marginTop: 8,
    marginBottom: 24,
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    gap: 12,
  },
  customInput: {
    backgroundColor: '#F5F5F5',
    padding: 16,
    borderRadius: 12,
    fontSize: 16,
  },
  customButtonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  customConfirmButton: {
    flex: 1,
    backgroundColor: '#000000',
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  customConfirmText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
  },
  customCancelButton: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  customCancelText: {
    color: '#000000',
    fontWeight: '600',
    fontSize: 16,
  },
  section: {
    marginTop: 32,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 16,
  },
  optionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  optionCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#F0F0F0',
    minWidth: '30%',
    flex: 1,
  },
  selectedOption: {
    borderColor: '#000000',
    backgroundColor: '#FAFAFA',
  },
  optionName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 4,
  },
  selectedOptionText: {
    color: '#000000',
  },
  optionDesc: {
    fontSize: 13,
    color: '#666666',
  },
});
