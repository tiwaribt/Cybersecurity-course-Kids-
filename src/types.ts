export interface User {
  id: number;
  username: string;
  role: 'admin' | 'student';
  full_name: string;
}

export interface Course {
  id: number;
  grade: number;
  title_en: string;
  title_ne: string;
  description_en: string;
  description_ne: string;
}

export interface Lesson {
  id: number;
  course_id: number;
  order_index: number;
  title_en: string;
  title_ne: string;
  content_en: string;
  content_ne: string;
}

export interface Quiz {
  id: number;
  lesson_id: number;
  title_en: string;
  title_ne: string;
}

export interface QuizQuestion {
  id: number;
  quiz_id: number;
  question_en: string;
  question_ne: string;
  option_a_en: string;
  option_a_ne: string;
  option_b_en: string;
  option_b_ne: string;
  option_c_en: string;
  option_c_ne: string;
  option_d_en: string;
  option_d_ne: string;
  correct_option: 'a' | 'b' | 'c' | 'd';
}

export interface QuizScore {
  id: number;
  user_id: number;
  quiz_id: number;
  score: number;
  total_questions: number;
  completed_at: string;
}

export interface CertificateSettings {
  school_name: string;
  signatory_name: string;
  signatory_title: string;
  signature_base64: string | null;
}
