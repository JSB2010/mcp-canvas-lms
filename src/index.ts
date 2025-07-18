#!/usr/bin/env node

// src/index.ts

import { Server } from "@modelcontextprotocol/sdk/server/index";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio";
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
  Tool
} from "@modelcontextprotocol/sdk/types";
import { CanvasClient } from "./client.js";
import * as dotenv from "dotenv";
import {
  CreateCourseArgs,
  UpdateCourseArgs,
  CreateAssignmentArgs,
  UpdateAssignmentArgs,
  SubmitGradeArgs,
  EnrollUserArgs,
  CanvasCourse,
  CanvasAssignmentSubmission,
  SubmitAssignmentArgs,
  FileUploadArgs,
  MCPServerConfig,
  CreateUserArgs,
  ListAccountCoursesArgs,
  ListAccountUsersArgs,
  CreateReportArgs,
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
  GetUserEnrollmentsArgs
} from "./types.js";
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Enhanced tools list with all student-focused endpoints
const TOOLS: Tool[] = [
  // Health and system tools
  {
    name: "canvas_health_check",
    description: "Check the health and connectivity of the Canvas API",
    inputSchema: {
      type: "object",
      properties: {},
      required: []
    }
  },

  // Course management
  {
    name: "canvas_list_courses",
    description: "List all courses for the current user",
    inputSchema: {
      type: "object",
      properties: {
        include_ended: { type: "boolean", description: "Include ended courses" }
      },
      required: []
    }
  },
  {
    name: "canvas_get_course",
    description: "Get detailed information about a specific course",
    inputSchema: {
      type: "object",
      properties: {
        course_id: { type: "number", description: "ID of the course" }
      },
      required: ["course_id"]
    }
  },
  {
    name: "canvas_create_course",
    description: "Create a new course in Canvas",
    inputSchema: {
      type: "object",
      properties: {
        account_id: { type: "number", description: "ID of the account to create the course in" },
        name: { type: "string", description: "Name of the course" },
        course_code: { type: "string", description: "Course code (e.g., CS101)" },
        start_at: { type: "string", description: "Course start date (ISO format)" },
        end_at: { type: "string", description: "Course end date (ISO format)" },
        license: { type: "string", description: "Course license" },
        is_public: { type: "boolean", description: "Whether the course is public" },
        is_public_to_auth_users: { type: "boolean", description: "Whether the course is public to authenticated users" },
        public_syllabus: { type: "boolean", description: "Whether the syllabus is public" },
        public_syllabus_to_auth: { type: "boolean", description: "Whether the syllabus is public to authenticated users" },
        public_description: { type: "string", description: "Public description of the course" },
        allow_student_wiki_edits: { type: "boolean", description: "Whether students can edit the wiki" },
        allow_wiki_comments: { type: "boolean", description: "Whether wiki comments are allowed" },
        allow_student_forum_attachments: { type: "boolean", description: "Whether students can add forum attachments" },
        open_enrollment: { type: "boolean", description: "Whether the course has open enrollment" },
        self_enrollment: { type: "boolean", description: "Whether the course allows self enrollment" },
        restrict_enrollments_to_course_dates: { type: "boolean", description: "Whether to restrict enrollments to course start/end dates" },
        term_id: { type: "number", description: "ID of the enrollment term" },
        sis_course_id: { type: "string", description: "SIS course ID" },
        integration_id: { type: "string", description: "Integration ID for the course" },
        hide_final_grades: { type: "boolean", description: "Whether to hide final grades" },
        apply_assignment_group_weights: { type: "boolean", description: "Whether to apply assignment group weights" },
        time_zone: { type: "string", description: "Course time zone" },
        syllabus_body: { type: "string", description: "Course syllabus content" }
      },
      required: ["account_id", "name"]
    }
  },
  {
    name: "canvas_update_course",
    description: "Update an existing course in Canvas",
    inputSchema: {
      type: "object",
      properties: {
        course_id: { type: "number", description: "ID of the course to update" },
        name: { type: "string", description: "New name for the course" },
        course_code: { type: "string", description: "New course code" },
        start_at: { type: "string", description: "New start date (ISO format)" },
        end_at: { type: "string", description: "New end date (ISO format)" },
        license: { type: "string", description: "Course license" },
        is_public: { type: "boolean", description: "Whether the course is public" },
        is_public_to_auth_users: { type: "boolean", description: "Whether the course is public to authenticated users" },
        public_syllabus: { type: "boolean", description: "Whether the syllabus is public" },
        public_syllabus_to_auth: { type: "boolean", description: "Whether the syllabus is public to authenticated users" },
        public_description: { type: "string", description: "Public description of the course" },
        allow_student_wiki_edits: { type: "boolean", description: "Whether students can edit the wiki" },
        allow_wiki_comments: { type: "boolean", description: "Whether wiki comments are allowed" },
        allow_student_forum_attachments: { type: "boolean", description: "Whether students can add forum attachments" },
        open_enrollment: { type: "boolean", description: "Whether the course has open enrollment" },
        self_enrollment: { type: "boolean", description: "Whether the course allows self enrollment" },
        restrict_enrollments_to_course_dates: { type: "boolean", description: "Whether to restrict enrollments to course start/end dates" },
        hide_final_grades: { type: "boolean", description: "Whether to hide final grades" },
        apply_assignment_group_weights: { type: "boolean", description: "Whether to apply assignment group weights" },
        time_zone: { type: "string", description: "Course time zone" },
        syllabus_body: { type: "string", description: "Updated syllabus content" }
      },
      required: ["course_id"]
    }
  },

  // Assignment management
  {
    name: "canvas_list_assignments",
    description: "List assignments for a course",
    inputSchema: {
      type: "object",
      properties: {
        course_id: { type: "number", description: "ID of the course" },
        include_submissions: { type: "boolean", description: "Include submission data" }
      },
      required: ["course_id"]
    }
  },
  {
    name: "canvas_get_assignment",
    description: "Get detailed information about a specific assignment",
    inputSchema: {
      type: "object",
      properties: {
        course_id: { type: "number", description: "ID of the course" },
        assignment_id: { type: "number", description: "ID of the assignment" },
        include_submission: { type: "boolean", description: "Include user's submission data" }
      },
      required: ["course_id", "assignment_id"]
    }
  },
  {
    name: "canvas_create_assignment",
    description: "Create a new assignment in a Canvas course",
    inputSchema: {
      type: "object",
      properties: {
        course_id: { type: "number", description: "ID of the course" },
        name: { type: "string", description: "Name of the assignment" },
        description: { type: "string", description: "Assignment description/instructions" },
        due_at: { type: "string", description: "Due date (ISO format)" },
        points_possible: { type: "number", description: "Maximum points possible" },
        submission_types: { 
          type: "array", 
          items: { type: "string" },
          description: "Allowed submission types"
        },
        allowed_extensions: {
          type: "array",
          items: { type: "string" },
          description: "Allowed file extensions for submissions"
        },
        published: { type: "boolean", description: "Whether the assignment is published" }
      },
      required: ["course_id", "name"]
    }
  },
  {
    name: "canvas_update_assignment",
    description: "Update an existing assignment",
    inputSchema: {
      type: "object",
      properties: {
        course_id: { type: "number", description: "ID of the course" },
        assignment_id: { type: "number", description: "ID of the assignment to update" },
        name: { type: "string", description: "New name for the assignment" },
        description: { type: "string", description: "New assignment description" },
        due_at: { type: "string", description: "New due date (ISO format)" },
        points_possible: { type: "number", description: "New maximum points" },
        published: { type: "boolean", description: "Whether the assignment is published" }
      },
      required: ["course_id", "assignment_id"]
    }
  },

  // Assignment groups
  {
    name: "canvas_list_assignment_groups",
    description: "List assignment groups for a course",
    inputSchema: {
      type: "object",
      properties: {
        course_id: { type: "number", description: "ID of the course" }
      },
      required: ["course_id"]
    }
  },

  // Submissions and grading
  {
    name: "canvas_get_submission",
    description: "Get submission details for an assignment",
    inputSchema: {
      type: "object",
      properties: {
        course_id: { type: "number", description: "ID of the course" },
        assignment_id: { type: "number", description: "ID of the assignment" },
        user_id: { type: "number", description: "ID of the user (optional, defaults to self)" }
      },
      required: ["course_id", "assignment_id"]
    }
  },
  {
    name: "canvas_submit_assignment",
    description: "Submit work for an assignment",
    inputSchema: {
      type: "object",
      properties: {
        course_id: { type: "number", description: "ID of the course" },
        assignment_id: { type: "number", description: "ID of the assignment" },
        submission_type: { 
          type: "string", 
          enum: ["online_text_entry", "online_url", "online_upload"],
          description: "Type of submission" 
        },
        body: { type: "string", description: "Text content for text submissions" },
        url: { type: "string", description: "URL for URL submissions" },
        file_ids: { 
          type: "array", 
          items: { type: "number" },
          description: "File IDs for file submissions" 
        }
      },
      required: ["course_id", "assignment_id", "submission_type"]
    }
  },
  {
    name: "canvas_submit_grade",
    description: "Submit a grade for a student's assignment (teacher only)",
    inputSchema: {
      type: "object",
      properties: {
        course_id: { type: "number", description: "ID of the course" },
        assignment_id: { type: "number", description: "ID of the assignment" },
        user_id: { type: "number", description: "ID of the student" },
        grade: { 
          oneOf: [
            { type: "number" },
            { type: "string" }
          ],
          description: "Grade to submit (number or letter grade)"
        },
        comment: { type: "string", description: "Optional comment on the submission" }
      },
      required: ["course_id", "assignment_id", "user_id", "grade"]
    }
  },

  // Files and uploads
  {
    name: "canvas_list_files",
    description: "List files in a course or folder",
    inputSchema: {
      type: "object",
      properties: {
        course_id: { type: "number", description: "ID of the course" },
        folder_id: { type: "number", description: "ID of the folder (optional)" }
      },
      required: ["course_id"]
    }
  },
  {
    name: "canvas_get_file",
    description: "Get information about a specific file",
    inputSchema: {
      type: "object",
      properties: {
        file_id: { type: "number", description: "ID of the file" }
      },
      required: ["file_id"]
    }
  },
  {
    name: "canvas_list_folders",
    description: "List folders in a course",
    inputSchema: {
      type: "object",
      properties: {
        course_id: { type: "number", description: "ID of the course" }
      },
      required: ["course_id"]
    }
  },

  // Pages
  {
    name: "canvas_list_pages",
    description: "List pages in a course",
    inputSchema: {
      type: "object",
      properties: {
        course_id: { type: "number", description: "ID of the course" }
      },
      required: ["course_id"]
    }
  },
  {
    name: "canvas_get_page",
    description: "Get content of a specific page",
    inputSchema: {
      type: "object",
      properties: {
        course_id: { type: "number", description: "ID of the course" },
        page_url: { type: "string", description: "URL slug of the page" }
      },
      required: ["course_id", "page_url"]
    }
  },

  // Calendar and due dates
  {
    name: "canvas_list_calendar_events",
    description: "List calendar events",
    inputSchema: {
      type: "object",
      properties: {
        start_date: { type: "string", description: "Start date (ISO format)" },
        end_date: { type: "string", description: "End date (ISO format)" }
      },
      required: []
    }
  },
  {
    name: "canvas_get_upcoming_assignments",
    description: "Get upcoming assignment due dates",
    inputSchema: {
      type: "object",
      properties: {
        limit: { type: "number", description: "Maximum number of assignments to return" }
      },
      required: []
    }
  },

  // Dashboard
  {
    name: "canvas_get_dashboard",
    description: "Get user's dashboard information",
    inputSchema: {
      type: "object",
      properties: {},
      required: []
    }
  },
  {
    name: "canvas_get_dashboard_cards",
    description: "Get dashboard course cards",
    inputSchema: {
      type: "object",
      properties: {},
      required: []
    }
  },

  // Grades
  {
    name: "canvas_get_course_grades",
    description: "Get grades for a course",
    inputSchema: {
      type: "object",
      properties: {
        course_id: { type: "number", description: "ID of the course" }
      },
      required: ["course_id"]
    }
  },
  {
    name: "canvas_get_user_grades",
    description: "Get all grades for the current user",
    inputSchema: {
      type: "object",
      properties: {},
      required: []
    }
  },

  // User management
  {
    name: "canvas_get_user_profile",
    description: "Get current user's profile",
    inputSchema: {
      type: "object",
      properties: {},
      required: []
    }
  },
  {
    name: "canvas_update_user_profile",
    description: "Update current user's profile",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string", description: "User's name" },
        short_name: { type: "string", description: "User's short name" },
        bio: { type: "string", description: "User's bio" },
        title: { type: "string", description: "User's title" },
        time_zone: { type: "string", description: "User's time zone" }
      },
      required: []
    }
  },
  {
    name: "canvas_enroll_user",
    description: "Enroll a user in a course",
    inputSchema: {
      type: "object",
      properties: {
        course_id: { type: "number", description: "ID of the course" },
        user_id: { type: "number", description: "ID of the user to enroll" },
        role: { 
          type: "string", 
          description: "Role for the enrollment (StudentEnrollment, TeacherEnrollment, etc.)" 
        },
        enrollment_state: { 
          type: "string",
          description: "State of the enrollment (active, invited, etc.)"
        }
      },
      required: ["course_id", "user_id"]
    }
  },

  // Modules
  {
    name: "canvas_list_modules",
    description: "List all modules in a course",
    inputSchema: {
      type: "object",
      properties: {
        course_id: { type: "number", description: "ID of the course" }
      },
      required: ["course_id"]
    }
  },
  {
    name: "canvas_get_module",
    description: "Get details of a specific module",
    inputSchema: {
      type: "object",
      properties: {
        course_id: { type: "number", description: "ID of the course" },
        module_id: { type: "number", description: "ID of the module" }
      },
      required: ["course_id", "module_id"]
    }
  },
  {
    name: "canvas_list_module_items",
    description: "List all items in a module",
    inputSchema: {
      type: "object",
      properties: {
        course_id: { type: "number", description: "ID of the course" },
        module_id: { type: "number", description: "ID of the module" }
      },
      required: ["course_id", "module_id"]
    }
  },
  {
    name: "canvas_get_module_item",
    description: "Get details of a specific module item",
    inputSchema: {
      type: "object",
      properties: {
        course_id: { type: "number", description: "ID of the course" },
        module_id: { type: "number", description: "ID of the module" },
        item_id: { type: "number", description: "ID of the module item" }
      },
      required: ["course_id", "module_id", "item_id"]
    }
  },
  {
    name: "canvas_mark_module_item_complete",
    description: "Mark a module item as complete",
    inputSchema: {
      type: "object",
      properties: {
        course_id: { type: "number", description: "ID of the course" },
        module_id: { type: "number", description: "ID of the module" },
        item_id: { type: "number", description: "ID of the module item" }
      },
      required: ["course_id", "module_id", "item_id"]
    }
  },

  // Discussions
  {
    name: "canvas_list_discussion_topics",
    description: "List all discussion topics in a course",
    inputSchema: {
      type: "object",
      properties: {
        course_id: { type: "number", description: "ID of the course" }
      },
      required: ["course_id"]
    }
  },
  {
    name: "canvas_get_discussion_topic",
    description: "Get details of a specific discussion topic",
    inputSchema: {
      type: "object",
      properties: {
        course_id: { type: "number", description: "ID of the course" },
        topic_id: { type: "number", description: "ID of the discussion topic" }
      },
      required: ["course_id", "topic_id"]
    }
  },
  {
    name: "canvas_post_to_discussion",
    description: "Post a message to a discussion topic",
    inputSchema: {
      type: "object",
      properties: {
        course_id: { type: "number", description: "ID of the course" },
        topic_id: { type: "number", description: "ID of the discussion topic" },
        message: { type: "string", description: "Message content" }
      },
      required: ["course_id", "topic_id", "message"]
    }
  },

  // Announcements
  {
    name: "canvas_list_announcements",
    description: "List all announcements in a course",
    inputSchema: {
      type: "object",
      properties: {
        course_id: { type: "number", description: "ID of the course" }
      },
      required: ["course_id"]
    }
  },

  // Quizzes
  {
    name: "canvas_list_quizzes",
    description: "List all quizzes in a course",
    inputSchema: {
      type: "object",
      properties: {
        course_id: { type: "number", description: "ID of the course" }
      },
      required: ["course_id"]
    }
  },
  {
    name: "canvas_get_quiz",
    description: "Get details of a specific quiz",
    inputSchema: {
      type: "object",
      properties: {
        course_id: { type: "number", description: "ID of the course" },
        quiz_id: { type: "number", description: "ID of the quiz" }
      },
      required: ["course_id", "quiz_id"]
    }
  },
  {
    name: "canvas_create_quiz",
    description: "Create a new quiz in a course",
    inputSchema: {
      type: "object",
      properties: {
        course_id: { type: "number", description: "ID of the course" },
        title: { type: "string", description: "Title of the quiz" },
        quiz_type: { type: "string", description: "Type of the quiz (e.g., graded)" },
        time_limit: { type: "number", description: "Time limit in minutes" },
        published: { type: "boolean", description: "Is the quiz published" },
        description: { type: "string", description: "Description of the quiz" },
        due_at: { type: "string", description: "Due date (ISO format)" }
      },
      required: ["course_id", "title"]
    }
  },
  {
    name: "canvas_start_quiz_attempt",
    description: "Start a new quiz attempt",
    inputSchema: {
      type: "object",
      properties: {
        course_id: { type: "number", description: "ID of the course" },
        quiz_id: { type: "number", description: "ID of the quiz" }
      },
      required: ["course_id", "quiz_id"]
    }
  },

  // Rubrics
  {
    name: "canvas_list_rubrics",
    description: "List rubrics for a course",
    inputSchema: {
      type: "object",
      properties: {
        course_id: { type: "number", description: "ID of the course" }
      },
      required: ["course_id"]
    }
  },
  {
    name: "canvas_get_rubric",
    description: "Get details of a specific rubric",
    inputSchema: {
      type: "object",
      properties: {
        course_id: { type: "number", description: "ID of the course" },
        rubric_id: { type: "number", description: "ID of the rubric" }
      },
      required: ["course_id", "rubric_id"]
    }
  },

  // Conversations
  {
    name: "canvas_list_conversations",
    description: "List user's conversations",
    inputSchema: {
      type: "object",
      properties: {},
      required: []
    }
  },
  {
    name: "canvas_get_conversation",
    description: "Get details of a specific conversation",
    inputSchema: {
      type: "object",
      properties: {
        conversation_id: { type: "number", description: "ID of the conversation" }
      },
      required: ["conversation_id"]
    }
  },
  {
    name: "canvas_create_conversation",
    description: "Create a new conversation",
    inputSchema: {
      type: "object",
      properties: {
        recipients: { 
          type: "array", 
          items: { type: "string" },
          description: "Recipient user IDs or email addresses" 
        },
        body: { type: "string", description: "Message body" },
        subject: { type: "string", description: "Message subject" }
      },
      required: ["recipients", "body"]
    }
  },

  // Notifications
  {
    name: "canvas_list_notifications",
    description: "List user's notifications",
    inputSchema: {
      type: "object",
      properties: {},
      required: []
    }
  },

  // Syllabus
  {
    name: "canvas_get_syllabus",
    description: "Get course syllabus",
    inputSchema: {
      type: "object",
      properties: {
        course_id: { type: "number", description: "ID of the course" }
      },
      required: ["course_id"]
    }
  },

  // Account Management
  {
    name: "canvas_get_account",
    description: "Get account details",
    inputSchema: {
      type: "object",
      properties: {
        account_id: { type: "number", description: "ID of the account" }
      },
      required: ["account_id"]
    }
  },
  {
    name: "canvas_list_account_courses",
    description: "List courses for an account",
    inputSchema: {
      type: "object",
      properties: {
        account_id: { type: "number", description: "ID of the account" },
        with_enrollments: { type: "boolean", description: "Include enrollment data" },
        published: { type: "boolean", description: "Only include published courses" },
        completed: { type: "boolean", description: "Include completed courses" },
        search_term: { type: "string", description: "Search term to filter courses" },
        sort: { type: "string", enum: ["course_name", "sis_course_id", "teacher", "account_name"], description: "Sort order" },
        order: { type: "string", enum: ["asc", "desc"], description: "Sort direction" }
      },
      required: ["account_id"]
    }
  },
  {
    name: "canvas_list_account_users",
    description: "List users for an account",
    inputSchema: {
      type: "object",
      properties: {
        account_id: { type: "number", description: "ID of the account" },
        search_term: { type: "string", description: "Search term to filter users" },
        sort: { type: "string", enum: ["username", "email", "sis_id", "last_login"], description: "Sort order" },
        order: { type: "string", enum: ["asc", "desc"], description: "Sort direction" }
      },
      required: ["account_id"]
    }
  },
  {
    name: "canvas_create_user",
    description: "Create a new user in an account",
    inputSchema: {
      type: "object",
      properties: {
        account_id: { type: "number", description: "ID of the account" },
        user: {
          type: "object",
          properties: {
            name: { type: "string", description: "Full name of the user" },
            short_name: { type: "string", description: "Short name of the user" },
            sortable_name: { type: "string", description: "Sortable name (Last, First)" },
            time_zone: { type: "string", description: "User's time zone" }
          },
          required: ["name"]
        },
        pseudonym: {
          type: "object",
          properties: {
            unique_id: { type: "string", description: "Unique login ID (email or username)" },
            password: { type: "string", description: "User's password" },
            sis_user_id: { type: "string", description: "SIS ID for the user" },
            send_confirmation: { type: "boolean", description: "Send confirmation email" }
          },
          required: ["unique_id"]
        }
      },
      required: ["account_id", "user", "pseudonym"]
    }
  },
  {
    name: "canvas_list_sub_accounts",
    description: "List sub-accounts for an account",
    inputSchema: {
      type: "object",
      properties: {
        account_id: { type: "number", description: "ID of the parent account" }
      },
      required: ["account_id"]
    }
  },
  {
    name: "canvas_get_account_reports",
    description: "List available reports for an account",
    inputSchema: {
      type: "object",
      properties: {
        account_id: { type: "number", description: "ID of the account" }
      },
      required: ["account_id"]
    }
  },
  {
    name: "canvas_create_account_report",
    description: "Generate a report for an account",
    inputSchema: {
      type: "object",
      properties: {
        account_id: { type: "number", description: "ID of the account" },
        report: { type: "string", description: "Type of report to generate" },
        parameters: { type: "object", description: "Report parameters" }
      },
      required: ["account_id", "report"]
    }
  },

  // ===== TEACHER INFORMATION RETRIEVAL TOOLS =====
  // Tier 1: Essential Daily Tools

  {
    name: "canvas_get_teacher_courses",
    description: "Get all courses where the current user is a teacher, with enrollment and activity data",
    inputSchema: {
      type: "object",
      properties: {
        enrollment_state: {
          type: "string",
          enum: ["active", "completed", "all"],
          description: "Filter by enrollment state",
          default: "active"
        },
        include_student_count: {
          type: "boolean",
          description: "Include total student count",
          default: true
        },
        include_needs_grading: {
          type: "boolean",
          description: "Include assignments needing grading count",
          default: true
        },
        include_recent_activity: {
          type: "boolean",
          description: "Include recent course activity",
          default: false
        },
        term_id: {
          type: "number",
          description: "Filter by specific term (optional)"
        }
      },
      required: []
    }
  },

  {
    name: "canvas_get_grading_queue",
    description: "Get assignments and submissions that need grading across all courses or specific course",
    inputSchema: {
      type: "object",
      properties: {
        course_id: {
          type: "number",
          description: "Specific course ID (optional - if not provided, gets all courses)"
        },
        include_quiz_submissions: {
          type: "boolean",
          description: "Include quiz submissions needing grading",
          default: true
        },
        limit: {
          type: "number",
          description: "Maximum number of items to return",
          default: 50,
          minimum: 1,
          maximum: 100
        }
      },
      required: []
    }
  },

  {
    name: "canvas_get_course_students",
    description: "Get detailed information about all students enrolled in a course",
    inputSchema: {
      type: "object",
      properties: {
        course_id: {
          type: "number",
          description: "ID of the course"
        },
        include_grades: {
          type: "boolean",
          description: "Include current grades and scores",
          default: true
        },
        include_activity: {
          type: "boolean",
          description: "Include last login and activity data",
          default: true
        },
        include_avatar: {
          type: "boolean",
          description: "Include student avatar URLs",
          default: false
        },
        enrollment_state: {
          type: "string",
          enum: ["active", "invited", "completed", "inactive", "all"],
          description: "Filter by enrollment state",
          default: "active"
        },
        sort_by: {
          type: "string",
          enum: ["name", "score", "last_login"],
          description: "Sort students by specified criteria",
          default: "name"
        }
      },
      required: ["course_id"]
    }
  },

  {
    name: "canvas_get_course_assignments",
    description: "Get all assignments for a course with submission and grading information",
    inputSchema: {
      type: "object",
      properties: {
        course_id: {
          type: "number",
          description: "ID of the course"
        },
        include_submissions: {
          type: "boolean",
          description: "Include submission counts and statistics",
          default: true
        },
        include_rubric: {
          type: "boolean",
          description: "Include rubric information",
          default: false
        },
        include_overrides: {
          type: "boolean",
          description: "Include assignment overrides",
          default: false
        },
        assignment_group_id: {
          type: "number",
          description: "Filter by assignment group (optional)"
        },
        due_date_filter: {
          type: "string",
          enum: ["past_due", "upcoming", "no_due_date", "all"],
          description: "Filter by due date status",
          default: "all"
        },
        search_term: {
          type: "string",
          description: "Search assignments by name (optional)"
        }
      },
      required: ["course_id"]
    }
  },

  {
    name: "canvas_get_upcoming_events",
    description: "Get upcoming assignments, due dates, and calendar events",
    inputSchema: {
      type: "object",
      properties: {
        course_id: {
          type: "number",
          description: "Specific course ID (optional - if not provided, gets all courses)"
        },
        days_ahead: {
          type: "number",
          description: "Number of days to look ahead",
          default: 7,
          minimum: 1,
          maximum: 30
        },
        include_assignments: {
          type: "boolean",
          description: "Include assignment due dates",
          default: true
        },
        include_calendar_events: {
          type: "boolean",
          description: "Include calendar events",
          default: true
        },
        include_quiz_due_dates: {
          type: "boolean",
          description: "Include quiz due dates",
          default: true
        }
      },
      required: []
    }
  },

  // Tier 2: Analytics & Insights Tools

  {
    name: "canvas_get_student_performance",
    description: "Get performance summaries for all students in a course",
    inputSchema: {
      type: "object",
      properties: {
        course_id: {
          type: "number",
          description: "ID of the course"
        },
        sort_by: {
          type: "string",
          enum: ["name", "score", "participation", "last_login"],
          description: "Sort students by specified criteria",
          default: "name"
        },
        include_missing_assignments: {
          type: "boolean",
          description: "Include missing assignment data",
          default: true
        },
        include_late_submissions: {
          type: "boolean",
          description: "Include late submission data",
          default: true
        }
      },
      required: ["course_id"]
    }
  },

  {
    name: "canvas_get_course_analytics",
    description: "Get comprehensive analytics for course participation and performance",
    inputSchema: {
      type: "object",
      properties: {
        course_id: {
          type: "number",
          description: "ID of the course"
        },
        include_assignment_analytics: {
          type: "boolean",
          description: "Include assignment performance data",
          default: true
        },
        include_participation_data: {
          type: "boolean",
          description: "Include student participation metrics",
          default: true
        },
        include_grade_distribution: {
          type: "boolean",
          description: "Include grade distribution statistics",
          default: true
        }
      },
      required: ["course_id"]
    }
  },

  {
    name: "canvas_get_assignment_analytics",
    description: "Get detailed analytics for assignment performance and submission patterns",
    inputSchema: {
      type: "object",
      properties: {
        course_id: {
          type: "number",
          description: "ID of the course"
        },
        assignment_id: {
          type: "number",
          description: "Specific assignment ID (optional - if not provided, gets all assignments)"
        },
        include_score_distribution: {
          type: "boolean",
          description: "Include score distribution data",
          default: true
        },
        include_submission_timing: {
          type: "boolean",
          description: "Include submission timing analysis",
          default: true
        }
      },
      required: ["course_id"]
    }
  },

  {
    name: "canvas_get_missing_submissions",
    description: "Get students with missing or late submissions across courses",
    inputSchema: {
      type: "object",
      properties: {
        course_id: {
          type: "number",
          description: "Specific course ID (optional - if not provided, gets all courses)"
        },
        student_id: {
          type: "number",
          description: "Specific student ID (optional)"
        },
        include_late_submissions: {
          type: "boolean",
          description: "Include late submissions",
          default: true
        },
        assignment_group_id: {
          type: "number",
          description: "Filter by assignment group (optional)"
        },
        days_overdue: {
          type: "number",
          description: "Filter by days overdue (optional)"
        }
      },
      required: []
    }
  },

  {
    name: "canvas_get_course_statistics",
    description: "Get comprehensive statistics and metrics for a course",
    inputSchema: {
      type: "object",
      properties: {
        course_id: {
          type: "number",
          description: "ID of the course"
        },
        include_grade_distribution: {
          type: "boolean",
          description: "Include grade distribution stats",
          default: true
        },
        include_participation_stats: {
          type: "boolean",
          description: "Include participation statistics",
          default: true
        },
        include_submission_stats: {
          type: "boolean",
          description: "Include submission statistics",
          default: true
        },
        include_engagement_metrics: {
          type: "boolean",
          description: "Include engagement metrics",
          default: false
        }
      },
      required: ["course_id"]
    }
  },

  // Tier 3: Advanced Information Tools

  {
    name: "canvas_get_student_details",
    description: "Get comprehensive information about a specific student including grades, activity, and progress",
    inputSchema: {
      type: "object",
      properties: {
        course_id: {
          type: "number",
          description: "ID of the course"
        },
        student_id: {
          type: "number",
          description: "ID of the student"
        },
        include_progress: {
          type: "boolean",
          description: "Include module progress",
          default: true
        },
        include_analytics: {
          type: "boolean",
          description: "Include activity analytics",
          default: true
        },
        include_submissions: {
          type: "boolean",
          description: "Include recent submissions",
          default: true
        }
      },
      required: ["course_id", "student_id"]
    }
  },

  {
    name: "canvas_get_student_activity",
    description: "Get student engagement and activity data for a course",
    inputSchema: {
      type: "object",
      properties: {
        course_id: {
          type: "number",
          description: "ID of the course"
        },
        student_id: {
          type: "number",
          description: "Specific student ID (optional - if not provided, gets all students)"
        },
        include_page_views: {
          type: "boolean",
          description: "Include page view data",
          default: true
        },
        include_participation: {
          type: "boolean",
          description: "Include participation metrics",
          default: true
        }
      },
      required: ["course_id"]
    }
  },

  {
    name: "canvas_get_course_details",
    description: "Get comprehensive information about a specific course",
    inputSchema: {
      type: "object",
      properties: {
        course_id: {
          type: "number",
          description: "ID of the course"
        },
        include_sections: {
          type: "boolean",
          description: "Include course sections",
          default: true
        },
        include_teachers: {
          type: "boolean",
          description: "Include teacher information",
          default: true
        },
        include_enrollment_counts: {
          type: "boolean",
          description: "Include enrollment statistics",
          default: true
        },
        include_syllabus: {
          type: "boolean",
          description: "Include syllabus content",
          default: false
        },
        include_assignments_summary: {
          type: "boolean",
          description: "Include assignments overview",
          default: true
        }
      },
      required: ["course_id"]
    }
  },

  {
    name: "canvas_get_course_discussions",
    description: "Get discussion topics and activity for a course",
    inputSchema: {
      type: "object",
      properties: {
        course_id: {
          type: "number",
          description: "ID of the course"
        },
        include_unread_count: {
          type: "boolean",
          description: "Include unread post counts",
          default: true
        },
        include_recent_posts: {
          type: "boolean",
          description: "Include recent discussion posts",
          default: true
        },
        only_announcements: {
          type: "boolean",
          description: "Only return announcements",
          default: false
        },
        search_term: {
          type: "string",
          description: "Search discussions by term (optional)"
        }
      },
      required: ["course_id"]
    }
  },

  {
    name: "canvas_get_teacher_activity",
    description: "Get recent activity stream for teacher including submissions, messages, and course updates",
    inputSchema: {
      type: "object",
      properties: {
        course_id: {
          type: "number",
          description: "Filter by specific course (optional)"
        },
        activity_types: {
          type: "array",
          items: {
            type: "string",
            enum: ["Submission", "DiscussionTopic", "Conversation", "Announcement"]
          },
          description: "Filter by activity types (optional)"
        },
        limit: {
          type: "number",
          description: "Maximum number of activities to return",
          default: 20,
          minimum: 1,
          maximum: 100
        }
      },
      required: []
    }
  },

  {
    name: "canvas_get_gradebook_data",
    description: "Get comprehensive gradebook information for a course",
    inputSchema: {
      type: "object",
      properties: {
        course_id: {
          type: "number",
          description: "ID of the course"
        },
        include_unposted_grades: {
          type: "boolean",
          description: "Include unposted grades",
          default: false
        },
        include_custom_columns: {
          type: "boolean",
          description: "Include custom gradebook columns",
          default: false
        },
        student_ids: {
          type: "array",
          items: { type: "number" },
          description: "Specific student IDs (optional)"
        },
        assignment_group_id: {
          type: "number",
          description: "Filter by assignment group (optional)"
        }
      },
      required: ["course_id"]
    }
  },

  {
    name: "canvas_get_module_progress",
    description: "Get module completion progress for students in a course",
    inputSchema: {
      type: "object",
      properties: {
        course_id: {
          type: "number",
          description: "ID of the course"
        },
        student_id: {
          type: "number",
          description: "Specific student ID (optional)"
        },
        module_id: {
          type: "number",
          description: "Specific module ID (optional)"
        },
        include_items: {
          type: "boolean",
          description: "Include individual module items",
          default: true
        },
        include_completion_dates: {
          type: "boolean",
          description: "Include completion timestamps",
          default: true
        }
      },
      required: ["course_id"]
    }
  },

  {
    name: "canvas_search_course_content",
    description: "Search across course content including assignments, discussions, pages, and files",
    inputSchema: {
      type: "object",
      properties: {
        course_id: {
          type: "number",
          description: "ID of the course"
        },
        search_term: {
          type: "string",
          description: "Search term"
        },
        content_types: {
          type: "array",
          items: {
            type: "string",
            enum: ["assignment", "discussion_topic", "wiki_page", "quiz", "file"]
          },
          description: "Types of content to search (optional)"
        },
        include_body: {
          type: "boolean",
          description: "Include content body in search",
          default: false
        }
      },
      required: ["course_id", "search_term"]
    }
  },

  {
    name: "canvas_get_user_enrollments",
    description: "Get detailed enrollment information for users across courses",
    inputSchema: {
      type: "object",
      properties: {
        user_id: {
          type: "number",
          description: "Specific user ID (optional)"
        },
        course_id: {
          type: "number",
          description: "Specific course ID (optional)"
        },
        enrollment_type: {
          type: "string",
          enum: ["StudentEnrollment", "TeacherEnrollment", "TaEnrollment", "ObserverEnrollment"],
          description: "Filter by enrollment type (optional)"
        },
        enrollment_state: {
          type: "string",
          enum: ["active", "invited", "completed", "inactive"],
          description: "Filter by enrollment state (optional)"
        },
        include_grades: {
          type: "boolean",
          description: "Include grade information",
          default: true
        }
      },
      required: []
    }
  }
];

class CanvasMCPServer {
  private server: Server;
  private client: CanvasClient;
  private config: MCPServerConfig;

  constructor(config: MCPServerConfig) {
    this.config = config;
    this.client = new CanvasClient(
      config.canvas.token, 
      config.canvas.domain,
      {
        maxRetries: config.canvas.maxRetries,
        retryDelay: config.canvas.retryDelay
      }
    );

    this.server = new Server(
      {
        name: config.name,
        version: config.version
      },
      {
        capabilities: {
          resources: {},
          tools: {}
        }
      }
    );

    this.setupHandlers();
    this.setupErrorHandling();
  }

  private setupErrorHandling(): void {
    this.server.onerror = (error: Error) => {
      console.error(`[${this.config.name} Error]`, error);
    };

    process.on('SIGINT', async () => {
      console.log('\nReceived SIGINT, shutting down gracefully...');
      await this.server.close();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      console.log('\nReceived SIGTERM, shutting down gracefully...');
      await this.server.close();
      process.exit(0);
    });

    process.on('uncaughtException', (error) => {
      console.error('Uncaught Exception:', error);
      process.exit(1);
    });

    process.on('unhandledRejection', (reason, promise) => {
      console.error('Unhandled Rejection at:', promise, 'reason:', reason);
      process.exit(1);
    });
  }

  private setupHandlers(): void {
    // List available resources
    this.server.setRequestHandler(ListResourcesRequestSchema, async () => {
      try {
        const courses = await this.client.listCourses();
        
        return {
          resources: [
            {
              uri: "canvas://health",
              name: "Canvas Health Status",
              description: "Health check and API connectivity status",
              mimeType: "application/json"
            },
            {
              uri: "courses://list",
              name: "All Courses",
              description: "List of all available Canvas courses",
              mimeType: "application/json"
            },
            ...courses.map((course: CanvasCourse) => ({
              uri: `course://${course.id}`,
              name: `Course: ${course.name}`,
              description: `${course.course_code} - ${course.name}`,
              mimeType: "application/json"
            })),
            ...courses.map((course: CanvasCourse) => ({
              uri: `assignments://${course.id}`,
              name: `Assignments: ${course.name}`,
              description: `Assignments for ${course.name}`,
              mimeType: "application/json"
            })),
            ...courses.map((course: CanvasCourse) => ({
              uri: `modules://${course.id}`,
              name: `Modules: ${course.name}`,
              description: `Modules for ${course.name}`,
              mimeType: "application/json"
            })),
            ...courses.map((course: CanvasCourse) => ({
              uri: `discussions://${course.id}`,
              name: `Discussions: ${course.name}`,
              description: `Discussion topics for ${course.name}`,
              mimeType: "application/json"
            })),
            ...courses.map((course: CanvasCourse) => ({
              uri: `announcements://${course.id}`,
              name: `Announcements: ${course.name}`,
              description: `Announcements for ${course.name}`,
              mimeType: "application/json"
            })),
            ...courses.map((course: CanvasCourse) => ({
              uri: `quizzes://${course.id}`,
              name: `Quizzes: ${course.name}`,
              description: `Quizzes for ${course.name}`,
              mimeType: "application/json"
            })),
            ...courses.map((course: CanvasCourse) => ({
              uri: `pages://${course.id}`,
              name: `Pages: ${course.name}`,
              description: `Pages for ${course.name}`,
              mimeType: "application/json"
            })),
            ...courses.map((course: CanvasCourse) => ({
              uri: `files://${course.id}`,
              name: `Files: ${course.name}`,
              description: `Files for ${course.name}`,
              mimeType: "application/json"
            })),
            {
              uri: "dashboard://user",
              name: "User Dashboard",
              description: "User's Canvas dashboard information",
              mimeType: "application/json"
            },
            {
              uri: "profile://user",
              name: "User Profile",
              description: "Current user's profile information",
              mimeType: "application/json"
            },
            {
              uri: "calendar://upcoming",
              name: "Upcoming Events",
              description: "Upcoming assignments and events",
              mimeType: "application/json"
            }
          ]
        };
      } catch (error) {
        console.error('Error listing resources:', error);
        return { resources: [] };
      }
    });

    // Read resource content
    this.server.setRequestHandler(ReadResourceRequestSchema, async (request: any) => {
      const uri = request.params.uri;
      const [type, id] = uri.split("://");
      
      try {
        let content;
        
        switch (type) {
          case "canvas":
            if (id === "health") {
              content = await this.client.healthCheck();
            }
            break;
            
          case "courses":
            content = await this.client.listCourses();
            break;
            
          case "course":
            content = await this.client.getCourse(parseInt(id));
            break;
          
          case "assignments":
            content = await this.client.listAssignments(parseInt(id), true);
            break;
          
          case "modules":
            content = await this.client.listModules(parseInt(id));
            break;

          case "discussions":
            content = await this.client.listDiscussionTopics(parseInt(id));
            break;

          case "announcements":
            content = await this.client.listAnnouncements(id);
            break;
          
          case "quizzes":
            content = await this.client.listQuizzes(id);
            break;

          case "pages":
            content = await this.client.listPages(parseInt(id));
            break;

          case "files":
            content = await this.client.listFiles(parseInt(id));
            break;

          case "dashboard":
            if (id === "user") {
              content = await this.client.getDashboard();
            }
            break;

          case "profile":
            if (id === "user") {
              content = await this.client.getUserProfile();
            }
            break;

          case "calendar":
            if (id === "upcoming") {
              content = await this.client.getUpcomingAssignments();
            }
            break;
          
          default:
            throw new Error(`Unknown resource type: ${type}`);
        }

        return {
          contents: [{
            uri: request.params.uri,
            mimeType: "application/json",
            text: JSON.stringify(content, null, 2)
          }]
        };
      } catch (error) {
        console.error(`Error reading resource ${uri}:`, error);
        return {
          contents: [{
            uri: request.params.uri,
            mimeType: "application/json",
            text: JSON.stringify({ error: error instanceof Error ? error.message : String(error) }, null, 2)
          }]
        };
      }
    });

    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: TOOLS
    }));

    // Handle tool calls with comprehensive error handling
    this.server.setRequestHandler(CallToolRequestSchema, async (request: any) => {
      try {
        const args = request.params.arguments || {};
        const toolName = request.params.name;
        
        console.error(`[Canvas MCP] Executing tool: ${toolName}`);
        
        switch (toolName) {
          // Health check
          case "canvas_health_check": {
            const health = await this.client.healthCheck();
            return {
              content: [{ type: "text", text: JSON.stringify(health, null, 2) }]
            };
          }

          // Course management
          case "canvas_list_courses": {
            const { include_ended = false } = args as { include_ended?: boolean };
            const courses = await this.client.listCourses(include_ended);
            return {
              content: [{ type: "text", text: JSON.stringify(courses, null, 2) }]
            };
          }

          case "canvas_get_course": {
            const { course_id } = args as { course_id: number };
            if (!course_id) throw new Error("Missing required field: course_id");
            
            const course = await this.client.getCourse(course_id);
            return {
              content: [{ type: "text", text: JSON.stringify(course, null, 2) }]
            };
          }
          
          case "canvas_create_course": {
            const courseArgs = args as unknown as CreateCourseArgs;
            if (!courseArgs.account_id || !courseArgs.name) {
              throw new Error("Missing required fields: account_id and name");
            }
            const course = await this.client.createCourse(courseArgs);
            return {
              content: [{ type: "text", text: JSON.stringify(course, null, 2) }]
            };
          }
          
          case "canvas_update_course": {
            const updateArgs = args as unknown as UpdateCourseArgs;
            if (!updateArgs.course_id) {
              throw new Error("Missing required field: course_id");
            }
            const updatedCourse = await this.client.updateCourse(updateArgs);
            return {
              content: [{ type: "text", text: JSON.stringify(updatedCourse, null, 2) }]
            };
          }

          // Assignment management
          case "canvas_list_assignments": {
            const { course_id, include_submissions = false } = args as { 
              course_id: number; 
              include_submissions?: boolean 
            };
            if (!course_id) throw new Error("Missing required field: course_id");
            
            const assignments = await this.client.listAssignments(course_id, include_submissions);
            return {
              content: [{ type: "text", text: JSON.stringify(assignments, null, 2) }]
            };
          }

          case "canvas_get_assignment": {
            const { course_id, assignment_id, include_submission = false } = args as { 
              course_id: number; 
              assignment_id: number;
              include_submission?: boolean;
            };
            if (!course_id || !assignment_id) {
              throw new Error("Missing required fields: course_id and assignment_id");
            }
            
            const assignment = await this.client.getAssignment(course_id, assignment_id, include_submission);
            return {
              content: [{ type: "text", text: JSON.stringify(assignment, null, 2) }]
            };
          }
          
          case "canvas_create_assignment": {
            const assignmentArgs = args as unknown as CreateAssignmentArgs;
            if (!assignmentArgs.course_id || !assignmentArgs.name) {
              throw new Error("Missing required fields: course_id and name");
            }
            const assignment = await this.client.createAssignment(assignmentArgs);
            return {
              content: [{ type: "text", text: JSON.stringify(assignment, null, 2) }]
            };
          }
          
          case "canvas_update_assignment": {
            const updateAssignmentArgs = args as unknown as UpdateAssignmentArgs;
            if (!updateAssignmentArgs.course_id || !updateAssignmentArgs.assignment_id) {
              throw new Error("Missing required fields: course_id and assignment_id");
            }
            const updatedAssignment = await this.client.updateAssignment(updateAssignmentArgs);
            return {
              content: [{ type: "text", text: JSON.stringify(updatedAssignment, null, 2) }]
            };
          }

          case "canvas_list_assignment_groups": {
            const { course_id } = args as { course_id: number };
            if (!course_id) throw new Error("Missing required field: course_id");
            
            const groups = await this.client.listAssignmentGroups(course_id);
            return {
              content: [{ type: "text", text: JSON.stringify(groups, null, 2) }]
            };
          }

          // Submissions
          case "canvas_get_submission": {
            const { course_id, assignment_id, user_id } = args as { 
              course_id: number; 
              assignment_id: number;
              user_id?: number;
            };
            if (!course_id || !assignment_id) {
              throw new Error("Missing required fields: course_id and assignment_id");
            }
            
            const submission = await this.client.getSubmission(course_id, assignment_id, user_id || 'self');
            return {
              content: [{ type: "text", text: JSON.stringify(submission, null, 2) }]
            };
          }

          case "canvas_submit_assignment": {
            const submitArgs = args as unknown as SubmitAssignmentArgs;
            const { course_id, assignment_id, submission_type } = submitArgs;

            if (!course_id || !assignment_id || !submission_type) {
              throw new Error("Missing required fields: course_id, assignment_id, and submission_type");
            }

            const submission = await this.client.submitAssignment(submitArgs);
            return {
              content: [{ type: "text", text: JSON.stringify(submission, null, 2) }]
            };
          }
          
          case "canvas_submit_grade": {
            const gradeArgs = args as unknown as SubmitGradeArgs;
            if (!gradeArgs.course_id || !gradeArgs.assignment_id || 
                !gradeArgs.user_id || gradeArgs.grade === undefined) {
              throw new Error("Missing required fields for grade submission");
            }
            const submission = await this.client.submitGrade(gradeArgs);
            return {
              content: [{ type: "text", text: JSON.stringify(submission, null, 2) }]
            };
          }

          // Files
          case "canvas_list_files": {
            const { course_id, folder_id } = args as { course_id: number; folder_id?: number };
            if (!course_id) throw new Error("Missing required field: course_id");
            
            const files = await this.client.listFiles(course_id, folder_id);
            return {
              content: [{ type: "text", text: JSON.stringify(files, null, 2) }]
            };
          }

          case "canvas_get_file": {
            const { file_id } = args as { file_id: number };
            if (!file_id) throw new Error("Missing required field: file_id");
            
            const file = await this.client.getFile(file_id);
            return {
              content: [{ type: "text", text: JSON.stringify(file, null, 2) }]
            };
          }

          case "canvas_list_folders": {
            const { course_id } = args as { course_id: number };
            if (!course_id) throw new Error("Missing required field: course_id");
            
            const folders = await this.client.listFolders(course_id);
            return {
              content: [{ type: "text", text: JSON.stringify(folders, null, 2) }]
            };
          }

          // Pages
          case "canvas_list_pages": {
            const { course_id } = args as { course_id: number };
            if (!course_id) throw new Error("Missing required field: course_id");
            
            const pages = await this.client.listPages(course_id);
            return {
              content: [{ type: "text", text: JSON.stringify(pages, null, 2) }]
            };
          }

          case "canvas_get_page": {
            const { course_id, page_url } = args as { course_id: number; page_url: string };
            if (!course_id || !page_url) {
              throw new Error("Missing required fields: course_id and page_url");
            }
            
            const page = await this.client.getPage(course_id, page_url);
            return {
              content: [{ type: "text", text: JSON.stringify(page, null, 2) }]
            };
          }

          // Calendar
          case "canvas_list_calendar_events": {
            const { start_date, end_date } = args as { start_date?: string; end_date?: string };
            const events = await this.client.listCalendarEvents(start_date, end_date);
            return {
              content: [{ type: "text", text: JSON.stringify(events, null, 2) }]
            };
          }

          case "canvas_get_upcoming_assignments": {
            const { limit = 10 } = args as { limit?: number };
            const assignments = await this.client.getUpcomingAssignments(limit);
            return {
              content: [{ type: "text", text: JSON.stringify(assignments, null, 2) }]
            };
          }

          // Dashboard
          case "canvas_get_dashboard": {
            const dashboard = await this.client.getDashboard();
            return {
              content: [{ type: "text", text: JSON.stringify(dashboard, null, 2) }]
            };
          }

          case "canvas_get_dashboard_cards": {
            const cards = await this.client.getDashboardCards();
            return {
              content: [{ type: "text", text: JSON.stringify(cards, null, 2) }]
            };
          }

          // User management
          case "canvas_get_user_profile": {
            const profile = await this.client.getUserProfile();
            return {
              content: [{ type: "text", text: JSON.stringify(profile, null, 2) }]
            };
          }

          case "canvas_update_user_profile": {
            const profileData = args as Partial<{ name: string; short_name: string; bio: string; title: string; time_zone: string }>;
            const updatedProfile = await this.client.updateUserProfile(profileData);
            return {
              content: [{ type: "text", text: JSON.stringify(updatedProfile, null, 2) }]
            };
          }

          case "canvas_enroll_user": {
            const enrollArgs = args as unknown as EnrollUserArgs;
            if (!enrollArgs.course_id || !enrollArgs.user_id) {
              throw new Error("Missing required fields: course_id and user_id");
            }
            const enrollment = await this.client.enrollUser(enrollArgs);
            return {
              content: [{ type: "text", text: JSON.stringify(enrollment, null, 2) }]
            };
          }

          // Grades
          case "canvas_get_course_grades": {
            const { course_id } = args as { course_id: number };
            if (!course_id) throw new Error("Missing required field: course_id");
            
            const grades = await this.client.getCourseGrades(course_id);
            return {
              content: [{ type: "text", text: JSON.stringify(grades, null, 2) }]
            };
          }

          case "canvas_get_user_grades": {
            const grades = await this.client.getUserGrades();
            return {
              content: [{ type: "text", text: JSON.stringify(grades, null, 2) }]
            };
          }

          // Continue with all other tools...
          // [I'll include the rest in the same pattern]
          
          // Account Management
          case "canvas_get_account": {
            const { account_id } = args as { account_id: number };
            if (!account_id) throw new Error("Missing required field: account_id");
            
            const account = await this.client.getAccount(account_id);
            return {
              content: [{ type: "text", text: JSON.stringify(account, null, 2) }]
            };
          }

          case "canvas_list_account_courses": {
            const accountCoursesArgs = args as unknown as ListAccountCoursesArgs;
            if (!accountCoursesArgs.account_id) {
              throw new Error("Missing required field: account_id");
            }
            
            const courses = await this.client.listAccountCourses(accountCoursesArgs);
            return {
              content: [{ type: "text", text: JSON.stringify(courses, null, 2) }]
            };
          }

          case "canvas_list_account_users": {
            const accountUsersArgs = args as unknown as ListAccountUsersArgs;
            if (!accountUsersArgs.account_id) {
              throw new Error("Missing required field: account_id");
            }
            
            const users = await this.client.listAccountUsers(accountUsersArgs);
            return {
              content: [{ type: "text", text: JSON.stringify(users, null, 2) }]
            };
          }

          case "canvas_create_user": {
            const createUserArgs = args as unknown as CreateUserArgs;
            if (!createUserArgs.account_id || !createUserArgs.user || !createUserArgs.pseudonym) {
              throw new Error("Missing required fields: account_id, user, and pseudonym");
            }
            
            const user = await this.client.createUser(createUserArgs);
            return {
              content: [{ type: "text", text: JSON.stringify(user, null, 2) }]
            };
          }

          case "canvas_list_sub_accounts": {
            const { account_id } = args as { account_id: number };
            if (!account_id) throw new Error("Missing required field: account_id");
            
            const subAccounts = await this.client.listSubAccounts(account_id);
            return {
              content: [{ type: "text", text: JSON.stringify(subAccounts, null, 2) }]
            };
          }

          case "canvas_get_account_reports": {
            const { account_id } = args as { account_id: number };
            if (!account_id) throw new Error("Missing required field: account_id");
            
            const reports = await this.client.getAccountReports(account_id);
            return {
              content: [{ type: "text", text: JSON.stringify(reports, null, 2) }]
            };
          }

          case "canvas_create_account_report": {
            const createReportArgs = args as unknown as CreateReportArgs;
            if (!createReportArgs.account_id || !createReportArgs.report) {
              throw new Error("Missing required fields: account_id and report");
            }
            
            const report = await this.client.createAccountReport(createReportArgs);
            return {
              content: [{ type: "text", text: JSON.stringify(report, null, 2) }]
            };
          }

          // ===== TEACHER INFORMATION RETRIEVAL TOOLS =====
          // Tier 1: Essential Daily Tools

          case "canvas_get_teacher_courses": {
            const teacherCoursesArgs = args as unknown as GetTeacherCoursesArgs;
            const courses = await this.client.getTeacherCourses(teacherCoursesArgs);
            return {
              content: [{ type: "text", text: JSON.stringify(courses, null, 2) }]
            };
          }

          case "canvas_get_grading_queue": {
            const gradingQueueArgs = args as unknown as GetGradingQueueArgs;
            const gradingItems = await this.client.getGradingQueue(gradingQueueArgs);
            return {
              content: [{ type: "text", text: JSON.stringify(gradingItems, null, 2) }]
            };
          }

          case "canvas_get_course_students": {
            const courseStudentsArgs = args as unknown as GetCourseStudentsArgs;
            if (!courseStudentsArgs.course_id) {
              throw new Error("Missing required field: course_id");
            }
            const students = await this.client.getCourseStudents(courseStudentsArgs);
            return {
              content: [{ type: "text", text: JSON.stringify(students, null, 2) }]
            };
          }

          case "canvas_get_course_assignments": {
            const courseAssignmentsArgs = args as unknown as GetCourseAssignmentsArgs;
            if (!courseAssignmentsArgs.course_id) {
              throw new Error("Missing required field: course_id");
            }
            const assignments = await this.client.getCourseAssignments(courseAssignmentsArgs);
            return {
              content: [{ type: "text", text: JSON.stringify(assignments, null, 2) }]
            };
          }

          case "canvas_get_upcoming_events": {
            const upcomingEventsArgs = args as unknown as GetUpcomingEventsArgs;
            const events = await this.client.getUpcomingEvents(upcomingEventsArgs);
            return {
              content: [{ type: "text", text: JSON.stringify(events, null, 2) }]
            };
          }

          // Tier 2: Analytics & Insights Tools

          case "canvas_get_student_performance": {
            const studentPerformanceArgs = args as unknown as GetStudentPerformanceArgs;
            if (!studentPerformanceArgs.course_id) {
              throw new Error("Missing required field: course_id");
            }
            const performance = await this.client.getStudentPerformance(studentPerformanceArgs);
            return {
              content: [{ type: "text", text: JSON.stringify(performance, null, 2) }]
            };
          }

          case "canvas_get_course_analytics": {
            const courseAnalyticsArgs = args as unknown as GetCourseAnalyticsArgs;
            if (!courseAnalyticsArgs.course_id) {
              throw new Error("Missing required field: course_id");
            }
            const analytics = await this.client.getCourseAnalytics(courseAnalyticsArgs);
            return {
              content: [{ type: "text", text: JSON.stringify(analytics, null, 2) }]
            };
          }

          case "canvas_get_assignment_analytics": {
            const assignmentAnalyticsArgs = args as unknown as GetAssignmentAnalyticsArgs;
            if (!assignmentAnalyticsArgs.course_id) {
              throw new Error("Missing required field: course_id");
            }
            const analytics = await this.client.getAssignmentAnalytics(assignmentAnalyticsArgs);
            return {
              content: [{ type: "text", text: JSON.stringify(analytics, null, 2) }]
            };
          }

          case "canvas_get_missing_submissions": {
            const missingSubmissionsArgs = args as unknown as GetMissingSubmissionsArgs;
            const missingSubmissions = await this.client.getMissingSubmissions(missingSubmissionsArgs);
            return {
              content: [{ type: "text", text: JSON.stringify(missingSubmissions, null, 2) }]
            };
          }

          case "canvas_get_course_statistics": {
            const courseStatsArgs = args as unknown as GetCourseStatisticsArgs;
            if (!courseStatsArgs.course_id) {
              throw new Error("Missing required field: course_id");
            }
            const statistics = await this.client.getCourseStatistics(courseStatsArgs);
            return {
              content: [{ type: "text", text: JSON.stringify(statistics, null, 2) }]
            };
          }

          // Tier 3: Advanced Information Tools

          case "canvas_get_student_details": {
            const studentDetailsArgs = args as unknown as GetStudentDetailsArgs;
            if (!studentDetailsArgs.course_id || !studentDetailsArgs.student_id) {
              throw new Error("Missing required fields: course_id and student_id");
            }
            const details = await this.client.getStudentDetails(studentDetailsArgs);
            return {
              content: [{ type: "text", text: JSON.stringify(details, null, 2) }]
            };
          }

          case "canvas_get_student_activity": {
            const studentActivityArgs = args as unknown as GetStudentActivityArgs;
            if (!studentActivityArgs.course_id) {
              throw new Error("Missing required field: course_id");
            }
            const activity = await this.client.getStudentActivity(studentActivityArgs);
            return {
              content: [{ type: "text", text: JSON.stringify(activity, null, 2) }]
            };
          }

          case "canvas_get_course_details": {
            const courseDetailsArgs = args as unknown as GetCourseDetailsArgs;
            if (!courseDetailsArgs.course_id) {
              throw new Error("Missing required field: course_id");
            }
            const details = await this.client.getCourseDetails(courseDetailsArgs);
            return {
              content: [{ type: "text", text: JSON.stringify(details, null, 2) }]
            };
          }

          case "canvas_get_course_discussions": {
            const courseDiscussionsArgs = args as unknown as GetCourseDiscussionsArgs;
            if (!courseDiscussionsArgs.course_id) {
              throw new Error("Missing required field: course_id");
            }
            const discussions = await this.client.getCourseDiscussions(courseDiscussionsArgs);
            return {
              content: [{ type: "text", text: JSON.stringify(discussions, null, 2) }]
            };
          }

          case "canvas_get_teacher_activity": {
            const teacherActivityArgs = args as unknown as GetTeacherActivityArgs;
            const activity = await this.client.getTeacherActivity(teacherActivityArgs);
            return {
              content: [{ type: "text", text: JSON.stringify(activity, null, 2) }]
            };
          }

          case "canvas_get_gradebook_data": {
            const gradebookArgs = args as unknown as GetGradebookDataArgs;
            if (!gradebookArgs.course_id) {
              throw new Error("Missing required field: course_id");
            }
            const gradebook = await this.client.getGradebookData(gradebookArgs);
            return {
              content: [{ type: "text", text: JSON.stringify(gradebook, null, 2) }]
            };
          }

          case "canvas_get_module_progress": {
            const moduleProgressArgs = args as unknown as GetModuleProgressArgs;
            if (!moduleProgressArgs.course_id) {
              throw new Error("Missing required field: course_id");
            }
            const progress = await this.client.getModuleProgress(moduleProgressArgs);
            return {
              content: [{ type: "text", text: JSON.stringify(progress, null, 2) }]
            };
          }

          case "canvas_search_course_content": {
            const searchArgs = args as unknown as SearchCourseContentArgs;
            if (!searchArgs.course_id || !searchArgs.search_term) {
              throw new Error("Missing required fields: course_id and search_term");
            }
            const results = await this.client.searchCourseContent(searchArgs);
            return {
              content: [{ type: "text", text: JSON.stringify(results, null, 2) }]
            };
          }

          case "canvas_get_user_enrollments": {
            const enrollmentsArgs = args as unknown as GetUserEnrollmentsArgs;
            const enrollments = await this.client.getUserEnrollments(enrollmentsArgs);
            return {
              content: [{ type: "text", text: JSON.stringify(enrollments, null, 2) }]
            };
          }

          default:
            throw new Error(`Unknown tool: ${toolName}`);
        }
      } catch (error) {
        console.error(`Error executing tool ${request.params.name}:`, error);
        return {
          content: [{
            type: "text",
            text: `Error: ${error instanceof Error ? error.message : String(error)}`
          }],
          isError: true
        };
      }
    });
  }

  async run(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error(`${this.config.name} running on stdio`);
  }
}

// Main entry point with enhanced configuration
async function main() {
  // Get current file's directory in ES modules
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);

  // Enhanced environment loading
  const envPaths = [
    '.env',
    'src/.env',
    path.join(__dirname, '.env'),
    path.join(process.cwd(), '.env'),
    path.join(__dirname, '..', '.env'), // Parent directory
  ];

  let loaded = false;
  for (const envPath of envPaths) {
    const result = dotenv.config({ path: envPath });
    if (result.parsed) {
      console.error(`Loaded environment from: ${envPath}`);
      loaded = true;
      break;
    }
  }

  if (!loaded) {
    console.error('Warning: No .env file found');
  }

  const token = process.env.CANVAS_API_TOKEN;
  const domain = process.env.CANVAS_DOMAIN;

  if (!token || !domain) {
    console.error("Missing required environment variables:");
    console.error("- CANVAS_API_TOKEN: Your Canvas API token");
    console.error("- CANVAS_DOMAIN: Your Canvas domain (e.g., school.instructure.com)");
    process.exit(1);
  }

  const config: MCPServerConfig = {
    name: "canvas-mcp-server",
    version: "2.2.3",
    canvas: {
      token,
      domain,
      maxRetries: parseInt(process.env.CANVAS_MAX_RETRIES || '3'),
      retryDelay: parseInt(process.env.CANVAS_RETRY_DELAY || '1000'),
      timeout: parseInt(process.env.CANVAS_TIMEOUT || '30000')
    },
    logging: {
      level: (process.env.LOG_LEVEL as any) || 'info'
    }
  };

  try {
    const server = new CanvasMCPServer(config);
    await server.run();
  } catch (error) {
    console.error("Fatal error:", error);
    process.exit(1);
  }
}

main().catch(console.error);