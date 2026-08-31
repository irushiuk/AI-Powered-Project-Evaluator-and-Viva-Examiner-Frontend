import type { StudentSession } from './sessionTypes'

export const MOCK_SESSIONS: Record<string, StudentSession> = {
  '1': {
    id: '1',
    projectTitle: 'AI-Powered Chat Application',
    lecturer: 'Dr. Sarah Johnson',
    date: '2026-05-15',
    time: '2:00 PM',
    status: 'upcoming',
    description: 'Final evaluation for your chat application project',
    rubrics: [
      {
        category_id: 'cat-1',
        category_name: 'Technical Implementation',
        weight_percentage: 40,
        description: 'Quality of the code, architecture, and technical decisions.',
        criteria: [
          { criteria_id: 'c-1', criteria_name: 'Code Quality & Best Practices', max_score: 20, weight_in_category: 50, description: 'Clean code, naming conventions, error handling.' },
          { criteria_id: 'c-2', criteria_name: 'System Architecture', max_score: 20, weight_in_category: 50, description: 'Scalability, separation of concerns, design patterns.' },
        ],
      },
      {
        category_id: 'cat-2',
        category_name: 'Functionality & Features',
        weight_percentage: 30,
        description: 'Completeness and correctness of implemented features.',
        criteria: [
          { criteria_id: 'c-3', criteria_name: 'Core Features', max_score: 15, weight_in_category: 50, description: 'All required features working correctly.' },
          { criteria_id: 'c-4', criteria_name: 'Edge Cases & Error Handling', max_score: 15, weight_in_category: 50, description: 'Graceful handling of unexpected inputs.' },
        ],
      },
      {
        category_id: 'cat-3',
        category_name: 'Documentation & Presentation',
        weight_percentage: 15,
        description: 'Quality of project documentation and report.',
        criteria: [
          { criteria_id: 'c-5', criteria_name: 'Project Report', max_score: 10, weight_in_category: 67, description: 'Clear, well-structured project documentation.' },
          { criteria_id: 'c-6', criteria_name: 'Code Documentation', max_score: 5, weight_in_category: 33, description: 'Inline comments, README, and API docs.' },
        ],
      },
      {
        category_id: 'cat-4',
        category_name: 'Viva Performance',
        weight_percentage: 15,
        description: 'Understanding demonstrated during the viva examination.',
        criteria: [
          { criteria_id: 'c-7', criteria_name: 'Problem Understanding', max_score: 10, weight_in_category: 67, description: 'Ability to explain design decisions and trade-offs.' },
          { criteria_id: 'c-8', criteria_name: 'Communication Skills', max_score: 5, weight_in_category: 33, description: 'Clarity and confidence in responses.' },
        ],
      },
    ],
  },
  '2': {
    id: '2',
    projectTitle: 'Real-time Collaboration Tool',
    lecturer: 'Prof. Mike Chen',
    date: '2025-05-10',
    time: '10:00 AM',
    status: 'ongoing',
    description: 'Live code review and discussion',
    rubrics: [
      {
        category_id: 'cat-1',
        category_name: 'Technical Implementation',
        weight_percentage: 40,
        description: 'Quality of the code, architecture, and technical decisions.',
        criteria: [
          { criteria_id: 'c-1', criteria_name: 'Code Quality & Best Practices', max_score: 20, weight_in_category: 50, description: 'Clean code, naming conventions, error handling.' },
          { criteria_id: 'c-2', criteria_name: 'System Architecture', max_score: 20, weight_in_category: 50, description: 'Scalability, separation of concerns, design patterns.' },
        ],
      },
      {
        category_id: 'cat-2',
        category_name: 'Functionality & Features',
        weight_percentage: 30,
        description: 'Completeness and correctness of implemented features.',
        criteria: [
          { criteria_id: 'c-3', criteria_name: 'Core Features', max_score: 15, weight_in_category: 50, description: 'All required features working correctly.' },
          { criteria_id: 'c-4', criteria_name: 'Edge Cases & Error Handling', max_score: 15, weight_in_category: 50, description: 'Graceful handling of unexpected inputs.' },
        ],
      },
      {
        category_id: 'cat-3',
        category_name: 'Viva Performance',
        weight_percentage: 30,
        description: 'Understanding demonstrated during the viva examination.',
        criteria: [
          { criteria_id: 'c-7', criteria_name: 'Problem Understanding', max_score: 20, weight_in_category: 67, description: 'Ability to explain design decisions and trade-offs.' },
          { criteria_id: 'c-8', criteria_name: 'Communication Skills', max_score: 10, weight_in_category: 33, description: 'Clarity and confidence in responses.' },
        ],
      },
    ],
  },
  '3': {
    id: '3',
    projectTitle: 'E-Commerce Platform',
    lecturer: 'Dr. Emily Davis',
    date: '2025-05-05',
    time: '3:30 PM',
    status: 'completed',
    description: 'Project evaluation completed',
    results: {
      transcript: [],
      score: 92,
      scoreMaximum: 100,
      summary:
        'Excellent project execution with outstanding code quality and innovative features. The application demonstrates strong understanding of full-stack development principles.',
      submission: {
        repo: 'https://github.com/username/ecommerce-platform',
        report: 'Project-Report.pdf',
      },
      codeAnalysis: {
        bugs: 2,
        vulnerabilities: 0,
        smells: 5,
        duplication: '8%',
        maintainability: 'A',
      },
      aiEvaluation: [
        {
          criteria: 'Problem Understanding',
          score: 9,
          explanation:
            'Student demonstrated excellent comprehension of requirements and edge cases',
        },
        {
          criteria: 'Code Quality',
          score: 9,
          explanation:
            'Clean, well-structured code following best practices and design patterns',
        },
        {
          criteria: 'System Design',
          score: 9,
          explanation: 'Scalable architecture with proper separation of concerns',
        },
        {
          criteria: 'Documentation',
          score: 8,
          explanation: 'Comprehensive documentation with clear examples',
        },
      ],
      feedback:
        'Outstanding work on this e-commerce platform! Your implementation shows strong technical depth and attention to detail. The code is well-organized and the database schema is efficient. Continue focusing on testing and performance optimization in future projects.',
    },
  },
  '4': {
    id: '4',
    projectTitle: 'Data Analytics Dashboard',
    lecturer: 'Prof. Robert Wilson',
    date: '2026-05-20',
    time: '1:00 PM',
    status: 'upcoming',
    description: 'Evaluation session for analytics project',
  },
  '5': {
    id: '5',
    projectTitle: 'Machine Learning Model',
    lecturer: 'Dr. Lisa Park',
    date: '2025-05-08',
    time: '11:00 AM',
    status: 'completed',
    description: 'Comprehensive evaluation completed',
    results: {
      transcript: [],
      score: 88,
      scoreMaximum: 100,
      summary:
        'Strong implementation with good model optimization and insightful analysis.',
      submission: {
        repo: 'https://github.com/username/ml-model',
        report: 'ML-Project-Report.pdf',
      },
      codeAnalysis: {
        bugs: 3,
        vulnerabilities: 1,
        smells: 8,
        duplication: '12%',
        maintainability: 'B',
      },
      aiEvaluation: [
        {
          criteria: 'Problem Understanding',
          score: 8,
          explanation: 'Good grasp of ML concepts and problem statement',
        },
        {
          criteria: 'Code Quality',
          score: 8,
          explanation: 'Well-written code with some areas for improvement',
        },
        {
          criteria: 'System Design',
          score: 9,
          explanation: 'Efficient pipeline and data handling',
        },
        {
          criteria: 'Documentation',
          score: 7,
          explanation: 'Adequate documentation, could be more detailed',
        },
      ],
      feedback:
        'Good work on the ML model implementation! Your approach to data preprocessing was effective. Consider adding more comprehensive error handling and unit tests for production readiness.',
    },
  },
  '6': {
    id: '6',
    projectTitle: 'Mobile App Development',
    lecturer: 'Dr. James Thompson',
    date: '2025-04-28',
    time: '4:00 PM',
    status: 'completed',
    description: 'Mobile application project review',
    results: {
      transcript: [],
      score: 85,
      scoreMaximum: 100,
      summary: 'Great mobile app implementation with good UI/UX design.',
      submission: {
        repo: 'https://github.com/username/mobile-app',
        report: 'Mobile-App-Report.pdf',
      },
      codeAnalysis: {
        bugs: 1,
        vulnerabilities: 0,
        smells: 3,
        duplication: '5%',
        maintainability: 'A',
      },
      aiEvaluation: [
        {
          criteria: 'Problem Understanding',
          score: 8,
          explanation: 'Clear understanding of mobile app requirements',
        },
        {
          criteria: 'Code Quality',
          score: 9,
          explanation: 'Excellent code structure and organization',
        },
        {
          criteria: 'System Design',
          score: 8,
          explanation: 'Good architecture for mobile app',
        },
        {
          criteria: 'Documentation',
          score: 8,
          explanation: 'Well-documented code and setup instructions',
        },
      ],
      feedback:
        'Excellent work on your mobile application! The UI is polished and the code is clean. Consider adding more unit tests to improve test coverage.',
    },
  },
}
