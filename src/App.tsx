import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Shield, 
  BookOpen, 
  Award, 
  Settings, 
  LogOut, 
  CheckCircle, 
  ChevronRight, 
  Languages,
  User as UserIcon,
  Download,
  School,
  HelpCircle,
  Trophy,
  RefreshCw,
  Users,
  Search,
  Eye
} from 'lucide-react';
import { User, Course, Lesson, CertificateSettings, Quiz, QuizQuestion, QuizScore } from './types';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [view, setView] = useState<'landing' | 'login' | 'dashboard' | 'course' | 'admin' | 'certificate' | 'stats'>('landing');
  const [lang, setLang] = useState<'en' | 'ne'>('en');
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [currentLessonIndex, setCurrentLessonIndex] = useState(0);
  const [progress, setProgress] = useState<number[]>([]);
  const [quizScores, setQuizScores] = useState<QuizScore[]>([]);
  const [activeQuiz, setActiveQuiz] = useState<{ quiz: Quiz; questions: QuizQuestion[] } | null>(null);
  const [showQuiz, setShowQuiz] = useState(false);
  const [certSettings, setCertSettings] = useState<CertificateSettings | null>(null);
  const [adminUsers, setAdminUsers] = useState<any[]>([]);
  const [selectedAdminUser, setSelectedAdminUser] = useState<any | null>(null);
  const [adminUserProgress, setAdminUserProgress] = useState<any | null>(null);
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });

  useEffect(() => {
    fetchCourses();
    fetchCertSettings();
  }, []);

  const fetchCourses = async () => {
    const res = await fetch('/api/courses');
    const data = await res.json();
    setCourses(data);
  };

  const fetchCertSettings = async () => {
    const res = await fetch('/api/certificate-settings');
    const data = await res.json();
    setCertSettings(data);
  };

  const fetchAdminUsers = async () => {
    const res = await fetch('/api/admin/users');
    const data = await res.json();
    setAdminUsers(data);
  };

  const fetchAdminUserProgress = async (userId: number) => {
    const res = await fetch(`/api/admin/users/${userId}/progress`);
    const data = await res.json();
    setAdminUserProgress(data);
  };

  const fetchProgress = async (userId: number) => {
    const res = await fetch(`/api/progress/${userId}`);
    const data = await res.json();
    setProgress(data);
    fetchQuizScores(userId);
  };

  const fetchQuizScores = async (userId: number) => {
    const res = await fetch(`/api/quiz-scores/${userId}`);
    const data = await res.json();
    setQuizScores(data);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(loginForm)
    });
    if (res.ok) {
      const userData = await res.json();
      setUser(userData);
      fetchProgress(userData.id);
      setView('dashboard');
    } else {
      alert('Login failed');
    }
  };

  const startCourse = async (course: Course) => {
    setSelectedCourse(course);
    const res = await fetch(`/api/courses/${course.id}/lessons`);
    const data = await res.json();
    setLessons(data);
    setCurrentLessonIndex(0);
    setShowQuiz(false);
    setActiveQuiz(null);
    setView('course');
  };

  const fetchQuiz = async (lessonId: number) => {
    const res = await fetch(`/api/lessons/${lessonId}/quiz`);
    if (res.ok) {
      const data = await res.json();
      setActiveQuiz(data);
    } else {
      setActiveQuiz(null);
    }
  };

  useEffect(() => {
    if (view === 'course' && lessons[currentLessonIndex]) {
      fetchQuiz(lessons[currentLessonIndex].id);
      setShowQuiz(false);
    }
  }, [currentLessonIndex, view, lessons]);

  const markComplete = async () => {
    if (!user || !lessons[currentLessonIndex]) return;
    const lessonId = lessons[currentLessonIndex].id;
    await fetch('/api/progress', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: user.id, lessonId })
    });
    setProgress([...progress, lessonId]);
    
    if (activeQuiz) {
      setShowQuiz(true);
    } else if (currentLessonIndex < lessons.length - 1) {
      setCurrentLessonIndex(currentLessonIndex + 1);
    }
  };

  const isCourseComplete = (courseId: number) => {
    const courseLessons = lessons.filter(l => l.course_id === courseId);
    if (courseLessons.length === 0) return false;
    return courseLessons.every(l => progress.includes(l.id));
  };

  const t = (en: string, ne: string) => lang === 'en' ? en : ne;

  const Landing = () => (
    <div className="min-h-screen bg-stone-50">
      <nav className="p-6 flex justify-between items-center border-b border-stone-200 bg-white">
        <div className="flex items-center gap-3">
          <div className="bg-emerald-600 p-2 rounded-lg">
            <Shield className="text-white w-6 h-6" />
          </div>
          <div>
            <h1 className="font-bold text-xl text-stone-900">Meridian Cyber Academy</h1>
            <p className="text-xs text-stone-500">Meridian International School</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setLang(lang === 'en' ? 'ne' : 'en')}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-stone-200 text-sm font-medium hover:bg-stone-50 transition-colors"
          >
            <Languages className="w-4 h-4" />
            {lang === 'en' ? 'नेपाली' : 'English'}
          </button>
          <button 
            onClick={() => setView('login')}
            className="bg-stone-900 text-white px-6 py-2 rounded-full text-sm font-medium hover:bg-stone-800 transition-colors"
          >
            {t('Student Login', 'विद्यार्थी लगइन')}
          </button>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-6 py-20">
        <div className="grid md:grid-columns-2 gap-12 items-center">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6"
          >
            <span className="inline-block px-4 py-1.5 bg-emerald-100 text-emerald-700 rounded-full text-sm font-semibold">
              {t('Digital Safety First', 'डिजिटल सुरक्षा पहिलो')}
            </span>
            <h2 className="text-6xl font-bold text-stone-900 leading-tight">
              {t('Empowering Future Digital Citizens', 'भविष्यका डिजिटल नागरिकहरूलाई सशक्त बनाउँदै')}
            </h2>
            <p className="text-xl text-stone-600 leading-relaxed">
              {t(
                'A comprehensive cybersecurity and IT curriculum designed for Grade 1 to 12 students of Meridian International School, following the National Curriculum of Nepal.',
                'नेपालको राष्ट्रिय पाठ्यक्रम अनुसार मेरिडियन इन्टरनेशनल स्कूलका कक्षा १ देखि १२ सम्मका विद्यार्थीहरूका लागि डिजाइन गरिएको विस्तृत साइबर सुरक्षा र सूचना प्रविधि पाठ्यक्रम।'
              )}
            </p>
            <div className="flex gap-4 pt-4">
              <button 
                onClick={() => setView('login')}
                className="bg-emerald-600 text-white px-8 py-4 rounded-2xl font-bold text-lg hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200"
              >
                {t('Start Learning Now', 'अहिले नै सिक्न सुरु गर्नुहोस्')}
              </button>
              <div className="flex items-center gap-4 px-6 py-4 border border-stone-200 rounded-2xl bg-white">
                <School className="text-stone-400" />
                <div className="text-left">
                  <p className="text-xs text-stone-400 uppercase tracking-wider font-bold">Location</p>
                  <p className="text-sm font-semibold text-stone-900">Balwatar, Kathmandu</p>
                </div>
              </div>
            </div>
          </motion.div>
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative"
          >
            <div className="aspect-square bg-emerald-100 rounded-[4rem] overflow-hidden rotate-3">
              <img 
                src="https://picsum.photos/seed/cyber/800/800" 
                alt="Cybersecurity" 
                className="w-full h-full object-cover -rotate-3 scale-110"
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="absolute -bottom-6 -left-6 bg-white p-6 rounded-3xl shadow-xl border border-stone-100 max-w-xs">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center">
                  <Award className="text-emerald-600" />
                </div>
                <p className="font-bold text-stone-900">{t('Certified Learning', 'प्रमाणित शिक्षा')}</p>
              </div>
              <p className="text-sm text-stone-500">
                {t('Earn official certificates upon completion of each grade level.', 'प्रत्येक कक्षा स्तर पूरा गरेपछि आधिकारिक प्रमाणपत्रहरू प्राप्त गर्नुहोस्।')}
              </p>
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  );

  const Login = () => (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center p-6">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white p-10 rounded-[2.5rem] shadow-xl border border-stone-100"
      >
        <div className="flex justify-center mb-8">
          <div className="bg-emerald-600 p-4 rounded-2xl shadow-lg shadow-emerald-100">
            <Shield className="text-white w-8 h-8" />
          </div>
        </div>
        <h2 className="text-3xl font-bold text-center text-stone-900 mb-2">{t('Welcome Back', 'स्वागत छ')}</h2>
        <p className="text-center text-stone-500 mb-8">{t('Sign in to your student account', 'आफ्नो विद्यार्थी खातामा साइन इन गर्नुहोस्')}</p>
        
        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-bold text-stone-700 ml-1">{t('Username', 'प्रयोगकर्ता नाम')}</label>
            <input 
              type="text" 
              required
              className="w-full px-5 py-4 bg-stone-50 border border-stone-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
              placeholder="e.g. student123"
              value={loginForm.username}
              onChange={e => setLoginForm({...loginForm, username: e.target.value})}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-bold text-stone-700 ml-1">{t('Password', 'पासवर्ड')}</label>
            <input 
              type="password" 
              required
              className="w-full px-5 py-4 bg-stone-50 border border-stone-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
              placeholder="••••••••"
              value={loginForm.password}
              onChange={e => setLoginForm({...loginForm, password: e.target.value})}
            />
          </div>
          <button 
            type="submit"
            className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-bold text-lg hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100"
          >
            {t('Sign In', 'साइन इन गर्नुहोस्')}
          </button>
        </form>
        
        <button 
          onClick={() => setView('landing')}
          className="w-full mt-6 text-stone-400 text-sm font-medium hover:text-stone-600 transition-colors"
        >
          {t('← Back to Home', '← गृहपृष्ठमा फर्कनुहोस्')}
        </button>
      </motion.div>
    </div>
  );

  const Dashboard = () => (
    <div className="min-h-screen bg-stone-50">
      <aside className="fixed left-0 top-0 bottom-0 w-72 bg-white border-r border-stone-200 p-8 flex flex-col">
        <div className="flex items-center gap-3 mb-12">
          <Shield className="text-emerald-600 w-8 h-8" />
          <h1 className="font-bold text-lg leading-tight">Meridian<br/>Cyber Academy</h1>
        </div>
        
        <nav className="flex-1 space-y-2">
          <button 
            onClick={() => setView('dashboard')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all ${view === 'dashboard' ? 'bg-emerald-50 text-emerald-700' : 'text-stone-500 hover:bg-stone-50'}`}
          >
            <BookOpen className="w-5 h-5" />
            {t('My Courses', 'मेरा पाठ्यक्रमहरू')}
          </button>
          <button 
            onClick={() => setView('stats')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all ${view === 'stats' ? 'bg-emerald-50 text-emerald-700' : 'text-stone-500 hover:bg-stone-50'}`}
          >
            <Trophy className="w-5 h-5" />
            {t('My Progress', 'मेरो प्रगति')}
          </button>
          {user?.role === 'admin' && (
            <button 
              onClick={() => setView('admin')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all ${view === 'admin' ? 'bg-emerald-50 text-emerald-700' : 'text-stone-500 hover:bg-stone-50'}`}
            >
              <Settings className="w-5 h-5" />
              {t('Admin Panel', 'प्रशासक प्यानल')}
            </button>
          )}
        </nav>

        <div className="mt-auto pt-8 border-t border-stone-100">
          <div className="flex items-center gap-3 mb-6 px-4">
            <div className="w-10 h-10 bg-stone-100 rounded-full flex items-center justify-center">
              <UserIcon className="text-stone-400 w-5 h-5" />
            </div>
            <div className="overflow-hidden">
              <p className="font-bold text-stone-900 truncate">{user?.full_name}</p>
              <p className="text-xs text-stone-400 capitalize">{user?.role}</p>
            </div>
          </div>
          <button 
            onClick={() => { setUser(null); setView('landing'); }}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-red-500 hover:bg-red-50 transition-all"
          >
            <LogOut className="w-5 h-5" />
            {t('Logout', 'लगआउट')}
          </button>
        </div>
      </aside>

      <main className="ml-72 p-12">
        <header className="flex justify-between items-center mb-12">
          <div>
            <h2 className="text-4xl font-bold text-stone-900 mb-2">{t('Welcome,', 'स्वागत छ,')} {user?.full_name.split(' ')[0]}</h2>
            <p className="text-stone-500">{t('Continue your journey to become a cyber expert.', 'साइबर विशेषज्ञ बन्ने आफ्नो यात्रा जारी राख्नुहोस्।')}</p>
          </div>
          <button 
            onClick={() => setLang(lang === 'en' ? 'ne' : 'en')}
            className="flex items-center gap-2 px-4 py-2 rounded-full border border-stone-200 text-sm font-medium bg-white hover:bg-stone-50 transition-colors"
          >
            <Languages className="w-4 h-4" />
            {lang === 'en' ? 'नेपाली' : 'English'}
          </button>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {courses.map(course => {
            const isComplete = isCourseComplete(course.id);
            const courseLessons = lessons.filter(l => l.course_id === course.id);
            return (
              <motion.div 
                key={course.id}
                whileHover={{ y: -5 }}
                className="bg-white p-8 rounded-[2rem] shadow-sm border border-stone-100 flex flex-col"
              >
                <div className="flex justify-between items-start mb-6">
                  <div className="bg-stone-50 px-4 py-2 rounded-xl font-bold text-stone-400 text-sm">
                    {t('Grade', 'कक्षा')} {course.grade}
                  </div>
                  {isComplete && <CheckCircle className="text-emerald-500 w-6 h-6" />}
                </div>
                <h3 className="text-xl font-bold text-stone-900 mb-3">{t(course.title_en, course.title_ne)}</h3>
                <p className="text-stone-500 text-sm mb-8 flex-1">{t(course.description_en, course.description_ne)}</p>
                
                {/* Quiz Scores Summary */}
                {quizScores.length > 0 && (
                  <div className="mb-6 space-y-2">
                    <p className="text-xs font-bold text-stone-400 uppercase tracking-wider">{t('Recent Quiz Performance', 'हालको प्रश्नोत्तरी प्रदर्शन')}</p>
                    <div className="flex flex-wrap gap-2">
                      {quizScores.filter(s => {
                        // This is a bit hacky since we don't have course_id in quiz_scores directly
                        // but we can infer it if we had more data. For now, just show all.
                        return true;
                      }).slice(0, 3).map(score => (
                        <div key={score.id} className="bg-emerald-50 text-emerald-700 px-2 py-1 rounded text-[10px] font-bold">
                          {score.score}/{score.total_questions}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex gap-3">
                  <button 
                    onClick={() => startCourse(course)}
                    className="flex-1 bg-stone-900 text-white py-3 rounded-xl font-bold text-sm hover:bg-stone-800 transition-all flex items-center justify-center gap-2"
                  >
                    {t('Start Course', 'पाठ्यक्रम सुरु गर्नुहोस्')}
                    <ChevronRight className="w-4 h-4" />
                  </button>
                  {isComplete && (
                    <button 
                      onClick={() => { setSelectedCourse(course); setView('certificate'); }}
                      className="p-3 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-100 transition-all"
                      title={t('View Certificate', 'प्रमाणपत्र हेर्नुहोस्')}
                    >
                      <Award className="w-5 h-5" />
                    </button>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </main>
    </div>
  );

  const CourseViewer = () => {
    const lesson = lessons[currentLessonIndex];
    const [selectedAnswers, setSelectedAnswers] = useState<Record<number, string>>({});
    const [quizResult, setQuizResult] = useState<{ score: number; total: number } | null>(null);

    if (!lesson) return null;

    const handleQuizSubmit = async () => {
      if (!activeQuiz || !user) return;
      
      let score = 0;
      activeQuiz.questions.forEach(q => {
        if (selectedAnswers[q.id] === q.correct_option) {
          score++;
        }
      });

      const res = await fetch('/api/quiz/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          quizId: activeQuiz.quiz.id,
          score,
          totalQuestions: activeQuiz.questions.length
        })
      });

      if (res.ok) {
        setQuizResult({ score, total: activeQuiz.questions.length });
        fetchQuizScores(user.id);
      }
    };

    const nextStep = () => {
      setQuizResult(null);
      setSelectedAnswers({});
      setShowQuiz(false);
      if (currentLessonIndex < lessons.length - 1) {
        setCurrentLessonIndex(currentLessonIndex + 1);
      } else {
        setView('dashboard');
      }
    };

    return (
      <div className="min-h-screen bg-white flex flex-col">
        <header className="px-8 py-6 border-b border-stone-100 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <button onClick={() => setView('dashboard')} className="text-stone-400 hover:text-stone-900">
              <LogOut className="w-6 h-6 rotate-180" />
            </button>
            <div>
              <p className="text-xs text-stone-400 font-bold uppercase tracking-widest">{t('Grade', 'कक्षा')} {selectedCourse?.grade}</p>
              <h1 className="font-bold text-stone-900">{t(selectedCourse?.title_en || '', selectedCourse?.title_ne || '')}</h1>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-stone-400">{currentLessonIndex + 1} / {lessons.length}</span>
              <div className="w-32 h-2 bg-stone-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-emerald-500 transition-all duration-500" 
                  style={{ width: `${((currentLessonIndex + 1) / lessons.length) * 100}%` }}
                />
              </div>
            </div>
            <button 
              onClick={() => setLang(lang === 'en' ? 'ne' : 'en')}
              className="px-4 py-2 rounded-full border border-stone-200 text-sm font-medium hover:bg-stone-50 transition-colors"
            >
              {lang === 'en' ? 'नेपाली' : 'English'}
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-12 max-w-4xl mx-auto w-full">
          <AnimatePresence mode="wait">
            {!showQuiz ? (
              <motion.div
                key={`lesson-${lesson.id}`}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-8"
              >
                <h2 className="text-5xl font-bold text-stone-900 leading-tight">{t(lesson.title_en, lesson.title_ne)}</h2>
                <div className="prose prose-stone prose-xl max-w-none text-stone-600 leading-relaxed whitespace-pre-wrap">
                  {t(lesson.content_en, lesson.content_ne)}
                </div>
                
                <div className="pt-12 border-t border-stone-100 flex justify-between items-center">
                  <button 
                    disabled={currentLessonIndex === 0}
                    onClick={() => setCurrentLessonIndex(currentLessonIndex - 1)}
                    className="px-8 py-4 rounded-2xl font-bold text-stone-400 hover:text-stone-900 disabled:opacity-30 transition-all"
                  >
                    {t('Previous Lesson', 'अघिल्लो पाठ')}
                  </button>
                  <button 
                    onClick={markComplete}
                    className="px-12 py-4 bg-emerald-600 text-white rounded-2xl font-bold text-lg hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100 flex items-center gap-3"
                  >
                    {activeQuiz ? t('Take Quiz', 'प्रश्नोत्तरी लिनुहोस्') : (currentLessonIndex === lessons.length - 1 ? t('Finish Course', 'पाठ्यक्रम समाप्त गर्नुहोस्') : t('Next Lesson', 'अर्को पाठ'))}
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key={`quiz-${activeQuiz?.quiz.id}`}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-8"
              >
                <div className="flex items-center gap-3 text-emerald-600 mb-2">
                  <HelpCircle className="w-6 h-6" />
                  <span className="font-bold uppercase tracking-wider text-sm">{t('Knowledge Check', 'ज्ञान परीक्षण')}</span>
                </div>
                <h2 className="text-4xl font-bold text-stone-900">{t(activeQuiz?.quiz.title_en || '', activeQuiz?.quiz.title_ne || '')}</h2>
                
                {!quizResult ? (
                  <div className="space-y-12">
                    {activeQuiz?.questions.map((q, idx) => (
                      <div key={q.id} className="space-y-6">
                        <h3 className="text-xl font-bold text-stone-800 flex gap-4">
                          <span className="text-emerald-500">{idx + 1}.</span>
                          {t(q.question_en, q.question_ne)}
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {['a', 'b', 'c', 'd'].map((opt) => (
                            <button
                              key={opt}
                              onClick={() => setSelectedAnswers({ ...selectedAnswers, [q.id]: opt })}
                              className={`p-5 rounded-2xl border-2 text-left transition-all flex items-center gap-4 ${
                                selectedAnswers[q.id] === opt 
                                  ? 'border-emerald-500 bg-emerald-50 text-emerald-900' 
                                  : 'border-stone-100 hover:border-stone-200 text-stone-600'
                              }`}
                            >
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                                selectedAnswers[q.id] === opt ? 'bg-emerald-500 text-white' : 'bg-stone-100 text-stone-400'
                              }`}>
                                {opt.toUpperCase()}
                              </div>
                              {t((q as any)[`option_${opt}_en`], (q as any)[`option_${opt}_ne` ] )}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                    <div className="pt-8 border-t border-stone-100 flex justify-end">
                      <button 
                        onClick={handleQuizSubmit}
                        disabled={Object.keys(selectedAnswers).length < (activeQuiz?.questions.length || 0)}
                        className="px-12 py-4 bg-emerald-600 text-white rounded-2xl font-bold text-lg hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100 disabled:opacity-50"
                      >
                        {t('Submit Answers', 'उत्तरहरू बुझाउनुहोस्')}
                      </button>
                    </div>
                  </div>
                ) : (
                  <motion.div 
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="bg-stone-50 p-12 rounded-[3rem] text-center space-y-8"
                  >
                    <div className="w-24 h-24 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
                      <Trophy className="w-12 h-12 text-emerald-600" />
                    </div>
                    <div>
                      <h3 className="text-3xl font-bold text-stone-900 mb-2">{t('Quiz Completed!', 'प्रश्नोत्तरी पूरा भयो!')}</h3>
                      <p className="text-stone-500 text-lg">
                        {t('You scored', 'तपाईंले प्राप्त गर्नुभयो')} <span className="text-emerald-600 font-bold text-2xl">{quizResult.score}</span> {t('out of', 'मध्ये')} <span className="font-bold text-2xl">{quizResult.total}</span>
                      </p>
                    </div>
                    <div className="w-full max-w-xs mx-auto h-4 bg-stone-200 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-emerald-500 transition-all duration-1000"
                        style={{ width: `${(quizResult.score / quizResult.total) * 100}%` }}
                      />
                    </div>
                    <button 
                      onClick={nextStep}
                      className="px-12 py-4 bg-stone-900 text-white rounded-2xl font-bold text-lg hover:bg-stone-800 transition-all"
                    >
                      {currentLessonIndex === lessons.length - 1 ? t('Finish Course', 'पाठ्यक्रम समाप्त गर्नुहोस्') : t('Continue to Next Lesson', 'अर्को पाठमा जानुहोस्')}
                    </button>
                  </motion.div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>
    );
  };

  const AdminPanel = () => {
    const [activeTab, setActiveTab] = useState<'certificate' | 'students'>('certificate');
    const [settings, setSettings] = useState<CertificateSettings>({
      school_name: '',
      signatory_name: '',
      signatory_title: '',
      signature_base64: null
    });

    useEffect(() => {
      if (certSettings) setSettings(certSettings);
      fetchAdminUsers();
    }, [certSettings]);

    const handleSave = async () => {
      const res = await fetch('/api/certificate-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });
      if (res.ok) {
        alert('Settings saved');
        fetchCertSettings();
      }
    };

    const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setSettings({ ...settings, signature_base64: reader.result as string });
        };
        reader.readAsDataURL(file);
      }
    };

    const viewUserDetail = (user: any) => {
      setSelectedAdminUser(user);
      fetchAdminUserProgress(user.id);
    };

    return (
      <div className="min-h-screen bg-stone-50 flex">
        <aside className="w-72 bg-white border-r border-stone-200 p-8 flex flex-col">
          <button onClick={() => setView('dashboard')} className="flex items-center gap-2 text-stone-400 hover:text-stone-900 mb-12">
            <LogOut className="w-5 h-5 rotate-180" />
            {t('Back to Dashboard', 'ड्यासबोर्डमा फर्कनुहोस्')}
          </button>
          <h2 className="text-2xl font-bold text-stone-900 mb-8">{t('Admin Panel', 'प्रशासक प्यानल')}</h2>
          <nav className="space-y-2 flex-1">
            <button 
              onClick={() => setActiveTab('certificate')}
              className={`w-full text-left px-4 py-3 rounded-xl font-medium transition-all ${activeTab === 'certificate' ? 'bg-emerald-50 text-emerald-700' : 'text-stone-500 hover:bg-stone-50'}`}
            >
              {t('Certificate Settings', 'प्रमाणपत्र सेटिङहरू')}
            </button>
            <button 
              onClick={() => setActiveTab('students')}
              className={`w-full text-left px-4 py-3 rounded-xl font-medium transition-all ${activeTab === 'students' ? 'bg-emerald-50 text-emerald-700' : 'text-stone-500 hover:bg-stone-50'}`}
            >
              {t('Student Management', 'विद्यार्थी व्यवस्थापन')}
            </button>
          </nav>
        </aside>

        <main className="flex-1 p-12 overflow-y-auto">
          {activeTab === 'certificate' ? (
            <div className="bg-white p-10 rounded-[2.5rem] shadow-sm border border-stone-100 space-y-8 max-w-3xl">
              <h3 className="text-2xl font-bold text-stone-900">Certificate Customization</h3>
              
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-stone-700">Signatory Name</label>
                  <input 
                    type="text"
                    className="w-full px-5 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    value={settings.signatory_name}
                    onChange={e => setSettings({...settings, signatory_name: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-stone-700">Signatory Title</label>
                  <input 
                    type="text"
                    className="w-full px-5 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    value={settings.signatory_title}
                    onChange={e => setSettings({...settings, signatory_title: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-stone-700">Signature Image</label>
                  <div className="flex items-center gap-4">
                    {settings.signature_base64 && (
                      <img src={settings.signature_base64} alt="Signature" className="h-12 border border-stone-200 rounded p-1" />
                    )}
                    <input 
                      type="file"
                      accept="image/*"
                      onChange={handleFile}
                      className="text-sm text-stone-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100"
                    />
                  </div>
                </div>
              </div>

              <button 
                onClick={handleSave}
                className="w-full bg-stone-900 text-white py-4 rounded-2xl font-bold hover:bg-stone-800 transition-all"
              >
                Save Changes
              </button>
            </div>
          ) : (
            <div className="space-y-8">
              {!selectedAdminUser ? (
                <div className="bg-white rounded-[2.5rem] shadow-sm border border-stone-100 overflow-hidden">
                  <div className="p-8 border-b border-stone-100 flex justify-between items-center bg-stone-50/50">
                    <h3 className="text-2xl font-bold text-stone-900">{t('Student List', 'विद्यार्थी सूची')}</h3>
                    <div className="relative">
                      <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" />
                      <input 
                        type="text" 
                        placeholder={t('Search students...', 'विद्यार्थीहरू खोज्नुहोस्...')}
                        className="pl-12 pr-6 py-3 bg-white border border-stone-200 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 w-64"
                      />
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="bg-stone-50/50 text-stone-400 text-xs font-bold uppercase tracking-widest">
                          <th className="px-8 py-4">{t('Student Name', 'विद्यार्थीको नाम')}</th>
                          <th className="px-8 py-4">{t('Username', 'प्रयोगकर्ता नाम')}</th>
                          <th className="px-8 py-4">{t('Lessons Done', 'सकिएका पाठहरू')}</th>
                          <th className="px-8 py-4">{t('Avg. Quiz Score', 'औसत प्रश्नोत्तरी अंक')}</th>
                          <th className="px-8 py-4 text-right">{t('Action', 'कार्य')}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-100">
                        {adminUsers.map(u => (
                          <tr key={u.id} className="hover:bg-stone-50 transition-colors">
                            <td className="px-8 py-6 font-bold text-stone-900">{u.full_name}</td>
                            <td className="px-8 py-6 text-stone-500">{u.username}</td>
                            <td className="px-8 py-6">
                              <span className="px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full text-xs font-bold">
                                {u.completed_lessons}
                              </span>
                            </td>
                            <td className="px-8 py-6">
                              <span className="font-bold text-stone-900">
                                {u.avg_quiz_score ? `${Math.round(u.avg_quiz_score)}%` : 'N/A'}
                              </span>
                            </td>
                            <td className="px-8 py-6 text-right">
                              <button 
                                onClick={() => viewUserDetail(u)}
                                className="p-2 hover:bg-stone-200 rounded-lg transition-colors text-stone-400 hover:text-stone-900"
                              >
                                <Eye className="w-5 h-5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="space-y-8">
                  <button 
                    onClick={() => setSelectedAdminUser(null)}
                    className="flex items-center gap-2 text-stone-400 hover:text-stone-900 font-bold"
                  >
                    <ChevronRight className="w-5 h-5 rotate-180" />
                    {t('Back to Student List', 'विद्यार्थी सूचीमा फर्कनुहोस्')}
                  </button>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="md:col-span-1 space-y-8">
                      <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-stone-100 text-center">
                        <div className="w-24 h-24 bg-stone-100 rounded-full flex items-center justify-center mx-auto mb-6">
                          <UserIcon className="w-12 h-12 text-stone-400" />
                        </div>
                        <h3 className="text-2xl font-bold text-stone-900 mb-1">{selectedAdminUser.full_name}</h3>
                        <p className="text-stone-500 mb-6">@{selectedAdminUser.username}</p>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="bg-stone-50 p-4 rounded-2xl">
                            <p className="text-xs text-stone-400 font-bold uppercase tracking-widest mb-1">{t('Lessons', 'पाठहरू')}</p>
                            <p className="text-2xl font-bold text-stone-900">{selectedAdminUser.completed_lessons}</p>
                          </div>
                          <div className="bg-stone-50 p-4 rounded-2xl">
                            <p className="text-xs text-stone-400 font-bold uppercase tracking-widest mb-1">{t('Score', 'अंक')}</p>
                            <p className="text-2xl font-bold text-stone-900">{selectedAdminUser.avg_quiz_score ? `${Math.round(selectedAdminUser.avg_quiz_score)}%` : 'N/A'}</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="md:col-span-2 space-y-8">
                      <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-stone-100">
                        <h4 className="text-xl font-bold text-stone-900 mb-6">{t('Recent Activity', 'हालैको गतिविधि')}</h4>
                        <div className="space-y-4">
                          {adminUserProgress?.progress.map((p: any, idx: number) => (
                            <div key={idx} className="flex items-center justify-between p-4 bg-stone-50 rounded-2xl">
                              <div className="flex items-center gap-4">
                                <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
                                  <CheckCircle className="w-5 h-5 text-emerald-600" />
                                </div>
                                <div>
                                  <p className="font-bold text-stone-900">{t(p.title_en, p.title_ne)}</p>
                                  <p className="text-xs text-stone-400">{new Date(p.completed_at).toLocaleDateString()}</p>
                                </div>
                              </div>
                              <span className="text-xs font-bold text-emerald-600 uppercase tracking-widest">Completed</span>
                            </div>
                          ))}
                          {(!adminUserProgress || adminUserProgress.progress.length === 0) && (
                            <p className="text-stone-400 text-center py-8 italic">No activity yet.</p>
                          )}
                        </div>
                      </div>

                      <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-stone-100">
                        <h4 className="text-xl font-bold text-stone-900 mb-6">{t('Quiz Scores', 'प्रश्नोत्तरी अंकहरू')}</h4>
                        <div className="space-y-4">
                          {adminUserProgress?.scores.map((s: any, idx: number) => (
                            <div key={idx} className="flex items-center justify-between p-4 bg-stone-50 rounded-2xl">
                              <div>
                                <p className="font-bold text-stone-900">{t(s.title_en, s.title_ne)}</p>
                                <p className="text-xs text-stone-400">{new Date(s.completed_at).toLocaleDateString()}</p>
                              </div>
                              <div className="text-right">
                                <p className="font-bold text-stone-900">{s.score} / {s.total}</p>
                                <p className="text-xs font-bold text-emerald-600">{Math.round((s.score / s.total) * 100)}%</p>
                              </div>
                            </div>
                          ))}
                          {(!adminUserProgress || adminUserProgress.scores.length === 0) && (
                            <p className="text-stone-400 text-center py-8 italic">No quizzes taken yet.</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    );
  };

  const StatsView = () => (
    <div className="min-h-screen bg-stone-50">
      <aside className="fixed left-0 top-0 bottom-0 w-72 bg-white border-r border-stone-200 p-8 flex flex-col">
        <div className="flex items-center gap-3 mb-12">
          <Shield className="text-emerald-600 w-8 h-8" />
          <h1 className="font-bold text-lg leading-tight">Meridian<br/>Cyber Academy</h1>
        </div>
        
        <nav className="flex-1 space-y-2">
          <button 
            onClick={() => setView('dashboard')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all ${view === 'dashboard' ? 'bg-emerald-50 text-emerald-700' : 'text-stone-500 hover:bg-stone-50'}`}
          >
            <BookOpen className="w-5 h-5" />
            {t('My Courses', 'मेरा पाठ्यक्रमहरू')}
          </button>
          <button 
            onClick={() => setView('stats')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all ${view === 'stats' ? 'bg-emerald-50 text-emerald-700' : 'text-stone-500 hover:bg-stone-50'}`}
          >
            <Trophy className="w-5 h-5" />
            {t('My Progress', 'मेरो प्रगति')}
          </button>
          {user?.role === 'admin' && (
            <button 
              onClick={() => setView('admin')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all ${view === 'admin' ? 'bg-emerald-50 text-emerald-700' : 'text-stone-500 hover:bg-stone-50'}`}
            >
              <Settings className="w-5 h-5" />
              {t('Admin Panel', 'प्रशासक प्यानल')}
            </button>
          )}
        </nav>

        <div className="mt-auto pt-8 border-t border-stone-100">
          <div className="flex items-center gap-3 mb-6 px-4">
            <div className="w-10 h-10 bg-stone-100 rounded-full flex items-center justify-center">
              <UserIcon className="text-stone-400 w-5 h-5" />
            </div>
            <div className="overflow-hidden">
              <p className="font-bold text-stone-900 truncate">{user?.full_name}</p>
              <p className="text-xs text-stone-400 capitalize">{user?.role}</p>
            </div>
          </div>
          <button 
            onClick={() => { setUser(null); setView('landing'); }}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-red-500 hover:bg-red-50 transition-all"
          >
            <LogOut className="w-5 h-5" />
            {t('Logout', 'लगआउट')}
          </button>
        </div>
      </aside>

      <main className="ml-72 p-12">
        <header className="flex justify-between items-center mb-12">
          <div>
            <h2 className="text-4xl font-bold text-stone-900 mb-2">{t('Learning Progress', 'सिकाइको प्रगति')}</h2>
            <p className="text-stone-500">{t('Track your achievements and quiz scores.', 'आफ्ना उपलब्धिहरू र प्रश्नोत्तरी स्कोरहरू ट्र्याक गर्नुहोस्।')}</p>
          </div>
          <button 
            onClick={() => setLang(lang === 'en' ? 'ne' : 'en')}
            className="flex items-center gap-2 px-4 py-2 rounded-full border border-stone-200 text-sm font-medium bg-white hover:bg-stone-50 transition-colors"
          >
            <Languages className="w-4 h-4" />
            {lang === 'en' ? 'नेपाली' : 'English'}
          </button>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
          <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-stone-100">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-emerald-100 rounded-2xl flex items-center justify-center">
                <CheckCircle className="text-emerald-600" />
              </div>
              <div>
                <p className="text-sm font-bold text-stone-400 uppercase tracking-wider">{t('Lessons Completed', 'पाठहरू पूरा भए')}</p>
                <p className="text-3xl font-bold text-stone-900">{progress.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-stone-100">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center">
                <HelpCircle className="text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-bold text-stone-400 uppercase tracking-wider">{t('Quizzes Taken', 'लिइएका प्रश्नोत्तरीहरू')}</p>
                <p className="text-3xl font-bold text-stone-900">{quizScores.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-stone-100">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-amber-100 rounded-2xl flex items-center justify-center">
                <Award className="text-amber-600" />
              </div>
              <div>
                <p className="text-sm font-bold text-stone-400 uppercase tracking-wider">{t('Average Score', 'औसत स्कोर')}</p>
                <p className="text-3xl font-bold text-stone-900">
                  {quizScores.length > 0 
                    ? Math.round((quizScores.reduce((acc, s) => acc + (s.score / s.total_questions), 0) / quizScores.length) * 100)
                    : 0}%
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-[2.5rem] shadow-sm border border-stone-100 overflow-hidden">
          <div className="p-8 border-b border-stone-100">
            <h3 className="text-xl font-bold text-stone-900">{t('Detailed Quiz History', 'विस्तृत प्रश्नोत्तरी इतिहास')}</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-stone-50 border-b border-stone-100">
                <tr>
                  <th className="px-8 py-4 text-xs font-bold text-stone-400 uppercase tracking-wider">{t('Quiz ID', 'प्रश्नोत्तरी ID')}</th>
                  <th className="px-8 py-4 text-xs font-bold text-stone-400 uppercase tracking-wider">{t('Score', 'स्कोर')}</th>
                  <th className="px-8 py-4 text-xs font-bold text-stone-400 uppercase tracking-wider">{t('Percentage', 'प्रतिशत')}</th>
                  <th className="px-8 py-4 text-xs font-bold text-stone-400 uppercase tracking-wider">{t('Date', 'मिति')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {quizScores.map(score => (
                  <tr key={score.id} className="hover:bg-stone-50 transition-colors">
                    <td className="px-8 py-4 font-medium text-stone-900">Quiz #{score.quiz_id}</td>
                    <td className="px-8 py-4">
                      <span className="font-bold text-emerald-600">{score.score}</span> / {score.total_questions}
                    </td>
                    <td className="px-8 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex-1 h-2 bg-stone-100 rounded-full max-w-[100px]">
                          <div 
                            className="h-full bg-emerald-500 rounded-full"
                            style={{ width: `${(score.score / score.total_questions) * 100}%` }}
                          />
                        </div>
                        <span className="text-sm font-bold text-stone-600">{Math.round((score.score / score.total_questions) * 100)}%</span>
                      </div>
                    </td>
                    <td className="px-8 py-4 text-stone-400 text-sm">
                      {new Date(score.completed_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
                {quizScores.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-8 py-12 text-center text-stone-400">
                      {t('No quizzes taken yet.', 'अझै कुनै प्रश्नोत्तरी लिइएको छैन।')}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
  const Certificate = () => {
    const certRef = useRef<HTMLDivElement>(null);

    const handlePrint = () => {
      window.print();
    };

    return (
      <div className="min-h-screen bg-stone-100 p-12 flex flex-col items-center">
        <div className="mb-8 flex gap-4 no-print">
          <button 
            onClick={() => setView('dashboard')}
            className="bg-white px-6 py-2 rounded-full font-bold text-stone-600 hover:bg-stone-50 transition-all"
          >
            {t('Close', 'बन्द गर्नुहोस्')}
          </button>
          <button 
            onClick={handlePrint}
            className="bg-emerald-600 text-white px-8 py-2 rounded-full font-bold hover:bg-emerald-700 transition-all flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            {t('Download / Print', 'डाउनलोड / प्रिन्ट')}
          </button>
        </div>

        <div 
          ref={certRef}
          className="w-[1000px] aspect-[1.414/1] bg-white p-16 shadow-2xl relative border-[20px] border-emerald-900 certificate-font"
        >
          {/* Decorative Corners */}
          <div className="absolute top-0 left-0 w-32 h-32 border-t-[10px] border-l-[10px] border-emerald-600 m-4" />
          <div className="absolute top-0 right-0 w-32 h-32 border-t-[10px] border-r-[10px] border-emerald-600 m-4" />
          <div className="absolute bottom-0 left-0 w-32 h-32 border-b-[10px] border-l-[10px] border-emerald-600 m-4" />
          <div className="absolute bottom-0 right-0 w-32 h-32 border-b-[10px] border-r-[10px] border-emerald-600 m-4" />

          <div className="h-full border-4 border-emerald-100 p-12 flex flex-col items-center text-center">
            <div className="mb-8">
              <Shield className="w-16 h-16 text-emerald-600 mx-auto mb-4" />
              <h2 className="text-4xl font-bold text-stone-900 uppercase tracking-widest">{certSettings?.school_name}</h2>
              <p className="text-stone-500 italic">Balwatar, Kathmandu, Nepal</p>
            </div>

            <div className="mb-12">
              <h3 className="text-6xl font-serif text-emerald-800 mb-4">Certificate of Completion</h3>
              <p className="text-xl text-stone-600">This is to certify that</p>
            </div>

            <div className="mb-12">
              <h4 className="text-5xl font-bold text-stone-900 border-b-2 border-stone-200 pb-2 inline-block min-w-[400px]">
                {user?.full_name}
              </h4>
            </div>

            <div className="mb-16 max-w-2xl">
              <p className="text-xl text-stone-600 leading-relaxed">
                has successfully completed the <span className="font-bold text-stone-900">{selectedCourse?.title_en}</span> course for Grade {selectedCourse?.grade} at Meridian Cyber Academy.
              </p>
            </div>

            <div className="mt-auto w-full flex justify-between items-end px-12">
              <div className="text-left">
                <p className="text-stone-400 text-sm mb-1">Date of Issue</p>
                <p className="font-bold text-stone-900">{new Date().toLocaleDateString()}</p>
              </div>
              
              <div className="text-center">
                <div className="h-20 flex items-center justify-center mb-2">
                  {certSettings?.signature_base64 && (
                    <img src={certSettings.signature_base64} alt="Signature" className="max-h-full" />
                  )}
                </div>
                <div className="border-t border-stone-300 pt-2 px-8">
                  <p className="font-bold text-stone-900">{certSettings?.signatory_name}</p>
                  <p className="text-sm text-stone-500">{certSettings?.signatory_title}</p>
                </div>
              </div>

              <div className="text-right">
                <p className="text-stone-400 text-sm mb-1">Certificate ID</p>
                <p className="font-mono text-stone-900">MCA-{selectedCourse?.id}-{user?.id}-{Date.now().toString().slice(-6)}</p>
              </div>
            </div>
          </div>
        </div>

        <style>{`
          @media print {
            body * { visibility: hidden; }
            .no-print { display: none; }
            .certificate-font { visibility: visible; position: absolute; left: 0; top: 0; width: 100%; }
            .certificate-font * { visibility: visible; }
          }
        `}</style>
      </div>
    );
  };

  return (
    <AnimatePresence mode="wait">
      {view === 'landing' && <Landing key="landing" />}
      {view === 'login' && <Login key="login" />}
      {view === 'dashboard' && <Dashboard key="dashboard" />}
      {view === 'course' && <CourseViewer key="course" />}
      {view === 'admin' && <AdminPanel key="admin" />}
      {view === 'certificate' && <Certificate key="certificate" />}
      {view === 'stats' && <StatsView key="stats" />}
    </AnimatePresence>
  );
};

export default App;
