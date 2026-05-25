import { useEffect, useMemo, useRef, useState } from 'react';
import { adminApi } from './api';
import logo from '../../mobile/assets/social/fulllogo.png';

const MAX_UPLOAD_DIMENSION = 1600;
const MAX_BASE64_LENGTH = 1_200_000;
const INITIAL_IMAGE_QUALITY = 0.82;

const emptyCourse = { title: '', description: '', category: '', level: 'CPL', coverImageUrl: '', priceAmount: 0, currency: 'INR' };
const emptyLesson = {
  title: '',
  subtitle: '',
  summary: '',
  durationMinutes: 20,
  videoUrl: '',
  thumbnailUrl: '',
  notesText: '',
  takeawaysText: ''
};
const emptyModule = { title: '', description: '', position: '' };
const emptyLessonEditor = {
  id: null,
  title: '',
  subtitle: '',
  summary: '',
  moduleId: '',
  position: '',
  notesText: '',
  takeawaysText: '',
  videos: [{ title: 'Main Video', videoUrl: '', thumbnailUrl: '', durationMinutes: 20, position: 1 }]
};
const emptyQuestion = {
  mode: 'practice',
  subject: '',
  prompt: '',
  explanationCorrect: '',
  explanationWrong: '',
  options: [
    { key: 'A', text: '', isCorrect: false },
    { key: 'B', text: '', isCorrect: false },
    { key: 'C', text: '', isCorrect: false },
    { key: 'D', text: '', isCorrect: false }
  ]
};

const emptyTest = {
  mode: 'practice',
  title: '',
  subject: '',
  description: ''
};

const emptyUserForm = {
  id: null,
  name: '',
  email: ''
};

const emptyContactSettings = {
  contactEmail: '',
  contactPhone: '',
  contactAddress: ''
};

const emptyEnrollmentForm = {
  userEmail: ''
};

const toLines = (text) =>
  text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

const readFileAsDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Failed to read image file'));
    reader.readAsDataURL(file);
  });

const loadImageElement = (src) =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Failed to load image preview'));
    image.src = src;
  });

const optimizeImageFile = async (file) => {
  const originalDataUrl = await readFileAsDataUrl(file);
  if (!file.type.startsWith('image/') || file.type === 'image/svg+xml') {
    return originalDataUrl;
  }

  const image = await loadImageElement(originalDataUrl);
  const scale = Math.min(1, MAX_UPLOAD_DIMENSION / Math.max(image.width || 1, image.height || 1));
  const width = Math.max(1, Math.round((image.width || 1) * scale));
  const height = Math.max(1, Math.round((image.height || 1) * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext('2d');
  if (!context) {
    return originalDataUrl;
  }

  context.drawImage(image, 0, 0, width, height);

  let quality = INITIAL_IMAGE_QUALITY;
  let optimizedDataUrl = canvas.toDataURL('image/jpeg', quality);

  while (optimizedDataUrl.length > MAX_BASE64_LENGTH && quality > 0.45) {
    quality -= 0.1;
    optimizedDataUrl = canvas.toDataURL('image/jpeg', quality);
  }

  return optimizedDataUrl.length < originalDataUrl.length ? optimizedDataUrl : originalDataUrl;
};

function App() {
  const [adminKey, setAdminKey] = useState(localStorage.getItem('pp_admin_key') || '');
  const [inputKey, setInputKey] = useState(localStorage.getItem('pp_admin_key') || '');
  const [authError, setAuthError] = useState('');
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(false);

  const [overview, setOverview] = useState(null);
  const [courses, setCourses] = useState([]);
  const [courseSearch, setCourseSearch] = useState('');
  const [courseForm, setCourseForm] = useState(emptyCourse);
  const [editingCourseId, setEditingCourseId] = useState(null);
  const [selectedCourseId, setSelectedCourseId] = useState(null);
  const [courseModalOpen, setCourseModalOpen] = useState(false);
  const [enrollmentsModalOpen, setEnrollmentsModalOpen] = useState(false);
  const [selectedEnrollmentCourse, setSelectedEnrollmentCourse] = useState(null);
  const [courseEnrollments, setCourseEnrollments] = useState([]);
  const [enrollmentForm, setEnrollmentForm] = useState(emptyEnrollmentForm);
  const [enrollmentSearch, setEnrollmentSearch] = useState('');
  const [userSearch, setUserSearch] = useState('');
  const [userSearchResults, setUserSearchResults] = useState([]);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  const [lessons, setLessons] = useState([]);
  const [lessonForm, setLessonForm] = useState(emptyLesson);
  const [editingLessonId, setEditingLessonId] = useState(null);
  const [courseModalModules, setCourseModalModules] = useState([]);
  const [courseModalLessons, setCourseModalLessons] = useState([]);
  const [moduleForm, setModuleForm] = useState(emptyModule);
  const [editingModuleId, setEditingModuleId] = useState(null);
  const [moduleModalOpen, setModuleModalOpen] = useState(false);
  const [lessonEditor, setLessonEditor] = useState(emptyLessonEditor);
  const [lessonEditorOpen, setLessonEditorOpen] = useState(false);

  const [questions, setQuestions] = useState([]);
  const [questionForm, setQuestionForm] = useState(emptyQuestion);
  const [editingQuestionId, setEditingQuestionId] = useState(null);

  const [tests, setTests] = useState([]);
  const [testModeFilter, setTestModeFilter] = useState('all');
  const [testForm, setTestForm] = useState(emptyTest);
  const [editingTestId, setEditingTestId] = useState(null);
  const [selectedTestId, setSelectedTestId] = useState(null);
  const [testQuestions, setTestQuestions] = useState([]);
  const [enquiries, setEnquiries] = useState([]);
  const [contactSettings, setContactSettings] = useState(emptyContactSettings);
  const [questionToAddId, setQuestionToAddId] = useState('');
  const [questionSearch, setQuestionSearch] = useState('');
  const [questionDropdownOpen, setQuestionDropdownOpen] = useState(false);
  const [testModalOpen, setTestModalOpen] = useState(false);
  const [questionModalOpen, setQuestionModalOpen] = useState(false);

  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [userDeleteTarget, setUserDeleteTarget] = useState(null);
  const [userForm, setUserForm] = useState(emptyUserForm);
  const questionDropdownRef = useRef(null);
  const questionSearchInputRef = useRef(null);
  const userDropdownRef = useRef(null);
  const userSearchInputRef = useRef(null);

  const selectedCourse = useMemo(() => courses.find((item) => item.id === selectedCourseId) || null, [courses, selectedCourseId]);
  const selectedTest = useMemo(() => tests.find((item) => item.id === selectedTestId) || null, [tests, selectedTestId]);
  const editingCourse = useMemo(() => courses.find((item) => item.id === editingCourseId) || null, [courses, editingCourseId]);
  const selectedTestMode = selectedTest?.mode === 'exam' ? 'exam' : 'practice';

  const filteredCourses = useMemo(() => {
    const query = courseSearch.trim().toLowerCase();
    if (!query) return courses;
    return (courses || []).filter((course) => {
      const haystack = [course.title, course.category, course.level, course.currency]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [courses, courseSearch]);

  const testSubjectOptions = useMemo(() => {
    return Array.from(
      new Set(
        (courses || [])
          .map((course) => String(course.title || '').trim())
          .filter(Boolean)
      )
    ).sort((a, b) => a.localeCompare(b));
  }, [courses]);

  const questionsInSelectedTest = useMemo(() => new Set((testQuestions || []).map((q) => q.id)), [testQuestions]);
  const addableQuestions = useMemo(() => {
    if (!selectedTest) return [];
    return (questions || [])
      .filter((q) => !questionsInSelectedTest.has(q.id))
      .sort((a, b) => {
        const subjectCompare = String(a.subject || '').localeCompare(String(b.subject || ''));
        if (subjectCompare !== 0) return subjectCompare;
        return String(a.prompt || '').localeCompare(String(b.prompt || ''));
      });
  }, [questions, selectedTest, questionsInSelectedTest]);

  const filteredAddableQuestions = useMemo(() => {
    const query = questionSearch.trim().toLowerCase();
    if (!query) return addableQuestions;
    return addableQuestions.filter((q) =>
      [q.subject, q.prompt, q.mode]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(query)
    );
  }, [addableQuestions, questionSearch]);

  const filteredTests = useMemo(() => {
    if (testModeFilter === 'all') return tests;
    return (tests || []).filter((test) => (test?.mode === 'exam' ? 'exam' : 'practice') === testModeFilter);
  }, [tests, testModeFilter]);

  const selectedAddableQuestion = useMemo(
    () => addableQuestions.find((question) => String(question.id) === String(questionToAddId)) || null,
    [addableQuestions, questionToAddId]
  );
  const enrolledUserEmails = useMemo(
    () =>
      new Set(
        (courseEnrollments || [])
          .map((enrollment) => String(enrollment.userEmail || '').trim().toLowerCase())
          .filter(Boolean)
      ),
    [courseEnrollments]
  );
  const filteredUserSearchResults = useMemo(
    () =>
      (userSearchResults || []).filter((user) => !enrolledUserEmails.has(String(user.email || '').trim().toLowerCase())),
    [userSearchResults, enrolledUserEmails]
  );
  const filteredCourseEnrollments = useMemo(() => {
    const query = enrollmentSearch.trim().toLowerCase();
    if (!query) return courseEnrollments;
    return (courseEnrollments || []).filter((enrollment) =>
      [enrollment.userName, enrollment.userEmail]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(query)
    );
  }, [courseEnrollments, enrollmentSearch]);
  const isUploadedCoverImage = String(courseForm.coverImageUrl || '').startsWith('data:image/');

  const withAsync = async (fn) => {
    try {
      setLoading(true);
      setError('');
      setMessage('');
      await fn();
    } catch (err) {
      setError(err.message || 'Request failed');
    } finally {
      setLoading(false);
    }
  };

  const loadOverview = () =>
    withAsync(async () => {
      const data = await adminApi.getOverview(adminKey);
      setOverview(data);
    });

  const loadCourses = () =>
    withAsync(async () => {
      const data = await adminApi.listCourses(adminKey);
      setCourses(data.courses || []);
    });

  const loadQuestions = () =>
    withAsync(async () => {
      const data = await adminApi.listQuestions(adminKey);
      setQuestions(data.questions || []);
    });

  const loadTests = () =>
    withAsync(async () => {
      const data = await adminApi.listTests(adminKey);
      setTests(data.tests || []);
    });

  const loadEnquiries = () =>
    withAsync(async () => {
      const [enquiriesData, contactData] = await Promise.all([
        adminApi.listEnquiries(adminKey),
        adminApi.getContactSettings(adminKey)
      ]);
      setEnquiries(enquiriesData.enquiries || []);
      setContactSettings(contactData.contact || emptyContactSettings);
    });

  const loadTestQuestions = (testId) =>
    withAsync(async () => {
      if (!testId) return;
      const data = await adminApi.listTestQuestions(testId, adminKey);
      setTestQuestions(data.questions || []);
    });

  const loadLessons = (courseId) =>
    withAsync(async () => {
      const data = await adminApi.listLessons(courseId, adminKey);
      setLessons(data.lessons || []);
    });

  useEffect(() => {
    if (!adminKey) return;
    loadOverview();
    loadCourses();
    loadQuestions();
    loadTests();
    loadEnquiries();
  }, [adminKey]);

  useEffect(() => {
    if (!questionDropdownOpen) return;

    const onMouseDown = (event) => {
      if (questionDropdownRef.current && !questionDropdownRef.current.contains(event.target)) {
        setQuestionDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, [questionDropdownOpen]);

  useEffect(() => {
    if (!userDropdownOpen) return;

    const onMouseDown = (event) => {
      if (userDropdownRef.current && !userDropdownRef.current.contains(event.target)) {
        setUserDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, [userDropdownOpen]);

  useEffect(() => {
    if (!questionDropdownOpen) return;
    questionSearchInputRef.current?.focus();
  }, [questionDropdownOpen]);

  useEffect(() => {
    if (!userDropdownOpen) return;
    userSearchInputRef.current?.focus();
  }, [userDropdownOpen]);

  const onLogin = async (e) => {
    e.preventDefault();
    setAuthError('');
    try {
      await adminApi.getOverview(inputKey.trim());
      const cleanKey = inputKey.trim();
      setAdminKey(cleanKey);
      localStorage.setItem('pp_admin_key', cleanKey);
    } catch (err) {
      setAuthError(err.message || 'Invalid admin key');
    }
  };

  const onLogout = () => {
    localStorage.removeItem('pp_admin_key');
    setAdminKey('');
    setInputKey('');
  };

  const closeUserModal = () => {
    setUserModalOpen(false);
    setUserForm(emptyUserForm);
  };

  const closeUserDeleteModal = () => {
    setUserDeleteTarget(null);
  };

  const onEditUser = (user) => {
    setUserForm({
      id: user?.id || null,
      name: user?.name || '',
      email: user?.email || ''
    });
    setUserModalOpen(true);
  };

  const submitUserEdit = async (e) => {
    e.preventDefault();
    if (!userForm.id) return;

    await withAsync(async () => {
      await adminApi.updateUser(userForm.id, { name: userForm.name, email: userForm.email }, adminKey);
      setMessage('User updated');
      const data = await adminApi.getOverview(adminKey);
      setOverview(data);
      closeUserModal();
    });
  };

  const onDeleteUser = (user) => {
    setUserDeleteTarget(user || null);
  };

  const confirmDeleteUser = async () => {
    if (!userDeleteTarget?.id) return;
    await withAsync(async () => {
      await adminApi.deleteUser(userDeleteTarget.id, adminKey);
      setMessage('User deleted');
      const data = await adminApi.getOverview(adminKey);
      setOverview(data);
      closeUserDeleteModal();
    });
  };

  const submitContactSettings = async (e) => {
    e.preventDefault();
    await withAsync(async () => {
      const data = await adminApi.updateContactSettings(contactSettings, adminKey);
      setContactSettings(data.contact || emptyContactSettings);
      setMessage('Contact details updated');
    });
  };

  const submitCourse = async (e) => {
    e.preventDefault();
    await withAsync(async () => {
      if (editingCourseId) {
        await adminApi.updateCourse(editingCourseId, courseForm, adminKey);
        setMessage('Course updated');
      } else {
        await adminApi.createCourse(courseForm, adminKey);
        setMessage('Course created');
      }
      setCourseForm(emptyCourse);
      setEditingCourseId(null);
      setCourseModalOpen(false);
      const data = await adminApi.listCourses(adminKey);
      setCourses(data.courses || []);
    });
  };

  const onEditCourse = (course) => {
    setEditingCourseId(course.id);
    setCourseForm({
      title: course.title || '',
      description: course.description || '',
      category: course.category || '',
      level: course.level || 'CPL',
      coverImageUrl: course.coverImageUrl || '',
      priceAmount: Number(course.priceAmount || 0),
      currency: (course.currency || 'INR').toUpperCase()
    });
    setCourseModalOpen(true);
  };

  const onCreateCourse = () => {
    setEditingCourseId(null);
    setCourseForm(emptyCourse);
    setCourseModalOpen(true);
  };

  const onCloseCourseModal = () => {
    setCourseModalOpen(false);
    setEditingCourseId(null);
    setCourseForm(emptyCourse);
    setCourseModalModules([]);
    setCourseModalLessons([]);
    setModuleForm(emptyModule);
    setEditingModuleId(null);
    setLessonEditor(emptyLessonEditor);
    setLessonEditorOpen(false);
  };

  const onViewEnrollments = async (course) => {
    if (!course?.id) return;
    await withAsync(async () => {
      const data = await adminApi.listCourseEnrollments(course.id, adminKey);
      setSelectedEnrollmentCourse(course);
      setCourseEnrollments(data.enrollments || []);
      setEnrollmentForm(emptyEnrollmentForm);
      setEnrollmentSearch('');
      setUserSearch('');
      setUserSearchResults([]);
      setUserDropdownOpen(false);
      setEnrollmentsModalOpen(true);
    });
  };

  const onCloseEnrollmentsModal = () => {
    setEnrollmentsModalOpen(false);
    setSelectedEnrollmentCourse(null);
    setCourseEnrollments([]);
    setEnrollmentForm(emptyEnrollmentForm);
    setEnrollmentSearch('');
    setUserSearch('');
    setUserSearchResults([]);
    setUserDropdownOpen(false);
  };

  const loadUsersForEnrollment = async (query = '') => {
    const data = await adminApi.listUsers(adminKey, query);
    setUserSearchResults(data.users || []);
  };

  const submitCourseEnrollment = async (e) => {
    e.preventDefault();
    if (!selectedEnrollmentCourse?.id) return;

    await withAsync(async () => {
      await adminApi.createCourseEnrollment(selectedEnrollmentCourse.id, enrollmentForm, adminKey);
      const [enrollmentData, coursesData] = await Promise.all([
        adminApi.listCourseEnrollments(selectedEnrollmentCourse.id, adminKey),
        adminApi.listCourses(adminKey)
      ]);
      setCourseEnrollments(enrollmentData.enrollments || []);
      setCourses(coursesData.courses || []);
      setSelectedEnrollmentCourse((prev) => {
        if (!prev) return prev;
        return (coursesData.courses || []).find((course) => course.id === prev.id) || prev;
      });
      setEnrollmentForm(emptyEnrollmentForm);
      setMessage('User enrolled successfully');
    });
  };

  const refreshCourseModalData = async (courseId) => {
    const [modulesResp, lessonsResp] = await Promise.all([
      adminApi.listModules(courseId, adminKey),
      adminApi.listLessons(courseId, adminKey)
    ]);
    setCourseModalModules(modulesResp.modules || []);
    setCourseModalLessons(lessonsResp.lessons || []);
  };

  const onDeleteCourse = async (courseId) => {
    if (!window.confirm('Delete this course and all its lessons?')) return;
    await withAsync(async () => {
      await adminApi.deleteCourse(courseId, adminKey);
      setMessage('Course deleted');
      const data = await adminApi.listCourses(adminKey);
      setCourses(data.courses || []);
      if (selectedCourseId === courseId) {
        setSelectedCourseId(null);
        setLessons([]);
      }
    });
  };

  useEffect(() => {
    if (!courseModalOpen) return;
    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        onCloseCourseModal();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [courseModalOpen]);

  useEffect(() => {
    if (!courseModalOpen && !enrollmentsModalOpen && !userModalOpen && !userDeleteTarget && !testModalOpen && !questionModalOpen && !moduleModalOpen && !lessonEditorOpen) return;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, [courseModalOpen, enrollmentsModalOpen, userModalOpen, userDeleteTarget, testModalOpen, questionModalOpen, moduleModalOpen, lessonEditorOpen]);

  useEffect(() => {
    if (!courseModalOpen || !editingCourseId) return;
    withAsync(async () => {
      await refreshCourseModalData(editingCourseId);
    });
  }, [courseModalOpen, editingCourseId, adminKey]);

  const onEditModule = (mod) => {
    setEditingModuleId(mod.id);
    setModuleForm({
      title: mod.title || '',
      description: mod.description || '',
      position: mod.position ?? ''
    });
    setModuleModalOpen(true);
  };

  const onCancelModuleEdit = () => {
    setEditingModuleId(null);
    setModuleForm(emptyModule);
    setModuleModalOpen(false);
  };

  const onCreateModule = () => {
    console.log('onCreateModule clicked');
    setEditingModuleId(null);
    setModuleForm(emptyModule);
    setModuleModalOpen(true);
  };

  const handleCoverUpload = async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    try {
      const optimizedImage = await optimizeImageFile(file);
      setCourseForm((p) => ({ ...p, coverImageUrl: optimizedImage }));
    } catch (err) {
      setError(err.message || 'Failed to prepare cover image');
    } finally {
      e.target.value = '';
    }
  };

  const handleLessonVideoThumbnailUpload = async (index, e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    try {
      const optimizedImage = await optimizeImageFile(file);
      updateLessonVideo(index, 'thumbnailUrl', optimizedImage);
    } catch (err) {
      setError(err.message || 'Failed to prepare thumbnail image');
    } finally {
      e.target.value = '';
    }
  };

  const submitModule = async (e) => {
    e.preventDefault();
    if (!editingCourseId) return;
    await withAsync(async () => {
      if (editingModuleId) {
        await adminApi.updateModule(editingModuleId, moduleForm, adminKey);
        setMessage('Module updated');
      } else {
        await adminApi.createModule(editingCourseId, moduleForm, adminKey);
        setMessage('Module created');
      }
      await refreshCourseModalData(editingCourseId);
      setEditingModuleId(null);
      setModuleForm(emptyModule);
      setModuleModalOpen(false);
    });
  };

  const onDeleteModule = async (moduleId) => {
    if (!window.confirm('Delete this module? Lessons will remain but module link may be removed.')) return;
    await withAsync(async () => {
      await adminApi.deleteModule(moduleId, adminKey);
      setMessage('Module deleted');
      if (editingCourseId) await refreshCourseModalData(editingCourseId);
    });
  };

  const openLessonEditor = async (lesson) => {
    if (!editingCourseId) return;
    await withAsync(async () => {
      if (!lesson) {
        setLessonEditor({
          ...emptyLessonEditor,
          id: null,
          moduleId: courseModalModules?.[0]?.id ? String(courseModalModules[0].id) : '',
          position: '',
          videos: [{ title: 'Main Video', videoUrl: '', thumbnailUrl: '', durationMinutes: 20, position: 1 }]
        });
        setLessonEditorOpen(true);
        return;
      }

      const videosResp = await adminApi.listLessonVideos(lesson.id, adminKey);
      const videos = (videosResp.videos || []).length
        ? (videosResp.videos || []).map((v) => ({
            title: v.title || '',
            videoUrl: v.videoUrl || '',
            thumbnailUrl: v.thumbnailUrl || '',
            durationMinutes: v.durationMinutes || '',
            position: v.position || ''
          }))
        : [
            {
              title: 'Main Video',
              videoUrl: lesson.videoUrl || '',
              thumbnailUrl: lesson.thumbnailUrl || '',
              durationMinutes: lesson.durationMinutes || 20,
              position: 1
            }
          ];

      setLessonEditor({
        id: lesson.id,
        title: lesson.title || '',
        subtitle: lesson.subtitle || '',
        summary: lesson.summary || '',
        moduleId: lesson.moduleId ? String(lesson.moduleId) : '',
        position: lesson.position ?? '',
        notesText: (lesson.notes || []).join('\n'),
        takeawaysText: (lesson.takeaways || []).join('\n'),
        videos
      });
      setLessonEditorOpen(true);
    });
  };

  const closeLessonEditor = () => {
    setLessonEditorOpen(false);
    setLessonEditor(emptyLessonEditor);
  };

  const updateLessonVideo = (index, field, value) => {
    setLessonEditor((prev) => ({
      ...prev,
      videos: prev.videos.map((v, idx) => (idx === index ? { ...v, [field]: value } : v))
    }));
  };

  const addLessonVideoRow = () => {
    setLessonEditor((prev) => ({
      ...prev,
      videos: [
        ...prev.videos,
        { title: `Video ${prev.videos.length + 1}`, videoUrl: '', thumbnailUrl: '', durationMinutes: 10, position: prev.videos.length + 1 }
      ]
    }));
  };

  const removeLessonVideoRow = (index) => {
    setLessonEditor((prev) => ({
      ...prev,
      videos: prev.videos.filter((_, idx) => idx !== index).map((v, idx) => ({ ...v, position: idx + 1 }))
    }));
  };

  const submitLessonEditor = async (e) => {
    e.preventDefault();
    if (!editingCourseId) return;

    const videos = (lessonEditor.videos || [])
      .map((v, idx) => ({
        title: v.title || `Video ${idx + 1}`,
        videoUrl: String(v.videoUrl || '').trim(),
        thumbnailUrl: String(v.thumbnailUrl || '').trim(),
        durationMinutes: v.durationMinutes !== '' ? Number(v.durationMinutes) : null,
        position: v.position !== '' ? Number(v.position) : idx + 1
      }))
      .filter((v) => v.videoUrl);

    if (videos.length === 0) {
      setError('Please add at least one video URL.');
      return;
    }
    if (!videos[0].durationMinutes) {
      setError('Main video durationMinutes is required.');
      return;
    }

    const payload = {
      title: lessonEditor.title,
      subtitle: lessonEditor.subtitle,
      summary: lessonEditor.summary,
      moduleId: lessonEditor.moduleId ? Number(lessonEditor.moduleId) : null,
      position: lessonEditor.position ? Number(lessonEditor.position) : null,
      durationMinutes: Number(videos[0].durationMinutes),
      videoUrl: videos[0].videoUrl,
      thumbnailUrl: videos[0].thumbnailUrl,
      notes: toLines(lessonEditor.notesText),
      takeaways: toLines(lessonEditor.takeawaysText)
    };

    await withAsync(async () => {
      let lessonId = lessonEditor.id;
      if (lessonId) {
        await adminApi.updateLesson(lessonId, payload, adminKey);
        setMessage('Lesson updated');
      } else {
        const created = await adminApi.createLesson(editingCourseId, payload, adminKey);
        lessonId = created.lesson?.id;
        setMessage('Lesson created');
      }

      if (lessonId) {
        await adminApi.replaceLessonVideos(lessonId, videos, adminKey);
      }

      await refreshCourseModalData(editingCourseId);
      closeLessonEditor();
    });
  };

  const onDeleteLessonInModal = async (lessonId) => {
    if (!window.confirm('Delete this lesson?')) return;
    await withAsync(async () => {
      await adminApi.deleteLesson(lessonId, adminKey);
      setMessage('Lesson deleted');
      if (editingCourseId) await refreshCourseModalData(editingCourseId);
    });
  };

  const submitLesson = async (e) => {
    e.preventDefault();
    if (!selectedCourseId) {
      setError('Select a course first');
      return;
    }
    const payload = {
      title: lessonForm.title,
      subtitle: lessonForm.subtitle,
      summary: lessonForm.summary,
      durationMinutes: Number(lessonForm.durationMinutes),
      videoUrl: lessonForm.videoUrl,
      thumbnailUrl: lessonForm.thumbnailUrl,
      notes: toLines(lessonForm.notesText),
      takeaways: toLines(lessonForm.takeawaysText)
    };

    await withAsync(async () => {
      if (editingLessonId) {
        await adminApi.updateLesson(editingLessonId, payload, adminKey);
        setMessage('Lesson updated');
      } else {
        await adminApi.createLesson(selectedCourseId, payload, adminKey);
        setMessage('Lesson created');
      }
      setLessonForm(emptyLesson);
      setEditingLessonId(null);
      const data = await adminApi.listLessons(selectedCourseId, adminKey);
      setLessons(data.lessons || []);
    });
  };

  const onEditLesson = (lesson) => {
    setEditingLessonId(lesson.id);
    setLessonForm({
      title: lesson.title || '',
      subtitle: lesson.subtitle || '',
      summary: lesson.summary || '',
      durationMinutes: lesson.durationMinutes || 20,
      videoUrl: lesson.videoUrl || '',
      thumbnailUrl: lesson.thumbnailUrl || '',
      notesText: (lesson.notes || []).join('\n'),
      takeawaysText: (lesson.takeaways || []).join('\n')
    });
  };

  const onDeleteLesson = async (lessonId) => {
    if (!window.confirm('Delete this lesson?')) return;
    await withAsync(async () => {
      await adminApi.deleteLesson(lessonId, adminKey);
      setMessage('Lesson deleted');
      const data = await adminApi.listLessons(selectedCourseId, adminKey);
      setLessons(data.lessons || []);
    });
  };

  const updateQuestionOption = (index, field, value) => {
    setQuestionForm((prev) => ({
      ...prev,
      options: prev.options.map((option, idx) =>
        idx === index
          ? {
              ...option,
              [field]: value
            }
          : field === 'isCorrect' && value
            ? { ...option, isCorrect: false }
            : option
      )
    }));
  };

  const onEditQuestion = (question) => {
    const mappedOptions = (question.options || []).map((option) => ({
      key: option.key,
      text: option.text,
      isCorrect: Boolean(option.isCorrect)
    }));
    while (mappedOptions.length < 4) {
      mappedOptions.push({
        key: String.fromCharCode(65 + mappedOptions.length),
        text: '',
        isCorrect: false
      });
    }

    setEditingQuestionId(question.id);
    setQuestionForm({
      mode: selectedTestMode,
      subject: selectedTest?.subject || question.subject || '',
      prompt: question.prompt || '',
      explanationCorrect: question.explanationCorrect || '',
      explanationWrong: question.explanationWrong || '',
      options: mappedOptions.slice(0, 4)
    });
    setQuestionModalOpen(true);
  };

  const closeQuestionModal = () => {
    setQuestionModalOpen(false);
    setEditingQuestionId(null);
    setQuestionForm((prev) => ({
      ...prev,
      mode: selectedTestMode,
      subject: selectedTest?.subject || '',
      prompt: '',
      explanationCorrect: '',
      explanationWrong: '',
      options: emptyQuestion.options
    }));
  };

  const onCreateQuestion = () => {
    if (!selectedTest) return;
    setEditingQuestionId(null);
    setQuestionForm({
      mode: selectedTestMode,
      subject: selectedTest.subject || '',
      prompt: '',
      explanationCorrect: '',
      explanationWrong: '',
      options: emptyQuestion.options
    });
    setQuestionModalOpen(true);
  };

  const onDeleteQuestion = async (questionId) => {
    if (!window.confirm('Delete this question?')) return;
    await withAsync(async () => {
      await adminApi.deleteQuestion(questionId, adminKey);
      setMessage('Question deleted');
      const data = await adminApi.listQuestions(adminKey);
      setQuestions(data.questions || []);
    });
  };

  const submitTest = async (e) => {
    e.preventDefault();
    await withAsync(async () => {
      if (editingTestId) {
        await adminApi.updateTest(editingTestId, testForm, adminKey);
        setMessage('Test updated');
      } else {
        await adminApi.createTest(testForm, adminKey);
        setMessage('Test created');
      }
      setTestForm(emptyTest);
      setEditingTestId(null);
      setTestModalOpen(false);
      const data = await adminApi.listTests(adminKey);
      setTests(data.tests || []);
    });
  };

  const onCreateTest = () => {
    setEditingTestId(null);
    setTestForm(emptyTest);
    setTestModalOpen(true);
  };

  const onEditTest = (test) => {
    setEditingTestId(test.id);
    setTestForm({
      mode: test.mode || 'practice',
      title: test.title || '',
      subject: test.subject || '',
      description: test.description || ''
    });
    setTestModalOpen(true);
  };

  const closeTestModal = () => {
    setTestModalOpen(false);
    setEditingTestId(null);
    setTestForm(emptyTest);
  };

  const onDeleteTest = async (testId) => {
    if (!window.confirm('Delete this test? (Questions will stay in the question bank)')) return;
    await withAsync(async () => {
      await adminApi.deleteTest(testId, adminKey);
      setMessage('Test deleted');
      const data = await adminApi.listTests(adminKey);
      setTests(data.tests || []);
      if (selectedTestId === testId) {
        setSelectedTestId(null);
        setTestQuestions([]);
        setQuestionToAddId('');
        setQuestionSearch('');
        setQuestionDropdownOpen(false);
      }
    });
  };

  const onPublishTest = async (testId) => {
    if (!window.confirm('Publish this test so it becomes visible to users?')) return;
    await withAsync(async () => {
      await adminApi.publishTest(testId, adminKey);
      setMessage('Test published');
      const data = await adminApi.listTests(adminKey);
      setTests(data.tests || []);
    });
  };

  const onSelectTest = async (testId) => {
      if (selectedTestId === testId) {
        setSelectedTestId(null);
        setEditingQuestionId(null);
        setQuestionModalOpen(false);
        setTestQuestions([]);
        setQuestionToAddId('');
        setQuestionSearch('');
        setQuestionDropdownOpen(false);
        setQuestionForm(emptyQuestion);
        return;
      }

    setSelectedTestId(testId);
    setEditingQuestionId(null);
    const nextSelected = tests.find((item) => item.id === testId) || null;
    setQuestionForm((prev) => ({
      ...prev,
      mode: nextSelected?.mode || 'practice',
      subject: nextSelected?.subject || '',
      prompt: '',
      explanationCorrect: '',
      explanationWrong: '',
      options: emptyQuestion.options
    }));
    setQuestionToAddId('');
    setQuestionSearch('');
    setQuestionDropdownOpen(false);
    await loadTestQuestions(testId);
  };

  const onAddExistingQuestion = async () => {
    if (!selectedTestId || !questionToAddId) return;
    await withAsync(async () => {
      await adminApi.addQuestionToTest(selectedTestId, Number(questionToAddId), adminKey);
      setMessage('Question added to test');
      setQuestionToAddId('');
      setQuestionSearch('');
      setQuestionDropdownOpen(false);
      const data = await adminApi.listTestQuestions(selectedTestId, adminKey);
      setTestQuestions(data.questions || []);
    });
  };

  const onRemoveQuestionFromTest = async (questionId) => {
    if (!selectedTestId) return;
    await withAsync(async () => {
      await adminApi.removeQuestionFromTest(selectedTestId, questionId, adminKey);
      setMessage('Question removed from test');
      const data = await adminApi.listTestQuestions(selectedTestId, adminKey);
      setTestQuestions(data.questions || []);
    });
  };

  const submitQuestionInTest = async (e) => {
    e.preventDefault();
    if (!selectedTestId) {
      setError('Select a test first');
      return;
    }

    await withAsync(async () => {
      const selected = tests.find((item) => item.id === selectedTestId) || null;
      const payload = {
        ...questionForm,
        mode: selected?.mode === 'exam' ? 'exam' : 'practice',
        subject: selected?.subject || questionForm.subject
      };
      if (editingQuestionId) {
        await adminApi.updateQuestion(editingQuestionId, payload, adminKey);
        setMessage('Question updated');
      } else {
        await adminApi.createQuestion({ ...payload, testSetId: selectedTestId }, adminKey);
        setMessage('Question created and added to test');
      }
      setQuestionModalOpen(false);
      setQuestionForm((prev) => ({
        ...prev,
        mode: selected?.mode === 'exam' ? 'exam' : 'practice',
        subject: selected?.subject || '',
        prompt: '',
        explanationCorrect: '',
        explanationWrong: '',
        options: emptyQuestion.options
      }));
      setEditingQuestionId(null);
      const questionBank = await adminApi.listQuestions(adminKey);
      setQuestions(questionBank.questions || []);
      const data = await adminApi.listTestQuestions(selectedTestId, adminKey);
      setTestQuestions(data.questions || []);
    });
  };

  if (!adminKey) {
    return (
      <main className="auth-layout">
        <form className="card auth-card" onSubmit={onLogin}>
          <h1>Pilot Pathshala Admin</h1>
          <p>Enter admin key to continue.</p>
          <input
            type="password"
            value={inputKey}
            onChange={(e) => setInputKey(e.target.value)}
            placeholder="Admin Key"
            required
          />
          {authError ? <p className="error">{authError}</p> : null}
          <button type="submit">Access Admin Panel</button>
        </form>
      </main>
    );
  }

  return (
    <main className="layout">
      <aside className="sidebar">
        <div className="sidebar-logo-wrap">
          <img src={logo} alt="Pilot Pathshala" className="sidebar-logo" />
        </div>
        <button className={activeTab === 'dashboard' ? 'active' : ''} onClick={() => setActiveTab('dashboard')}>
          Dashboard
        </button>
        <button className={activeTab === 'courses' ? 'active' : ''} onClick={() => setActiveTab('courses')}>
          Courses & Lessons
        </button>
        <button className={activeTab === 'tests' ? 'active' : ''} onClick={() => setActiveTab('tests')}>
          Tests
        </button>
        <button className={activeTab === 'enquiries' ? 'active' : ''} onClick={() => setActiveTab('enquiries')}>
          Enquiries
        </button>
        <button className="logout" onClick={onLogout}>
          Logout
        </button>
      </aside>

      <section className="content">
        <header className="topbar">
          <h1>
            {activeTab === 'dashboard'
              ? 'Dashboard'
              : activeTab === 'courses'
                ? 'Courses & Lessons'
                : activeTab === 'tests'
                  ? 'Tests'
                  : 'Enquiries'}
          </h1>
          <button
            onClick={() =>
              activeTab === 'dashboard'
                ? loadOverview()
                : activeTab === 'courses'
                  ? loadCourses()
                  : activeTab === 'tests'
                    ? loadTests()
                    : loadEnquiries()
            }
          >
            Refresh
          </button>
        </header>

        {loading ? <p>Loading...</p> : null}
        {message ? <p className="success">{message}</p> : null}
        {error ? <p className="error">{error}</p> : null}

        {activeTab === 'dashboard' ? (
          <div className="grid cols-5">
            <div className="card stat"><h3>Users</h3><p>{overview?.stats?.users ?? '-'}</p></div>
            <div className="card stat"><h3>Courses</h3><p>{overview?.stats?.courses ?? '-'}</p></div>
            <div className="card stat"><h3>Enrollments</h3><p>{overview?.stats?.enrollments ?? '-'}</p></div>
            <div className="card stat"><h3>Enquiries</h3><p>{overview?.stats?.enquiries ?? '-'}</p></div>
            <div className="card span-5">
              <h3>Recent Users</h3>
              <table>
                <thead>
                  <tr><th>Name</th><th>Email</th><th style={{ width: '96px' }}>Actions</th></tr>
                </thead>
                <tbody>
                  {(overview?.recentUsers || []).map((user) => (
                    <tr key={user.id}>
                      <td>{user.name}</td>
                      <td>{user.email}</td>
                      <td>
                        <div className="course-actions">
                          <button
                            type="button"
                            className="icon-btn primary"
                            title="Edit user"
                            aria-label="Edit user"
                            onClick={() => onEditUser(user)}
                          >
                            <svg viewBox="0 0 24 24" aria-hidden="true">
                              <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zm2.92 2.83H5v-.92l9.06-9.06.92.92L5.92 20.08zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
                            </svg>
                          </button>
                          <button
                            type="button"
                            className="icon-btn danger"
                            title="Delete user"
                            aria-label="Delete user"
                            onClick={() => onDeleteUser(user)}
                          >
                            <svg viewBox="0 0 24 24" aria-hidden="true">
                              <path d="M6 7h12l-1 14H7L6 7zm3-3h6l1 1h4v2H4V5h4l1-1z" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}

        {moduleModalOpen ? (
          <div
            className="modal-overlay"
            role="dialog"
            aria-modal="true"
            style={{ zIndex: 80 }}
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) onCancelModuleEdit();
            }}
          >
            <div className="modal-dialog" onMouseDown={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <div>
                  <div className="modal-title">{editingModuleId ? 'Edit Module' : 'Create Module'}</div>
                </div>
                <div className="row">
                  <button type="button" onClick={onCancelModuleEdit}>
                    Close
                  </button>
                </div>
              </div>

              <div className="modal-body">
                <form onSubmit={submitModule}>
                  <div className="form-grid">
                    <div>
                      <label className="field-label">Title</label>
                      <input placeholder="Module title" value={moduleForm.title} onChange={(e) => setModuleForm((p) => ({ ...p, title: e.target.value }))} required />
                    </div>
                    <div>
                      <label className="field-label">Position</label>
                      <input type="number" placeholder="1" value={moduleForm.position} onChange={(e) => setModuleForm((p) => ({ ...p, position: e.target.value }))} />
                    </div>
                    <div className="form-span-2">
                      <label className="field-label">Description</label>
                      <textarea rows="2" placeholder="Optional" value={moduleForm.description} onChange={(e) => setModuleForm((p) => ({ ...p, description: e.target.value }))} />
                    </div>
                  </div>
                  <div className="modal-footer">
                    <button type="submit">{editingModuleId ? 'Update Module' : 'Create Module'}</button>
                    <button type="button" onClick={onCancelModuleEdit}>
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        ) : null}

        {activeTab === 'courses' ? (
          <div className="grid cols-2">
            <div className="card span-2">
              <div className="card-header-row">
                <h3 style={{ margin: 0 }}>Courses</h3>
                <div className="row" style={{ justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                  <input
                    className="table-search"
                    placeholder="Search courses (title/category/level)…"
                    value={courseSearch}
                    onChange={(e) => setCourseSearch(e.target.value)}
                  />
                  <button type="button" onClick={onCreateCourse}>
                    Create Course
                  </button>
                </div>
              </div>

              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th style={{ width: '36%' }}>Title</th>
                      <th>Category</th>
                      <th>Level</th>
                      <th>Price</th>
                      <th>Enrollments</th>
                      <th>Updated</th>
                      <th style={{ width: 220 }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCourses.map((course) => {
                      const isSelected = selectedCourseId === course.id;
                      const priceLabel =
                        Number(course.priceAmount || 0) > 0 ? `${course.currency || 'INR'} ${course.priceAmount}` : 'Free';
                      return (
                        <tr key={course.id} className={isSelected ? 'is-selected' : ''}>
                          <td>
                            <div className="cell-title">{course.title}</div>
                            <div className="cell-sub">
                              {course.coverImageUrl ? (
                                <a href={course.coverImageUrl} target="_blank" rel="noreferrer">
                                  Cover
                                </a>
                              ) : (
                                <span className="muted">No cover</span>
                              )}
                            </div>
                          </td>
                          <td>{course.category}</td>
                          <td>{course.level}</td>
                          <td>{priceLabel}</td>
                          <td>
                            <div className="row" style={{ gap: 8, alignItems: 'center' }}>
                              <span>{course.enrollmentsCount ?? 0}</span>
                              <button
                                type="button"
                                title="View enrollments"
                                aria-label="View enrollments"
                                onClick={() => onViewEnrollments(course)}
                              >
                                View
                              </button>
                            </div>
                          </td>
                          <td>{course.updatedAt ? new Date(course.updatedAt).toLocaleDateString() : '-'}</td>
                          <td>
                            <div className="course-actions">
                              <button
                                type="button"
                                className="icon-btn primary"
                                title="Edit course"
                                aria-label="Edit course"
                                onClick={() => onEditCourse(course)}
                              >
                                <svg viewBox="0 0 24 24" aria-hidden="true">
                                  <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zm2.92 2.83H5v-.92l9.06-9.06.92.92L5.92 20.08zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
                                </svg>
                              </button>
                              <button
                                type="button"
                                className="icon-btn danger"
                                title="Delete course"
                                aria-label="Delete course"
                                onClick={() => onDeleteCourse(course.id)}
                              >
                                <svg viewBox="0 0 24 24" aria-hidden="true">
                                  <path d="M6 7h12l-1 14H7L6 7zm3-3h6l1 1h4v2H4V5h4l1-1z" />
                                </svg>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {filteredCourses.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="empty-cell">
                          No courses found.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Lesson create/list panels removed from main page (kept inside course edit modal). */}
          </div>
        ) : null}

        {activeTab === 'enquiries' ? (
          <div className="grid cols-2">
            <div className="card span-2">
              <div className="card-header-row">
                <h3 style={{ margin: 0 }}>Contact Us Details</h3>
                <p className="muted" style={{ margin: 0 }}>
                  Update the public website contact cards
                </p>
              </div>

              <form onSubmit={submitContactSettings}>
                <div className="form-grid">
                  <div>
                    <label className="field-label">Contact Email</label>
                    <input
                      type="email"
                      value={contactSettings.contactEmail}
                      onChange={(e) => setContactSettings((prev) => ({ ...prev, contactEmail: e.target.value }))}
                      placeholder="support@pilotpathshala.com"
                      required
                    />
                  </div>
                  <div>
                    <label className="field-label">Contact Phone</label>
                    <input
                      value={contactSettings.contactPhone}
                      onChange={(e) => setContactSettings((prev) => ({ ...prev, contactPhone: e.target.value }))}
                      placeholder="+91 98765 43210"
                      required
                    />
                  </div>
                  <div className="form-span-2">
                    <label className="field-label">Contact Address</label>
                    <textarea
                      rows="3"
                      value={contactSettings.contactAddress}
                      onChange={(e) => setContactSettings((prev) => ({ ...prev, contactAddress: e.target.value }))}
                      placeholder="Aviation Academy, India"
                      required
                    />
                  </div>
                </div>

                <div className="modal-footer">
                  <button type="submit">Save Contact Details</button>
                </div>
              </form>
            </div>

            <div className="card span-2">
              <div className="card-header-row">
                <h3 style={{ margin: 0 }}>Website Enquiries</h3>
                <p className="muted" style={{ margin: 0 }}>
                  {enquiries.length} total
                </p>
              </div>

              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Phone</th>
                      <th>Submitted</th>
                    </tr>
                  </thead>
                  <tbody>
                    {enquiries.map((enquiry) => (
                      <tr key={enquiry.id}>
                        <td>{enquiry.name}</td>
                        <td>
                          <a href={`mailto:${enquiry.email}`}>{enquiry.email}</a>
                        </td>
                        <td>
                          <a href={`tel:${enquiry.phone}`}>{enquiry.phone}</a>
                        </td>
                        <td>{enquiry.createdAt ? new Date(enquiry.createdAt).toLocaleString() : '-'}</td>
                      </tr>
                    ))}
                    {enquiries.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="empty-cell">
                          No enquiries yet.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : null}

        {enrollmentsModalOpen ? (
          <div
            className="modal-overlay"
            role="dialog"
            aria-modal="true"
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) onCloseEnrollmentsModal();
            }}
          >
            <div className="modal modal-full" onMouseDown={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <div>
                  <div className="modal-title">Course Enrollments</div>
                  <div className="modal-subtitle">
                    {selectedEnrollmentCourse?.title || 'Selected course'} • {courseEnrollments.length} enrollment{courseEnrollments.length === 1 ? '' : 's'}
                  </div>
                </div>
                <div className="row">
                  <button type="button" onClick={onCloseEnrollmentsModal}>
                    Close
                  </button>
                </div>
              </div>

              <div className="modal-body">
                <form onSubmit={submitCourseEnrollment}>
                  <label className="field-label">User Email</label>
                  <div className="question-toolbar" style={{ marginBottom: 0, alignItems: 'stretch' }}>
                    <div className="question-dropdown" ref={userDropdownRef} style={{ maxWidth: 420 }}>
                      <button
                        type="button"
                        className="question-dropdown-trigger"
                        onClick={async () => {
                          const nextOpen = !userDropdownOpen;
                          setUserDropdownOpen(nextOpen);
                          if (nextOpen) {
                            await loadUsersForEnrollment(userSearch);
                          }
                        }}
                      >
                        <span className="question-dropdown-trigger-text">
                          {enrollmentForm.userEmail || 'Search and select user email'}
                        </span>
                        <span className="question-dropdown-trigger-icon">{userDropdownOpen ? '▲' : '▼'}</span>
                      </button>

                      {userDropdownOpen ? (
                        <div className="question-dropdown-menu">
                          <input
                            ref={userSearchInputRef}
                            className="question-dropdown-search"
                            placeholder="Search users by name or email..."
                            value={userSearch}
                            onChange={async (e) => {
                              const value = e.target.value;
                              setUserSearch(value);
                              await loadUsersForEnrollment(value);
                            }}
                          />
                          <div className="question-dropdown-list">
                            {filteredUserSearchResults.length === 0 ? (
                              <div className="question-dropdown-empty">No users found.</div>
                            ) : (
                              filteredUserSearchResults.map((user) => (
                                <button
                                  key={user.id}
                                  type="button"
                                  className={`question-dropdown-option ${
                                    enrollmentForm.userEmail === user.email ? 'is-selected' : ''
                                  }`}
                                  onClick={() => {
                                    setEnrollmentForm({ userEmail: user.email || '' });
                                    setUserDropdownOpen(false);
                                  }}
                                >
                                  <span className="question-dropdown-option-subject">{user.name || 'Unnamed User'}</span>
                                  <span className="question-dropdown-option-prompt">{user.email}</span>
                                </button>
                              ))
                            )}
                          </div>
                        </div>
                      ) : null}
                    </div>

                    <button type="submit" style={{ whiteSpace: 'nowrap' }}>
                      Add Enrollment
                    </button>
                  </div>
                </form>

                <div style={{ marginTop: 12, maxWidth: 420 }}>
                  <label className="field-label">Search Enrolled User</label>
                  <input
                    value={enrollmentSearch}
                    onChange={(e) => setEnrollmentSearch(e.target.value)}
                    placeholder="Search by user name or email..."
                  />
                </div>

                <div className="table-wrap" style={{ marginTop: 12 }}>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>User</th>
                        <th>Email</th>
                        <th>Progress</th>
                        <th>Enrolled</th>
                        <th>Updated</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredCourseEnrollments.map((enrollment) => (
                        <tr key={enrollment.id}>
                          <td>{enrollment.userName || '-'}</td>
                          <td>{enrollment.userEmail || '-'}</td>
                          <td>{Math.round(Number(enrollment.progress || 0))}%</td>
                          <td>{enrollment.createdAt ? new Date(enrollment.createdAt).toLocaleString() : '-'}</td>
                          <td>{enrollment.updatedAt ? new Date(enrollment.updatedAt).toLocaleString() : '-'}</td>
                        </tr>
                      ))}
                      {filteredCourseEnrollments.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="empty-cell">
                            No enrolled users match this search.
                          </td>
                        </tr>
                      ) : null}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {testModalOpen ? (
          <div
            className="modal-overlay"
            role="dialog"
            aria-modal="true"
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) closeTestModal();
            }}
          >
            <div className="modal-dialog" onMouseDown={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <div>
                  <div className="modal-title">{editingTestId ? 'Edit Test' : 'Create Test'}</div>
                  <div className="modal-subtitle">Set up the test metadata, then manage its questions from the Tests page.</div>
                </div>
                <div className="row">
                  <button type="button" onClick={closeTestModal}>
                    Close
                  </button>
                </div>
              </div>

              <form className="modal-body" onSubmit={submitTest}>
                <div className="form-grid">
                  <div>
                    <label className="field-label">Mode</label>
                    <select value={testForm.mode} onChange={(e) => setTestForm((p) => ({ ...p, mode: e.target.value }))}>
                      <option value="practice">Practice</option>
                      <option value="exam">Exam</option>
                    </select>
                  </div>
                  <div>
                    <label className="field-label">Subject</label>
                    <select
                      value={testForm.subject}
                      onChange={(e) => setTestForm((p) => ({ ...p, subject: e.target.value }))}
                      required
                    >
                      <option value="">Select course name</option>
                      {testSubjectOptions.map((subject) => (
                        <option key={subject} value={subject}>
                          {subject}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-span-2">
                    <label className="field-label">Test Title</label>
                    <input
                      placeholder="Navigation Practice Test"
                      value={testForm.title}
                      onChange={(e) => setTestForm((p) => ({ ...p, title: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="form-span-2">
                    <label className="field-label">Description</label>
                    <textarea
                      placeholder="Optional description"
                      rows="4"
                      value={testForm.description}
                      onChange={(e) => setTestForm((p) => ({ ...p, description: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="modal-footer">
                  <button type="submit">{editingTestId ? 'Update Test' : 'Create Test'}</button>
                  <button type="button" onClick={closeTestModal}>
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        ) : null}

        {questionModalOpen ? (
          <div
            className="modal-overlay"
            role="dialog"
            aria-modal="true"
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) closeQuestionModal();
            }}
          >
            <div className="modal-dialog" onMouseDown={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <div>
                  <div className="modal-title">{editingQuestionId ? 'Edit Question' : 'Create Question'}</div>
                  <div className="modal-subtitle">
                    {editingQuestionId ? 'Update this question inside the selected test.' : 'Create a new question and add it to the selected test.'}
                  </div>
                </div>
                <div className="row">
                  <button type="button" onClick={closeQuestionModal}>
                    Close
                  </button>
                </div>
              </div>

              <form className="modal-body" onSubmit={submitQuestionInTest}>
                <div className="form-grid">
                  <div>
                    <label className="field-label">Mode</label>
                    <select value={questionForm.mode} disabled>
                      <option value="practice">Practice</option>
                      <option value="exam">Exam</option>
                    </select>
                  </div>
                </div>
                <textarea
                  placeholder="Prompt"
                  rows="3"
                  value={questionForm.prompt}
                  onChange={(e) => setQuestionForm((p) => ({ ...p, prompt: e.target.value }))}
                  required
                />
                <textarea
                  placeholder="Explanation (correct)"
                  rows="2"
                  value={questionForm.explanationCorrect}
                  onChange={(e) => setQuestionForm((p) => ({ ...p, explanationCorrect: e.target.value }))}
                  required={questionForm.mode !== 'exam'}
                />
                <textarea
                  placeholder="Explanation (wrong)"
                  rows="2"
                  value={questionForm.explanationWrong}
                  onChange={(e) => setQuestionForm((p) => ({ ...p, explanationWrong: e.target.value }))}
                  required={questionForm.mode !== 'exam'}
                />
                <h4>Options</h4>
                {questionForm.options.map((option, index) => (
                  <div key={`${option.key}-${index}`} className="option-row">
                    <input value={option.key} onChange={(e) => updateQuestionOption(index, 'key', e.target.value)} />
                    <input
                      value={option.text}
                      placeholder={`Option ${index + 1}`}
                      onChange={(e) => updateQuestionOption(index, 'text', e.target.value)}
                      required
                    />
                    <label>
                      <input
                        type="radio"
                        name="correct_option_modal"
                        checked={option.isCorrect}
                        onChange={() => updateQuestionOption(index, 'isCorrect', true)}
                      />
                      Correct
                    </label>
                  </div>
                ))}
                <div className="modal-footer">
                  <button type="submit">{editingQuestionId ? 'Update Question' : 'Create Question'}</button>
                  <button type="button" onClick={closeQuestionModal}>
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        ) : null}

        {userModalOpen ? (
          <div
            className="modal-overlay"
            role="dialog"
            aria-modal="true"
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) closeUserModal();
            }}
          >
            <div className="modal-dialog" onMouseDown={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <div>
                  <div className="modal-title">Edit User</div>
                  <div className="modal-subtitle">Update name and email for this account.</div>
                </div>
                <div className="row">
                  <button type="button" onClick={closeUserModal}>
                    Close
                  </button>
                </div>
              </div>

              <form className="modal-body" onSubmit={submitUserEdit}>
                <div className="form-grid">
                  <div>
                    <label className="field-label">Full Name</label>
                    <input
                      value={userForm.name}
                      onChange={(e) => setUserForm((prev) => ({ ...prev, name: e.target.value }))}
                      placeholder="User name"
                      required
                    />
                  </div>
                  <div>
                    <label className="field-label">Email</label>
                    <input
                      type="email"
                      value={userForm.email}
                      onChange={(e) => setUserForm((prev) => ({ ...prev, email: e.target.value }))}
                      placeholder="user@example.com"
                      required
                    />
                  </div>
                </div>

                <div className="modal-footer">
                  <button type="submit">Save Changes</button>
                  <button type="button" onClick={closeUserModal}>
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        ) : null}

        {userDeleteTarget ? (
          <div
            className="modal-overlay"
            role="dialog"
            aria-modal="true"
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) closeUserDeleteModal();
            }}
          >
            <div className="modal-dialog" onMouseDown={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <div>
                  <div className="modal-title">Delete User</div>
                  <div className="modal-subtitle">This action cannot be undone.</div>
                </div>
              </div>

              <div className="modal-body">
                <p className="confirm-copy">
                  Delete <strong>{userDeleteTarget.name || userDeleteTarget.email}</strong> from the platform?
                </p>
                <div className="modal-footer">
                  <button type="button" className="danger-solid" onClick={confirmDeleteUser}>
                    Delete User
                  </button>
                  <button type="button" onClick={closeUserDeleteModal}>
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {courseModalOpen ? (
          <div
            className="modal-overlay"
            role="dialog"
            aria-modal="true"
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) onCloseCourseModal();
            }}
          >
            <div className="modal modal-full" onMouseDown={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <div>
                  <div className="modal-title">{editingCourseId ? 'Edit Course' : 'Create Course'}</div>
                  {editingCourseId ? <div className="modal-subtitle">Course ID: {editingCourseId}</div> : null}
                </div>
                <div className="row">
                  <button type="button" onClick={onCloseCourseModal}>
                    Close
                  </button>
                </div>
              </div>

              <div className="modal-body">
                <div className="modal-grid">
                  <form className="modal-card" onSubmit={submitCourse}>
                    <div className="form-grid">
                      <div>
                        <label className="field-label">Title</label>
                        <input
                          placeholder="Course title"
                          value={courseForm.title}
                          onChange={(e) => setCourseForm((p) => ({ ...p, title: e.target.value }))}
                          required
                        />
                      </div>
                      <div>
                        <label className="field-label">Category</label>
                        <input
                          placeholder="e.g. Navigation"
                          value={courseForm.category}
                          onChange={(e) => setCourseForm((p) => ({ ...p, category: e.target.value }))}
                          required
                        />
                      </div>
                      <div>
                        <label className="field-label">Level</label>
                        <input
                          placeholder="PPL / CPL / ATPL"
                          value={courseForm.level}
                          onChange={(e) => setCourseForm((p) => ({ ...p, level: e.target.value }))}
                        />
                      </div>
                      <div>
                        <label className="field-label">Cover Image URL</label>
                        <input
                          placeholder="https://..."
                          value={isUploadedCoverImage ? '' : courseForm.coverImageUrl}
                          onChange={(e) => setCourseForm((p) => ({ ...p, coverImageUrl: e.target.value }))}
                        />
                        {isUploadedCoverImage ? <div className="field-help">Uploaded image selected.</div> : null}
                        <div style={{ marginTop: 8 }}>
                          <label className="field-label">Or upload image</label>
                          <input type="file" accept="image/*" onChange={handleCoverUpload} />
                        </div>
                        {courseForm.coverImageUrl ? (
                          <div style={{ marginTop: 8 }}>
                            <img src={courseForm.coverImageUrl} alt="cover" style={{ maxWidth: '100%', maxHeight: 160, borderRadius: 8 }} />
                          </div>
                        ) : null}
                      </div>
                      <div>
                        <label className="field-label">Price Amount (0 = Free)</label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="0"
                          value={courseForm.priceAmount}
                          onChange={(e) => setCourseForm((p) => ({ ...p, priceAmount: e.target.value }))}
                        />
                      </div>
                      <div>
                        <label className="field-label">Currency</label>
                        <input
                          placeholder="INR"
                          value={courseForm.currency}
                          onChange={(e) => setCourseForm((p) => ({ ...p, currency: e.target.value }))}
                        />
                      </div>
                      <div className="form-span-2">
                        <label className="field-label">Description</label>
                        <textarea
                          placeholder="Course description"
                          rows="6"
                          value={courseForm.description}
                          onChange={(e) => setCourseForm((p) => ({ ...p, description: e.target.value }))}
                          required
                        />
                      </div>
                    </div>

                    <div className="modal-footer">
                      <button type="submit">{editingCourseId ? 'Update Course' : 'Create Course'}</button>
                    92px
                    </div>
                  </form>

                  <div className="modal-card">
                    <h3 style={{ marginTop: 0 }}>Course Data</h3>
                    <div className="meta-grid">
                      <div className="meta-item">
                        <div className="meta-label">Lessons</div>
                        <div className="meta-value">{editingCourse?.lessonsCount ?? 0}</div>
                      </div>
                      <div className="meta-item">
                        <div className="meta-label">Modules</div>
                        <div className="meta-value">{editingCourse?.modulesCount ?? 0}</div>
                      </div>
                      <div className="meta-item">
                        <div className="meta-label">Enrollments</div>
                        <div className="meta-value">{editingCourse?.enrollmentsCount ?? 0}</div>
                      </div>
                      <div className="meta-item">
                        <div className="meta-label">Course ID</div>
                        <div className="meta-value">{editingCourse?.id ?? '-'}</div>
                      </div>
                      <div className="meta-item">
                        <div className="meta-label">Created</div>
                        <div className="meta-value">
                          {editingCourse?.createdAt ? new Date(editingCourse.createdAt).toLocaleString() : '-'}
                        </div>
                      </div>
                      <div className="meta-item">
                        <div className="meta-label">Updated</div>
                        <div className="meta-value">
                          {editingCourse?.updatedAt ? new Date(editingCourse.updatedAt).toLocaleString() : '-'}
                        </div>
                      </div>
                      <div className="meta-item">
                        <div className="meta-label">Cover</div>
                        <div className="meta-value">
                          {courseForm.coverImageUrl ? (
                            <a href={courseForm.coverImageUrl} target="_blank" rel="noreferrer">
                              Open
                            </a>
                          ) : (
                            '-'
                          )}
                        </div>
                      </div>
                    </div>

                    {editingCourseId ? (
                      <>
                        <div className="modal-list">
                          <div className="section-head">
                            <h3 style={{ marginTop: 0 }}>Modules</h3>
                            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                <button type="button" onClick={onCreateModule}>
                                  New Module
                                </button>
                              </div>
                          </div>

                          <table className="mini-table">
                            <thead>
                              <tr>
                                <th style={{ width: '12%' }}>Pos</th>
                                <th>Title</th>
                                <th style={{ width: '20%' }}>Lessons</th>
                                <th style={{ width: 120 }}>Actions</th>
                              </tr>
                            </thead>
                            <tbody>
                              {(courseModalModules || []).map((m) => (
                                <tr key={m.id}>
                                  <td>{m.position ?? '-'}</td>
                                  <td>{m.title}</td>
                                  <td>{m.lessonsCount ?? 0}</td>
                                  <td>
                                    <div className="action-row">
                                      <button type="button" className="icon-btn primary" title="Edit module" onClick={() => onEditModule(m)}>
                                        <svg viewBox="0 0 24 24" aria-hidden="true">
                                          <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zm2.92 2.83H5v-.92l9.06-9.06.92.92L5.92 20.08zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
                                        </svg>
                                      </button>
                                      <button type="button" className="icon-btn danger" title="Delete module" onClick={() => onDeleteModule(m.id)}>
                                        <svg viewBox="0 0 24 24" aria-hidden="true">
                                          <path d="M6 7h12l-1 14H7L6 7zm3-3h6l1 1h4v2H4V5h4l1-1z" />
                                        </svg>
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                              {(courseModalModules || []).length === 0 ? (
                                <tr>
                                  <td colSpan={4} className="empty-cell">
                                    No modules found for this course.
                                  </td>
                                </tr>
                              ) : null}
                            </tbody>
                          </table>
                        </div>

                        <div className="modal-list">
                          <div className="section-head">
                            <h3 style={{ marginTop: 0 }}>Lessons</h3>
                            <button type="button" onClick={() => openLessonEditor(null)}>
                              Add Lesson
                            </button>
                          </div>
                          <table className="mini-table">
                            <thead>
                              <tr>
                                <th style={{ width: '12%' }}>Pos</th>
                                <th>Title</th>
                                <th style={{ width: '22%' }}>Duration</th>
                                <th style={{ width: 120 }}>Actions</th>
                              </tr>
                            </thead>
                            <tbody>
                              {(courseModalLessons || []).map((l) => (
                                <tr key={l.id}>
                                  <td>{l.position ?? '-'}</td>
                                  <td>{l.title}</td>
                                  <td>{l.durationMinutes ? `${l.durationMinutes} min` : '-'}</td>
                                  <td>
                                    <div className="action-row">
                                      <button type="button" className="icon-btn primary" title="Edit lesson" onClick={() => openLessonEditor(l)}>
                                        <svg viewBox="0 0 24 24" aria-hidden="true">
                                          <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zm2.92 2.83H5v-.92l9.06-9.06.92.92L5.92 20.08zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
                                        </svg>
                                      </button>
                                      <button type="button" className="icon-btn danger" title="Delete lesson" onClick={() => onDeleteLessonInModal(l.id)}>
                                        <svg viewBox="0 0 24 24" aria-hidden="true">
                                          <path d="M6 7h12l-1 14H7L6 7zm3-3h6l1 1h4v2H4V5h4l1-1z" />
                                        </svg>
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                              {(courseModalLessons || []).length === 0 ? (
                                <tr>
                                  <td colSpan={4} className="empty-cell">
                                    No lessons found for this course.
                                  </td>
                                </tr>
                              ) : null}
                            </tbody>
                          </table>

                          {lessonEditorOpen ? (
                            <div
                              className="modal-overlay"
                              role="dialog"
                              aria-modal="true"
                              onMouseDown={(e) => {
                                if (e.target === e.currentTarget) closeLessonEditor();
                              }}
                            >
                              <div className="modal-dialog modal-dialog-large" onMouseDown={(e) => e.stopPropagation()}>
                                <div className="modal-header">
                                  <div>
                                    <div className="modal-title">{lessonEditor.id ? 'Edit Lesson' : 'Create Lesson'}</div>
                                    <div className="drawer-sub muted">Edit lesson fields, notes/takeaways, and videos.</div>
                                  </div>
                                  <div className="row">
                                    <button type="button" onClick={closeLessonEditor}>
                                      Close
                                    </button>
                                  </div>
                                </div>

                                <form onSubmit={submitLessonEditor} className="drawer-body">
                                  <div className="form-grid">
                                    <div>
                                      <label className="field-label">Title</label>
                                      <input value={lessonEditor.title} onChange={(e) => setLessonEditor((p) => ({ ...p, title: e.target.value }))} required />
                                    </div>
                                    <div>
                                      <label className="field-label">Module</label>
                                      <select value={lessonEditor.moduleId} onChange={(e) => setLessonEditor((p) => ({ ...p, moduleId: e.target.value }))}>
                                        <option value="">No module</option>
                                        {(courseModalModules || []).map((m) => (
                                          <option key={m.id} value={String(m.id)}>
                                            {m.title}
                                          </option>
                                        ))}
                                      </select>
                                    </div>
                                    <div>
                                      <label className="field-label">Subtitle</label>
                                      <input value={lessonEditor.subtitle} onChange={(e) => setLessonEditor((p) => ({ ...p, subtitle: e.target.value }))} />
                                    </div>
                                    <div>
                                      <label className="field-label">Position</label>
                                      <input
                                        type="number"
                                        value={lessonEditor.position}
                                        onChange={(e) => setLessonEditor((p) => ({ ...p, position: e.target.value }))}
                                        placeholder="1"
                                      />
                                    </div>
                                    <div className="form-span-2">
                                      <label className="field-label">Summary</label>
                                      <textarea rows="2" value={lessonEditor.summary} onChange={(e) => setLessonEditor((p) => ({ ...p, summary: e.target.value }))} />
                                    </div>
                                    <div className="form-span-2">
                                      <label className="field-label">Notes (one per line)</label>
                                      <textarea rows="3" value={lessonEditor.notesText} onChange={(e) => setLessonEditor((p) => ({ ...p, notesText: e.target.value }))} />
                                    </div>
                                    <div className="form-span-2">
                                      <label className="field-label">Takeaways (one per line)</label>
                                      <textarea
                                        rows="3"
                                        value={lessonEditor.takeawaysText}
                                        onChange={(e) => setLessonEditor((p) => ({ ...p, takeawaysText: e.target.value }))}
                                      />
                                    </div>
                                  </div>

                                  <div style={{ height: 10 }} />
                                  <div className="section-head">
                                    <h3 style={{ margin: 0 }}>Videos</h3>
                                    <button type="button" onClick={addLessonVideoRow}>
                                      Add Video
                                    </button>
                                  </div>

                                  {(lessonEditor.videos || []).map((v, idx) => (
                                    <div key={`${idx}`} className="video-card">
                                      <div className="video-row-top">
                                        <div>
                                          <label className="field-label">Pos</label>
                                          <input
                                            className="video-pos"
                                            type="number"
                                            value={v.position}
                                            onChange={(e) => updateLessonVideo(idx, 'position', e.target.value)}
                                            placeholder="1"
                                          />
                                        </div>
                                        <div className="video-top-title">
                                          <label className="field-label">Title</label>
                                          <input
                                            className="video-title"
                                            value={v.title}
                                            onChange={(e) => updateLessonVideo(idx, 'title', e.target.value)}
                                            placeholder={`Video ${idx + 1}`}
                                          />
                                        </div>
                                        <div>
                                          <label className="field-label">Minutes</label>
                                          <input
                                            className="video-dur"
                                            type="number"
                                            min="1"
                                            value={v.durationMinutes}
                                            onChange={(e) => updateLessonVideo(idx, 'durationMinutes', e.target.value)}
                                            placeholder="34"
                                            required={idx === 0}
                                          />
                                        </div>
                                        <div className="video-top-actions">
                                          <label className="field-label">&nbsp;</label>
                                          <button
                                            type="button"
                                            className="icon-btn danger"
                                            title="Remove video"
                                            onClick={() => removeLessonVideoRow(idx)}
                                            disabled={(lessonEditor.videos || []).length <= 1}
                                          >
                                            <svg viewBox="0 0 24 24" aria-hidden="true">
                                              <path d="M6 7h12l-1 14H7L6 7zm3-3h6l1 1h4v2H4V5h4l1-1z" />
                                            </svg>
                                          </button>
                                        </div>
                                      </div>

                                      <div className="video-row-url">
                                        <label className="field-label">Video URL {idx === 0 ? '(Main video)' : ''}</label>
                                        <input
                                          value={v.videoUrl}
                                          onChange={(e) => updateLessonVideo(idx, 'videoUrl', e.target.value)}
                                          placeholder="https://..."
                                          required={idx === 0}
                                        />
                                      </div>

                                      <div className="video-row-url">
                                        <label className="field-label">Thumbnail URL</label>
                                        <input
                                          value={v.thumbnailUrl}
                                          onChange={(e) => updateLessonVideo(idx, 'thumbnailUrl', e.target.value)}
                                          placeholder="https://..."
                                        />
                                        <div style={{ marginTop: 8 }}>
                                          <label className="field-label">Or upload thumbnail</label>
                                          <input type="file" accept="image/*" onChange={(e) => handleLessonVideoThumbnailUpload(idx, e)} />
                                        </div>
                                        {v.thumbnailUrl ? (
                                          <div style={{ marginTop: 8 }}>
                                            <img src={v.thumbnailUrl} alt={`thumb-${idx}`} style={{ maxWidth: 220, maxHeight: 120, borderRadius: 8 }} />
                                          </div>
                                        ) : null}
                                      </div>
                                    </div>
                                  ))}

                                  <div className="modal-footer">
                                    <button type="submit">{lessonEditor.id ? 'Update Lesson' : 'Create Lesson'}</button>
                                    <button type="button" onClick={closeLessonEditor}>
                                      Cancel
                                    </button>
                                  </div>
                                </form>
                              </div>
                            </div>
                          ) : null}
                        </div>
                      </>
                    ) : (
                      <p className="muted" style={{ margin: 0 }}>
                        Tip: create the course first to attach modules and lessons.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {activeTab === 'tests' ? (
          <div className="grid cols-2">
            <div className="card span-2">
              <div className="card-header-row">
                <h3 style={{ margin: 0 }}>Existing Tests</h3>
                <div className="row" style={{ justifyContent: 'flex-end', gap: 12, flexWrap: 'wrap' }}>
                  <select value={testModeFilter} onChange={(e) => setTestModeFilter(e.target.value)}>
                    <option value="all">All Modes</option>
                    <option value="practice">Practice</option>
                    <option value="exam">Exam</option>
                  </select>
                  <button type="button" onClick={onCreateTest}>
                    New Test
                  </button>
                </div>
              </div>
              <table>
                <thead>
                  <tr>
                    <th>Mode</th>
                    <th>Title</th>
                    <th>Subject</th>
                    <th>Status</th>
                    <th>#Q</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTests.map((test) => {
                    const isSelected = selectedTestId === test.id;
                    return (
                      <tr key={test.id}>
                        <td>{test.mode}</td>
                        <td>{test.title}</td>
                        <td>{test.subject || '-'}</td>
                        <td>{test.isPublished ? 'Published' : 'Draft'}</td>
                        <td>{test.questionsCount ?? 0}</td>
                        <td>
                          <div className="action-row test-action-row">
                            <button type="button" onClick={() => onSelectTest(test.id)}>
                              {isSelected ? 'Close' : 'View'}
                            </button>
                            <button
                              type="button"
                              onClick={() => onPublishTest(test.id)}
                              disabled={Boolean(test.isPublished)}
                              title={test.isPublished ? 'Already published' : 'Publish test'}
                            >
                              {test.isPublished ? 'Published' : 'Publish'}
                            </button>
                            <button
                              type="button"
                              className="icon-btn primary"
                              title="Edit test"
                              aria-label="Edit test"
                              onClick={() => onEditTest(test)}
                            >
                              <svg viewBox="0 0 24 24" aria-hidden="true">
                                <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zm2.92 2.83H5v-.92l9.06-9.06.92.92L5.92 20.08zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
                              </svg>
                            </button>
                            <button
                              type="button"
                              className="icon-btn danger"
                              title="Delete test"
                              aria-label="Delete test"
                              onClick={() => onDeleteTest(test.id)}
                            >
                              <svg viewBox="0 0 24 24" aria-hidden="true">
                                <path d="M6 7h12l-1 14H7L6 7zm3-3h6l1 1h4v2H4V5h4l1-1z" />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredTests.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="empty-cell">
                        No tests found for the selected mode.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>

            <div className="card span-2">
              <h3>Questions {selectedTest ? `(${selectedTest.title})` : ''}</h3>
              {!selectedTest ? (
                <p>Select a test to view / edit questions.</p>
              ) : (
                <>
                  <div className="question-toolbar">
                    <div className="question-dropdown" ref={questionDropdownRef}>
                      <button
                        type="button"
                        className="question-dropdown-trigger"
                        onClick={() => setQuestionDropdownOpen((open) => !open)}
                        aria-haspopup="listbox"
                        aria-expanded={questionDropdownOpen}
                      >
                        <span className="question-dropdown-trigger-text">
                          {selectedAddableQuestion
                            ? `[${selectedAddableQuestion.subject || 'No subject'}] ${selectedAddableQuestion.prompt.slice(0, 80)}`
                            : 'Add existing question…'}
                        </span>
                        <span className="question-dropdown-trigger-icon">v</span>
                      </button>

                      {questionDropdownOpen ? (
                        <div className="question-dropdown-menu">
                          <input
                            ref={questionSearchInputRef}
                            className="question-dropdown-search"
                            type="text"
                            placeholder="Search existing questions…"
                            value={questionSearch}
                            onChange={(e) => setQuestionSearch(e.target.value)}
                          />
                          <div className="question-dropdown-list" role="listbox">
                            {filteredAddableQuestions.length === 0 ? (
                              <div className="question-dropdown-empty">No matching questions found.</div>
                            ) : (
                              filteredAddableQuestions.map((q) => (
                                <button
                                  key={q.id}
                                  type="button"
                                  className={`question-dropdown-option ${String(questionToAddId) === String(q.id) ? 'is-selected' : ''}`}
                                  onClick={() => {
                                    setQuestionToAddId(String(q.id));
                                    setQuestionDropdownOpen(false);
                                  }}
                                >
                                  <span className="question-dropdown-option-subject">[{q.subject || 'No subject'}]</span>
                                  <span className="question-dropdown-option-prompt">{q.prompt}</span>
                                </button>
                              ))
                            )}
                          </div>
                        </div>
                      ) : null}
                    </div>
                    <button type="button" onClick={onAddExistingQuestion} disabled={!questionToAddId}>
                      Add
                    </button>
                    <button type="button" onClick={onCreateQuestion}>
                      Create New Question
                    </button>
                  </div>

                  <table>
                    <thead>
                      <tr>
                        <th>Mode</th>
                        <th>Subject</th>
                        <th>Prompt</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {testQuestions.map((question) => (
                        <tr key={question.id}>
                          <td>{question.mode}</td>
                          <td>{question.subject}</td>
                          <td>{question.prompt.slice(0, 80)}...</td>
                          <td>
                            <div className="action-row test-action-row">
                              <button
                                type="button"
                                className="icon-btn primary"
                                title="Edit question"
                                aria-label="Edit question"
                                onClick={() => onEditQuestion(question)}
                              >
                                <svg viewBox="0 0 24 24" aria-hidden="true">
                                  <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zm2.92 2.83H5v-.92l9.06-9.06.92.92L5.92 20.08zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
                                </svg>
                              </button>
                              <button
                                type="button"
                                className="icon-btn danger"
                                title="Delete question"
                                aria-label="Delete question"
                                onClick={() => onDeleteQuestion(question.id)}
                              >
                                <svg viewBox="0 0 24 24" aria-hidden="true">
                                  <path d="M6 7h12l-1 14H7L6 7zm3-3h6l1 1h4v2H4V5h4l1-1z" />
                                </svg>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
              )}
            </div>
          </div>
        ) : null}
      </section>
    </main>
  );
}

export default App;
