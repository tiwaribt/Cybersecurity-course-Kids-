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

  // Seed data
  const courseCount = db.prepare("SELECT COUNT(*) as count FROM courses").get().count;
  // If you want to force re-seed, you can uncomment the next line or check for a specific condition
  // db.exec("DELETE FROM lessons; DELETE FROM courses;"); 
  
  if (courseCount < 12) { // Check if we have all grades, if not, re-seed
    console.log("Seeding comprehensive curriculum data...");
    db.exec("DELETE FROM lessons; DELETE FROM courses;"); 
    const insertCourse = db.prepare("INSERT INTO courses (grade, title_en, title_ne, description_en, description_ne) VALUES (?, ?, ?, ?, ?)");
    const insertLesson = db.prepare("INSERT INTO lessons (course_id, order_index, title_en, title_ne, content_en, content_ne) VALUES (?, ?, ?, ?, ?, ?)");

    const curriculum = [
      {
        grade: 1,
        title_en: "My First Computer",
        title_ne: "मेरो पहिलो कम्प्युटर",
        desc_en: "Introduction to computer parts and basic usage.",
        desc_ne: "कम्प्युटरका भागहरू र आधारभूत प्रयोगको परिचय।",
        lessons: [
          { t_en: "What is a Computer?", t_ne: "कम्प्युटर भनेको के हो?", c_en: "A computer is an electronic machine that helps us do work. It has parts like a Monitor, Keyboard, and Mouse.", c_ne: "कम्प्युटर एक इलेक्ट्रोनिक मेसिन हो जसले हामीलाई काम गर्न मद्दत गर्दछ। यसमा मनिटर, किबोर्ड र माउस जस्ता भागहरू हुन्छन्।" },
          { t_en: "The Magic Mouse", t_ne: "जादुई माउस", c_en: "The mouse helps us point and click on things. Always hold it gently.", c_ne: "माउसले हामीलाई वस्तुहरू देखाउन र क्लिक गर्न मद्दत गर्दछ। यसलाई सधैं बिस्तारै समात्नुहोस्।" },
          { t_en: "Screen Time Rules", t_ne: "स्क्रिन समयका नियमहरू", c_en: "Don't sit too close to the screen. Take breaks every 20 minutes.", c_ne: "स्क्रिनको धेरै नजिक नबस्नुहोस्। हरेक २० मिनेटमा विश्राम लिनुहोस्।" }
        ]
      },
      {
        grade: 2,
        title_en: "Using Technology Safely",
        title_ne: "प्रविधिको सुरक्षित प्रयोग",
        desc_en: "Learning basic safety rules for using devices.",
        desc_ne: "उपकरणहरू प्रयोग गर्दा पालना गर्नुपर्ने आधारभूत सुरक्षा नियमहरू।",
        lessons: [
          { t_en: "Parts of a Desktop", t_ne: "डेस्कटपका भागहरू", c_en: "Learn about CPU, Monitor, Keyboard, and Mouse. Each part has a special job.", c_ne: "CPU, मनिटर, किबोर्ड र माउसको बारेमा सिक्नुहोस्। प्रत्येक भागको विशेष काम हुन्छ।" },
          { t_en: "Asking for Permission", t_ne: "अनुमति माग्ने तरिका", c_en: "Always ask a teacher or parent before using the internet.", c_ne: "इन्टरनेट प्रयोग गर्नु अघि सधैं शिक्षक वा अभिभावकलाई सोध्नुहोस्।" },
          { t_en: "Keeping Water Away", t_ne: "पानीबाट टाढा राख्ने", c_en: "Never eat or drink near a computer. Liquids can damage the machine.", c_ne: "कम्प्युटर नजिक कहिल्यै नखानुहोस् वा नपिउनुहोस्। तरल पदार्थले मेसिनलाई क्षति पुर्याउन सक्छ।" }
        ]
      },
      {
        grade: 3,
        title_en: "Exploring the Internet",
        title_ne: "इन्टरनेटको खोजी",
        desc_en: "Safe browsing and basic internet concepts.",
        desc_ne: "सुरक्षित ब्राउजिङ र इन्टरनेटका आधारभूत धारणाहरू।",
        lessons: [
          { t_en: "What is the Internet?", t_ne: "इन्टरनेट भनेको के हो?", c_en: "The internet is a giant network connecting computers all over the world.", c_ne: "इन्टरनेट संसारभरका कम्प्युटरहरूलाई जोड्ने एउटा विशाल नेटवर्क हो।" },
          { t_en: "Safe Websites", t_ne: "सुरक्षित वेबसाइटहरू", c_en: "Only visit websites that your teacher tells you about. Look for the padlock icon.", c_ne: "तपाईंको शिक्षकले भनेका वेबसाइटहरू मात्र हेर्नुहोस्। ताल्चाको आइकन खोज्नुहोस्।" },
          { t_en: "Your Digital Footprint", t_ne: "तपाईंको डिजिटल पदचिह्न", c_en: "Everything you do online leaves a trace. Be kind to everyone.", c_ne: "तपाईंले अनलाइन गर्ने सबै कुराले एउटा छाप छोड्छ। सबैसँग दयालु हुनुहोस्।" }
        ]
      },
      {
        grade: 4,
        title_en: "Digital Citizenship",
        title_ne: "डिजिटल नागरिकता",
        desc_en: "Becoming a responsible user of the digital world.",
        desc_ne: "डिजिटल संसारको जिम्मेवार प्रयोगकर्ता बन्ने तरिका।",
        lessons: [
          { t_en: "Strong Passwords", t_ne: "बलियो पासवर्ड", c_en: "A strong password uses letters, numbers, and symbols. Never share it with friends.", c_ne: "बलियो पासवर्डमा अक्षर, अंक र चिन्हहरू प्रयोग गरिन्छ। यसलाई साथीहरूसँग कहिल्यै साझा नगर्नुहोस्।" },
          { t_en: "Cyberbullying Basics", t_ne: "साइबर बुलिङका आधारभूत कुराहरू", c_en: "Cyberbullying is being mean to others online. If it happens, tell an adult immediately.", c_ne: "साइबर बुलिङ भनेको अनलाइनमा अरूलाई नराम्रो व्यवहार गर्नु हो। यदि यस्तो भयो भने, तुरुन्तै ठूला मानिसलाई भन्नुहोस्।" },
          { t_en: "Private Information", t_ne: "निजी जानकारी", c_en: "Don't share your address, phone number, or school name online.", c_ne: "आफ्नो ठेगाना, फोन नम्बर वा स्कूलको नाम अनलाइनमा साझा नगर्नुहोस्।" }
        ]
      },
      {
        grade: 5,
        title_en: "Communication & Collaboration",
        title_ne: "सञ्चार र सहकार्य",
        desc_en: "Using email and online tools safely.",
        desc_ne: "इमेल र अनलाइन उपकरणहरूको सुरक्षित प्रयोग।",
        lessons: [
          { t_en: "Email Etiquette", t_ne: "इमेल शिष्टाचार", c_en: "Write clear subject lines and be polite in your emails.", c_ne: "स्पष्ट विषयहरू लेख्नुहोस् र आफ्नो इमेलमा विनम्र हुनुहोस्।" },
          { t_en: "Spotting Fake News", t_ne: "गलत समाचार पहिचान गर्ने", c_en: "Not everything on the internet is true. Always check the source.", c_ne: "इन्टरनेटमा भएका सबै कुरा सत्य हुँदैनन्। सधैं स्रोत जाँच गर्नुहोस्।" },
          { t_en: "Online Privacy Settings", t_ne: "अनलाइन गोपनीयता सेटिङहरू", c_en: "Learn how to use privacy settings on apps to stay safe.", c_ne: "सुरक्षित रहनका लागि एपहरूमा गोपनीयता सेटिङहरू कसरी प्रयोग गर्ने सिक्नुहोस्।" }
        ]
      },
      {
        grade: 6,
        title_en: "Introduction to Cyber Security",
        title_ne: "साइबर सुरक्षाको परिचय",
        desc_en: "Understanding threats and how to protect yourself.",
        desc_ne: "खतराहरू बुझ्ने र आफूलाई कसरी सुरक्षित राख्ने।",
        lessons: [
          { t_en: "What is Malware?", t_ne: "मालवेयर भनेको के हो?", c_en: "Malware is bad software that can hurt your computer. Use antivirus software.", c_ne: "मालवेयर खराब सफ्टवेयर हो जसले तपाईंको कम्प्युटरलाई हानि पुर्याउन सक्छ। एन्टिभाइरस सफ्टवेयर प्रयोग गर्नुहोस्।" },
          { t_en: "Phishing Scams", t_ne: "फिसिङ स्क्यामहरू", c_en: "Be careful of emails that ask for your password or money. They might be scams.", c_ne: "तपाईंको पासवर्ड वा पैसा माग्ने इमेलहरूबाट सावधान रहनुहोस्। ती स्क्यामहरू हुन सक्छन्।" },
          { t_en: "Public Wi-Fi Safety", t_ne: "सार्वजनिक वाइफाइ सुरक्षा", c_en: "Avoid logging into private accounts when using public Wi-Fi.", c_ne: "सार्वजनिक वाइफाइ प्रयोग गर्दा निजी खाताहरूमा लगइन नगर्नुहोस्।" }
        ]
      },
      {
        grade: 7,
        title_en: "Data Privacy & Protection",
        title_ne: "डाटा गोपनीयता र सुरक्षा",
        desc_en: "Managing your personal data and online identity.",
        desc_ne: "तपाईंको व्यक्तिगत डाटा र अनलाइन पहिचान व्यवस्थापन।",
        lessons: [
          { t_en: "Two-Factor Authentication", t_ne: "टु-फ्याक्टर अथेन्टिकेसन", c_en: "2FA adds an extra layer of security to your accounts. Use it whenever possible.", c_ne: "2FA ले तपाईंको खाताहरूमा सुरक्षाको अतिरिक्त तह थप्छ। सम्भव भएसम्म यसलाई प्रयोग गर्नुहोस्।" },
          { t_en: "Social Media Safety", t_ne: "सामाजिक सञ्जाल सुरक्षा", c_en: "Think before you post. Once it's online, it's hard to take back.", c_ne: "पोस्ट गर्नु अघि सोच्नुहोस्। एक पटक अनलाइन भएपछि, यसलाई फिर्ता लिन गाह्रो हुन्छ।" },
          { t_en: "Copyright & Fair Use", t_ne: "प्रतिलिपि अधिकार र उचित प्रयोग", c_en: "Respect other people's work. Don't copy images or text without permission.", c_ne: "अरूको कामको सम्मान गर्नुहोस्। अनुमति बिना तस्विर वा पाठ प्रतिलिपि नगर्नुहोस्।" }
        ]
      },
      {
        grade: 8,
        title_en: "Networking & The Web",
        title_ne: "नेटवर्किङ र वेब",
        desc_en: "How computers talk to each other and web safety.",
        desc_ne: "कम्प्युटरहरूले एकअर्कासँग कसरी कुरा गर्छन् र वेब सुरक्षा।",
        lessons: [
          { t_en: "How the Internet Works", t_ne: "इन्टरनेटले कसरी काम गर्छ", c_en: "Learn about IP addresses, routers, and servers.", c_ne: "IP ठेगाना, राउटर र सर्भरको बारेमा सिक्नुहोस्।" },
          { t_en: "Secure Browsing (HTTPS)", t_ne: "सुरक्षित ब्राउजिङ (HTTPS)", c_en: "HTTPS encrypts the data between your browser and the website.", c_ne: "HTTPS ले तपाईंको ब्राउजर र वेबसाइट बीचको डाटालाई इन्क्रिप्ट गर्दछ।" },
          { t_en: "Cloud Computing Safety", t_ne: "क्लाउड कम्प्युटिङ सुरक्षा", c_en: "Storing files online is convenient but requires strong security.", c_ne: "अनलाइन फाइलहरू भण्डारण गर्नु सुविधाजनक छ तर यसका लागि बलियो सुरक्षा चाहिन्छ।" }
        ]
      },
      {
        grade: 9,
        title_en: "Advanced Cyber Threats",
        title_ne: "उन्नत साइबर खतराहरू",
        desc_en: "In-depth look at modern cyber attacks.",
        desc_ne: "आधुनिक साइबर आक्रमणहरूको विस्तृत अध्ययन।",
        lessons: [
          { t_en: "Ransomware Attacks", t_ne: "र्यान्समवेयर आक्रमणहरू", c_en: "Ransomware locks your files and asks for money. Always keep backups.", c_ne: "र्यान्समवेयरले तपाईंको फाइलहरू लक गर्छ र पैसा माग्छ। सधैं ब्याकअप राख्नुहोस्।" },
          { t_en: "Social Engineering", t_ne: "सोशल इन्जिनियरिङ", c_en: "Hackers use psychology to trick people into giving away secrets.", c_ne: "ह्याकरहरूले मानिसहरूलाई गोप्य कुराहरू दिन झुक्याउन मनोविज्ञान प्रयोग गर्छन्।" },
          { t_en: "Identity Theft", t_ne: "पहिचान चोरी", c_en: "Protect your personal documents to prevent someone from pretending to be you.", c_ne: "कोही व्यक्ति तपाईं बनेर झुक्याउन नपाओस् भन्नका लागि आफ्ना व्यक्तिगत कागजातहरू सुरक्षित राख्नुहोस्।" }
        ]
      },
      {
        grade: 10,
        title_en: "Cyber Law & Ethics",
        title_ne: "साइबर कानून र नैतिकता",
        desc_en: "Legal framework and ethical behavior in cyberspace.",
        desc_ne: "साइबर स्पेसमा कानूनी ढाँचा र नैतिक व्यवहार।",
        lessons: [
          { t_en: "Cyber Law in Nepal", t_ne: "नेपालमा साइबर कानून", c_en: "Understanding the Electronic Transactions Act of Nepal.", c_ne: "नेपालको विद्युतीय कारोबार ऐन बुझ्ने।" },
          { t_en: "Ethical Hacking Intro", t_ne: "एथिकल ह्याकिङ परिचय", c_en: "Using hacking skills for good to find and fix security holes.", c_ne: "सुरक्षा कमजोरीहरू फेला पार्न र समाधान गर्न ह्याकिङ सीपको राम्रो प्रयोग गर्ने।" },
          { t_en: "Digital Rights", t_ne: "डिजिटल अधिकार", c_en: "Your rights to privacy and freedom of expression online.", c_ne: "अनलाइनमा तपाईंको गोपनीयता र अभिव्यक्ति स्वतन्त्रताको अधिकार।" }
        ]
      },
      {
        grade: 11,
        title_en: "Information Security Management",
        title_ne: "सूचना सुरक्षा व्यवस्थापन",
        desc_en: "Professional standards for protecting information.",
        desc_ne: "सूचना सुरक्षाका लागि व्यावसायिक मापदण्डहरू।",
        lessons: [
          { t_en: "Risk Assessment", t_ne: "जोखिम मूल्याङ्कन", c_en: "Identifying and evaluating potential security risks.", c_ne: "सम्भावित सुरक्षा जोखिमहरू पहिचान र मूल्याङ्कन गर्ने।" },
          { t_en: "Encryption Basics", t_ne: "इन्क्रिप्शनका आधारभूत कुराहरू", c_en: "How data is scrambled to keep it secret from unauthorized users.", c_ne: "अनधिकृत प्रयोगकर्ताहरूबाट गोप्य राख्न डाटालाई कसरी मिलाइन्छ।" },
          { t_en: "Incident Response", t_ne: "घटना प्रतिक्रिया", c_en: "What to do when a security breach happens.", c_ne: "सुरक्षा उल्लंघन हुँदा के गर्ने।" }
        ]
      },
      {
        grade: 12,
        title_en: "Future of Cyber Security",
        title_ne: "साइबर सुरक्षाको भविष्य",
        desc_en: "Emerging technologies and career paths.",
        desc_ne: "उदीयमान प्रविधिहरू र करियरका बाटाहरू।",
        lessons: [
          { t_en: "AI in Cyber Security", t_ne: "साइबर सुरक्षामा AI", c_en: "How Artificial Intelligence is used to detect and stop attacks.", c_ne: "आक्रमणहरू पत्ता लगाउन र रोक्नको लागि आर्टिफिसियल इन्टेलिजेन्स कसरी प्रयोग गरिन्छ।" },
          { t_en: "Blockchain Technology", t_ne: "ब्लकचेन प्रविधि", c_en: "Understanding decentralized security and its applications.", c_ne: "विकेन्द्रीकृत सुरक्षा र यसको प्रयोग बुझ्ने।" },
          { t_en: "Careers in Cyber Security", t_ne: "साइबर सुरक्षामा करियर", c_en: "Exploring roles like Security Analyst, Pentester, and CISO.", c_ne: "सुरक्षा विश्लेषक, पेन्टेस्टर र CISO जस्ता भूमिकाहरूको खोजी।" }
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
        insertLesson.run(courseId, idx + 1, lesson.t_en, lesson.t_ne, lesson.c_en, lesson.c_ne);
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
