// src/client.ts

import axios, { AxiosInstance, AxiosError } from 'axios';
import {
  CanvasCourse,
  CanvasAssignment,
  CanvasSubmission,
  CanvasUser,
  CanvasEnrollment,
  CreateCourseArgs,
  UpdateCourseArgs,
  CreateAssignmentArgs,
  UpdateAssignmentArgs,
  SubmitGradeArgs,
  EnrollUserArgs,
  CanvasAPIError,
  CanvasDiscussionTopic,
  CanvasModule,
  CanvasModuleItem,
  CanvasQuiz,
  CanvasAnnouncement,
  CanvasUserProfile,
  CanvasScope,
  CanvasAssignmentSubmission,
  CanvasPage,
  CanvasCalendarEvent,
  CanvasRubric,
  CanvasAssignmentGroup,
  CanvasConversation,
  CanvasNotification,
  CanvasFile,
  CanvasSyllabus,
  CanvasDashboard,
  SubmitAssignmentArgs,
  FileUploadArgs,
  CanvasAccount,
  CreateUserArgs,
  CanvasAccountReport,
  CreateReportArgs,
  ListAccountCoursesArgs,
  ListAccountUsersArgs,
  // Teacher Information Retrieval Types
  GetTeacherCoursesArgs,
  GetGradingQueueArgs,
  GetCourseStudentsArgs,
  GetCourseAssignmentsArgs,
  GetUpcomingEventsArgs,
  GetStudentPerformanceArgs,
  GetCourseAnalyticsArgs,
  GetAssignmentAnalyticsArgs,
  GetMissingSubmissionsArgs,
  GetCourseStatisticsArgs,
  GetStudentDetailsArgs,
  GetStudentActivityArgs,
  GetCourseDetailsArgs,
  GetCourseDiscussionsArgs,
  GetTeacherActivityArgs,
  GetGradebookDataArgs,
  GetModuleProgressArgs,
  SearchCourseContentArgs,
  GetUserEnrollmentsArgs,
  StudentPerformanceSummary,
  CourseAnalyticsSummary,
  AssignmentAnalyticsSummary,
  MissingSubmissionItem,
  UpcomingEventItem,
  GradingQueueItem,
  StudentActivitySummary,
  CourseContentSearchResult,
  ModuleProgressSummary
} from './types.js';

export class CanvasClient {
  private client: AxiosInstance;
  private baseURL: string;
  private maxRetries: number = 3;
  private retryDelay: number = 1000;

  constructor(token: string, domain: string, options?: { maxRetries?: number; retryDelay?: number }) {
    this.baseURL = `https://${domain}/api/v1`;
    this.maxRetries = options?.maxRetries ?? 3;
    this.retryDelay = options?.retryDelay ?? 1000;

    this.client = axios.create({
      baseURL: this.baseURL,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      timeout: 30000 // 30 second timeout
    });

    this.setupInterceptors();
  }

  private setupInterceptors(): void {
    // Request interceptor for logging
    this.client.interceptors.request.use(
      (config) => {
        console.error(`[Canvas API] ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => {
        console.error('[Canvas API] Request error:', error.message || error);
        return Promise.reject(error);
      }
    );

    // Response interceptor for pagination and retry logic
    this.client.interceptors.response.use(
      async (response) => {
        const { headers, data } = response;
        const linkHeader = headers.link;
        const contentType = headers['content-type'] || '';

        // Only handle pagination for JSON responses
        if (Array.isArray(data) && linkHeader && contentType.includes('application/json')) {
          let allData = [...data];
          let nextUrl = this.getNextPageUrl(linkHeader);

          while (nextUrl) {
            const nextResponse = await this.client.get(nextUrl);
            allData = [...allData, ...nextResponse.data];
            nextUrl = this.getNextPageUrl(nextResponse.headers.link);
          }

          response.data = allData;
        }

        return response;
      },
      async (error: AxiosError) => {
        const config = error.config as any;
        
        // Retry logic for specific errors
        if (this.shouldRetry(error) && config && config.__retryCount < this.maxRetries) {
          config.__retryCount = config.__retryCount || 0;
          config.__retryCount++;
          
          const delay = this.retryDelay * Math.pow(2, config.__retryCount - 1); // Exponential backoff
          console.error(`[Canvas API] Retrying request (${config.__retryCount}/${this.maxRetries}) after ${delay}ms`);
          
          await this.sleep(delay);
          return this.client.request(config);
        }

        // Transform error with better handling for non-JSON responses
        if (error.response) {
          const { status, data, headers } = error.response;
          const contentType = headers?.['content-type'] || 'unknown';
          console.error(`[Canvas API] Error response: ${status}, Content-Type: ${contentType}, Data type: ${typeof data}`);
          
          let errorMessage: string;
          
          try {
            // Check if data is already a string (HTML error pages, plain text, etc.)
            if (typeof data === 'string') {
              errorMessage = data.length > 200 ? data.substring(0, 200) + '...' : data;
            } else if (data && typeof data === 'object') {
              // Handle structured Canvas API error responses
              if ((data as any)?.message) {
                errorMessage = (data as any).message;
              } else if ((data as any)?.errors && Array.isArray((data as any).errors)) {
                errorMessage = (data as any).errors.map((err: any) => err.message || err).join(', ');
              } else {
                errorMessage = JSON.stringify(data);
              }
            } else {
              errorMessage = String(data);
            }
          } catch (jsonError) {
            // Fallback if JSON operations fail
            errorMessage = String(data);
          }
          
          throw new CanvasAPIError(
            `Canvas API Error (${status}): ${errorMessage}`, 
            status, 
            data
          );
        }
        
        // Handle network errors or other issues
        if (error.request) {
          console.error('[Canvas API] Network error - no response received:', error.message);
          throw new CanvasAPIError(
            `Network error: ${error.message}`,
            0,
            null
          );
        }
        
        console.error('[Canvas API] Unexpected error:', error.message);
        throw error;
      }
    );
  }

  private shouldRetry(error: AxiosError): boolean {
    if (!error.response) return true; // Network errors
    
    const status = error.response.status;
    return status === 429 || status >= 500; // Rate limit or server errors
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private getNextPageUrl(linkHeader: string): string | null {
    const links = linkHeader.split(',');
    const nextLink = links.find(link => link.includes('rel="next"'));
    if (!nextLink) return null;

    const match = nextLink.match(/<(.+?)>/);
    return match ? match[1] : null;
  }

  // ---------------------
  // HEALTH CHECK
  // ---------------------
  async healthCheck(): Promise<{ status: 'ok' | 'error'; timestamp: string; user?: any }> {
    try {
      const user = await this.getUserProfile();
      return {
        status: 'ok',
        timestamp: new Date().toISOString(),
        user: { id: user.id, name: user.name }
      };
    } catch (error) {
      return {
        status: 'error',
        timestamp: new Date().toISOString()
      };
    }
  }

  // ---------------------
  // COURSES (Enhanced)
  // ---------------------
  async listCourses(includeEnded: boolean = false): Promise<CanvasCourse[]> {
    const params: any = {
      include: ['total_students', 'teachers', 'term', 'course_progress']
    };
    
    if (!includeEnded) {
      params.state = ['available', 'completed'];
    }

    const response = await this.client.get('/courses', { params });
    return response.data;
  }

  async getCourse(courseId: number): Promise<CanvasCourse> {
    const response = await this.client.get(`/courses/${courseId}`, {
      params: {
        include: ['total_students', 'teachers', 'term', 'course_progress', 'sections', 'syllabus_body']
      }
    });
    return response.data;
  }

  async createCourse(args: CreateCourseArgs): Promise<CanvasCourse> {
    const { account_id, ...courseData } = args;
    const response = await this.client.post(`/accounts/${account_id}/courses`, {
      course: courseData
    });
    return response.data;
  }

  async updateCourse(args: UpdateCourseArgs): Promise<CanvasCourse> {
    const { course_id, ...courseData } = args;
    const response = await this.client.put(`/courses/${course_id}`, {
      course: courseData
    });
    return response.data;
  }

  async deleteCourse(courseId: number): Promise<void> {
    await this.client.delete(`/courses/${courseId}`);
  }

  // ---------------------
  // ASSIGNMENTS (Enhanced)
  // ---------------------
  async listAssignments(courseId: number, includeSubmissions: boolean = false): Promise<CanvasAssignment[]> {
    const params: any = {
      include: ['assignment_group', 'rubric', 'due_at']
    };
    
    if (includeSubmissions) {
      params.include.push('submission');
    }

    const response = await this.client.get(`/courses/${courseId}/assignments`, { params });
    return response.data;
  }

  async getAssignment(courseId: number, assignmentId: number, includeSubmission: boolean = false): Promise<CanvasAssignment> {
    const params: any = {
      include: ['assignment_group', 'rubric']
    };
    
    if (includeSubmission) {
      params.include.push('submission');
    }

    const response = await this.client.get(`/courses/${courseId}/assignments/${assignmentId}`, { params });
    return response.data;
  }

  async createAssignment(args: CreateAssignmentArgs): Promise<CanvasAssignment> {
    const { course_id, ...assignmentData } = args;
    const response = await this.client.post(`/courses/${course_id}/assignments`, {
      assignment: assignmentData
    });
    return response.data;
  }

  async updateAssignment(args: UpdateAssignmentArgs): Promise<CanvasAssignment> {
    const { course_id, assignment_id, ...assignmentData } = args;
    const response = await this.client.put(
      `/courses/${course_id}/assignments/${assignment_id}`,
      { assignment: assignmentData }
    );
    return response.data;
  }

  async deleteAssignment(courseId: number, assignmentId: number): Promise<void> {
    await this.client.delete(`/courses/${courseId}/assignments/${assignmentId}`);
  }

  // ---------------------
  // ASSIGNMENT GROUPS
  // ---------------------
  async listAssignmentGroups(courseId: number): Promise<CanvasAssignmentGroup[]> {
    const response = await this.client.get(`/courses/${courseId}/assignment_groups`, {
      params: {
        include: ['assignments']
      }
    });
    return response.data;
  }

  async getAssignmentGroup(courseId: number, groupId: number): Promise<CanvasAssignmentGroup> {
    const response = await this.client.get(`/courses/${courseId}/assignment_groups/${groupId}`, {
      params: {
        include: ['assignments']
      }
    });
    return response.data;
  }

  // ---------------------
  // SUBMISSIONS (Enhanced for Students)
  // ---------------------
  async getSubmissions(courseId: number, assignmentId: number): Promise<CanvasSubmission[]> {
    const response = await this.client.get(
      `/courses/${courseId}/assignments/${assignmentId}/submissions`,
      {
        params: {
          include: ['submission_comments', 'rubric_assessment', 'assignment']
        }
      }
    );
    return response.data;
  }

  async getSubmission(courseId: number, assignmentId: number, userId: number | 'self' = 'self'): Promise<CanvasSubmission> {
    const response = await this.client.get(
      `/courses/${courseId}/assignments/${assignmentId}/submissions/${userId}`,
      {
        params: {
          include: ['submission_comments', 'rubric_assessment', 'assignment']
        }
      }
    );
    return response.data;
  }

  async submitGrade(args: SubmitGradeArgs): Promise<CanvasSubmission> {
    const { course_id, assignment_id, user_id, grade, comment } = args;
    const response = await this.client.put(
      `/courses/${course_id}/assignments/${assignment_id}/submissions/${user_id}`, {
      submission: {
        posted_grade: grade,
        comment: comment ? { text_comment: comment } : undefined
      }
    });
    return response.data;
  }

  // Student submission with file support
  async submitAssignment(args: SubmitAssignmentArgs): Promise<CanvasAssignmentSubmission> {
    const { course_id, assignment_id, submission_type, body, url, file_ids } = args;
    
    const submissionData: any = {
      submission_type
    };

    if (body) submissionData.body = body;
    if (url) submissionData.url = url;
    if (file_ids && file_ids.length > 0) submissionData.file_ids = file_ids;

    const response = await this.client.post(
      `/courses/${course_id}/assignments/${assignment_id}/submissions`,
      { submission: submissionData }
    );
    return response.data;
  }

  // ---------------------
  // FILES (Enhanced)
  // ---------------------
  async listFiles(courseId: number, folderId?: number): Promise<CanvasFile[]> {
    const endpoint = folderId 
      ? `/folders/${folderId}/files`
      : `/courses/${courseId}/files`;
    
    const response = await this.client.get(endpoint);
    return response.data;
  }

  async getFile(fileId: number): Promise<CanvasFile> {
    const response = await this.client.get(`/files/${fileId}`);
    return response.data;
  }

  async uploadFile(args: FileUploadArgs): Promise<CanvasFile> {
    const { course_id, folder_id, name, size } = args;
    
    // Step 1: Get upload URL
    const uploadEndpoint = folder_id 
      ? `/folders/${folder_id}/files`
      : `/courses/${course_id}/files`;
      
    const uploadResponse = await this.client.post(uploadEndpoint, {
      name,
      size,
      content_type: args.content_type || 'application/octet-stream'
    });

    // Note: Actual file upload would require multipart form data handling
    // This is a simplified version - in practice, you'd need to handle the 
    // two-step upload process Canvas uses
    return uploadResponse.data;
  }

  async listFolders(courseId: number): Promise<any[]> {
    const response = await this.client.get(`/courses/${courseId}/folders`);
    return response.data;
  }

  // ---------------------
  // PAGES
  // ---------------------
  async listPages(courseId: number): Promise<CanvasPage[]> {
    const response = await this.client.get(`/courses/${courseId}/pages`);
    return response.data;
  }

  async getPage(courseId: number, pageUrl: string): Promise<CanvasPage> {
    const response = await this.client.get(`/courses/${courseId}/pages/${pageUrl}`);
    return response.data;
  }

  // ---------------------
  // CALENDAR EVENTS
  // ---------------------
  async listCalendarEvents(startDate?: string, endDate?: string): Promise<CanvasCalendarEvent[]> {
    const params: any = {
      type: 'event',
      all_events: true
    };
    
    if (startDate) params.start_date = startDate;
    if (endDate) params.end_date = endDate;

    const response = await this.client.get('/calendar_events', { params });
    return response.data;
  }

  async getUpcomingAssignments(limit: number = 10): Promise<CanvasAssignment[]> {
    const response = await this.client.get('/users/self/upcoming_events', {
      params: { limit }
    });
    return response.data.filter((event: any) => event.assignment);
  }

  // ---------------------
  // RUBRICS
  // ---------------------
  async listRubrics(courseId: number): Promise<CanvasRubric[]> {
    const response = await this.client.get(`/courses/${courseId}/rubrics`);
    return response.data;
  }

  async getRubric(courseId: number, rubricId: number): Promise<CanvasRubric> {
    const response = await this.client.get(`/courses/${courseId}/rubrics/${rubricId}`);
    return response.data;
  }

  // ---------------------
  // DASHBOARD
  // ---------------------
  async getDashboard(): Promise<CanvasDashboard> {
    const response = await this.client.get('/users/self/dashboard');
    return response.data;
  }

  async getDashboardCards(): Promise<any[]> {
    const response = await this.client.get('/dashboard/dashboard_cards');
    return response.data;
  }

  // ---------------------
  // SYLLABUS
  // ---------------------
  async getSyllabus(courseId: number): Promise<CanvasSyllabus> {
    const response = await this.client.get(`/courses/${courseId}`, {
      params: {
        include: ['syllabus_body']
      }
    });
    return {
      course_id: courseId,
      syllabus_body: response.data.syllabus_body
    };
  }

  // ---------------------
  // CONVERSATIONS/MESSAGING
  // ---------------------
  async listConversations(): Promise<CanvasConversation[]> {
    const response = await this.client.get('/conversations');
    return response.data;
  }

  async getConversation(conversationId: number): Promise<CanvasConversation> {
    const response = await this.client.get(`/conversations/${conversationId}`);
    return response.data;
  }

  async createConversation(recipients: string[], body: string, subject?: string): Promise<CanvasConversation> {
    const response = await this.client.post('/conversations', {
      recipients,
      body,
      subject
    });
    return response.data;
  }

  // ---------------------
  // NOTIFICATIONS
  // ---------------------
  async listNotifications(): Promise<CanvasNotification[]> {
    const response = await this.client.get('/users/self/activity_stream');
    return response.data;
  }

  // ---------------------
  // USERS AND ENROLLMENTS (Enhanced)
  // ---------------------
  async listUsers(courseId: number): Promise<CanvasUser[]> {
    const response = await this.client.get(`/courses/${courseId}/users`, {
      params: {
        include: ['email', 'enrollments', 'avatar_url']
      }
    });
    return response.data;
  }

  async getEnrollments(courseId: number): Promise<CanvasEnrollment[]> {
    const response = await this.client.get(`/courses/${courseId}/enrollments`);
    return response.data;
  }

  async enrollUser(args: EnrollUserArgs): Promise<CanvasEnrollment> {
    const { course_id, user_id, role = 'StudentEnrollment', enrollment_state = 'active' } = args;
    const response = await this.client.post(`/courses/${course_id}/enrollments`, {
      enrollment: {
        user_id,
        type: role,
        enrollment_state
      }
    });
    return response.data;
  }

  async unenrollUser(courseId: number, enrollmentId: number): Promise<void> {
    await this.client.delete(`/courses/${courseId}/enrollments/${enrollmentId}`);
  }

  // ---------------------
  // GRADES (Enhanced)
  // ---------------------
  async getCourseGrades(courseId: number): Promise<CanvasEnrollment[]> {
    const response = await this.client.get(`/courses/${courseId}/enrollments`, {
      params: {
        include: ['grades', 'observed_users']
      }
    });
    return response.data;
  }

  async getUserGrades(): Promise<any> {
    const response = await this.client.get('/users/self/grades');
    return response.data;
  }

  // ---------------------
  // USER PROFILE (Enhanced)
  // ---------------------
  async getUserProfile(): Promise<CanvasUserProfile> {
    const response = await this.client.get('/users/self/profile');
    return response.data;
  }

  async updateUserProfile(profileData: Partial<CanvasUserProfile>): Promise<CanvasUserProfile> {
    const response = await this.client.put('/users/self', {
      user: profileData
    });
    return response.data;
  }

  // ---------------------
  // STUDENT COURSES (Enhanced)
  // ---------------------
  async listStudentCourses(): Promise<CanvasCourse[]> {
    const response = await this.client.get('/courses', {
      params: {
        include: ['enrollments', 'total_students', 'term', 'course_progress'],
        enrollment_state: 'active'
      }
    });
    return response.data;
  }

  // ---------------------
  // MODULES (Enhanced)
  // ---------------------
  async listModules(courseId: number): Promise<CanvasModule[]> {
    const response = await this.client.get(`/courses/${courseId}/modules`, {
      params: {
        include: ['items']
      }
    });
    return response.data;
  }

  async getModule(courseId: number, moduleId: number): Promise<CanvasModule> {
    const response = await this.client.get(`/courses/${courseId}/modules/${moduleId}`, {
      params: {
        include: ['items']
      }
    });
    return response.data;
  }

  async listModuleItems(courseId: number, moduleId: number): Promise<CanvasModuleItem[]> {
    const response = await this.client.get(`/courses/${courseId}/modules/${moduleId}/items`, {
      params: {
        include: ['content_details']
      }
    });
    return response.data;
  }

  async getModuleItem(courseId: number, moduleId: number, itemId: number): Promise<CanvasModuleItem> {
    const response = await this.client.get(`/courses/${courseId}/modules/${moduleId}/items/${itemId}`, {
      params: {
        include: ['content_details']
      }
    });
    return response.data;
  }

  async markModuleItemComplete(courseId: number, moduleId: number, itemId: number): Promise<void> {
    await this.client.put(`/courses/${courseId}/modules/${moduleId}/items/${itemId}/done`);
  }

  // ---------------------
  // DISCUSSION TOPICS (Enhanced)
  // ---------------------
  async listDiscussionTopics(courseId: number): Promise<CanvasDiscussionTopic[]> {
    const response = await this.client.get(`/courses/${courseId}/discussion_topics`, {
      params: {
        include: ['assignment']
      }
    });
    return response.data;
  }

  async getDiscussionTopic(courseId: number, topicId: number): Promise<CanvasDiscussionTopic> {
    const response = await this.client.get(`/courses/${courseId}/discussion_topics/${topicId}`, {
      params: {
        include: ['assignment']
      }
    });
    return response.data;
  }

  async postToDiscussion(courseId: number, topicId: number, message: string): Promise<any> {
    const response = await this.client.post(`/courses/${courseId}/discussion_topics/${topicId}/entries`, {
      message
    });
    return response.data;
  }

  // ---------------------
  // ANNOUNCEMENTS (Enhanced)
  // ---------------------
  async listAnnouncements(courseId: string): Promise<CanvasAnnouncement[]> {
    const response = await this.client.get(`/courses/${courseId}/discussion_topics`, {
      params: {
        type: 'announcement',
        include: ['assignment']
      }
    });
    return response.data;
  }

  // ---------------------
  // QUIZZES (Enhanced)
  // ---------------------
  async listQuizzes(courseId: string): Promise<CanvasQuiz[]> {
    const response = await this.client.get(`/courses/${courseId}/quizzes`);
    return response.data;
  }

  async getQuiz(courseId: string, quizId: number): Promise<CanvasQuiz> {
    const response = await this.client.get(`/courses/${courseId}/quizzes/${quizId}`);
    return response.data;
  }

  async createQuiz(courseId: number, quizData: Partial<CanvasQuiz>): Promise<CanvasQuiz> {
    const response = await this.client.post(`/courses/${courseId}/quizzes`, {
      quiz: quizData
    });
    return response.data;
  }

  async updateQuiz(courseId: number, quizId: number, quizData: Partial<CanvasQuiz>): Promise<CanvasQuiz> {
    const response = await this.client.put(`/courses/${courseId}/quizzes/${quizId}`, {
      quiz: quizData
    });
    return response.data;
  }

  async deleteQuiz(courseId: number, quizId: number): Promise<void> {
    await this.client.delete(`/courses/${courseId}/quizzes/${quizId}`);
  }

  async startQuizAttempt(courseId: number, quizId: number): Promise<any> {
    const response = await this.client.post(`/courses/${courseId}/quizzes/${quizId}/submissions`);
    return response.data;
  }

  async submitQuizAttempt(courseId: number, quizId: number, submissionId: number, answers: any): Promise<any> {
    const response = await this.client.post(
      `/courses/${courseId}/quizzes/${quizId}/submissions/${submissionId}/complete`,
      { quiz_submissions: [{ attempt: 1, questions: answers }] }
    );
    return response.data;
  }

  // ---------------------
  // SCOPES (Enhanced)
  // ---------------------
  async listTokenScopes(accountId: number, groupBy?: string): Promise<CanvasScope[]> {
    const params: Record<string, string> = {};
    if (groupBy) {
      params.group_by = groupBy;
    }

    const response = await this.client.get(`/accounts/${accountId}/scopes`, { params });
    return response.data;
  }

  // ---------------------
  // ACCOUNT MANAGEMENT (New)
  // ---------------------
  async getAccount(accountId: number): Promise<CanvasAccount> {
    const response = await this.client.get(`/accounts/${accountId}`);
    return response.data;
  }

  async listAccountCourses(args: ListAccountCoursesArgs): Promise<CanvasCourse[]> {
    const { account_id, ...params } = args;
    const response = await this.client.get(`/accounts/${account_id}/courses`, { params });
    return response.data;
  }

  async listAccountUsers(args: ListAccountUsersArgs): Promise<CanvasUser[]> {
    const { account_id, ...params } = args;
    const response = await this.client.get(`/accounts/${account_id}/users`, { params });
    return response.data;
  }

  async createUser(args: CreateUserArgs): Promise<CanvasUser> {
    const { account_id, ...userData } = args;
    const response = await this.client.post(`/accounts/${account_id}/users`, userData);
    return response.data;
  }

  async listSubAccounts(accountId: number): Promise<CanvasAccount[]> {
    const response = await this.client.get(`/accounts/${accountId}/sub_accounts`);
    return response.data;
  }

  // ---------------------
  // ACCOUNT REPORTS (New)
  // ---------------------
  async getAccountReports(accountId: number): Promise<any[]> {
    const response = await this.client.get(`/accounts/${accountId}/reports`);
    return response.data;
  }

  async createAccountReport(args: CreateReportArgs): Promise<CanvasAccountReport> {
    const { account_id, report, parameters } = args;
    const response = await this.client.post(`/accounts/${account_id}/reports/${report}`, {
      parameters: parameters || {}
    });
    return response.data;
  }

  async getAccountReport(accountId: number, reportType: string, reportId: number): Promise<CanvasAccountReport> {
    const response = await this.client.get(`/accounts/${accountId}/reports/${reportType}/${reportId}`);
    return response.data;
  }

  // ===== TEACHER INFORMATION RETRIEVAL METHODS =====
  // Tier 1: Essential Daily Tools

  /**
   * Get all courses where the current user is a teacher
   */
  async getTeacherCourses(args: GetTeacherCoursesArgs = {}): Promise<CanvasCourse[]> {
    const params = new URLSearchParams();

    // Set enrollment type to teacher
    params.append('enrollment_type', 'teacher');

    if (args.enrollment_state && args.enrollment_state !== 'all') {
      params.append('enrollment_state', args.enrollment_state);
    }

    // Include additional data
    const includes = ['term'];
    if (args.include_student_count) includes.push('total_students');
    if (args.include_needs_grading) includes.push('needs_grading_count');
    if (args.include_recent_activity) includes.push('course_progress');

    includes.forEach(include => params.append('include[]', include));

    if (args.term_id) {
      params.append('enrollment_term_id', args.term_id.toString());
    }

    const response = await this.client.get(`/courses?${params.toString()}`);
    return response.data;
  }

  /**
   * Get assignments and submissions that need grading
   */
  async getGradingQueue(args: GetGradingQueueArgs = {}): Promise<GradingQueueItem[]> {
    const gradingItems: GradingQueueItem[] = [];

    if (args.course_id) {
      // Get course-specific grading needs
      const courseParams = new URLSearchParams();
      courseParams.append('include[]', 'needs_grading_count');
      const courseResponse = await this.client.get(`/courses/${args.course_id}?${courseParams.toString()}`);

      // Get assignments needing grading for this course
      const assignmentParams = new URLSearchParams();
      assignmentParams.append('include[]', 'needs_grading_count');
      const assignmentsResponse = await this.client.get(`/courses/${args.course_id}/assignments?${assignmentParams.toString()}`);

      const assignmentsNeedingGrading = assignmentsResponse.data.filter((a: any) => a.needs_grading_count > 0);

      for (const assignment of assignmentsNeedingGrading) {
        gradingItems.push({
          id: assignment.id,
          title: assignment.name,
          course_id: args.course_id,
          course_name: courseResponse.data.name,
          assignment_id: assignment.id,
          needs_grading_count: assignment.needs_grading_count,
          due_date: assignment.due_at,
          html_url: assignment.html_url,
          type: 'assignment'
        });
      }
    } else {
      // Get grading needs across all courses
      const params = new URLSearchParams();
      if (args.limit) {
        params.append('per_page', args.limit.toString());
      }

      const response = await this.client.get(`/users/self/todo?${params.toString()}`);
      const gradingTodos = response.data.filter((item: any) => item.type === 'grading');

      for (const todo of gradingTodos) {
        gradingItems.push({
          id: todo.assignment?.id || todo.id,
          title: todo.assignment?.name || todo.title,
          course_id: todo.course_id,
          course_name: todo.context_name,
          assignment_id: todo.assignment?.id,
          needs_grading_count: todo.needs_grading_count || 1,
          due_date: todo.assignment?.due_at,
          html_url: todo.html_url,
          type: 'assignment'
        });
      }
    }

    return gradingItems;
  }

  /**
   * Get detailed information about all students enrolled in a course
   */
  async getCourseStudents(args: GetCourseStudentsArgs): Promise<CanvasUser[]> {
    const params = new URLSearchParams();
    params.append('enrollment_type[]', 'student');

    if (args.enrollment_state && args.enrollment_state !== 'all') {
      params.append('enrollment_state[]', args.enrollment_state);
    }

    const includes = [];
    if (args.include_grades) includes.push('enrollments');
    if (args.include_avatar) includes.push('avatar_url');

    includes.forEach(include => params.append('include[]', include));

    if (args.sort_by) {
      params.append('sort', args.sort_by);
    }

    const response = await this.client.get(`/courses/${args.course_id}/users?${params.toString()}`);

    // If including activity data, fetch additional info
    if (args.include_activity) {
      const studentsWithActivity = await Promise.all(
        response.data.map(async (student: any) => {
          try {
            const activityResponse = await this.client.get(`/users/${student.id}/page_views?per_page=1`);
            return {
              ...student,
              last_activity: activityResponse.data[0]?.created_at || null
            };
          } catch (error) {
            return {
              ...student,
              last_activity: null
            };
          }
        })
      );
      return studentsWithActivity;
    }

    return response.data;
  }

  /**
   * Get all assignments for a course with submission and grading information
   */
  async getCourseAssignments(args: GetCourseAssignmentsArgs): Promise<CanvasAssignment[]> {
    const params = new URLSearchParams();

    const includes = ['submission'];
    if (args.include_submissions) includes.push('needs_grading_count');
    if (args.include_rubric) includes.push('rubric');
    if (args.include_overrides) includes.push('overrides');

    includes.forEach(include => params.append('include[]', include));

    if (args.assignment_group_id) {
      params.append('assignment_group_id', args.assignment_group_id.toString());
    }

    if (args.search_term) {
      params.append('search_term', args.search_term);
    }

    const response = await this.client.get(`/courses/${args.course_id}/assignments?${params.toString()}`);

    let assignments = response.data;

    // Apply due date filtering
    if (args.due_date_filter && args.due_date_filter !== 'all') {
      const now = new Date();
      assignments = assignments.filter((assignment: any) => {
        if (!assignment.due_at && args.due_date_filter === 'no_due_date') return true;
        if (!assignment.due_at) return false;

        const dueDate = new Date(assignment.due_at);

        switch (args.due_date_filter) {
          case 'past_due':
            return dueDate < now;
          case 'upcoming':
            return dueDate > now;
          default:
            return true;
        }
      });
    }

    return assignments;
  }

  /**
   * Get upcoming assignments, due dates, and calendar events
   */
  async getUpcomingEvents(args: GetUpcomingEventsArgs = {}): Promise<UpcomingEventItem[]> {
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + (args.days_ahead || 7));

    const events: UpcomingEventItem[] = [];

    // Get upcoming assignments
    if (args.include_assignments !== false) {
      let assignmentsEndpoint = args.course_id
        ? `/courses/${args.course_id}/assignments`
        : '/users/self/upcoming_events';

      const assignmentParams = new URLSearchParams();
      if (args.course_id) {
        assignmentParams.append('include[]', 'submission');
      }

      const assignmentsResponse = await this.client.get(`${assignmentsEndpoint}?${assignmentParams.toString()}`);

      const upcomingAssignments = assignmentsResponse.data
        .filter((item: any) => {
          const dueDate = item.due_at || item.assignment?.due_at;
          return dueDate && new Date(dueDate) <= endDate && new Date(dueDate) >= new Date();
        })
        .map((item: any) => ({
          id: item.id || item.assignment?.id,
          title: item.title || item.assignment?.name,
          due_date: item.due_at || item.assignment?.due_at,
          event_type: 'assignment' as const,
          course_id: item.course_id || item.context_id,
          course_name: item.context_name || '',
          points_possible: item.points_possible || item.assignment?.points_possible,
          html_url: item.html_url || item.assignment?.html_url
        }));

      events.push(...upcomingAssignments);
    }

    // Get calendar events if requested
    if (args.include_calendar_events) {
      const calendarParams = new URLSearchParams();
      calendarParams.append('start_date', new Date().toISOString().split('T')[0]);
      calendarParams.append('end_date', endDate.toISOString().split('T')[0]);

      if (args.course_id) {
        calendarParams.append('context_codes[]', `course_${args.course_id}`);
      }

      const calendarResponse = await this.client.get(`/calendar_events?${calendarParams.toString()}`);

      const calendarEvents = calendarResponse.data.map((event: any) => ({
        id: event.id,
        title: event.title,
        due_date: event.start_at,
        event_type: 'calendar_event' as const,
        course_id: event.context_id,
        course_name: event.context_name || '',
        html_url: event.html_url
      }));

      events.push(...calendarEvents);
    }

    // Sort by date
    return events.sort((a, b) => {
      const dateA = new Date(a.due_date);
      const dateB = new Date(b.due_date);
      return dateA.getTime() - dateB.getTime();
    });
  }

  // Tier 2: Analytics & Insights Tools

  /**
   * Get performance summaries for all students in a course
   */
  async getStudentPerformance(args: GetStudentPerformanceArgs): Promise<StudentPerformanceSummary[]> {
    const params = new URLSearchParams();
    params.append('enrollment_type[]', 'student');
    params.append('include[]', 'enrollments');

    const studentsResponse = await this.client.get(`/courses/${args.course_id}/users?${params.toString()}`);
    const students = studentsResponse.data;

    const performanceSummaries: StudentPerformanceSummary[] = [];

    for (const student of students) {
      const enrollment = student.enrollments?.[0];

      let missingAssignments = 0;
      let lateSubmissions = 0;
      let lastActivity = null;

      if (args.include_missing_assignments || args.include_late_submissions) {
        try {
          const submissionsResponse = await this.client.get(
            `/courses/${args.course_id}/students/submissions?student_ids[]=${student.id}&include[]=assignment`
          );

          if (args.include_missing_assignments) {
            missingAssignments = submissionsResponse.data.filter((s: any) => s.missing).length;
          }

          if (args.include_late_submissions) {
            lateSubmissions = submissionsResponse.data.filter((s: any) => s.late).length;
          }
        } catch (error) {
          console.error(`Error fetching submissions for student ${student.id}:`, error);
        }
      }

      // Get last activity
      try {
        const activityResponse = await this.client.get(`/users/${student.id}/page_views?per_page=1`);
        lastActivity = activityResponse.data[0]?.created_at || null;
      } catch (error) {
        // Ignore activity errors
      }

      performanceSummaries.push({
        user: student,
        enrollment: enrollment,
        current_score: enrollment?.grades?.current_score || null,
        final_score: enrollment?.grades?.final_score || null,
        current_grade: enrollment?.grades?.current_grade || null,
        final_grade: enrollment?.grades?.final_grade || null,
        missing_assignments: missingAssignments,
        late_submissions: lateSubmissions,
        last_activity: lastActivity,
        participation_score: null // Would need additional API calls to calculate
      });
    }

    // Sort by specified criteria
    if (args.sort_by) {
      performanceSummaries.sort((a, b) => {
        switch (args.sort_by) {
          case 'score':
            return (b.current_score || 0) - (a.current_score || 0);
          case 'name':
            return a.user.sortable_name.localeCompare(b.user.sortable_name);
          case 'last_login':
            const aDate = a.last_activity ? new Date(a.last_activity).getTime() : 0;
            const bDate = b.last_activity ? new Date(b.last_activity).getTime() : 0;
            return bDate - aDate;
          default:
            return 0;
        }
      });
    }

    return performanceSummaries;
  }

  /**
   * Get comprehensive analytics for course participation and performance
   */
  async getCourseAnalytics(args: GetCourseAnalyticsArgs): Promise<CourseAnalyticsSummary> {
    // Get course details
    const courseParams = new URLSearchParams();
    courseParams.append('include[]', 'total_students');
    const courseResponse = await this.client.get(`/courses/${args.course_id}?${courseParams.toString()}`);
    const course = courseResponse.data;

    // Get student enrollments with grades
    const studentsParams = new URLSearchParams();
    studentsParams.append('enrollment_type[]', 'student');
    studentsParams.append('include[]', 'enrollments');
    const studentsResponse = await this.client.get(`/courses/${args.course_id}/users?${studentsParams.toString()}`);
    const students = studentsResponse.data;

    const totalStudents = students.length;
    const activeStudents = students.filter((s: any) =>
      s.enrollments?.[0]?.enrollment_state === 'active'
    ).length;

    // Calculate grade distribution and average
    const scores = students
      .map((s: any) => s.enrollments?.[0]?.grades?.current_score)
      .filter((score: any) => score !== null && score !== undefined);

    const averageScore = scores.length > 0
      ? scores.reduce((sum: number, score: number) => sum + score, 0) / scores.length
      : null;

    const gradeDistribution = {
      a_range: scores.filter((s: number) => s >= 90).length,
      b_range: scores.filter((s: number) => s >= 80 && s < 90).length,
      c_range: scores.filter((s: number) => s >= 70 && s < 80).length,
      d_range: scores.filter((s: number) => s >= 60 && s < 70).length,
      f_range: scores.filter((s: number) => s < 60).length,
      no_grade: totalStudents - scores.length
    };

    // Calculate participation rate (simplified)
    const participationRate = activeStudents / totalStudents * 100;

    // Get assignment completion rate
    let assignmentCompletionRate = 0;
    if (args.include_assignment_analytics) {
      try {
        const assignmentsResponse = await this.client.get(`/courses/${args.course_id}/assignments`);
        const assignments = assignmentsResponse.data;

        if (assignments.length > 0) {
          const submissionsResponse = await this.client.get(
            `/courses/${args.course_id}/students/submissions?include[]=assignment`
          );
          const submissions = submissionsResponse.data;

          const totalPossibleSubmissions = assignments.length * totalStudents;
          const actualSubmissions = submissions.filter((s: any) => s.workflow_state === 'submitted').length;
          assignmentCompletionRate = (actualSubmissions / totalPossibleSubmissions) * 100;
        }
      } catch (error) {
        console.error('Error calculating assignment completion rate:', error);
      }
    }

    return {
      course,
      total_students: totalStudents,
      active_students: activeStudents,
      average_score: averageScore,
      grade_distribution: gradeDistribution,
      participation_rate: participationRate,
      assignment_completion_rate: assignmentCompletionRate,
      recent_activity_count: 0 // Would need additional API calls
    };
  }

  /**
   * Get detailed analytics for assignment performance and submission patterns
   */
  async getAssignmentAnalytics(args: GetAssignmentAnalyticsArgs): Promise<AssignmentAnalyticsSummary[]> {
    const analytics: AssignmentAnalyticsSummary[] = [];

    if (args.assignment_id) {
      // Get specific assignment analytics
      const assignment = await this.getAssignment(args.course_id, args.assignment_id);
      const submissionsResponse = await this.client.get(
        `/courses/${args.course_id}/assignments/${args.assignment_id}/submissions?include[]=user`
      );

      const summary = this.calculateAssignmentAnalytics(assignment, submissionsResponse.data, args);
      analytics.push(summary);
    } else {
      // Get analytics for all assignments
      const assignmentsResponse = await this.client.get(`/courses/${args.course_id}/assignments`);
      const assignments = assignmentsResponse.data;

      for (const assignment of assignments) {
        try {
          const submissionsResponse = await this.client.get(
            `/courses/${args.course_id}/assignments/${assignment.id}/submissions?include[]=user`
          );

          const summary = this.calculateAssignmentAnalytics(assignment, submissionsResponse.data, args);
          analytics.push(summary);
        } catch (error) {
          console.error(`Error getting analytics for assignment ${assignment.id}:`, error);
        }
      }
    }

    return analytics;
  }

  private calculateAssignmentAnalytics(
    assignment: CanvasAssignment,
    submissions: any[],
    args: GetAssignmentAnalyticsArgs
  ): AssignmentAnalyticsSummary {
    const submissionCount = submissions.filter(s => s.workflow_state === 'submitted').length;
    const gradedCount = submissions.filter(s => s.workflow_state === 'graded').length;

    const scores = submissions
      .map(s => s.score)
      .filter(score => score !== null && score !== undefined);

    const averageScore = scores.length > 0
      ? scores.reduce((sum, score) => sum + score, 0) / scores.length
      : null;

    const sortedScores = [...scores].sort((a, b) => a - b);
    const medianScore = sortedScores.length > 0
      ? sortedScores[Math.floor(sortedScores.length / 2)]
      : null;

    const now = new Date();
    const dueDate = assignment.due_at ? new Date(assignment.due_at) : null;

    const onTimeSubmissions = submissions.filter(s =>
      s.submitted_at && (!dueDate || new Date(s.submitted_at) <= dueDate)
    ).length;

    const lateSubmissions = submissions.filter(s => s.late).length;
    const missingSubmissions = submissions.filter(s => s.missing).length;

    return {
      assignment,
      submission_count: submissionCount,
      graded_count: gradedCount,
      average_score: averageScore,
      median_score: medianScore,
      score_distribution: scores, // Could be binned for better visualization
      on_time_submissions: onTimeSubmissions,
      late_submissions: lateSubmissions,
      missing_submissions: missingSubmissions
    };
  }

  /**
   * Get students with missing or late submissions
   */
  async getMissingSubmissions(args: GetMissingSubmissionsArgs = {}): Promise<MissingSubmissionItem[]> {
    const missingItems: MissingSubmissionItem[] = [];

    if (args.course_id) {
      // Get missing submissions for specific course
      const params = new URLSearchParams();
      params.append('include[]', 'assignment');
      params.append('include[]', 'user');

      if (args.student_id) {
        params.append('student_ids[]', args.student_id.toString());
      }

      const submissionsResponse = await this.client.get(
        `/courses/${args.course_id}/students/submissions?${params.toString()}`
      );

      const missingSubmissions = submissionsResponse.data.filter((s: any) => {
        const isMissing = s.missing || (!s.submitted_at && s.assignment?.due_at && new Date(s.assignment.due_at) < new Date());
        const isLate = args.include_late_submissions && s.late;
        return isMissing || isLate;
      });

      for (const submission of missingSubmissions) {
        const daysOverdue = submission.assignment?.due_at
          ? Math.max(0, Math.floor((new Date().getTime() - new Date(submission.assignment.due_at).getTime()) / (1000 * 60 * 60 * 24)))
          : 0;

        if (!args.days_overdue || daysOverdue >= args.days_overdue) {
          missingItems.push({
            assignment: submission.assignment,
            student: submission.user,
            days_overdue: daysOverdue,
            points_possible: submission.assignment?.points_possible || 0
          });
        }
      }
    } else {
      // Get missing submissions across all teacher's courses
      const courses = await this.getTeacherCourses({ enrollment_state: 'active' });

      for (const course of courses) {
        try {
          const courseMissing = await this.getMissingSubmissions({
            ...args,
            course_id: course.id as number
          });
          missingItems.push(...courseMissing);
        } catch (error) {
          console.error(`Error getting missing submissions for course ${course.id}:`, error);
        }
      }
    }

    return missingItems;
  }

  /**
   * Get comprehensive statistics and metrics for a course
   */
  async getCourseStatistics(args: GetCourseStatisticsArgs): Promise<any> {
    const stats: any = {
      course_id: args.course_id,
      generated_at: new Date().toISOString()
    };

    // Get basic course info
    const courseResponse = await this.client.get(`/courses/${args.course_id}?include[]=total_students`);
    stats.course = courseResponse.data;

    if (args.include_grade_distribution || args.include_participation_stats) {
      const analytics = await this.getCourseAnalytics({
        course_id: args.course_id,
        include_assignment_analytics: true,
        include_participation_data: true,
        include_grade_distribution: true
      });

      if (args.include_grade_distribution) {
        stats.grade_distribution = analytics.grade_distribution;
        stats.average_score = analytics.average_score;
      }

      if (args.include_participation_stats) {
        stats.participation_rate = analytics.participation_rate;
        stats.active_students = analytics.active_students;
        stats.total_students = analytics.total_students;
      }
    }

    if (args.include_submission_stats) {
      const assignmentsResponse = await this.client.get(`/courses/${args.course_id}/assignments`);
      const assignments = assignmentsResponse.data;

      let totalSubmissions = 0;
      let lateSubmissions = 0;
      let missingSubmissions = 0;

      for (const assignment of assignments) {
        try {
          const submissionsResponse = await this.client.get(
            `/courses/${args.course_id}/assignments/${assignment.id}/submissions`
          );

          totalSubmissions += submissionsResponse.data.filter((s: any) => s.workflow_state === 'submitted').length;
          lateSubmissions += submissionsResponse.data.filter((s: any) => s.late).length;
          missingSubmissions += submissionsResponse.data.filter((s: any) => s.missing).length;
        } catch (error) {
          console.error(`Error getting submission stats for assignment ${assignment.id}:`, error);
        }
      }

      stats.submission_stats = {
        total_assignments: assignments.length,
        total_submissions: totalSubmissions,
        late_submissions: lateSubmissions,
        missing_submissions: missingSubmissions,
        on_time_rate: totalSubmissions > 0 ? ((totalSubmissions - lateSubmissions) / totalSubmissions) * 100 : 0
      };
    }

    if (args.include_engagement_metrics) {
      // This would require additional API calls to page views, discussions, etc.
      stats.engagement_metrics = {
        note: "Engagement metrics require additional Canvas Analytics API access"
      };
    }

    return stats;
  }

  // Tier 3: Advanced Information Tools

  /**
   * Get comprehensive information about a specific student
   */
  async getStudentDetails(args: GetStudentDetailsArgs): Promise<any> {
    const studentParams = new URLSearchParams();
    studentParams.append('include[]', 'enrollments');
    studentParams.append('include[]', 'avatar_url');

    const studentResponse = await this.client.get(
      `/courses/${args.course_id}/users/${args.student_id}?${studentParams.toString()}`
    );

    const studentDetails: any = {
      student: studentResponse.data,
      course_id: args.course_id
    };

    if (args.include_progress) {
      try {
        const progressResponse = await this.client.get(
          `/courses/${args.course_id}/users/${args.student_id}/progress`
        );
        studentDetails.progress = progressResponse.data;
      } catch (error) {
        studentDetails.progress = null;
      }
    }

    if (args.include_submissions) {
      try {
        const submissionsResponse = await this.client.get(
          `/courses/${args.course_id}/students/submissions?student_ids[]=${args.student_id}&include[]=assignment`
        );
        studentDetails.submissions = submissionsResponse.data;
      } catch (error) {
        studentDetails.submissions = [];
      }
    }

    if (args.include_analytics) {
      try {
        const activityResponse = await this.client.get(`/users/${args.student_id}/page_views?per_page=10`);
        studentDetails.recent_activity = activityResponse.data;
      } catch (error) {
        studentDetails.recent_activity = [];
      }
    }

    return studentDetails;
  }

  /**
   * Get student engagement and activity data
   */
  async getStudentActivity(args: GetStudentActivityArgs): Promise<StudentActivitySummary[]> {
    const activities: StudentActivitySummary[] = [];

    if (args.student_id) {
      // Get activity for specific student
      const activity = await this.calculateStudentActivity(args.course_id, args.student_id, args);
      activities.push(activity);
    } else {
      // Get activity for all students in course
      const studentsResponse = await this.client.get(
        `/courses/${args.course_id}/users?enrollment_type[]=student`
      );

      for (const student of studentsResponse.data) {
        try {
          const activity = await this.calculateStudentActivity(args.course_id, student.id, args);
          activities.push(activity);
        } catch (error) {
          console.error(`Error calculating activity for student ${student.id}:`, error);
        }
      }
    }

    return activities;
  }

  private async calculateStudentActivity(
    courseId: number,
    studentId: number,
    args: GetStudentActivityArgs
  ): Promise<StudentActivitySummary> {
    // Get student info
    const studentResponse = await this.client.get(`/courses/${courseId}/users/${studentId}`);
    const student = studentResponse.data;

    let lastLogin = null;
    let totalPageViews = 0;
    let recentPageViews = 0;

    if (args.include_page_views) {
      try {
        const pageViewsResponse = await this.client.get(`/users/${studentId}/page_views?per_page=100`);
        const pageViews = pageViewsResponse.data;

        totalPageViews = pageViews.length;
        lastLogin = pageViews[0]?.created_at || null;

        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        recentPageViews = pageViews.filter((pv: any) =>
          new Date(pv.created_at) > sevenDaysAgo
        ).length;
      } catch (error) {
        // Page views might not be accessible
      }
    }

    // Get submission counts
    let assignmentSubmissions = 0;
    let quizSubmissions = 0;

    try {
      const submissionsResponse = await this.client.get(
        `/courses/${courseId}/students/submissions?student_ids[]=${studentId}`
      );
      assignmentSubmissions = submissionsResponse.data.filter((s: any) =>
        s.workflow_state === 'submitted'
      ).length;
    } catch (error) {
      // Ignore submission errors
    }

    return {
      user: student,
      last_login: lastLogin,
      total_page_views: totalPageViews,
      recent_page_views: recentPageViews,
      participation_count: 0, // Would need discussion API calls
      discussion_posts: 0, // Would need discussion API calls
      assignment_submissions: assignmentSubmissions,
      quiz_submissions: quizSubmissions
    };
  }

  /**
   * Get comprehensive information about a specific course
   */
  async getCourseDetails(args: GetCourseDetailsArgs): Promise<any> {
    const includes = ['term'];
    if (args.include_sections) includes.push('sections');
    if (args.include_teachers) includes.push('teachers');
    if (args.include_enrollment_counts) includes.push('total_students');
    if (args.include_syllabus) includes.push('syllabus_body');

    const params = new URLSearchParams();
    includes.forEach(include => params.append('include[]', include));

    const courseResponse = await this.client.get(`/courses/${args.course_id}?${params.toString()}`);
    const courseDetails = courseResponse.data;

    if (args.include_assignments_summary) {
      try {
        const assignmentsResponse = await this.client.get(`/courses/${args.course_id}/assignments`);
        courseDetails.assignments_summary = {
          total_assignments: assignmentsResponse.data.length,
          published_assignments: assignmentsResponse.data.filter((a: any) => a.published).length,
          assignments_with_due_dates: assignmentsResponse.data.filter((a: any) => a.due_at).length
        };
      } catch (error) {
        courseDetails.assignments_summary = null;
      }
    }

    return courseDetails;
  }

  /**
   * Get discussion topics and activity for a course
   */
  async getCourseDiscussions(args: GetCourseDiscussionsArgs): Promise<CanvasDiscussionTopic[]> {
    const params = new URLSearchParams();

    if (args.only_announcements) {
      params.append('only_announcements', 'true');
    }

    if (args.search_term) {
      params.append('search_term', args.search_term);
    }

    const includes = [];
    if (args.include_unread_count) includes.push('unread_count');
    if (args.include_recent_posts) includes.push('recent_posts');

    includes.forEach(include => params.append('include[]', include));

    const response = await this.client.get(`/courses/${args.course_id}/discussion_topics?${params.toString()}`);
    return response.data;
  }

  /**
   * Get recent activity stream for teacher
   */
  async getTeacherActivity(args: GetTeacherActivityArgs = {}): Promise<any[]> {
    const params = new URLSearchParams();

    if (args.limit) {
      params.append('per_page', args.limit.toString());
    }

    let endpoint = '/users/self/activity_stream';
    if (args.course_id) {
      endpoint = `/courses/${args.course_id}/activity_stream`;
    }

    const response = await this.client.get(`${endpoint}?${params.toString()}`);

    let activities = response.data;

    // Filter by activity types if specified
    if (args.activity_types && args.activity_types.length > 0) {
      activities = activities.filter((activity: any) =>
        args.activity_types!.includes(activity.type)
      );
    }

    return activities;
  }

  /**
   * Get comprehensive gradebook information for a course
   */
  async getGradebookData(args: GetGradebookDataArgs): Promise<any> {
    const gradebookData: any = {
      course_id: args.course_id,
      generated_at: new Date().toISOString()
    };

    // Get assignments
    const assignmentParams = new URLSearchParams();
    if (args.assignment_group_id) {
      assignmentParams.append('assignment_group_id', args.assignment_group_id.toString());
    }

    const assignmentsResponse = await this.client.get(
      `/courses/${args.course_id}/assignments?${assignmentParams.toString()}`
    );
    gradebookData.assignments = assignmentsResponse.data;

    // Get students with enrollments
    const studentParams = new URLSearchParams();
    studentParams.append('enrollment_type[]', 'student');
    studentParams.append('include[]', 'enrollments');

    if (args.student_ids && args.student_ids.length > 0) {
      args.student_ids.forEach(id => studentParams.append('user_ids[]', id.toString()));
    }

    const studentsResponse = await this.client.get(
      `/courses/${args.course_id}/users?${studentParams.toString()}`
    );
    gradebookData.students = studentsResponse.data;

    // Get submissions for all students and assignments
    const submissionParams = new URLSearchParams();
    submissionParams.append('include[]', 'assignment');
    submissionParams.append('include[]', 'user');

    if (args.student_ids && args.student_ids.length > 0) {
      args.student_ids.forEach(id => submissionParams.append('student_ids[]', id.toString()));
    }

    const submissionsResponse = await this.client.get(
      `/courses/${args.course_id}/students/submissions?${submissionParams.toString()}`
    );
    gradebookData.submissions = submissionsResponse.data;

    // Get custom gradebook columns if requested
    if (args.include_custom_columns) {
      try {
        const columnsResponse = await this.client.get(`/courses/${args.course_id}/custom_gradebook_columns`);
        gradebookData.custom_columns = columnsResponse.data;
      } catch (error) {
        gradebookData.custom_columns = [];
      }
    }

    return gradebookData;
  }

  /**
   * Get module completion progress for students in a course
   */
  async getModuleProgress(args: GetModuleProgressArgs): Promise<ModuleProgressSummary[]> {
    const progressSummaries: ModuleProgressSummary[] = [];

    // Get modules
    const modulesParams = new URLSearchParams();
    modulesParams.append('include[]', 'items');

    let modulesEndpoint = `/courses/${args.course_id}/modules`;
    if (args.module_id) {
      modulesEndpoint = `/courses/${args.course_id}/modules/${args.module_id}`;
    }

    const modulesResponse = await this.client.get(`${modulesEndpoint}?${modulesParams.toString()}`);
    const modules = Array.isArray(modulesResponse.data) ? modulesResponse.data : [modulesResponse.data];

    for (const module of modules) {
      const progressSummary: ModuleProgressSummary = {
        module: module,
        student_progress: []
      };

      // Get students
      let students: any[] = [];
      if (args.student_id) {
        const studentResponse = await this.client.get(`/courses/${args.course_id}/users/${args.student_id}`);
        students = [studentResponse.data];
      } else {
        const studentsResponse = await this.client.get(
          `/courses/${args.course_id}/users?enrollment_type[]=student`
        );
        students = studentsResponse.data;
      }

      // Get progress for each student
      for (const student of students) {
        try {
          const progressResponse = await this.client.get(
            `/courses/${args.course_id}/modules/${module.id}/items?student_id=${student.id}&include[]=content_details`
          );

          const items = progressResponse.data;
          const completedItems = items.filter((item: any) =>
            item.completion_requirement?.completed
          ).length;

          progressSummary.student_progress.push({
            user: student,
            state: module.state,
            completed_at: module.completed_at,
            current_position: 0, // Would need additional calculation
            items_completed: completedItems,
            items_total: items.length
          });
        } catch (error) {
          console.error(`Error getting module progress for student ${student.id}:`, error);
        }
      }

      progressSummaries.push(progressSummary);
    }

    return progressSummaries;
  }

  /**
   * Search across course content
   */
  async searchCourseContent(args: SearchCourseContentArgs): Promise<CourseContentSearchResult[]> {
    const results: CourseContentSearchResult[] = [];
    const contentTypes = args.content_types || ['assignment', 'discussion_topic', 'wiki_page', 'quiz', 'file'];

    for (const contentType of contentTypes) {
      try {
        let endpoint = '';
        let searchParam = 'search_term';

        switch (contentType) {
          case 'assignment':
            endpoint = `/courses/${args.course_id}/assignments`;
            break;
          case 'discussion_topic':
            endpoint = `/courses/${args.course_id}/discussion_topics`;
            break;
          case 'wiki_page':
            endpoint = `/courses/${args.course_id}/pages`;
            break;
          case 'quiz':
            endpoint = `/courses/${args.course_id}/quizzes`;
            break;
          case 'file':
            endpoint = `/courses/${args.course_id}/files`;
            break;
        }

        const params = new URLSearchParams();
        params.append(searchParam, args.search_term);

        const response = await this.client.get(`${endpoint}?${params.toString()}`);

        const filteredResults = response.data
          .filter((item: any) => {
            const title = item.name || item.title || item.display_name || '';
            const body = args.include_body ? (item.description || item.message || item.body || '') : '';
            const searchText = (title + ' ' + body).toLowerCase();
            return searchText.includes(args.search_term.toLowerCase());
          })
          .map((item: any) => ({
            id: item.id,
            title: item.name || item.title || item.display_name,
            content_type: contentType,
            course_id: args.course_id,
            html_url: item.html_url,
            body_excerpt: args.include_body ?
              (item.description || item.message || item.body || '').substring(0, 200) + '...' :
              undefined,
            created_at: item.created_at,
            updated_at: item.updated_at
          }));

        results.push(...filteredResults);
      } catch (error) {
        console.error(`Error searching ${contentType}:`, error);
      }
    }

    return results;
  }

  /**
   * Get detailed enrollment information for users
   */
  async getUserEnrollments(args: GetUserEnrollmentsArgs = {}): Promise<CanvasEnrollment[]> {
    const params = new URLSearchParams();

    if (args.enrollment_type) {
      params.append('type[]', args.enrollment_type);
    }

    if (args.enrollment_state) {
      params.append('state[]', args.enrollment_state);
    }

    if (args.include_grades) {
      params.append('include[]', 'grades');
    }

    let endpoint = '';
    if (args.user_id && args.course_id) {
      endpoint = `/courses/${args.course_id}/enrollments?user_id=${args.user_id}`;
    } else if (args.course_id) {
      endpoint = `/courses/${args.course_id}/enrollments`;
    } else if (args.user_id) {
      endpoint = `/users/${args.user_id}/enrollments`;
    } else {
      endpoint = '/users/self/enrollments';
    }

    const response = await this.client.get(`${endpoint}?${params.toString()}`);
    return response.data;
  }
}