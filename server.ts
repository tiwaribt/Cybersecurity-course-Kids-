import express from "express";
import { createServer as createViteServer } from "vite";
import db from "./src/db.js"; // Note: using .js extension for ESM compatibility with tsx
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));

  // API Routes
  app.post("/api/login", (req, res) => {
    const { username, password } = req.body;
    const user = db.prepare("SELECT * FROM users WHERE username = ? AND password = ?").get(username, password);
    if (user) {
      res.json({ id: user.id, username: user.username, role: user.role, full_name: user.full_name });
    } else {
      res.status(401).json({ error: "Invalid credentials" });
    }
  });

  app.get("/api/courses", (req, res) => {
    const courses = db.prepare("SELECT * FROM courses ORDER BY grade ASC").all();
    res.json(courses);
  });

  app.get("/api/courses/:id/lessons", (req, res) => {
    const lessons = db.prepare("SELECT * FROM lessons WHERE course_id = ? ORDER BY order_index ASC").all(req.params.id);
    res.json(lessons);
  });

  app.get("/api/progress/:userId", (req, res) => {
    const progress = db.prepare("SELECT lesson_id FROM progress WHERE user_id = ?").all(req.params.userId);
    res.json(progress.map(p => p.lesson_id));
  });

  app.post("/api/progress", (req, res) => {
    const { userId, lessonId } = req.body;
    try {
      db.prepare("INSERT OR IGNORE INTO progress (user_id, lesson_id) VALUES (?, ?)").run(userId, lessonId);
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/lessons/:id/quiz", (req, res) => {
    const quiz = db.prepare("SELECT * FROM quizzes WHERE lesson_id = ?").get(req.params.id);
    if (!quiz) return res.status(404).json({ error: "No quiz for this lesson" });
    const questions = db.prepare("SELECT * FROM quiz_questions WHERE quiz_id = ?").all(quiz.id);
    res.json({ ...quiz, questions });
  });

  app.post("/api/quiz/submit", (req, res) => {
    const { userId, quizId, score, total } = req.body;
    db.prepare("INSERT OR REPLACE INTO quiz_scores (user_id, quiz_id, score, total) VALUES (?, ?, ?, ?)")
      .run(userId, quizId, score, total);
    res.json({ success: true });
  });

  app.get("/api/quiz-scores/:userId", (req, res) => {
    const scores = db.prepare("SELECT * FROM quiz_scores WHERE user_id = ?").all(req.params.userId);
    res.json(scores);
  });

  app.get("/api/certificate-settings", (req, res) => {
    const settings = db.prepare("SELECT * FROM certificate_settings WHERE id = 1").get();
    res.json(settings);
  });

  app.post("/api/certificate-settings", (req, res) => {
    const { signatory_name, signatory_title, signature_base64 } = req.body;
    db.prepare("UPDATE certificate_settings SET signatory_name = ?, signatory_title = ?, signature_base64 = ? WHERE id = 1")
      .run(signatory_name, signatory_title, signature_base64);
    res.json({ success: true });
  });

  // Admin: Get all users and their progress
  app.get("/api/admin/users", (req, res) => {
    const users = db.prepare(`
      SELECT 
        u.id, 
        u.username, 
        u.full_name, 
        u.role,
        (SELECT COUNT(*) FROM progress p WHERE p.user_id = u.id) as completed_lessons,
        (SELECT AVG(score * 1.0 / total) * 100 FROM quiz_scores qs WHERE qs.user_id = u.id) as avg_quiz_score
      FROM users u
      WHERE u.role = 'student'
    `).all();
    res.json(users);
  });

  // Admin: Get specific user progress details
  app.get("/api/admin/users/:id/progress", (req, res) => {
    const userId = req.params.id;
    const progress = db.prepare(`
      SELECT l.title_en, l.title_ne, p.completed_at
      FROM progress p
      JOIN lessons l ON p.lesson_id = l.id
      WHERE p.user_id = ?
      ORDER BY p.completed_at DESC
    `).all(userId);
    
    const scores = db.prepare(`
      SELECT q.title_en, q.title_ne, qs.score, qs.total, qs.completed_at
      FROM quiz_scores qs
      JOIN quizzes q ON qs.quiz_id = q.id
      WHERE qs.user_id = ?
      ORDER BY qs.completed_at DESC
    `).all(userId);

    res.json({ progress, scores });
  });

  // Seed data
  const courseCount = db.prepare("SELECT COUNT(*) as count FROM courses").get().count;
  
  if (courseCount < 12) {
    console.log("Seeding comprehensive curriculum data with quizzes...");
    db.exec("DELETE FROM quiz_questions; DELETE FROM quizzes; DELETE FROM lessons; DELETE FROM courses;"); 
    
    const insertCourse = db.prepare("INSERT INTO courses (grade, title_en, title_ne, description_en, description_ne) VALUES (?, ?, ?, ?, ?)");
    const insertLesson = db.prepare("INSERT INTO lessons (course_id, order_index, title_en, title_ne, content_en, content_ne) VALUES (?, ?, ?, ?, ?, ?)");
    const insertQuiz = db.prepare("INSERT INTO quizzes (lesson_id, title_en, title_ne) VALUES (?, ?, ?)");
    const insertQuestion = db.prepare("INSERT INTO quiz_questions (quiz_id, question_en, question_ne, option_a_en, option_a_ne, option_b_en, option_b_ne, option_c_en, option_c_ne, option_d_en, option_d_ne, correct_option) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");

    const curriculum = [
      {
        grade: 1,
        title_en: "Introduction to Computers",
        title_ne: "कम्प्युटरको परिचय",
        desc_en: "Basic computer parts and how to use them safely.",
        desc_ne: "कम्प्युटरका आधारभूत भागहरू र तिनीहरूको सुरक्षित प्रयोग।",
        lessons: [
          {
            t_en: "What is a Computer?",
            t_ne: "कम्प्युटर भनेको के हो?",
            c_en: "A computer is a smart machine. It helps us to draw, play games, and learn new things. It works very fast and never gets tired. \n\nMain parts of a computer:\n1. Monitor (looks like a TV)\n2. Keyboard (used for typing)\n3. Mouse (used for pointing)\n4. CPU (the brain of the computer)",
            c_ne: "कम्प्युटर एक स्मार्ट मेसिन हो। यसले हामीलाई चित्र कोर्न, खेल खेल्न र नयाँ कुराहरू सिक्न मद्दत गर्दछ। यो धेरै छिटो काम गर्दछ र कहिल्यै थाक्दैन।\n\nकम्प्युटरका मुख्य भागहरू:\n१. मनिटर (टिभी जस्तै देखिन्छ)\n२. किबोर्ड (टाइपिङका लागि प्रयोग गरिन्छ)\n३. माउस (देखाउनका लागि प्रयोग गरिन्छ)\n४. CPU (कम्प्युटरको मस्तिष्क)",
            quiz: {
              title_en: "Computer Basics Quiz",
              title_ne: "कम्प्युटर आधारभूत प्रश्नोत्तरी",
              questions: [
                {
                  q_en: "Which part of the computer looks like a TV?",
                  q_ne: "कम्प्युटरको कुन भाग टिभी जस्तै देखिन्छ?",
                  a_en: "Monitor", a_ne: "मनिटर",
                  b_en: "Mouse", b_ne: "माउस",
                  c_en: "Keyboard", c_ne: "किबोर्ड",
                  d_en: "CPU", d_ne: "CPU",
                  correct: "a"
                }
              ]
            }
          },
          {
            t_en: "Using the Mouse",
            t_ne: "माउसको प्रयोग",
            c_en: "The mouse is a pointing device. It has two buttons: Left and Right. \n\nHow to hold a mouse:\n- Place your palm on the mouse.\n- Keep your index finger on the left button.\n- Keep your middle finger on the right button.\n- Move the mouse to move the pointer on the screen.",
            c_ne: "माउस एक पोइन्टिङ उपकरण हो। यसमा दुईवटा बटनहरू हुन्छन्: बायाँ र दायाँ।\n\nमाउस कसरी समात्ने:\n- आफ्नो हत्केला माउसमा राख्नुहोस्।\n- आफ्नो चोर औंला बायाँ बटनमा राख्नुहोस्।\n- आफ्नो माझी औंला दायाँ बटनमा राख्नुहोस्।\n- स्क्रिनमा पोइन्टर सार्न माउस सार्नुहोस्।",
            quiz: {
              title_en: "Mouse Quiz",
              title_ne: "माउस प्रश्नोत्तरी",
              questions: [
                {
                  q_en: "How many main buttons does a mouse have?",
                  q_ne: "माउसमा कतिवटा मुख्य बटनहरू हुन्छन्?",
                  a_en: "One", a_ne: "एक",
                  b_en: "Two", b_ne: "दुई",
                  c_en: "Three", c_ne: "तीन",
                  d_en: "Four", d_ne: "चार",
                  correct: "b"
                }
              ]
            }
          }
        ]
      },
      {
        grade: 2,
        title_en: "Safe Technology Use",
        title_ne: "प्रविधिको सुरक्षित प्रयोग",
        desc_en: "Learning how to be safe and kind online.",
        desc_ne: "अनलाइनमा सुरक्षित र दयालु हुने तरिका सिक्दै।",
        lessons: [
          {
            t_en: "Asking for Help",
            t_ne: "मद्दत माग्ने",
            c_en: "When you use a computer or tablet, always stay near a grown-up. If you see something that makes you feel sad or scared, tell your teacher or parents immediately. \n\nSafety Rules:\n1. Never share your name or address.\n2. Don't talk to strangers online.\n3. Be kind to everyone.",
            c_ne: "जब तपाईं कम्प्युटर वा ट्याब्लेट प्रयोग गर्नुहुन्छ, सधैं ठूला मानिसको नजिक बस्नुहोस्। यदि तपाईंले आफूलाई दुखी वा डराएको महसुस गराउने केही देख्नुभयो भने, तुरुन्तै आफ्नो शिक्षक वा अभिभावकलाई भन्नुहोस्।\n\nसुरक्षा नियमहरू:\n१. आफ्नो नाम वा ठेगाना कहिल्यै साझा नगर्नुहोस्।\n२. अनलाइनमा अपरिचित व्यक्तिहरूसँग कुरा नगर्नुहोस्।\n३. सबैसँग दयालु हुनुहोस्।",
            quiz: {
              title_en: "Safety First Quiz",
              title_ne: "सुरक्षा पहिलो प्रश्नोत्तरी",
              questions: [
                {
                  q_en: "What should you do if you see something scary online?",
                  q_ne: "यदि तपाईंले अनलाइनमा केही डरलाग्दो देख्नुभयो भने के गर्नुपर्छ?",
                  a_en: "Close your eyes", a_ne: "आँखा बन्द गर्ने",
                  b_en: "Tell an adult", b_ne: "ठूला मानिसलाई भन्ने",
                  c_en: "Keep it a secret", c_ne: "गोप्य राख्ने",
                  d_en: "Turn off the lights", d_ne: "बत्ती निभाउने",
                  correct: "b"
                }
              ]
            }
          }
        ]
      },
      {
        grade: 3,
        title_en: "The World of Internet",
        title_ne: "इन्टरनेटको संसार",
        desc_en: "Understanding the web and digital footprints.",
        desc_ne: "वेब र डिजिटल पदचिह्नहरू बुझ्दै।",
        lessons: [
          {
            t_en: "What is the Internet?",
            t_ne: "इन्टरनेट भनेको के हो?",
            c_en: "The internet is like a giant library that connects computers all over the world. We can use it to find information, watch videos, and talk to friends. \n\nTo go to the internet, we use a 'Web Browser' like Google Chrome or Microsoft Edge.",
            c_ne: "इन्टरनेट एउटा विशाल पुस्तकालय जस्तै हो जसले संसारभरका कम्प्युटरहरूलाई जोड्दछ। हामी यसलाई जानकारी खोज्न, भिडियोहरू हेर्न र साथीहरूसँग कुरा गर्न प्रयोग गर्न सक्छौं।\n\nइन्टरनेटमा जानका लागि हामी गुगल क्रोम वा माइक्रोसफ्ट एज जस्ता 'वेब ब्राउजर' प्रयोग गर्छौं।",
            quiz: {
              title_en: "Internet Quiz",
              title_ne: "इन्टरनेट प्रश्नोत्तरी",
              questions: [
                {
                  q_en: "Which of these is a web browser?",
                  q_ne: "यी मध्ये कुन वेब ब्राउजर हो?",
                  a_en: "MS Paint", a_ne: "MS Paint",
                  b_en: "Google Chrome", b_ne: "गुगल क्रोम",
                  c_en: "Calculator", c_ne: "क्याल्कुलेटर",
                  d_en: "Notepad", d_ne: "नोटप्याड",
                  correct: "b"
                }
              ]
            }
          }
        ]
      },
      {
        grade: 4,
        title_en: "Digital Citizenship & Passwords",
        title_ne: "डिजिटल नागरिकता र पासवर्ड",
        desc_en: "Creating strong passwords and being a good digital citizen.",
        desc_ne: "बलियो पासवर्ड बनाउने र राम्रो डिजिटल नागरिक बन्ने।",
        lessons: [
          {
            t_en: "Creating Strong Passwords",
            t_ne: "बलियो पासवर्ड बनाउने",
            c_en: "A password is like a key to your digital house. A strong password is hard to guess. \n\nTips for a strong password:\n- Use at least 8 characters.\n- Mix uppercase (A) and lowercase (a) letters.\n- Include numbers (123).\n- Add symbols (!@#).\n- Never use your name or birthday.",
            c_ne: "पासवर्ड तपाईंको डिजिटल घरको साँचो जस्तै हो। बलियो पासवर्ड अनुमान गर्न गाह्रो हुन्छ।\n\nबलियो पासवर्डका लागि सुझावहरू:\n- कम्तिमा ८ अक्षरहरू प्रयोग गर्नुहोस्।\n- ठूला (A) र साना (a) अक्षरहरू मिलाउनुहोस्।\n- अंकहरू (१२३) समावेश गर्नुहोस्।\n- चिन्हहरू (!@#) थप्नुहोस्।\n- आफ्नो नाम वा जन्मदिन कहिल्यै प्रयोग नगर्नुहोस्।",
            quiz: {
              title_en: "Password Safety Quiz",
              title_ne: "पासवर्ड सुरक्षा प्रश्नोत्तरी",
              questions: [
                {
                  q_en: "Which of these is a strong password?",
                  q_ne: "यी मध्ये कुन बलियो पासवर्ड हो?",
                  a_en: "123456", a_ne: "१२३४५६",
                  b_en: "password", b_ne: "password",
                  c_en: "MyName2010", c_ne: "MyName2010",
                  d_en: "B1u3#Sky!9", d_ne: "B1u3#Sky!9",
                  correct: "d"
                }
              ]
            }
          }
        ]
      },
      {
        grade: 5,
        title_en: "Cyberbullying Awareness",
        title_ne: "साइबर बुलिङ सचेतना",
        desc_en: "Identifying and stopping online bullying.",
        desc_ne: "अनलाइन बुलिङ पहिचान गर्ने र रोक्ने।",
        lessons: [
          {
            t_en: "What is Cyberbullying?",
            t_ne: "साइबर बुलिङ भनेको के हो?",
            c_en: "Cyberbullying is when someone uses technology to be mean to others on purpose. This can happen through messages, social media, or games. \n\nIf you are being bullied:\n- STOP: Don't reply.\n- BLOCK: Block the person.\n- TELL: Tell a trusted adult immediately.",
            c_ne: "साइबर बुलिङ भनेको कसैले जानाजानी अरूलाई नराम्रो व्यवहार गर्न प्रविधिको प्रयोग गर्नु हो। यो सन्देश, सामाजिक सञ्जाल वा खेलहरू मार्फत हुन सक्छ।\n\nयदि तपाईं बुलिङको शिकार हुनुभएको छ भने:\n- रोक्नुहोस्: जवाफ नदिनुहोस्।\n- ब्लक गर्नुहोस्: त्यो व्यक्तिलाई ब्लक गर्नुहोस्।\n- भन्नुहोस्: तुरुन्तै एक भरपर्दो ठूलो मानिसलाई भन्नुहोस्।",
            quiz: {
              title_en: "Cyberbullying Quiz",
              title_ne: "साइबर बुलिङ प्रश्नोत्तरी",
              questions: [
                {
                  q_en: "What is the first thing you should do if someone is mean to you online?",
                  q_ne: "यदि कसैले तपाईंलाई अनलाइनमा नराम्रो व्यवहार गर्यो भने तपाईंले सबैभन्दा पहिले के गर्नुपर्छ?",
                  a_en: "Be mean back", a_ne: "फिर्ता नराम्रो व्यवहार गर्ने",
                  b_en: "Tell a trusted adult", b_ne: "भरपर्दो ठूलो मानिसलाई भन्ने",
                  c_en: "Delete your account", c_ne: "आफ्नो खाता हटाउने",
                  d_en: "Ignore it forever", d_ne: "सधैं बेवास्ता गर्ने",
                  correct: "b"
                }
              ]
            }
          }
        ]
      },
      {
        grade: 6,
        title_en: "Malware & Antivirus",
        title_ne: "मालवेयर र एन्टिभाइरस",
        desc_en: "Protecting your computer from bad software.",
        desc_ne: "आफ्नो कम्प्युटरलाई खराब सफ्टवेयरबाट सुरक्षित राख्ने।",
        lessons: [
          {
            t_en: "Understanding Malware",
            t_ne: "मालवेयर बुझ्दै",
            c_en: "Malware stands for 'Malicious Software'. It is designed to damage or gain unauthorized access to a computer system. \n\nTypes of Malware:\n- Viruses: Spread from file to file.\n- Worms: Spread through networks.\n- Trojans: Pretend to be useful programs.\n- Ransomware: Locks your files for money.",
            c_ne: "मालवेयरको अर्थ 'मालिसियस सफ्टवेयर' (खराब सफ्टवेयर) हो। यो कम्प्युटर प्रणालीलाई क्षति पुर्याउन वा अनधिकृत पहुँच प्राप्त गर्न डिजाइन गरिएको हो।\n\nमालवेयरका प्रकारहरू:\n- भाइरस: एक फाइलबाट अर्को फाइलमा फैलिन्छ।\n- वर्म्स: नेटवर्क मार्फत फैलिन्छ।\n- ट्रोजन: उपयोगी कार्यक्रम भएको नाटक गर्दछ।\n- र्यान्समवेयर: पैसाका लागि तपाईंको फाइलहरू लक गर्दछ।",
            quiz: {
              title_en: "Malware Quiz",
              title_ne: "मालवेयर प्रश्नोत्तरी",
              questions: [
                {
                  q_en: "What does 'Malware' stand for?",
                  q_ne: "मालवेयरको पूरा रूप के हो?",
                  a_en: "Mail Software", a_ne: "मेल सफ्टवेयर",
                  b_en: "Malicious Software", b_ne: "मालिसियस सफ्टवेयर",
                  c_en: "Multi Software", c_ne: "मल्टी सफ्टवेयर",
                  d_en: "Modern Software", d_ne: "मोडर्न सफ्टवेयर",
                  correct: "b"
                }
              ]
            }
          }
        ]
      },
      {
        grade: 7,
        title_en: "Social Media & Privacy",
        title_ne: "सामाजिक सञ्जाल र गोपनीयता",
        desc_en: "Navigating social networks safely.",
        desc_ne: "सामाजिक सञ्जालहरू सुरक्षित रूपमा प्रयोग गर्ने।",
        lessons: [
          {
            t_en: "Privacy Settings",
            t_ne: "गोपनीयता सेटिङहरू",
            c_en: "Social media apps collect a lot of data. You should always check your privacy settings to control who can see your posts and personal information. \n\nKey Privacy Tips:\n- Set profile to 'Private'.\n- Only accept friend requests from people you know in real life.\n- Turn off location sharing.",
            c_ne: "सामाजिक सञ्जाल एपहरूले धेरै डाटा सङ्कलन गर्छन्। तपाईंको पोस्ट र व्यक्तिगत जानकारी कसले देख्न सक्छ भन्ने कुरा नियन्त्रण गर्न तपाईंले सधैं आफ्नो गोपनीयता सेटिङहरू जाँच गर्नुपर्छ।\n\nमुख्य गोपनीयता सुझावहरू:\n- प्रोफाइललाई 'प्राइभेट' मा सेट गर्नुहोस्।\n- वास्तविक जीवनमा चिनेका मानिसहरूको मात्र साथी अनुरोध स्वीकार गर्नुहोस्।\n- लोकेसन सेयरिङ बन्द गर्नुहोस्।",
            quiz: {
              title_en: "Privacy Quiz",
              title_ne: "गोपनीयता प्रश्नोत्तरी",
              questions: [
                {
                  q_en: "Who should you accept friend requests from?",
                  q_ne: "तपाईंले कसको साथी अनुरोध स्वीकार गर्नुपर्छ?",
                  a_en: "Anyone who asks", a_ne: "जसले सोधे पनि",
                  b_en: "Strangers with cool photos", b_ne: "राम्रो फोटो भएका अपरिचितहरू",
                  c_en: "People you know in real life", c_ne: "वास्तविक जीवनमा चिनेका मानिसहरू",
                  d_en: "Celebrities", d_ne: "सेलिब्रेटीहरू",
                  correct: "c"
                }
              ]
            }
          }
        ]
      },
      {
        grade: 8,
        title_en: "Networking Fundamentals",
        title_ne: "नेटवर्किङका आधारभूत कुराहरू",
        desc_en: "How the internet and local networks work.",
        desc_ne: "इन्टरनेट र स्थानीय नेटवर्कहरूले कसरी काम गर्छन्।",
        lessons: [
          {
            t_en: "IP Addresses and Routers",
            t_ne: "IP ठेगाना र राउटरहरू",
            c_en: "Every device on a network has a unique address called an IP (Internet Protocol) address. A router is a device that directs data traffic between your local network and the internet. \n\nThink of an IP address like your home address, and the router like a mailman.",
            c_ne: "नेटवर्कमा रहेका प्रत्येक उपकरणको IP (इन्टरनेट प्रोटोकल) ठेगाना भनिने एउटा अद्वितीय ठेगाना हुन्छ। राउटर एउटा यस्तो उपकरण हो जसले तपाईंको स्थानीय नेटवर्क र इन्टरनेट बीचको डाटा ट्राफिकलाई निर्देशित गर्दछ।\n\nIP ठेगानालाई आफ्नो घरको ठेगाना जस्तै र राउटरलाई हुलाकी जस्तै सम्झनुहोस्।",
            quiz: {
              title_en: "Networking Quiz",
              title_ne: "नेटवर्किङ प्रश्नोत्तरी",
              questions: [
                {
                  q_en: "What does IP stand for?",
                  q_ne: "IP को पूरा रूप के हो?",
                  a_en: "Internet Protocol", a_ne: "इन्टरनेट प्रोटोकल",
                  b_en: "Internal Process", b_ne: "इन्टरनल प्रोसेस",
                  c_en: "Instant Post", c_ne: "इन्स्ट्यान्ट पोस्ट",
                  d_en: "Information Path", d_ne: "इन्फर्मेसन पाथ",
                  correct: "a"
                }
              ]
            }
          }
        ]
      },
      {
        grade: 9,
        title_en: "Cryptography & Encryption",
        title_ne: "क्रिप्टोग्राफी र इन्क्रिप्शन",
        desc_en: "The science of keeping secrets.",
        desc_ne: "गोप्य कुराहरू राख्ने विज्ञान।",
        lessons: [
          {
            t_en: "Introduction to Encryption",
            t_ne: "इन्क्रिप्शनको परिचय",
            c_en: "Encryption is the process of converting information into a secret code that hides the information's true meaning. \n\nTypes of Encryption:\n- Symmetric: Uses the same key to encrypt and decrypt.\n- Asymmetric: Uses a public key to encrypt and a private key to decrypt.",
            c_ne: "इन्क्रिप्शन भनेको जानकारीलाई गोप्य कोडमा परिवर्तन गर्ने प्रक्रिया हो जसले जानकारीको वास्तविक अर्थ लुकाउँछ।\n\nइन्क्रिप्शनका प्रकारहरू:\n- सिमेट्रिक: इन्क्रिप्ट र डिक्रिप्ट गर्न एउटै साँचो प्रयोग गर्दछ।\n- असिमेट्रिक: इन्क्रिप्ट गर्न सार्वजनिक साँचो र डिक्रिप्ट गर्न निजी साँचो प्रयोग गर्दछ।",
            quiz: {
              title_en: "Encryption Quiz",
              title_ne: "इन्क्रिप्शन प्रश्नोत्तरी",
              questions: [
                {
                  q_en: "Which type of encryption uses two different keys?",
                  q_ne: "कुन प्रकारको इन्क्रिप्शनले दुईवटा फरक साँचोहरू प्रयोग गर्दछ?",
                  a_en: "Symmetric", a_ne: "सिमेट्रिक",
                  b_en: "Asymmetric", b_ne: "असिमेट्रिक",
                  c_en: "Simple", c_ne: "साधारण",
                  d_en: "Double", d_ne: "डबल",
                  correct: "b"
                }
              ]
            }
          }
        ]
      },
      {
        grade: 10,
        title_en: "Cyber Laws in Nepal",
        title_ne: "नेपालमा साइबर कानून",
        desc_en: "Understanding the legal side of technology.",
        desc_ne: "प्रविधिको कानूनी पक्ष बुझ्दै।",
        lessons: [
          {
            t_en: "Electronic Transactions Act 2063",
            t_ne: "विद्युतीय कारोबार ऐन २०६३",
            c_en: "The Electronic Transactions Act (ETA) is the primary cyber law in Nepal. It covers digital signatures, cyber crimes, and the legal recognition of electronic records. \n\nCommon Cyber Crimes in Nepal:\n- Hacking\n- Identity Theft\n- Online Fraud\n- Spreading Hate Speech",
            c_ne: "विद्युतीय कारोबार ऐन (ETA) नेपालको प्राथमिक साइबर कानून हो। यसले डिजिटल हस्ताक्षर, साइबर अपराध र विद्युतीय अभिलेखहरूको कानूनी मान्यतालाई समेट्छ।\n\nनेपालमा सामान्य साइबर अपराधहरू:\n- ह्याकिङ\n- पहिचान चोरी\n- अनलाइन ठगी\n- घृणास्पद भाषण फैलाउने",
            quiz: {
              title_en: "Cyber Law Quiz",
              title_ne: "साइबर कानून प्रश्नोत्तरी",
              questions: [
                {
                  q_en: "What is the main cyber law in Nepal?",
                  q_ne: "नेपालको मुख्य साइबर कानून कुन हो?",
                  a_en: "IT Policy", a_ne: "IT Policy",
                  b_en: "Electronic Transactions Act", b_ne: "विद्युतीय कारोबार ऐन",
                  c_en: "Cyber Security Act", c_ne: "साइबर सुरक्षा ऐन",
                  d_en: "Internet Act", d_ne: "इन्टरनेट ऐन",
                  correct: "b"
                }
              ]
            }
          }
        ]
      },
      {
        grade: 11,
        title_en: "Information Security Management",
        title_ne: "सूचना सुरक्षा व्यवस्थापन",
        desc_en: "Protecting organizational data.",
        desc_ne: "संस्थागत डाटाको सुरक्षा।",
        lessons: [
          {
            t_en: "The CIA Triad",
            t_ne: "CIA ट्रायड",
            c_en: "The CIA Triad is a model designed to guide policies for information security within an organization. \n\n- Confidentiality: Ensuring only authorized users can access data.\n- Integrity: Ensuring data is accurate and has not been tampered with.\n- Availability: Ensuring data is accessible when needed.",
            c_ne: "CIA ट्रायड एउटा यस्तो मोडेल हो जुन संस्था भित्र सूचना सुरक्षाका लागि नीतिहरू निर्देशित गर्न डिजाइन गरिएको हो।\n\n- गोपनीयता (Confidentiality): अनधिकृत प्रयोगकर्ताहरूले मात्र डाटा पहुँच गर्न सक्ने सुनिश्चित गर्ने।\n- अखण्डता (Integrity): डाटा सही छ र यसमा कुनै छेडछाड गरिएको छैन भन्ने सुनिश्चित गर्ने।\n- उपलब्धता (Availability): आवश्यक पर्दा डाटा पहुँचयोग्य छ भन्ने सुनिश्चित गर्ने।",
            quiz: {
              title_en: "CIA Triad Quiz",
              title_ne: "CIA ट्रायड प्रश्नोत्तरी",
              questions: [
                {
                  q_en: "What does the 'I' in CIA stand for?",
                  q_ne: "CIA मा 'I' को अर्थ के हो?",
                  a_en: "Information", a_ne: "इन्फर्मेसन",
                  b_en: "Integrity", b_ne: "इन्टेग्रिटी",
                  c_en: "Internet", c_ne: "इन्टरनेट",
                  d_en: "Identity", d_ne: "आइडेन्टिटी",
                  correct: "b"
                }
              ]
            }
          }
        ]
      },
      {
        grade: 12,
        title_en: "Emerging Technologies & AI",
        title_ne: "उदीयमान प्रविधिहरू र AI",
        desc_en: "The future of cyber security.",
        desc_ne: "साइबर सुरक्षाको भविष्य।",
        lessons: [
          {
            t_en: "AI and Machine Learning in Security",
            t_ne: "सुरक्षामा AI र मेसिन लर्निङ",
            c_en: "Artificial Intelligence (AI) is being used to automate threat detection and response. Machine Learning models can analyze vast amounts of data to find patterns that indicate a cyber attack. \n\nHowever, hackers also use AI to create more sophisticated attacks.",
            c_ne: "आर्टिफिसियल इन्टेलिजेन्स (AI) खतरा पत्ता लगाउन र प्रतिक्रिया दिन स्वचालित गर्न प्रयोग भइरहेको छ। मेसिन लर्निङ मोडेलहरूले साइबर आक्रमणको संकेत गर्ने ढाँचाहरू फेला पार्न ठूलो मात्रामा डाटा विश्लेषण गर्न सक्छन्।\n\nयद्यपि, ह्याकरहरूले पनि थप परिष्कृत आक्रमणहरू सिर्जना गर्न AI प्रयोग गर्छन्।",
            quiz: {
              title_en: "AI in Security Quiz",
              title_ne: "सुरक्षामा AI प्रश्नोत्तरी",
              questions: [
                {
                  q_en: "How can AI help in cyber security?",
                  q_ne: "साइबर सुरक्षामा AI ले कसरी मद्दत गर्न सक्छ?",
                  a_en: "Automate threat detection", a_ne: "खतरा पत्ता लगाउन स्वचालित गर्ने",
                  b_en: "Make computers faster", b_ne: "कम्प्युटरलाई छिटो बनाउने",
                  c_en: "Replace the internet", c_ne: "इन्टरनेटलाई प्रतिस्थापन गर्ने",
                  d_en: "Create more viruses", d_ne: "थप भाइरसहरू बनाउने",
                  correct: "a"
                }
              ]
            }
          }
        ]
      }
    ];

    curriculum.forEach(item => {
      const courseId = insertCourse.run(
        item.grade,
        item.title_en,
        item.title_ne,
        item.desc_en,
        item.desc_ne
      ).lastInsertRowid;

      item.lessons.forEach((lesson, idx) => {
        const lessonId = insertLesson.run(courseId, idx + 1, lesson.t_en, lesson.t_ne, lesson.c_en, lesson.c_ne).lastInsertRowid;
        
        if (lesson.quiz) {
          const quizId = insertQuiz.run(lessonId, lesson.quiz.title_en, lesson.quiz.title_ne).lastInsertRowid;
          lesson.quiz.questions.forEach(q => {
            insertQuestion.run(
              quizId,
              q.q_en, q.q_ne,
              q.a_en, q.a_ne,
              q.b_en, q.b_ne,
              q.c_en, q.c_ne,
              q.d_en, q.d_ne,
              q.correct
            );
          });
        }
      });
    });
  }

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
