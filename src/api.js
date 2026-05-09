const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://api.pilotpathshala.com/api/admin';

const request = async ({ path, method = 'GET', adminKey, body }) => {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'X-Admin-Key': adminKey
    },
    body: body ? JSON.stringify(body) : undefined
  });

  const contentType = response.headers.get('content-type') || '';
  const data = contentType.includes('application/json') ? await response.json() : {};
  if (!response.ok) {
    throw new Error(data?.message || `Request failed (${response.status})`);
  }
  return data;
};

export const adminApi = {
  getOverview: (adminKey) => request({ path: '/overview', adminKey }),
  listEnquiries: (adminKey) => request({ path: '/enquiries', adminKey }),
  updateUser: (userId, payload, adminKey) => request({ path: `/users/${userId}`, method: 'PUT', body: payload, adminKey }),
  deleteUser: (userId, adminKey) => request({ path: `/users/${userId}`, method: 'DELETE', adminKey }),

  listCourses: (adminKey) => request({ path: '/courses', adminKey }),
  createCourse: (payload, adminKey) => request({ path: '/courses', method: 'POST', body: payload, adminKey }),
  updateCourse: (courseId, payload, adminKey) =>
    request({ path: `/courses/${courseId}`, method: 'PUT', body: payload, adminKey }),
  deleteCourse: (courseId, adminKey) => request({ path: `/courses/${courseId}`, method: 'DELETE', adminKey }),

  listModules: (courseId, adminKey) => request({ path: `/courses/${courseId}/modules`, adminKey }),
  createModule: (courseId, payload, adminKey) =>
    request({ path: `/courses/${courseId}/modules`, method: 'POST', body: payload, adminKey }),
  updateModule: (moduleId, payload, adminKey) => request({ path: `/modules/${moduleId}`, method: 'PUT', body: payload, adminKey }),
  deleteModule: (moduleId, adminKey) => request({ path: `/modules/${moduleId}`, method: 'DELETE', adminKey }),

  listLessons: (courseId, adminKey) => request({ path: `/courses/${courseId}/lessons`, adminKey }),
  createLesson: (courseId, payload, adminKey) =>
    request({ path: `/courses/${courseId}/lessons`, method: 'POST', body: payload, adminKey }),
  updateLesson: (lessonId, payload, adminKey) =>
    request({ path: `/lessons/${lessonId}`, method: 'PUT', body: payload, adminKey }),
  deleteLesson: (lessonId, adminKey) => request({ path: `/lessons/${lessonId}`, method: 'DELETE', adminKey }),

  listLessonVideos: (lessonId, adminKey) => request({ path: `/lessons/${lessonId}/videos`, adminKey }),
  replaceLessonVideos: (lessonId, videos, adminKey) =>
    request({ path: `/lessons/${lessonId}/videos`, method: 'PUT', body: { videos }, adminKey }),

  listTests: (adminKey) => request({ path: '/tests', adminKey }),
  createTest: (payload, adminKey) => request({ path: '/tests', method: 'POST', body: payload, adminKey }),
  updateTest: (testId, payload, adminKey) => request({ path: `/tests/${testId}`, method: 'PUT', body: payload, adminKey }),
  deleteTest: (testId, adminKey) => request({ path: `/tests/${testId}`, method: 'DELETE', adminKey }),

  listTestQuestions: (testId, adminKey) => request({ path: `/tests/${testId}/questions`, adminKey }),
  addQuestionToTest: (testId, questionId, adminKey) =>
    request({ path: `/tests/${testId}/questions`, method: 'POST', body: { questionId }, adminKey }),
  removeQuestionFromTest: (testId, questionId, adminKey) =>
    request({ path: `/tests/${testId}/questions/${questionId}`, method: 'DELETE', adminKey }),

  listQuestions: (adminKey) => request({ path: '/questions', adminKey }),
  createQuestion: (payload, adminKey) => request({ path: '/questions', method: 'POST', body: payload, adminKey }),
  updateQuestion: (questionId, payload, adminKey) =>
    request({ path: `/questions/${questionId}`, method: 'PUT', body: payload, adminKey }),
  deleteQuestion: (questionId, adminKey) => request({ path: `/questions/${questionId}`, method: 'DELETE', adminKey })
};
